import type { ReactNode } from "react";

// Small shared pieces so every page has the same headings, loading states and stat tiles.
export const panel = "rounded-xl border border-white/10 bg-white/[0.03]";

export function SectionTitle({ id, children, sub }: { id?: string; children: ReactNode; sub?: string }) {
  return (
    <div id={id} className="mb-5 mt-14 flex items-end justify-between gap-4 first:mt-0">
      <h2 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-wide sm:text-3xl">
        <span className="h-6 w-1 rounded-full bg-orange-500" />
        {children}
      </h2>
      {sub && <p className="hidden text-sm text-zinc-500 sm:block">{sub}</p>}
    </div>
  );
}

export function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-orange-400">{children}</h3>;
}

export function Loading({ label }: { label: string }) {
  return (
    <div className={`${panel} animate-pulse space-y-3 p-5`} aria-busy="true">
      <div className="text-sm text-zinc-500">Loading {label}…</div>
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-4 rounded bg-white/10" style={{ width: `${95 - i * 12}%` }} />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="mb-4 h-4 w-32 rounded bg-white/10" />
      <div className="mb-8 h-44 rounded-2xl border border-white/10 bg-white/[0.04]" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-5 rounded bg-white/10" style={{ width: `${100 - i * 10}%` }} />)}
      </div>
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-bold ${accent ? "text-orange-400" : ""}`}>{value}</dd>
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-white/10 text-zinc-300",
    green: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    red: "bg-red-500/15 text-red-400 ring-1 ring-red-500/40",
    blue: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}
