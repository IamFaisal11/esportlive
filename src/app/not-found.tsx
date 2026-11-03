import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-24 text-center">
      <p className="font-[family-name:var(--font-display)] text-7xl font-bold text-orange-500">404</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-zinc-400">The team, player or tournament may not exist on Liquipedia under that name.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400">Back to tournaments</Link>
    </div>
  );
}
