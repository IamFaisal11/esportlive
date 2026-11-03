import type { ReactNode } from "react";
import { Broadcasts } from "@/components/Broadcasts";
import { Chip, panel, SubTitle } from "@/components/ui";
import { VideoGrid } from "@/components/VideoGrid";
import type { Broadcast, Vod } from "@/lib/broadcast";

// Where to watch: official channels per language (YouTube opens that channel's videos and recordings in place) and the
// watch parties found for the event.
export function Watch({ streams, vods, state, parties }: { streams: Broadcast[]; vods: Vod[]; state: "live" | "upcoming" | "finished"; parties: ReactNode }) {
  const live = state === "live";

  return (
    <div className="space-y-8">
      <div className={`${panel} flex flex-wrap items-center gap-3 p-4`}>
        <Chip tone={live ? "red" : state === "upcoming" ? "blue" : "neutral"}>
          {live && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
          {live ? "Live now" : state === "upcoming" ? "Not started" : "Finished"}
        </Chip>
        <p className="text-sm text-zinc-300">
          {live ? "Choose a broadcast below to watch the matches live." : state === "upcoming" ? "These channels will carry the broadcast once the event starts." : "The event has ended. Open a YouTube broadcast below to watch the recordings."}
        </p>
      </div>

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
