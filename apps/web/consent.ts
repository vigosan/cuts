export type Consent = "granted" | "denied";

const CONSENT_COOKIE = "consent";

function cookies(cookie: string): [string, string][] {
  return cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...value] = part.split("=");
      return [name, value.join("=")];
    });
}

export function readConsent(cookie: string): Consent | undefined {
  const value = cookies(cookie).find(([name]) => name === CONSENT_COOKIE)?.[1];
  return value === "granted" || value === "denied" ? value : undefined;
}

export function consentCookie(consent: Consent): string {
  return `${CONSENT_COOKIE}=${consent}; path=/; max-age=15552000; samesite=lax`;
}

export function consentRemoval(): string {
  return `${CONSENT_COOKIE}=; path=/; max-age=0`;
}

export function analyticsCookieRemovals(cookie: string, hostname: string): string[] {
  const labels = hostname.split(".");
  const domains = labels.slice(1, -1).map((_, i) => `; domain=.${labels.slice(i + 1).join(".")}`);
  return cookies(cookie)
    .map(([name]) => name)
    .filter((name) => name.startsWith("_ga"))
    .flatMap((name) => ["", ...domains].map((domain) => `${name}=; path=/; max-age=0${domain}`));
}
