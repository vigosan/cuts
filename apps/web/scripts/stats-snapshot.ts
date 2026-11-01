import { readFile, writeFile } from "node:fs/promises";
import { recordSnapshot, type Stats, type StatsRelease } from "../stats.ts";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/stats-snapshot.ts <stats.json>");
  process.exit(1);
}

async function readPrevious(): Promise<Stats | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Stats;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function fetchReleases(): Promise<StatsRelease[]> {
  const token = process.env.GITHUB_TOKEN;
  const releases: StatsRelease[] = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/repos/vigosan/cuts-releases/releases?per_page=100&page=${page}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status} ${await response.text()}`);
    const batch = (await response.json()) as StatsRelease[];
    releases.push(...batch);
    if (batch.length < 100) return releases;
  }
}

const today = new Date().toISOString().slice(0, 10);
await writeFile(path, `${JSON.stringify(recordSnapshot(await readPrevious(), await fetchReleases(), today))}\n`);
