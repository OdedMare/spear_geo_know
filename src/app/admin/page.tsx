import type { Metadata } from "next";
import Admin from "@/components/Admin";

export const metadata: Metadata = { title: "ניהול פרסים — גלובוס", robots: { index: false } };

export default function AdminPage() {
  return <Admin />;
}
