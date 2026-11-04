import type { Lang } from "./content";

export function formatDownloads(count: number, lang: Lang, label: { one: string; other: string }): string {
  const plural = new Intl.PluralRules(lang).select(count) === "one" ? label.one : label.other;
  return `${count.toLocaleString(lang)} ${plural}`;
}
