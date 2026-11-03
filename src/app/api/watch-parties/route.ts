import { NextResponse } from "next/server";
import { findWatchParties } from "@/lib/youtube";

// Watch parties of one event, as JSON. The page loads this after it has rendered, so YouTube's slow search never holds
// the page up, and the Cache-Control header lets the CDN keep one shared copy for every visitor.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const name = (p.get("name") ?? "").trim().slice(0, 150);
  const abbr = (p.get("abbr") ?? "").trim().slice(0, 20) || undefined;
  const year = /^20\d\d$/.test(p.get("year") ?? "") ? p.get("year")! : undefined;
  const live = p.get("live") === "1";
  if (name.length < 3) return NextResponse.json({ error: "Missing event name" }, { status: 400 });

  try {
    const videos = await findWatchParties({ name, abbr, year }, live);
    // Running events refresh every minute; finished ones can sit in the CDN for ten.
    const cache = live ? "public, s-maxage=60, stale-while-revalidate=300" : "public, s-maxage=600, stale-while-revalidate=3600";
    return NextResponse.json({ videos }, { headers: { "Cache-Control": cache } });
  } catch {
    return NextResponse.json({ error: "Couldn't reach YouTube" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
