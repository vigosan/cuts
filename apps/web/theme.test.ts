import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { nextChoice, THEME_SCRIPT } from "./theme";

function browser(stored: string | null, systemDark: boolean) {
  const listeners: (() => void)[] = [];
  const media = { matches: systemDark, addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
  const storage = new Map(stored ? [["theme", stored]] : []);
  const root = { dataset: {} as Record<string, string> };
  const window: Record<string, unknown> = {
    localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) },
    matchMedia: () => media,
    document: { documentElement: root },
  };
  window.window = window;
  runInNewContext(THEME_SCRIPT, window);
  return {
    theme: () => root.dataset.theme,
    choice: () => root.dataset.choice,
    choose: (choice: string) => {
      storage.set("theme", choice);
      (window.applyTheme as () => void)();
    },
    systemChangesTo: (dark: boolean) => {
      media.matches = dark;
      listeners.forEach((fn) => fn());
    },
  };
}

describe("theme script", () => {
  it("follows the system when the visitor never chose, so a dark Mac gets the dark page on the first visit", () => {
    expect(browser(null, true).theme()).toBe("dark");
    expect(browser(null, false).theme()).toBe("light");
    expect(browser(null, true).choice()).toBe("system");
  });

  it("keeps the visitor's choice over the system, so a light page stays light on a dark Mac", () => {
    expect(browser("light", true).theme()).toBe("light");
    expect(browser("dark", false).theme()).toBe("dark");
  });

  it("switches live when the system changes, but only while following the system", () => {
    const following = browser("system", false);
    following.systemChangesTo(true);
    expect(following.theme()).toBe("dark");
    const chosen = browser("light", false);
    chosen.systemChangesTo(true);
    expect(chosen.theme()).toBe("light");
  });

  it("applies a new choice at once when the button is pressed", () => {
    const page = browser(null, false);
    page.choose("dark");
    expect(page.theme()).toBe("dark");
    expect(page.choice()).toBe("dark");
  });

  it("still renders when storage is blocked, as in some private windows", () => {
    const window: Record<string, unknown> = {
      localStorage: { getItem: () => { throw new Error("blocked"); } },
      matchMedia: () => ({ matches: true, addEventListener: () => {} }),
      document: { documentElement: { dataset: {} } },
    };
    window.window = window;
    expect(() => runInNewContext(THEME_SCRIPT, window)).not.toThrow();
    expect((window.document as { documentElement: { dataset: Record<string, string> } }).documentElement.dataset.theme).toBe("dark");
  });
});

describe("nextChoice", () => {
  it("cycles system, light and dark with one button", () => {
    expect(nextChoice("system")).toBe("light");
    expect(nextChoice("light")).toBe("dark");
    expect(nextChoice("dark")).toBe("system");
  });
});
