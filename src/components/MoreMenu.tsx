"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Extra sections live here so the header stays short; add an entry to grow the menu.
const ITEMS = [{ href: "/transfers", label: "Transfers", hint: "Signings, departures and team moves" }];

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 transition hover:text-white"
      >
        More
        <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="fade-up absolute right-0 top-full z-30 mt-3 w-64 overflow-hidden rounded-xl border border-white/10 bg-surface/95 p-1.5 shadow-2xl backdrop-blur-md">
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 transition hover:bg-white/10">
              <span className="block text-sm font-medium text-zinc-100">{i.label}</span>
              <span className="block text-xs text-zinc-500">{i.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
