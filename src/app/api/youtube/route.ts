import { NextResponse } from "next/server";

// Public channel page -> channel id, then the channel's public Atom feed (its 15 latest uploads). No API key needed.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  // Only letters, digits, . _ - reach the URL, so this can only ever request youtube.com/@<handle>.
  // A display name ("PUBG Mobile Esports") is turned into a handle guess by dropping everything else.
  const handle = q.replace(/^@/, "").replace(/[^A-Za-z0-9._-]/g, "");
  if (handle.length < 3 || handle.length > 60) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

  const key = handle.toLowerCase();
  const hit = cache.get(key);
  if (hit && performance.now() - hit.at < TTL) return NextResponse.json(hit.body);

  try {
    const page = await fetch(`https://www.youtube.com/@${handle}`, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" } });
    if (!page.ok) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    const html = await page.text();
    const channelId = html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ?? html.match(/channel\/(UC[\w-]{22})/)?.[1];
    if (!channelId) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: { "User-Agent": UA } });
    if (!feed.ok) return NextResponse.json({ error: "Videos unavailable" }, { status: 502 });
    const xml = await feed.text();
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap((m) => {
      const id = m[1].match(/<yt:videoId>([^<]+)/)?.[1];
      return id ? [{ id, title: decode(m[1].match(/<title>([^<]*)/)?.[1] ?? ""), published: m[1].match(/<published>([^<]+)/)?.[1]?.slice(0, 10) ?? "" }] : [];
    });
    const body = { channel: decode(xml.match(/<title>([^<]*)/)?.[1] ?? handle), channelId, guessed: !q.startsWith("@"), videos };
    cache.set(key, { at: performance.now(), body });
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Couldn't reach YouTube" }, { status: 502 });
  }
}
