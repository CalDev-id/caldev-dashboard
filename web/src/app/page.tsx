import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import LogoutButton from "./logout-button";
import TerminalPanel from "./terminal-panel";
import { TerminalSessionProvider, TerminalVisibility } from "./terminal-session";
import Loading from "./loading";
import {
  formatGiB,
  formatLastUpdated,
  formatPercent,
  formatTemperature,
  formatUptime,
  isHostSnapshotStale,
  refreshHostMetrics,
} from "@/lib/host-metrics";

export const prefetch = "force-disabled";

const terminalOptions = new URLSearchParams({
  theme: JSON.stringify({
    background: "#091321",
    foreground: "#CBD5E1",
    cursor: "#60A5FA",
    selectionBackground: "#334155",
    green: "#4ADE80",
    blue: "#60A5FA",
  }),
  fontSize: "15",
  fontFamily: "Menlo, Monaco, monospace",
  lineHeight: "1.25",
  cursorBlink: "false",
  disableResizeOverlay: "true",
});
const terminalUrl = `/terminal/?${terminalOptions.toString()}`;

function MetricIcon({ kind }: { kind: "cpu" | "memory" | "storage" }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "cpu" && <path d="M3 12h4l3-7 4 14 3-7h4" />}
      {kind === "memory" && <><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" /></>}
      {kind === "storage" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 13h18M7 16h.01M11 16h.01" /></>}
    </svg>
  );
}

function MetricSparkline({ kind }: { kind: "cpu" | "memory" | "storage" }) {
  const paths = {
    cpu: "M0 37 L28 33 L56 36 L84 18 L112 24 L140 14 L168 23 L196 20 L224 27 L252 13 L280 17 L320 8",
    memory: "M0 37 L28 35 L56 32 L84 35 L112 27 L140 28 L168 24 L196 26 L224 20 L252 21 L280 16 L320 14",
    storage: "M0 37 L28 36 L56 33 L84 34 L112 31 L140 27 L168 27 L196 24 L224 21 L252 20 L280 17 L320 15",
  };
  const colors = { cpu: "text-blue-400", memory: "text-violet-400", storage: "text-emerald-400" };

  return (
    <svg className={`mt-5 h-10 w-full ${colors[kind]}`} viewBox="0 0 320 48" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d={paths[kind]} stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

async function DashboardContent() {
  await connection();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    redirect("/login");
  }
  const session = await auth();
  const sessionEmail = session?.user?.email;
  if (typeof sessionEmail !== "string" || sessionEmail.toLowerCase() !== adminEmail) {
    redirect("/login");
  }
  const requestHeaders = await headers();
  const isProduction = process.env.NODE_ENV === "production";
  const terminalEnabled = isProduction
    ? requestHeaders.get("host") === "server.caldev.my.id" && requestHeaders.get("x-forwarded-proto") === "https"
    : process.env.NODE_ENV === "development" && requestHeaders.get("host") === "localhost:8080";
  const { host, refreshed } = await refreshHostMetrics();
  const metrics = [
    { label: "CPU USAGE", kind: "cpu" as const, value: formatPercent(host?.cpu_usage_percent ?? null), detail: host?.cpu_model ?? "Processor unavailable", usage: host?.cpu_usage_percent ?? null, bar: "bg-blue-400", icon: "bg-blue-400/10 text-blue-400" },
    { label: "MEMORY", kind: "memory" as const, value: formatPercent(host?.memory?.usage_percent ?? null), detail: host?.memory ? `${formatGiB(host.memory.used_bytes)} / ${formatGiB(host.memory.total_bytes)}` : "Data unavailable", usage: host?.memory?.usage_percent ?? null, bar: "bg-violet-400", icon: "bg-violet-400/10 text-violet-400" },
    { label: "STORAGE", kind: "storage" as const, value: formatPercent(host?.storage?.usage_percent ?? null), detail: host?.storage ? `${formatGiB(host.storage.used_bytes)} / ${formatGiB(host.storage.total_bytes)}` : "Data unavailable", usage: host?.storage?.usage_percent ?? null, bar: "bg-emerald-400", icon: "bg-emerald-400/10 text-emerald-400" },
  ];
  const cloudflaredStatus = host?.cloudflared_status ?? null;
  const cloudflaredLabel = cloudflaredStatus ? cloudflaredStatus[0].toUpperCase() + cloudflaredStatus.slice(1) : "N/A";
  const sshStatus = host?.ssh_status ?? null;
  const sshLabel = sshStatus ? sshStatus[0].toUpperCase() + sshStatus.slice(1) : "N/A";
  const dockerStatus = host?.docker_status ?? null;
  const dockerLabel = dockerStatus ? dockerStatus[0].toUpperCase() + dockerStatus.slice(1) : "N/A";
  const snapshotAvailable = host?.collected_at != null;
  const snapshotStale = isHostSnapshotStale(host?.collected_at ?? null);
  const snapshotCurrent = refreshed && snapshotAvailable && !snapshotStale;
  const snapshotLabel = snapshotCurrent ? "Data terbaru" : snapshotAvailable ? "Snapshot sebelumnya" : "Data tidak tersedia";

  return (
    <TerminalSessionProvider>
    <main className="min-h-screen bg-[#080e1b] font-sans text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="pt-9 sm:pt-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400"><span className="h-px w-5 bg-blue-400" />System overview</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">CalDev Server</h1>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">Personal Development Infrastructure</p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${snapshotCurrent ? "border-emerald-400/15 bg-emerald-400/[0.06]" : "border-slate-600/30 bg-slate-500/[0.06]"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${snapshotCurrent ? "bg-emerald-400" : "bg-slate-500"}`} aria-hidden="true" />
                <div><p className={`text-sm font-semibold ${snapshotCurrent ? "text-emerald-300" : "text-slate-300"}`}>{snapshotLabel}</p><p className="text-[11px] text-slate-500">Last updated: {formatLastUpdated(host?.collected_at ?? null)}</p>{snapshotStale && <p className="text-[11px] text-amber-300">Data lama</p>}{!refreshed && snapshotAvailable && <p className="text-[11px] text-amber-300">Refresh gagal</p>}</div>
              </div>
              <LogoutButton />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-blue-400/15 bg-blue-400/[0.055] px-4 py-3 text-xs leading-relaxed text-blue-100/75 sm:text-sm" role="note"><span className="mr-2 font-bold tracking-wide text-blue-300">HOST DATA</span>{snapshotAvailable ? "Hardware host diperbarui saat dashboard dibuka atau di-refresh. Jika refresh gagal, snapshot terakhir ditampilkan." : "No valid host snapshot is available. Missing values are shown as N/A."}</div>

          <section className="mt-9" aria-labelledby="resources-title">
            <div className="mb-4 flex items-center justify-between gap-4"><h2 id="resources-title" className="text-base font-semibold text-white sm:text-lg">Resource usage</h2></div>
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-white/[0.08] bg-[#101a2c] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.15)] sm:p-6">
                  <div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.icon}`}><MetricIcon kind={metric.kind} /></span></div>
                  <h3 className="mt-6 text-[11px] font-semibold tracking-[0.19em] text-slate-400">{metric.label}</h3>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{metric.value}</p>
                  <p className="mt-1 min-h-5 truncate text-xs text-slate-500" title={metric.detail}>{metric.detail}</p>
                  <MetricSparkline kind={metric.kind} />
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label={`${metric.label} usage at last collection`} aria-valuenow={metric.usage ?? undefined} aria-valuetext={metric.usage === null ? "Data unavailable" : undefined} aria-valuemin={0} aria-valuemax={100}><div className={`h-full rounded-full ${metric.bar}`} style={{ width: `${metric.usage ?? 0}%` }} /></div>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.08] bg-[#101a2c] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.15)] sm:p-6" aria-labelledby="system-title">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="8" rx="2" /><rect x="3" y="13" width="18" height="8" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6m-6 10h6" /></svg></span><h2 id="system-title" className="text-base font-semibold text-white">System Information</h2></div>
              </div>
              <dl className="divide-y divide-white/[0.06]">
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-slate-400">Operating system</dt><dd className="min-w-0 text-right font-medium text-slate-100">{host?.os ?? "N/A"}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-slate-400">Hostname</dt><dd className="min-w-0 text-right font-medium text-slate-100">{host?.hostname ?? "N/A"}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-slate-400">Uptime</dt><dd className="min-w-0 text-right font-medium text-slate-100">{formatUptime(host?.uptime_seconds ?? null)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-slate-400">CPU temperature</dt><dd className="min-w-0 text-right font-medium text-slate-100">{formatTemperature(host?.cpu_temperature_celsius ?? null)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-slate-400">Processor</dt><dd className="min-w-0 text-right font-medium text-slate-100">{host?.cpu_model ?? "N/A"}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-slate-400">Processes</dt><dd className="min-w-0 text-right font-medium text-slate-100">{host?.process_count == null ? "N/A" : `${host.process_count} processes`}</dd></div>
              </dl>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#101a2c] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.15)] sm:p-6" aria-labelledby="network-title">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="16" r="1" /><path d="M5 10a10 10 0 0 1 14 0M8 13a6 6 0 0 1 8 0M2 7a14 14 0 0 1 20 0" /></svg></span><h2 id="network-title" className="text-base font-semibold text-white">Network &amp; Services</h2></div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-[#0b1425] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 font-mono text-xs font-bold text-sky-400">W</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">Wi-Fi</p><p className="truncate text-xs text-slate-500">{host?.wifi_ipv4 ?? "IPv4 unavailable"}</p></div><span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${host?.wifi_ipv4 ? "text-emerald-300" : "text-slate-500"}`}>{host?.wifi_ipv4 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{host?.wifi_ipv4 ? "Connected" : "N/A"}</span></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-[#0b1425] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 font-mono text-xs font-bold text-violet-400">&gt;_</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">SSH</p><p className="text-xs text-slate-500">Remote access</p></div><span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${sshStatus === "active" ? "text-emerald-300" : "text-slate-500"}`}>{sshStatus === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{sshLabel}</span></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-[#0b1425] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-400/10 font-mono text-xs font-bold text-orange-400">CF</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">Cloudflare</p><p className="text-xs text-slate-500">Tunnel service</p></div><span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${cloudflaredStatus === "active" ? "text-emerald-300" : "text-slate-500"}`}>{cloudflaredStatus === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{cloudflaredLabel}</span></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-[#0b1425] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 font-mono text-xs font-bold text-blue-400">D</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">Docker</p><p className="text-xs text-slate-500">Container engine</p></div><span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${dockerStatus === "active" ? "text-emerald-300" : "text-slate-500"}`}>{dockerStatus === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{dockerLabel}</span></div>
              </div>
            </section>
          </div>

          <TerminalVisibility>
            <TerminalPanel url={terminalUrl} enabled={terminalEnabled} dashboardUrl={isProduction ? "https://server.caldev.my.id" : "http://localhost:8080"} />
          </TerminalVisibility>
        </div>
      </div>
    </main>
    </TerminalSessionProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
