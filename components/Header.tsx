"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/verdicts", label: "Verdicts" },
  { href: "/plan", label: "Plan" },
  { href: "/brief", label: "Brief" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-header text-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-8">
        <Link href="/pipeline" className="flex items-center gap-3 shrink-0">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded bg-white text-header font-semibold tracking-tight"
          >
            KC
          </span>
          <span className="font-semibold tracking-tight">Kitchen Corp</span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "px-3 py-1.5 rounded text-sm transition-colors " +
                  (active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/5")
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <span
          className="ml-auto inline-flex items-center rounded-full border border-white/25 px-2.5 py-0.5 text-xs text-white/80"
          title="All figures shown are fictional sample data"
        >
          Sample data
        </span>
      </div>
    </header>
  );
}
