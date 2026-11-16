import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Login · CalDev Server" };

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#080e1b] px-4 py-8 text-slate-100 sm:px-6 lg:py-12">
      <div className="pointer-events-none absolute -left-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-64 right-[-8rem] h-[38rem] w-[38rem] rounded-full bg-sky-500/[0.07] blur-3xl" aria-hidden="true" />

      <div className="relative grid w-full max-w-5xl gap-5 lg:grid-cols-2">
        <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[30px] border border-blue-300/20 bg-[#16427f] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.3)] sm:p-10 lg:min-h-[560px] lg:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-[#245caa] via-[#16427f] to-[#0a203d]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-28 top-16 h-80 w-80 rounded-full border border-white/15" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-14 top-28 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />

          <p className="relative w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-blue-50">CALDEV / ACCESS</p>

          <div className="relative my-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-white p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              <Image src="/ical_logo.png" alt="" width={76} height={76} priority className="h-full w-full object-contain" />
            </div>
            <p className="mt-8 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">CalDev<br />Server.</p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100/80">Personal Development Infrastructure</p>
          </div>

          <div className="relative flex items-center gap-2.5 border-t border-white/20 pt-5 text-xs font-medium text-blue-100/80">
            <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
            Dashboard access
          </div>
        </div>

        <section className="flex flex-col justify-center rounded-[30px] border border-white/10 bg-[#101a2c] px-8 py-10 shadow-[0_28px_80px_rgba(0,0,0,0.3)] sm:px-10 lg:px-12">
          <p className="mb-8 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-blue-300"><span className="h-px w-5 bg-blue-400" aria-hidden="true" />System access</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Welcome back.</h1>
          <p className="mb-9 mt-3 text-sm leading-6 text-slate-400">Enter your credentials to open the dashboard.</p>
          <LoginForm />
          <p className="mt-9 border-t border-white/10 pt-5 text-xs text-slate-500">Access restricted to authorized users.</p>
        </section>
      </div>
    </main>
  );
}
