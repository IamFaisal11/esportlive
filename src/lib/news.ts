// Headlines from Google News' public RSS search feed. Only the headline, publisher, date and a link out are used;
// the articles belong to their publishers.
export type NewsItem = { title: string; url: string; source: string; date: string };
export type NewsGame = "all" | "bgmi" | "pubgm";

const QUERIES: Record<NewsGame, string> = {
  all: '("BGMI" OR "PUBG Mobile") esports',
  bgmi: '"BGMI" esports',
  pubgm: '"PUBG Mobile" esports',
};

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

export async function getNews(game: NewsGame): Promise<NewsItem[]> {
  const q = `${QUERIES[game]} when:30d`;
  const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`News feed ${res.status}`);
  const xml = await res.text();

  const seen = new Set<string>();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .flatMap((m) => {
      const tag = (name: string) => decode(m[1].match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");
      const source = tag("source");
      // Google appends " - Publisher" to every headline; the publisher is shown separately.
      const title = tag("title").replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
      const url = tag("link");
      const time = Date.parse(tag("pubDate"));
      if (!title || !url || Number.isNaN(time) || seen.has(title.toLowerCase())) return [];
      seen.add(title.toLowerCase());
      return [{ title, url, source, date: new Date(time).toISOString() }];
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);
}
