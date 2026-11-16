import TerminalFrame from "./terminal-frame";

export default function TerminalPanel({ url, enabled }: { url: string; enabled: boolean }) {
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
          {enabled && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buka terminal di tab baru"
              title="Buka langsung"
              className="flex h-8 w-8 items-center justify-center rounded-md text-blue-400 hover:bg-blue-400/10 hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 5h6v6m0-6-8 8" />
                <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
              </svg>
            </a>
          )}
        </div>
      </div>
      <div className="bg-[#091321]">
        {enabled ? <TerminalFrame url={url} /> : <p className="min-h-[520px] px-5 py-5 text-sm text-slate-400 md:min-h-[680px]">Terminal tersedia hanya untuk development lokal.</p>}
      </div>
    </section>
  );
}
