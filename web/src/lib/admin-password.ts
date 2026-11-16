import "server-only";

import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;

export async function verifyAdminPassword(password: string, encoded: string | undefined): Promise<boolean> {
  if (!encoded) return false;

  const parts = encoded.split(":");
  if (
    parts.length !== 6 || parts[0] !== "scrypt" ||
    parts[1] !== String(COST) || parts[2] !== String(BLOCK_SIZE) ||
    parts[3] !== String(PARALLELIZATION) ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{128}$/.test(parts[5])
  ) return false;

  try {
    const expected = Buffer.from(parts[5], "hex");
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scryptCallback(password, Buffer.from(parts[4], "hex"), KEY_LENGTH, {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      }, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey as Buffer);
      });
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
