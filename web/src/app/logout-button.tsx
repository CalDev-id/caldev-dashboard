"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCloseTerminal } from "./terminal-session";

export default function LogoutButton() {
  const router = useRouter();
  const closeTerminal = useCloseTerminal();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    flushSync(() => {
      closeTerminal();
      setPending(true);
    });
    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      router.push("/logout");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#101a2c] px-4 text-sm font-medium text-slate-300 transition-colors hover:border-blue-400/25 hover:bg-[#17243a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-60"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </svg>
      <span>Logout</span>
    </button>
  );
}
