import "server-only";

import { readFile } from "node:fs/promises";

const METRICS_PATH = "/run/caldev-metrics/host-metrics.json";
const GIB = 1024 ** 3;

type Capacity = {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  usage_percent: number;
};

export type HostMetrics = {
  collected_at: string | null;
  hostname: string | null;
  os: string | null;
  cpu_model: string | null;
  cpu_usage_percent: number | null;
  cpu_temperature_celsius: number | null;
  memory: Capacity | null;
  storage: Capacity | null;
  uptime_seconds: number | null;
  process_count: number | null;
  wifi_ipv4: string | null;
  cloudflared_status: string | null;
  ssh_status: string | null;
  docker_status: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonemptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function serviceStatus(value: unknown): string | null {
  const status = nonemptyString(value);
  return status && ["active", "inactive", "failed", "activating", "deactivating", "reloading"].includes(status)
    ? status
    : null;
}

function finiteNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

function ipv4(value: unknown): string | null {
  const address = nonemptyString(value);
  if (!address) return null;
  const parts = address.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
    ? address
    : null;
}

function capacity(value: unknown): Capacity | null {
  const data = record(value);
  if (!data) return null;
  const total = finiteNumber(data.total_bytes);
  const used = finiteNumber(data.used_bytes);
  const available = finiteNumber(data.available_bytes);
  const percent = finiteNumber(data.usage_percent, 0, 100);
  if (total === null || total === 0 || used === null || available === null || percent === null || used > total || available > total) return null;
  return { total_bytes: total, used_bytes: used, available_bytes: available, usage_percent: percent };
}

export async function readHostMetrics(): Promise<HostMetrics | null> {
  try {
    const raw: unknown = JSON.parse(await readFile(METRICS_PATH, "utf8"));
    const data = record(raw);
    if (!data) return null;
    const timestamp = nonemptyString(data.collected_at);
    return {
      collected_at: timestamp && /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) && !Number.isNaN(Date.parse(timestamp)) ? timestamp : null,
      hostname: nonemptyString(data.hostname),
      os: nonemptyString(data.os),
      cpu_model: nonemptyString(data.cpu_model),
      cpu_usage_percent: finiteNumber(data.cpu_usage_percent, 0, 100),
      cpu_temperature_celsius: finiteNumber(data.cpu_temperature_celsius, -100, 200),
      memory: capacity(data.memory),
      storage: capacity(data.storage),
      uptime_seconds: finiteNumber(data.uptime_seconds),
      process_count: typeof data.process_count === "number" && Number.isInteger(data.process_count) ? finiteNumber(data.process_count) : null,
      wifi_ipv4: ipv4(data.wifi_ipv4),
      cloudflared_status: serviceStatus(data.cloudflared_status),
      ssh_status: serviceStatus(data.ssh_status),
      docker_status: serviceStatus(data.docker_status),
    };
  } catch {
    return null;
  }
}

export function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${Number(value.toFixed(1))}%`;
}

export function formatGiB(value: number | null): string {
  return value === null ? "N/A" : `${(value / GIB).toFixed(1)} GiB`;
}

export function formatUptime(value: number | null): string {
  if (value === null) return "N/A";
  const totalMinutes = Math.floor(value / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [days && `${days}d`, hours && `${hours}h`, `${minutes}m`].filter(Boolean).join(" ");
}

export function formatTemperature(value: number | null): string {
  return value === null ? "N/A" : `${Number(value.toFixed(1))}°C`;
}
