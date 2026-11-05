import type { ReactNode } from "react";
import { WatchStatus } from "@/components/WatchStatus";
import { Broadcasts } from "@/components/Broadcasts";
import { panel, SubTitle } from "@/components/ui";
import { VideoGrid } from "@/components/VideoGrid";
import type { Broadcast, Vod } from "@/lib/broadcast";

// Where to watch: official channels per language (YouTube opens that channel's videos and recordings in place) and the
// watch parties found for the event.
export function Watch({ streams, vods, state, parties, kick, scores, check }: { streams: Broadcast[]; vods: Vod[]; state: "live" | "upcoming" | "finished"; parties: ReactNode; kick?: string[]; scores?: string; check?: Record<string, string> }) {
  const live = state === "live";

  return (
    <div className="space-y-8">
      <WatchStatus state={state} check={check} />

      {scores && (
        <a href={scores} target="_blank" rel="noopener noreferrer" className={`${panel} flex items-center justify-between gap-3 p-4 text-sm transition hover:border-orange-500/60`}>
          <span><span className="font-semibold text-zinc-100">Live scores and match results</span> <span className="text-zinc-400">on eSportsAmaze</span></span>
          <span className="text-orange-400">Open ↗</span>
        </a>
      )}

      {kick?.map((slug) => (
        <section key={slug}>
          <SubTitle>Live on Kick</SubTitle>
          <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe src={`https://player.kick.com/${slug}`} title={`${slug} on Kick`} loading="lazy" allowFullScreen className="size-full" />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Kick&apos;s player for <a href={`https://kick.com/${slug}`} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">kick.com/{slug}</a>. It shows the stream while the channel is live.
          </p>
        </section>
      ))}

      <section>
        <SubTitle>Official broadcasts</SubTitle>
        {streams.length === 0 ? (
          vods.length > 0 ? <VideoGrid vods={vods} /> : <p className={`${panel} p-5 text-zinc-400`}>No broadcast channels are listed for this event yet.</p>
        ) : (
          <Broadcasts streams={streams} live={live} vods={vods} />
        )}
      </section>

      <section>
        <SubTitle>Watch parties &amp; co-streams</SubTitle>
        {parties}
      </section>
    </div>
  );
}
