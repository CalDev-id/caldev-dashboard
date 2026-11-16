"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type TerminalSession = {
  visible: boolean;
  close: () => void;
};

const TerminalSessionContext = createContext<TerminalSession | null>(null);

function useTerminalSession(): TerminalSession {
  const session = useContext(TerminalSessionContext);
  if (!session) throw new Error("Terminal session provider is missing");
  return session;
}

export function TerminalSessionProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  return (
    <TerminalSessionContext.Provider value={{ visible, close: () => setVisible(false) }}>
      {children}
    </TerminalSessionContext.Provider>
  );
}

export function TerminalVisibility({ children }: { children: ReactNode }) {
  return useTerminalSession().visible ? children : null;
}

export function useCloseTerminal(): () => void {
  return useTerminalSession().close;
}
