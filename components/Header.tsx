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
    <header className="sticky top-0 z-30 border-b border-line bg-white/75 backdrop-blur-md supports-[backdrop-filter]:bg-white/65">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
        <Link href="/pipeline" className="flex shrink-0 items-center gap-2.5 text-foreground no-underline">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-[12px] font-semibold tracking-tight text-white"
          >
            KC
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Kitchen Corp</span>
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
                  "rounded-full px-3 py-1 text-sm no-underline transition-colors " +
                  (active
                    ? "bg-foreground text-white"
                    : "text-muted hover:bg-fill hover:text-foreground")
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <span
          className="ml-auto inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted"
          title="All figures shown are fictional sample data"
        >
          Sample data
        </span>
      </div>
    </header>
  );
}
