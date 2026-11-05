"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Chip } from "@/components/ui";

type St = "live" | "upcoming" | "finished";
const tone = { live: "red", upcoming: "blue", finished: "neutral" } as const;

// Events found live by a stream check (the home page's LiveDetect, or this chip on an event page), shared between components.
const onAir = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
export function markOnAir(title: string) {
  if (onAir.has(title)) return;
  onAir.add(title);
  version++;
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));

// "Live stream" means Liquipedia still says upcoming (it often lists only the finals dates) but streams are on air.
export function StatusChip({ st, title, check }: { st: St; title: string; check?: Record<string, string> }) {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const key = check ? new URLSearchParams({ ...check, live: "1" }).toString() : "";

  useEffect(() => {
    if (!key || st !== "upcoming") return;
    let off = false;
    fetch(`/api/watch-parties?${key}`)
      .then((r) => r.json())
      .then((d: { videos?: { live: boolean; channel: string; title: string }[] }) => {
        const channels = new Set(d.videos?.filter((v) => v.live && !/starting (soon|in)|countdown|waiting/i.test(v.title)).map((v) => v.channel));
        if (!off && channels.size >= 2) markOnAir(title);
      })
      .catch(() => {});
    return () => { off = true; };
  }, [key, st, title]);

  const live = st === "live" || (st === "upcoming" && onAir.has(title));
  const s: St = live ? "live" : st;
  return (
    <Chip tone={tone[s]}>
      {live && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
      {live && st === "upcoming" ? "live stream" : s}
    </Chip>
  );
}
