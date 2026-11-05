import type { Metadata } from "next";
import Link from "next/link";
import { Rajdhani, Inter } from "next/font/google";
import "./globals.css";

const display = Rajdhani({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Esportlive", template: "%s · Esportlive" },
  description: "BGMI and PUBG Mobile esports tournaments, standings, teams and players",
  other: {
    "google-adsense-account": "ca-pub-7470745732799601",
  },
};

// A signal / crosshair style mark in the accent colour.
const Logo = () => (
  <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden>
    <rect width="24" height="24" rx="6" className="fill-orange-500" />
    <circle cx="12" cy="12" r="4.5" stroke="#09090b" strokeWidth="2" />
    <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <head>
        <meta name="google-adsense-account" content="ca-pub-7470745732799601" />
        {/* Google AdSense: the publisher script (also used to verify the site) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7470745732799601"
          crossOrigin="anonymous"
        />
      </head>
      <body className="relative min-h-full bg-[#09090b] font-[family-name:var(--font-body)] text-zinc-100">
        {/* Soft accent glow plus a faint grid that fades out down the page */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] [background-image:radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(249,115,22,0.20),transparent),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-2xl font-bold tracking-wide">
              <Logo />
              <span>ESPORT<span className="text-orange-500">LIVE</span></span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
              <nav aria-label="Main" className="flex items-center gap-4 text-sm text-zinc-400 sm:gap-6">
                <Link href="/" className="transition hover:text-white">Tournaments</Link>
                <Link href="/rankings" className="transition hover:text-white">Rankings</Link>
                <Link href="/news" className="transition hover:text-white">News</Link>
              </nav>
              <form action="/search" role="search" className="relative hidden md:block">
                <input
                  name="q"
                  type="search"
                  required
                  minLength={2}
                  aria-label="Search tournaments, teams and players"
                  placeholder="Search teams, players, events…"
                  className="w-52 rounded-full border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-500 focus:border-orange-500 lg:w-72"
                />
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </form>
              <Link href="/search" aria-label="Search" className="text-zinc-400 transition hover:text-white md:hidden">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </Link>
            </div>
          </div>
        </header>

        <main className="fade-up mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-white/5">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p>
                Data from <a className="text-zinc-400 underline hover:text-orange-400" href="https://liquipedia.net/pubgmobile">Liquipedia</a> (CC-BY-SA 3.0).
              </p>
              <p>Esportlive is an independent fan project, not affiliated with Krafton or Tencent.</p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
              <Link href="/about" className="transition hover:text-white">About</Link>
              <Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link>
              <Link href="/contact" className="transition hover:text-white">Contact</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
