import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "לימודא - לימוד תורה יומי",
  description: "פלטפורמה אישית ללימוד תורה יומי בקצב אישי",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
