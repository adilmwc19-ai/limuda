import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ReadingProvider, READING_PREFS_STORAGE_KEY } from "@/context/ReadingContext";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const taameyFrank = localFont({
  src: [
    {
      path: "../../public/fonts/TaameyFrankCLM.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/TaameyFrankCLM-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-taamey-frank",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://limuda.vercel.app";
const SITE_TITLE = "לימודא • מרחב לימוד יומי שקט";
const SITE_DESCRIPTION =
  "לימוד יומי ללא רעשי רקע, בקצב שלך: תנ״ך, משנה, גמרא, רמב״ם, תהילים ועוד.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s | לימודא",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "לימודא",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "לימודא",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
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
      className={`h-full ${heebo.variable} ${taameyFrank.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        {/* Legacy iOS Safari still looks for the apple-prefixed tag; Next's
            appleWebApp metadata field only emits mobile-web-app-capable. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Google Translate otherwise rewrites Hebrew numerals/UI glyphs (e.g.
            "Aa" -> "אא") and can mangle adjacent text nodes mid-sentence. */}
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full w-full flex flex-col overflow-x-hidden bg-slate-50 font-sans text-slate-800 dark:bg-slate-900 dark:text-zinc-100">
        <ReadingProvider>{children}</ReadingProvider>
        <PwaUpdatePrompt />
      </body>
    </html>
  );
}
