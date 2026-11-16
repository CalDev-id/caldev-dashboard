import Image from "next/image";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main className="relative isolate flex min-h-screen min-h-[100svh] items-center justify-center overflow-hidden bg-[#080e1b] px-6 text-slate-100" role="status" aria-live="polite">
      <div className={styles.backdrop} aria-hidden="true" />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative mb-9 flex h-36 w-36 items-center justify-center">
          <div className={styles.glow} aria-hidden="true" />
          <div className={`${styles.logo} relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]`}>
            <Image src="/ical_logo.png" alt="" width={112} height={112} unoptimized preload className="h-full w-full rounded-full object-contain" />
          </div>
        </div>

        <div className="mb-8 h-0.5 w-36 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className={styles.progress} />
        </div>

        <p className="text-sm font-semibold tracking-[0.32em] text-white sm:text-base">CALDEV SERVER</p>
        <p className="mt-3 text-xs tracking-[0.16em] text-slate-400">Loading...</p>
      </div>
    </main>
  );
}
