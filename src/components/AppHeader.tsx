"use client";

import { Earth, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { useTheme } from "@/hooks/useTheme";
import { GAME_LIST } from "@/lib/games";

const NAV = [
  { href: "/", title: "משחקים" },
  { href: "/leaderboard", title: "טבלת הצוות" },
];

export default function AppHeader() {
  const path = usePathname();
  const { theme, toggle } = useTheme();
  const hydrated = useHydrated();
  const current = GAME_LIST.find((g) => path.replace(/\/$/, "") === g.href);

  return (
    <header className="app-header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden>
          <Earth size={20} />
        </span>
        גלובוס
      </Link>
      <nav aria-label="ניווט">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={(path.replace(/\/$/, "") || "/") === n.href ? "page" : undefined}>
            {n.title}
          </Link>
        ))}
        {current && <span className="nav-current">{current.title}</span>}
      </nav>
      <button type="button" className="icon-button" onClick={toggle} aria-label={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
        suppressHydrationWarning>
        {hydrated && theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      </button>
    </header>
  );
}
