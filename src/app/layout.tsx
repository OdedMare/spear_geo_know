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
        {/* A plain <link> rather than next/font, as in PakashAgent: an image
            built without network falls back to system faces instead of failing. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Hebrew:wght@400;500;600;700&display=swap"
        />
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
