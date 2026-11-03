"use client";

import { useEffect, useState } from "react";
import { Video, VideoGrid } from "@/components/VideoGrid";
import { LANGUAGES, type Broadcast, type Channel, type Vod } from "@/lib/broadcast";

const platformStyle: Record<Channel["platform"], string> = {
  youtube: "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  twitch: "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20",
  facebook: "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20",
  tiktok: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20",
  kick: "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20",
  vk: "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20",
  huya: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  stream: "border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10",
};
const platformName: Record<Channel["platform"], string> = { youtube: "YouTube", twitch: "Twitch", facebook: "Facebook", tiktok: "TikTok", kick: "Kick", vk: "VK", huya: "Huya", stream: "Stream" };

type Result = { channel: string; channelId: string; guessed: boolean; videos: { id: string; title: string; published: string }[] } | { error: string };
type Selected = { key: string; lang: string; channel: Channel };

const pill = (c: Channel, active: boolean, live: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${platformStyle[c.platform]} ${active ? "ring-2 ring-orange-400" : live ? "ring-1 ring-red-400/40" : ""}`;

function Card({ b, i, live, selected, onSelect }: { b: Broadcast; i: number; live: boolean; selected?: string; onSelect: (s: Selected) => void }) {
  const lang = LANGUAGES[b.lang] ?? (b.lang ? b.lang.toUpperCase() : "Broadcast");
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 font-medium">{lang}</div>
      <div className="flex flex-wrap gap-2">
        {b.channels.map((c, k) => {
          const key = `${i}:${k}`;
          const dot = live && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />;
          // YouTube opens the channel's videos right here; other platforms can't be embedded, so they link out.
          return c.platform === "youtube" ? (
            <button key={key} type="button" aria-pressed={selected === key} onClick={() => onSelect({ key, lang, channel: c })} className={pill(c, selected === key, live)}>
              {dot}YouTube <span aria-hidden>▾</span>
            </button>
          ) : (
            <a key={key} href={c.href} target="_blank" rel="noopener noreferrer" title={c.direct ? c.name : `Search for “${c.name}”`} className={pill(c, false, live)}>
              {dot}{platformName[c.platform]} <span aria-hidden>↗</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ sel, live, vods, onClose }: { sel: Selected; live: boolean; vods: Vod[]; onClose: () => void }) {
  const [data, setData] = useState<{ key: string; result: Result }>();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/youtube?q=${encodeURIComponent(sel.channel.name)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((result: Result) => setData({ key: sel.key, result }))
      .catch((e) => e.name !== "AbortError" && setData({ key: sel.key, result: { error: "Couldn't load videos" } }));
    return () => ctrl.abort();
  }, [sel.key, sel.channel.name]);

  const result = data?.key === sel.key ? data.result : undefined;
  const ok = result && "videos" in result ? result : undefined;
  // Liquipedia's recordings are columns per language ("Hindi", "Korean"...): the ones matching this card come first.
  const label = sel.lang.toLowerCase();
  const mine = vods.filter((v) => label.includes(v.language.toLowerCase()));
  const others = vods.filter((v) => !mine.includes(v));

  return (
    <div className="fade-up mt-4 rounded-xl border border-orange-500/30 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500">{sel.lang} · YouTube</div>
          <div className="truncate font-[family-name:var(--font-display)] text-xl font-semibold">{ok?.channel ?? sel.channel.name}</div>
        </div>
        <div className="flex gap-2">
          <a href={sel.channel.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs hover:border-orange-500 hover:text-orange-400">
            {sel.channel.direct ? "Open channel" : "Search on YouTube"} ↗
          </a>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs hover:border-white/30">Close</button>
        </div>
      </div>

      {mine.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">Recordings</h4>
          <VideoGrid vods={mine} />
        </div>
      )}
      {others.length > 0 && (
        <details className="mb-6 rounded-lg border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-sm text-zinc-300">
            {mine.length > 0 ? "More recordings" : "Recordings"} · {others.map((v) => v.language).join(", ")}
          </summary>
          <div className="border-t border-white/10 p-4"><VideoGrid vods={others} /></div>
        </details>
      )}

      {!result && (
        <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="aspect-video rounded-xl bg-white/10" />)}
        </div>
      )}

      {result && !ok && (
        <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-zinc-400">
          Couldn&apos;t load this channel&apos;s videos here{"error" in result ? ` (${result.error.toLowerCase()})` : ""}. Liquipedia lists only its name, so use the button above to find it on YouTube.
        </p>
      )}

      {ok && (
        <>
          {live && (
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-300">
                <span className="size-1.5 animate-pulse rounded-full bg-red-400" /> Live stream
              </div>
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${ok.channelId}`}
                  title={`${ok.channel} live`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            </div>
          )}
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">Latest uploads</h4>
          {ok.guessed && <p className="mb-3 text-xs text-zinc-500">Matched by name, so this may not be the exact channel.</p>}
          {ok.videos.length === 0 ? (
            <p className="text-sm text-zinc-400">This channel has no public videos.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ok.videos.map((v) => (
                <Video key={v.id} id={v.id} url={`https://www.youtube.com/watch?v=${v.id}`} title={v.title} sub={v.published} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Official broadcast channels per language; choosing YouTube shows that channel's videos below the cards.
export function Broadcasts({ streams, live, vods }: { streams: Broadcast[]; live: boolean; vods: Vod[] }) {
  const [sel, setSel] = useState<Selected | null>(null);
  const shown = streams.slice(0, 6);
  const rest = streams.slice(6);
  const hasYoutube = streams.some((b) => b.channels.some((c) => c.platform === "youtube"));
  const toggle = (s: Selected) => setSel((cur) => (cur?.key === s.key ? null : s));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((b, i) => <Card key={b.lang + i} b={b} i={i} live={live} selected={sel?.key} onSelect={toggle} />)}
      </div>
      {rest.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer select-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
            Show {rest.length} more broadcasts
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((b, i) => <Card key={b.lang + (i + 6)} b={b} i={i + 6} live={live} selected={sel?.key} onSelect={toggle} />)}
          </div>
        </details>
      )}
      {sel && <Panel sel={sel} live={live} vods={vods} onClose={() => setSel(null)} />}
      {/* No YouTube button to hang the recordings on: show them directly so they are never lost. */}
      {!hasYoutube && vods.length > 0 && <div className="mt-6"><VideoGrid vods={vods} /></div>}
    </>
  );
}
