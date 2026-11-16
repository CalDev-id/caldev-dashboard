"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function LogoutPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] px-4 py-12 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#101a2c] p-6 text-center shadow-[0_12px_35px_rgba(0,0,0,0.15)] sm:p-8">
        <h1 className="text-2xl font-semibold text-white">Sign out</h1>
        <p className="mt-2 text-sm text-slate-400">End your CalDev Server session.</p>
        {error && <p role="alert" className="mt-5 text-sm text-rose-300">Gagal keluar. Coba lagi.</p>}
        <button type="button" onClick={handleLogout} disabled={pending} className="mt-7 w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Signing out…" : "Sign out"}
        </button>
        <Link href="/" className="mt-5 inline-block text-sm text-slate-400 hover:text-white">Back to dashboard</Link>
      </div>
    </main>
  );
}
