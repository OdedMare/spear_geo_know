import type { Metadata, Viewport } from "next";
import AppHeader from "@/components/AppHeader";
import "@/styles/globals.css";

const themeScript = `
(() => {
  const systemTheme = () => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const stored = localStorage.getItem("geo.theme");
    document.documentElement.dataset.theme = stored === "light" || stored === "dark" ? stored : systemTheme();
  } catch {
    document.documentElement.dataset.theme = systemTheme();
  }
})();`;

export const metadata: Metadata = {
  title: "גלובוס — משחקי גיאוגרפיה לצוות",
  description: "אתגר גיאוגרפיה יומי לצוות: חם וקר על הגלובוס, מסלול בין מדינות, דגלים וצלליות.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          דלגו לתוכן הראשי
        </a>
        <AppHeader />
        {children}
        <footer className="app-footer">
          מפות: Natural Earth · נתוני מדינות: mledoze/countries · דגלים: flag-icons
        </footer>
      </body>
    </html>
  );
}
