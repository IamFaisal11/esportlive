"use client";

import { useEffect, useState } from "react";
import { Chip, panel } from "@/components/ui";

type State = "live" | "upcoming" | "finished";

// The status line of "Where to watch". Liquipedia can say "not started" while an event is already on air, so for an event
// that starts soon we also look for live streams after load: two or more channels live means it is running.
export function WatchStatus({ state, check }: { state: State; check?: Record<string, string> }) {
  const [onAir, setOnAir] = useState(false);
  const key = check ? new URLSearchParams({ ...check, live: "1" }).toString() : "";

  useEffect(() => {
    if (!key || state !== "upcoming") return;
    let off = false;
    fetch(`/api/watch-parties?${key}`)
      .then((r) => r.json())
      .then((d: { videos?: { live: boolean; channel: string; title: string }[] }) => {
        const channels = new Set(d.videos?.filter((v) => v.live && !/starting (soon|in)|countdown|waiting/i.test(v.title)).map((v) => v.channel));
        if (!off) setOnAir(channels.size >= 2);
      })
      .catch(() => {});
    return () => { off = true; };
  }, [key, state]);

  const live = state === "live" || onAir;
  const s: State = live ? "live" : state;
  return (
    <div className={`${panel} flex flex-wrap items-center gap-3 p-4`}>
      <Chip tone={live ? "red" : s === "upcoming" ? "blue" : "neutral"}>
        {live && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
        {live ? "Live now" : s === "upcoming" ? "Not started" : "Finished"}
      </Chip>
      <p className="text-sm text-zinc-300">
        {live ? "Choose a broadcast below to watch the matches live." : s === "upcoming" ? "These channels will carry the broadcast once the event starts." : "The event has ended. Open a YouTube broadcast below to watch the recordings."}
      </p>
    </div>
  );
}
