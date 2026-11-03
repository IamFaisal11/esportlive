import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Esportlive handles visitor data, cookies, embedded YouTube videos and Google AdSense advertising.",
};

export default function Privacy() {
  return (
    <Prose title="Privacy Policy">
      <p>Last updated: 3 November 2026</p>
      <p>
        This policy explains what happens to your information when you visit Esportlive. The site has no accounts, no
        comments and no forms that collect personal details.
      </p>
      <h2>Information we collect</h2>
      <p>
        We do not directly collect names, email addresses or other personal data. Like most websites, our hosting provider
        (Vercel) may keep standard server logs, such as IP address, browser type and the pages requested, to run and secure
        the service. If you contact us, we only use your message and address to reply.
      </p>
      <h2>Cookies and advertising</h2>
      <p>
        This site uses Google AdSense to show ads. Google and its partners use cookies and similar technologies to serve ads
        based on your visits to this and other websites, and to measure how ads perform. This may include personalised
        advertising, depending on your region and settings.
      </p>
      <ul>
        <li>
          You can manage or turn off personalised ads in your <a href="https://adssettings.google.com">Google Ads Settings</a>.
        </li>
        <li>
          You can learn how Google uses data from sites that use its services at{" "}
          <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>.
        </li>
        <li>You can also block or delete cookies in your browser settings.</li>
      </ul>
      <h2>Embedded videos</h2>
      <p>
        Recordings and watch parties are played with embedded YouTube players. A video only loads when you press play. When
        it does, YouTube (Google) may set cookies and collect data about your viewing, under{" "}
        <a href="https://policies.google.com/privacy">Google&apos;s Privacy Policy</a>.
      </p>
      <h2>Third-party content and links</h2>
      <p>
        Tournament data is provided by Liquipedia, and pages link to other sites such as Liquipedia, YouTube, Twitch and
        TikTok. We are not responsible for how those sites handle your data, so please read their own policies.
      </p>
      <h2>Changes to this policy</h2>
      <p>We may update this policy from time to time. The date at the top shows when it last changed.</p>
      <h2>Contact</h2>
      <p>
        If you have questions about this policy, please use the <Link href="/contact">contact page</Link>.
      </p>
    </Prose>
  );
}
