import type { Metadata } from "next";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about Esportlive: feedback, bugs, data corrections or business enquiries.",
};

export default function Contact() {
  return (
    <Prose title="Contact">
      <p>Questions, feedback or a bug to report? Here is how to reach us:</p>
      <ul>
        <li>
          GitHub: open an issue or message on <a href="https://github.com/IamFaisal11/esportlive">github.com/IamFaisal11/esportlive</a>
        </li>
      </ul>
      <h2>Data corrections</h2>
      <p>
        Tournament results, rosters and team details come from <a href="https://liquipedia.net/pubgmobile">Liquipedia</a>.
        If a result or roster looks wrong, the best place to correct it is Liquipedia itself, and the fix will appear here
        on the next refresh.
      </p>
      <p>We usually reply within a few days.</p>
    </Prose>
  );
}
