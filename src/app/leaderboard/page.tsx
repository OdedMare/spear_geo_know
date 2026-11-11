import type { Metadata } from "next";
import Leaderboard from "@/components/Leaderboard";

export const metadata: Metadata = { title: "טבלת הצוות — גלובוס", description: "מי מוביל היום ומי אלוף השבוע" };

export default function LeaderboardPage() {
  return <Leaderboard />;
}
