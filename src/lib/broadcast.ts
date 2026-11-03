// Parses an event page's {{Streams ...}} block (official channels per language) and its VODs table.
export type Platform = "youtube" | "twitch" | "facebook" | "tiktok" | "kick" | "vk" | "huya" | "stream";
export type Channel = { platform: Platform; name: string; href: string; direct: boolean };
export type Broadcast = { lang: string; channels: Channel[] };
export type Vod = { language: string; links: { url: string; label: string }[] };

const PLATFORMS: Platform[] = ["youtube", "twitch", "facebook", "tiktok", "kick", "vk", "huya", "stream"];
const q = encodeURIComponent;

// Direct channel link when the value is a real handle; otherwise a search for the channel name.
function channel(platform: Platform, raw: string): Channel {
  const name = raw.trim();
  const slug = name.replace(/^@/, "");
  const simple = /^@?[\w.-]+$/.test(name);
  const at = name.startsWith("@");
  const [href, direct] =
    platform === "stream" ? [name, /^https?:\/\//.test(name)]
    : platform === "youtube" ? (at ? [`https://www.youtube.com/${name}`, true] : [`https://www.youtube.com/results?search_query=${q(name)}`, false])
    : platform === "tiktok" ? (at ? [`https://www.tiktok.com/${name}`, true] : [`https://www.tiktok.com/search?q=${q(name)}`, false])
    : platform === "twitch" ? (simple ? [`https://www.twitch.tv/${slug}`, true] : [`https://www.twitch.tv/search?term=${q(name)}`, false])
    : platform === "facebook" ? (simple ? [`https://www.facebook.com/${slug}`, true] : [`https://www.facebook.com/search/top?q=${q(name)}`, false])
    : platform === "kick" ? [`https://kick.com/${slug}`, true]
    : platform === "vk" ? [`https://vk.com/${slug}`, true]
    : [`https://www.huya.com/${slug}`, true];
  return { platform, name, href, direct };
}

export const LANGUAGES: Record<string, string> = {
  usuk: "English", in: "India (Hindi)", kr: "Korean", jp: "Japanese", my: "Malaysia", id: "Indonesia", th: "Thailand", vn: "Vietnam",
  ph: "Philippines", bd: "Bangladesh", pk: "Pakistan", ru: "Russian", kz: "Kazakhstan", uz: "Uzbekistan", mn: "Mongolia", np: "Nepal",
  mena: "Arabic (MENA)", "arab states": "Arabic", ptbr: "Portuguese (Brazil)", esmx: "Spanish (LATAM)", es: "Spanish", tr: "Turkey", cn: "Chinese",
  tw: "Taiwan", fr: "French", de: "German", pl: "Polish",
};

export function parseStreams(wikitext: string): Broadcast[] {
  const start = wikitext.indexOf("{{Streams");
  if (start < 0) return [];
  const block = wikitext.slice(start).split(/\n\}\}/)[0];
  const byNumber = new Map<string, { lang?: string; channels: Channel[] }>();
  // |youtube3=@handle  |2facebook5=Alt name  |lang3=kr   (a leading digit marks a secondary channel)
  for (const m of block.matchAll(/\|\d?([a-z ]+?)(\d+)=([^|\n}]+)/g)) {
    const [, key, num, value] = m;
    const entry = byNumber.get(num) ?? { channels: [] };
    if (key === "lang") entry.lang = value.trim();
    else if ((PLATFORMS as string[]).includes(key) && value.trim()) entry.channels.push(channel(key as Platform, value));
    byNumber.set(num, entry);
  }
  return [...byNumber.entries()]
    .sort((a, b) => +a[0] - +b[0])
    .filter(([, e]) => e.channels.length)
    .map(([, e]) => ({ lang: e.lang ?? "", channels: e.channels }));
}

// "===VODs===" wikitable: header cells are languages, each body cell is a bullet list of [url label] links.
export function parseVods(wikitext: string): Vod[] {
  const section = wikitext.split(/\n===\s*VODs\s*===/)[1]?.split(/\n==/)[0];
  if (!section) return [];
  const headers = [...section.matchAll(/^!\s*(.+)$/gm)].map((m) => m[1].replace(/\{\{[^}]*\}\}/g, "").trim());
  const cells = section.slice(section.indexOf("|-")).split(/\n\|(?![-}])/).slice(1);
  const out = new Map<string, Vod>();
  cells.forEach((cell, i) => {
    const language = headers[i % Math.max(headers.length, 1)] || "Recording";
    const links = [...cell.matchAll(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g)].map((m) => ({ url: m[1], label: m[2].trim() }));
    if (!links.length) return;
    const v = out.get(language) ?? { language, links: [] };
    v.links.push(...links);
    out.set(language, v);
  });
  return [...out.values()];
}
