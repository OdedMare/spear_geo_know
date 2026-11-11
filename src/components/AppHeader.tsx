"use client";

import { Earth, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { useTheme } from "@/hooks/useTheme";
import { GAME_LIST } from "@/lib/games";

export default function AppHeader() {
  const path = usePathname();
  const { theme, toggle } = useTheme();
  const hydrated = useHydrated();

  return (
    <header className="app-header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden>
          <Earth size={20} />
        </span>
        גלובוס
      </Link>
      <nav aria-label="משחקים">
        {GAME_LIST.map((g) => (
          <Link key={g.id} href={g.href} aria-current={path === g.href ? "page" : undefined}>
            {g.title}
          </Link>
        ))}
      </nav>
      <button type="button" className="icon-button" onClick={toggle} aria-label={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
        suppressHydrationWarning>
        {hydrated && theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      </button>
    </header>
  );
}
