"use client";

import Image from "next/image";
import { markOnAir } from "@/components/StatusChip";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export type Candidate = { title: string; name: string; abbr?: string; year?: string; logo?: string };

// Liquipedia often only lists an event's finals dates, so an event can be on air well before it is marked as running.
// Events starting soon are checked for a live YouTube stream after the page loads; any hit is shown as live.
export function LiveDetect({ candidates, children }: { candidates: Candidate[]; children: ReactNode }) {
  const [found, setFound] = useState<Candidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      candidates.map(async (c) => {
        const q = new URLSearchParams({ name: c.name, live: "1", ...(c.abbr ? { abbr: c.abbr } : {}), ...(c.year ? { year: c.year } : {}) });
        try {
          const res = await fetch(`/api/watch-parties?${q}`);
          const { videos } = (await res.json()) as { videos?: { live: boolean; channel: string; title: string }[] };
          // One stray stream (a streamer's countdown room, a reaction) is not the event: a running event has several channels live
          const channels = new Set(videos?.filter((v) => v.live && !/starting (soon|in)|countdown|waiting/i.test(v.title)).map((v) => v.channel));
          return channels.size >= 2 ? c : null;
        } catch {
          return null;
        }
      }),
    ).then((r) => {
      if (cancelled) return;
      const hits = r.filter((c): c is Candidate => !!c);
      hits.forEach((c) => markOnAir(c.title));
      setFound(hits);
    });
    return () => { cancelled = true; };
  }, [candidates]);

  if (!found.length) return <>{children}</>;
  return (
    <section aria-label="Live now" className="mb-6 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-500/15 to-transparent p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400">
        <span className="size-2.5 animate-pulse rounded-full bg-red-500 ring-4 ring-red-500/25" />
        Live now
      </h2>
      <div className="flex flex-wrap gap-2">
        {found.map((t) => (
          <Link key={t.title} href={`/event/${t.title.replaceAll(" ", "_")}`} className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-white/5 px-3 py-2 text-sm font-medium transition hover:border-red-400">
            {t.logo && <Image src={t.logo} alt="" width={28} height={28} unoptimized={t.logo.endsWith(".svg")} className="logo-plate size-7 rounded object-contain p-0.5" />}
            {t.name}
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Live stream</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
