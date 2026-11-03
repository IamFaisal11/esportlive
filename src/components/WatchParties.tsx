"use client";

import { useEffect, useState } from "react";
import { Video } from "@/components/VideoGrid";
import type { YtVideo } from "@/lib/youtube";

type State = { status: "loading" } | { status: "done"; videos: YtVideo[] } | { status: "error" };

// Watch parties are looked up after the page has loaded (through /api/watch-parties, which the CDN caches),
// so a slow YouTube search never delays the rest of the event page.
export function WatchParties({ name, abbr, year, live }: { name: string; abbr?: string; year?: string; live: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const url = `/api/watch-parties?${new URLSearchParams({ name, ...(abbr ? { abbr } : {}), ...(year ? { year } : {}), ...(live ? { live: "1" } : {}) })}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { videos?: YtVideo[] }) => setState(d.videos ? { status: "done", videos: d.videos } : { status: "error" }))
      .catch((e) => e.name !== "AbortError" && setState({ status: "error" }));
    return () => ctrl.abort();
  }, [url]);

  if (state.status === "loading")
    return (
      <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="aspect-video rounded-xl bg-white/10" />)}
      </div>
    );

  if (state.status === "error" || state.videos.length === 0)
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
        {state.status === "error" ? "Couldn't load watch parties right now." : "No watch parties found for this event yet. They usually appear once the broadcast starts."}
      </p>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {state.videos.map((v) => (
        <Video key={v.id} id={v.id} url={`https://www.youtube.com/watch?v=${v.id}`} title={v.title} sub={[v.channel, v.meta].filter(Boolean).join(" · ")} live={v.live} />
      ))}
    </div>
  );
}
