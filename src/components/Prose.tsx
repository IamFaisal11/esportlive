import Link from "next/link";
import type { ReactNode } from "react";

// Shared frame for the plain text pages (About, Privacy Policy, Contact).
export function Prose({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-orange-400">← All tournaments</Link>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-zinc-300 [&_a]:text-orange-400 [&_a]:underline [&_a:hover]:text-orange-300 [&_h2]:mb-1 [&_h2]:mt-10 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
