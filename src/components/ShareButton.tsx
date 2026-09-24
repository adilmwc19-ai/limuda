"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { HEADER_ICON_BUTTON_CLASS } from "@/components/studyHeaderStyles";

/**
 * Quiet native-share button, styled to match the Aa button in the sticky
 * study header. Uses the Web Share API when available; otherwise copies the
 * current page URL to the clipboard and shows a brief inline confirmation.
 */
interface ShareButtonProps {
  className?: string;
}

export default function ShareButton({ className = HEADER_ICON_BUTTON_CLASS }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleShare() {
    if (typeof window === "undefined") return;

    const shareData: ShareData = {
      title: document.title || "לימודא",
      text: "לימוד יומי בלימודא",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url ?? window.location.href);
      setCopied(true);
    } catch {
      // clipboard unavailable — nothing to do
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        title="שיתוף"
        aria-label="שיתוף"
        className={className}
      >
        <Share2 className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
      </button>

      {copied && (
        <div
          role="status"
          className="absolute end-0 top-full z-30 mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
        >
          הקישור הועתק
        </div>
      )}
    </div>
  );
}
