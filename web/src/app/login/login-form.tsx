"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(false);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: "/",
      });
      if (result.ok && !result.error) {
        window.location.replace("/");
        return;
      }
    } catch {
      // Use the same message for invalid credentials and request failures.
    }

    setPassword("");
    setError(true);
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
        <div className="group relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-300" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
          <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} className="w-full rounded-xl border border-white/10 bg-[#0b1423] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-600 hover:border-white/20 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 disabled:opacity-60" placeholder="admin@example.com" />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
        <div className="group relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-300" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} className="w-full rounded-xl border border-white/10 bg-[#0b1423] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 disabled:opacity-60" />
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-200">Login gagal. Periksa kredensial atau coba lagi nanti.</p>}
      <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(59,130,246,0.22)] transition-colors hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>}
      </button>
    </form>
  );
}
