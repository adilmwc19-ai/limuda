import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { ReadingProvider, READING_PREFS_STORAGE_KEY } from "@/context/ReadingContext";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: "variable",
  variable: "--font-frank-ruhl",
  display: "swap",
});

export const metadata: Metadata = {
  title: "לימודא - לימוד תורה יומי",
  description: "פלטפורמה אישית ללימוד תורה יומי בקצב אישי",
};

const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(
  READING_PREFS_STORAGE_KEY
)});if(!raw)return;var p=JSON.parse(raw);var r=document.documentElement;if(p.theme)r.setAttribute("data-theme",p.theme);if(p.fontSize)r.setAttribute("data-font-size",p.fontSize);if(p.fontFamily)r.setAttribute("data-font-family",p.fontFamily);}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`h-full ${heebo.variable} ${frankRuhl.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-zinc-100">
        <ReadingProvider>{children}</ReadingProvider>
      </body>
    </html>
  );
}
