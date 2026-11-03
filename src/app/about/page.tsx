import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "About",
  description: "About Esportlive, an independent fan site for BGMI and PUBG Mobile esports tournaments, standings, teams and players.",
};

export default function About() {
  return (
    <Prose title="About Esportlive">
      <p>
        Esportlive is an independent fan project that brings BGMI and PUBG Mobile esports into one place: every tournament,
        its points table, the teams and players, and where to watch. It is built to feel like a live scoreboard for mobile
        battle royale.
      </p>
      <h2>What you can find here</h2>
      <ul>
        <li>Tournaments from S-tier and A-tier events, with dates, prize pools, locations and status (upcoming, live or finished)</li>
        <li>Team standings with placement points, eliminations, chicken dinners and per-map breakdowns</li>
        <li>Player rankings and statistics, plus team pages with rosters, roster changes and past results</li>
        <li>Where to watch: official broadcast channels by language, recordings, and watch parties found on YouTube</li>
      </ul>
      <h2>Where the data comes from</h2>
      <p>
        Tournament data comes from <a href="https://liquipedia.net/pubgmobile">Liquipedia</a>, the community-edited esports
        wiki, and is used under the CC-BY-SA 3.0 licence. Videos and watch parties come from YouTube. Because Liquipedia is
        edited by volunteers, results usually appear a few minutes after a match rather than instantly, and a small
        team may not have a page there at all.
      </p>
      <p>
        Spotted something wrong? The fix belongs on Liquipedia itself, and it will show up here the next time the page
        refreshes. For anything about this site, use the <Link href="/contact">contact page</Link>.
      </p>
      <h2>Independence</h2>
      <p>
        Esportlive is not affiliated with, endorsed by or sponsored by Krafton, Tencent, Liquipedia or YouTube. All team,
        player and tournament names and logos belong to their respective owners.
      </p>
    </Prose>
  );
}
