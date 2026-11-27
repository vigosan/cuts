"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import type { Content } from "@/content";
import { analyticsCookieRemovals, consentCookie, consentRemoval, readConsent, type Consent } from "@/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const button =
  "link cursor-pointer border border-line px-3 py-1.5 font-medium text-ink";

export function Analytics({ labels }: { labels: Content["consent"] }) {
  const [consent, setConsent] = useState<Consent | "ask" | null>(null);
  useEffect(() => setConsent(readConsent(document.cookie) ?? "ask"), []);

  if (!GA_ID) return null;
  if (consent === "granted") return <GoogleAnalytics gaId={GA_ID} />;
  if (consent !== "ask") return null;

  const answer = (choice: Consent) => {
    document.cookie = consentCookie(choice);
    setConsent(choice);
  };

  return (
    <div
      data-testid="consent-banner"
      role="dialog"
      aria-label={labels.text}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 border border-line bg-canvas p-4 text-sm text-body antialiased sm:flex-row sm:items-center"
    >
      <p className="flex-1">{labels.text}</p>
      <div className="flex gap-2">
        <button type="button" data-testid="consent-decline" onClick={() => answer("denied")} className={button}>
          {labels.decline}
        </button>
        <button type="button" data-testid="consent-accept" onClick={() => answer("granted")} className={button}>
          {labels.accept}
        </button>
      </div>
    </div>
  );
}

export function CookieSettings({ label, className }: { label: string; className: string }) {
  if (!GA_ID) return null;

  const reset = () => {
    for (const removal of analyticsCookieRemovals(document.cookie, location.hostname)) document.cookie = removal;
    document.cookie = consentRemoval();
    location.reload();
  };

  return (
    <button type="button" data-testid="cookie-settings" onClick={reset} className={`${className} cursor-pointer`}>
      {label}
    </button>
  );
}
