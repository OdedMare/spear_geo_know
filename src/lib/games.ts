import { Flag, Flame, Route, Shapes, type LucideIcon } from "lucide-react";
import type { GameId } from "./storage";

export interface GameMeta {
  id: GameId;
  href: string;
  title: string;
  tagline: string;
  emoji: string;
  icon: LucideIcon;
  color: string;
  tint: string;
  rules: string[];
}

export const GAMES: Record<GameId, GameMeta> = {
  hotcold: {
    id: "hotcold",
    href: "/hot-cold",
    title: "חם וקר",
    tagline: "מצאו את המדינה הסודית על הגלובוס",
    emoji: "🌍",
    icon: Flame,
    color: "var(--hue-pink)",
    tint: "var(--hue-pink-soft)",
    rules: [
      "בכל יום מסתתרת על הגלובוס מדינה אחת.",
      "נחשו מדינה כלשהי — היא תיצבע לפי המרחק מהמדינה הסודית: ככל שהיא חמה ואדומה יותר, אתם קרובים יותר.",
      "המרחק נמדד בין הגבולות. מדינה שגובלת במדינה הסודית מסומנת כ״גובלת״.",
      "אין הגבלת ניחושים — נסו למצוא אותה בכמה שפחות.",
      "גררו כדי לסובב את הגלובוס, צבטו או גללו כדי להתקרב, והקישו על מדינה צבועה כדי לראות את שמה.",
    ],
  },
  route: {
    id: "route",
    href: "/route",
    title: "מסלול",
    tagline: "הדרך הקצרה ביותר בין שתי מדינות",
    emoji: "🧭",
    icon: Route,
    color: "var(--hue-teal)",
    tint: "var(--hue-teal-soft)",
    rules: [
      "קיבלתם מדינת מוצא ומדינת יעד. מצאו מסלול יבשתי ביניהן — רק דרך גבולות משותפים.",
      "נחשו את המדינות שבדרך. ירוק: על אחד המסלולים הקצרים ביותר. כתום: עיקוף קטן. אדום: רחוק מהמסלול.",
      "המשחק נגמר כשהמדינות שניחשתם מחברות את המוצא ליעד.",
      "יש לכם כמה ניחושים מעבר למינימום. רמז מסמן על הגלובוס את המדינה הבאה במסלול, בלי השם שלה.",
    ],
  },
  flags: {
    id: "flags",
    href: "/flags",
    title: "דגלים",
    tagline: "עשרה דגלים, ארבע אפשרויות",
    emoji: "🚩",
    icon: Flag,
    color: "var(--hue-violet)",
    tint: "var(--hue-violet-soft)",
    rules: [
      "עשרה סבבים. בחלק תראו דגל ותבחרו את המדינה, ובחלק תראו מדינה ותבחרו את הדגל שלה.",
      "האפשרויות השגויות הן לרוב מאותה יבשת — שימו לב לפרטים.",
      "7 תשובות נכונות ומעלה נחשבות הצלחה ברצף היומי.",
    ],
  },
  shape: {
    id: "shape",
    href: "/shape",
    title: "צללית",
    tagline: "זהו את המדינה לפי צורת הגבולות שלה",
    emoji: "🔷",
    icon: Shapes,
    color: "var(--hue-blue)",
    tint: "var(--hue-blue-soft)",
    rules: [
      "לפניכם קווי המתאר של מדינה. יש לכם שישה ניחושים.",
      "אחרי כל ניחוש תקבלו את המרחק בין מרכזי המדינות, את הכיוון אל המדינה הנכונה ואחוז קרבה.",
      "אחרי שלושה ניחושים שגויים תקבלו רמז: היבשת.",
    ],
  },
};

export const GAME_LIST = [GAMES.hotcold, GAMES.route, GAMES.flags, GAMES.shape];
