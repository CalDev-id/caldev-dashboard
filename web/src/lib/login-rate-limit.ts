import "server-only";

import { isIP } from "node:net";

const WINDOW_MS = 15 * 60 * 1000;
const PER_ADDRESS_LIMIT = 8;
const MAX_TRACKED_ADDRESSES = 4096;

type Bucket = { failures: number[]; pending: number };
const buckets = new Map<string, Bucket>();
let nextPruneAt = 0;

function removeExpiredFailures(bucket: Bucket, now: number) {
  bucket.failures = bucket.failures.filter((failedAt) => failedAt > now - WINDOW_MS);
}

function pruneBuckets(now: number) {
  if (now < nextPruneAt) return;
  nextPruneAt = now + 60_000;
  for (const [address, bucket] of buckets) {
    removeExpiredFailures(bucket, now);
    if (bucket.failures.length === 0 && bucket.pending === 0) buckets.delete(address);
  }
}

function addressFromProxy(request: Request): string {
  // Production NGINX replaces this header with the visitor IP from its trusted
  // loopback Tunnel hop. Reject lists and malformed values instead of taking
  // a client supplied first hop.
  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  return forwarded && isIP(forwarded) ? forwarded : "unknown";
}

export function beginLoginAttempt(request: Request): ((failed: boolean) => void) | null {
  const now = Date.now();
  pruneBuckets(now);

  const address = addressFromProxy(request);
  let bucket = buckets.get(address);
  if (!bucket) {
    // Bound memory without a shared failure limit that would lock out other IPs.
    if (buckets.size >= MAX_TRACKED_ADDRESSES) return null;
    bucket = { failures: [], pending: 0 };
    buckets.set(address, bucket);
  }

  removeExpiredFailures(bucket, now);
  if (bucket.failures.length + bucket.pending >= PER_ADDRESS_LIMIT) return null;
  bucket.pending += 1;

  let finished = false;
  return (failed) => {
    if (finished) return;
    finished = true;
    bucket.pending -= 1;
    if (failed) bucket.failures.push(Date.now());
    if (bucket.failures.length === 0 && bucket.pending === 0) buckets.delete(address);
  };
}
