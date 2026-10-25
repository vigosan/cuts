import { describe, expect, it } from "vitest";
import { content, LANGS } from "./content";
import { splitKeys } from "./keys";

describe("splitKeys", () => {
  it("separates the keys written in brackets, so the shortcuts render as keycaps", () => {
    expect(splitKeys("Mark with [I] and [O], play with [Space].")).toEqual([
      { text: "Mark with " },
      { key: "I" },
      { text: " and " },
      { key: "O" },
      { text: ", play with " },
      { key: "Space" },
      { text: "." },
    ]);
  });

  it("leaves no stray bracket in any feature, so a typo never shows up on the page", () => {
    for (const lang of LANGS) {
      for (const feature of content[lang].home.features) {
        expect(splitKeys(feature).some((part) => "text" in part && /[[\]]/.test(part.text)), feature).toBe(false);
      }
    }
  });
});
