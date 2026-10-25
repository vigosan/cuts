import { DOWNLOADS, type Lang } from "./content";

type Release = { assets: { name: string; download_count: number }[] };

const INSTALLERS = new Set(Object.values(DOWNLOADS).map((url) => url.split("/").pop()));

export function totalDownloads(releases: Release[]): number {
  return releases
    .flatMap((release) => release.assets)
    .filter((asset) => INSTALLERS.has(asset.name))
    .reduce((sum, asset) => sum + asset.download_count, 0);
}

export function formatDownloads(count: number, lang: Lang, label: { one: string; other: string }): string {
  const plural = new Intl.PluralRules(lang).select(count) === "one" ? label.one : label.other;
  return `${count.toLocaleString(lang)} ${plural}`;
}

export async function fetchDownloads(): Promise<number | null> {
  try {
    const response = await fetch("https://api.github.com/repos/vigosan/cuts-releases/releases?per_page=100", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return totalDownloads(await response.json());
  } catch {
    return null;
  }
}
