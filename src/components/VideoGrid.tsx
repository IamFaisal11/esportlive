"use client";

import { useEffect, useRef, useState } from "react";
import type { Vod } from "@/lib/broadcast";

// youtu.be/ID, youtube.com/watch?v=ID, youtube.com/live/ID, youtube.com/embed/ID -> ID
function youtubeId(url: string) {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/))([\w-]{11})/)?.[1];
}

// Thumbnail first (so 15 videos don't load 15 players). Hovering for a moment plays a muted preview in the card;
// a click swaps it for the full player and starts it with sound.
export function Video({ id, url, title, sub, live }: { id: string; url: string; title: string; sub?: string; live?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [preview, setPreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const enter = () => {
    // Only for a real mouse: touch screens have no hover
    if (window.matchMedia("(hover: hover)").matches) timer.current = setTimeout(() => setPreview(true), 400);
  };
  const leave = () => {
    clearTimeout(timer.current);
    setPreview(false);
  };
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-video bg-black" onMouseEnter={enter} onMouseLeave={leave}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${title}`} className="group absolute inset-0 size-full">
            {preview && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${id}`}
                title=""
                tabIndex={-1}
                allow="autoplay; encrypted-media"
                className="pointer-events-none absolute inset-0 z-10 size-full"
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-80 transition group-hover:opacity-100" />
            {live && <span className="absolute left-2 top-2 z-20 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Live</span>}
            <span className={`absolute left-1/2 top-1/2 z-20 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110 ${preview ? "opacity-0" : ""}`}>
              <svg viewBox="0 0 24 24" className="ml-0.5 size-6" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          {sub && <span className="block text-xs text-zinc-500">{sub}</span>}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-zinc-400 hover:text-orange-400">YouTube ↗</a>
      </figcaption>
    </figure>
  );
}

// Every recording of the event, grouped by language, playable in place.
export function VideoGrid({ vods }: { vods: Vod[] }) {
  return (
    <div className="space-y-8">
      {vods.map((v) => (
        <div key={v.language}>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">{v.language}</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {v.links.map((l) => {
              const id = youtubeId(l.url);
              const title = `${v.language} · ${l.label}`;
              return id ? (
                <Video key={l.url} id={id} url={l.url} title={title} />
              ) : (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm transition hover:border-orange-500 hover:text-orange-400">
                  {title} ↗
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
