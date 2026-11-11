import type { Metadata } from "next";
import Profile from "@/components/Profile";

export const metadata: Metadata = { title: "הפרופיל שלי — גלובוס", description: "הכינוי, האווטאר והארון שלי" };

export default function ProfilePage() {
  return <Profile />;
}
