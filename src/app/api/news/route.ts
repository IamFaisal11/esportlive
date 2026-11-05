import { NextResponse } from "next/server";
import { getNews, type NewsGame } from "@/lib/news";

export const maxDuration = 30; // a cold request runs several searches and reads each story's preview

// News as JSON. Building it takes a few seconds, so the page loads it after it has rendered, and the CDN keeps one shared
// copy for every visitor (fresh for 15 minutes, then served stale while it refreshes in the background).
export async function GET(req: Request) {
  const g = new URL(req.url).searchParams.get("game");
  const game: NewsGame = g === "bgmi" || g === "pubgm" ? g : "all";
  try {
    const items = await getNews(game);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "Couldn't load the news" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
