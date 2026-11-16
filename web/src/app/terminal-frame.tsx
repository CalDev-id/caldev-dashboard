"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const MIN_HEIGHT = 320;
const MAX_HEIGHT = 1200;

function clampHeight(height: number) {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height));
}

export default function TerminalFrame({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const revealTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  function focusTerminal() {
    iframeRef.current?.focus();
    try {
      iframeRef.current?.contentWindow?.focus();
    } catch {
      // The iframe element remains focusable if the browser blocks window focus.
    }
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    const startHeight = containerRef.current?.getBoundingClientRect().height;
    if (startHeight === undefined) return;
    dragRef.current = { startY: event.clientY, startHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current) {
      setHeight(clampHeight(dragRef.current.startHeight + event.clientY - dragRef.current.startY));
    }
  }

  function stopResize(event: PointerEvent<HTMLButtonElement>) {
    const wasDragging = dragRef.current !== null;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (wasDragging) focusTerminal();
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusTerminal();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const currentHeight = containerRef.current?.getBoundingClientRect().height;
    if (currentHeight !== undefined) {
      setHeight(clampHeight(currentHeight + (event.key === "ArrowDown" ? 40 : -40)));
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => {
      window.cancelAnimationFrame(frame);
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted || ready || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [mounted, ready, failed]);

  return (
    <div ref={containerRef} className={`flex w-full flex-col bg-[#091321] ${height === null ? "h-[520px] md:h-[680px]" : ""}`} style={height === null ? undefined : { height }}>
      <div className="min-h-0 flex-1">
        {failed ? (
          <div className="flex h-full items-center justify-center px-5 text-center text-sm text-slate-400">
            <p>Terminal tidak dapat dimuat. Periksa layanan terminal.</p>
          </div>
        ) : mounted && (
          <iframe
            ref={iframeRef}
            title="CalDev Server terminal"
            src={url}
            className={`block h-full w-full border-0 bg-[#091321] ${ready ? "opacity-100" : "opacity-0"}`}
            onLoad={() => {
              revealTimer.current = window.setTimeout(() => {
                setReady(true);
                focusTerminal();
              }, 450);
            }}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {!failed && (
        <button
          type="button"
          aria-label="Ubah tinggi terminal: seret atau gunakan panah atas dan bawah. Tekan Enter untuk fokus ke terminal"
          className="flex h-9 w-full shrink-0 touch-none cursor-ns-resize items-center justify-center border-t border-white/10 bg-[#111b2d] text-slate-400 hover:bg-[#1b2b41] hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-400"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          onKeyDown={resizeWithKeyboard}
        >
          <span className="h-1 w-14 rounded-full bg-current" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
