import { describe, expect, it } from "vitest";
import { analyticsCookieRemovals, consentCookie, consentRemoval, readConsent } from "./consent";

describe("readConsent", () => {
  it("asks first-time visitors, so analytics never load before they answer", () => {
    expect(readConsent("")).toBeUndefined();
    expect(readConsent("lang=es")).toBeUndefined();
  });

  it("remembers the answer the visitor gave, so the banner does not come back on every page", () => {
    expect(readConsent("lang=es; consent=granted")).toBe("granted");
    expect(readConsent("consent=denied; lang=en")).toBe("denied");
  });

  it("treats a tampered value as no answer instead of as consent", () => {
    expect(readConsent("consent=yes")).toBeUndefined();
  });
});

describe("consentCookie", () => {
  it("keeps the answer for six months on every page, then asks again as the guidelines on consent expect", () => {
    expect(consentCookie("granted")).toBe("consent=granted; path=/; max-age=15552000; samesite=lax");
  });
});

describe("consentRemoval", () => {
  it("forgets the answer, so the banner asks again when the visitor wants to change it", () => {
    expect(readConsent(consentRemoval().split(";")[0])).toBeUndefined();
    expect(consentRemoval()).toBe("consent=; path=/; max-age=0");
  });
});

describe("analyticsCookieRemovals", () => {
  it("expires every Google Analytics cookie on the host and its parent domain, where gtag stores them, so withdrawing consent stops the tracking", () => {
    expect(analyticsCookieRemovals("lang=es; _ga=GA1.1.1; _ga_EDF4JMR8P1=GS1.1; consent=granted", "cuts.vicent.io")).toEqual([
      "_ga=; path=/; max-age=0",
      "_ga=; path=/; max-age=0; domain=.vicent.io",
      "_ga_EDF4JMR8P1=; path=/; max-age=0",
      "_ga_EDF4JMR8P1=; path=/; max-age=0; domain=.vicent.io",
    ]);
  });

  it("removes them from the host itself when there is no parent domain, as on localhost", () => {
    expect(analyticsCookieRemovals("_ga=GA1.1.1", "localhost")).toEqual(["_ga=; path=/; max-age=0"]);
  });

  it("leaves the visitor's other cookies alone", () => {
    expect(analyticsCookieRemovals("lang=es; consent=granted", "cuts.vicent.io")).toEqual([]);
  });
});
