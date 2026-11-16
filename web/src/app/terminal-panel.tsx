import TerminalFrame from "./terminal-frame";

export default function TerminalPanel({ url, enabled, dashboardUrl }: { url: string; enabled: boolean; dashboardUrl: string }) {
  return (
    <section
      className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0b1423]"
      aria-labelledby="terminal-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111b2d] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <h2 id="terminal-title" className="text-right font-mono text-xs text-slate-300 sm:text-sm">caldev@caldev-server — bash</h2>
        </div>
      </div>
      <div className="bg-[#091321]">
        {enabled ? <TerminalFrame url={url} /> : <p className="min-h-[520px] px-5 py-5 text-sm text-slate-400 md:min-h-[680px]">Buka dashboard melalui <a className="text-blue-400 underline underline-offset-4" href={dashboardUrl}>{dashboardUrl}</a> untuk menggunakan terminal.</p>}
      </div>
    </section>
  );
}
