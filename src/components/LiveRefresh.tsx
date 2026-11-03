"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// While a tournament is running, re-render the page's server data on an interval (only while the tab is visible).
export function LiveRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [checked, setChecked] = useState<string>();

  useEffect(() => {
    const stamp = () => setChecked(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    stamp();
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      stamp();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300" role="status">
      <span className="size-1.5 animate-pulse rounded-full bg-red-400" />
      Live · refreshes every {seconds}s{checked && <span className="text-red-300/70">· last checked {checked}</span>}
    </p>
  );
}
