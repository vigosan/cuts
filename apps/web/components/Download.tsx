"use client";

import { useEffect, useState } from "react";
import { BREW, DOWNLOADS, type Content, type Lang } from "@/content";
import { formatDownloads } from "@/downloads";
import { detectOS, type OS } from "@/os";
import { link } from "./Page";

const PLATFORMS: OS[] = ["mac", "windows", "linux"];

const base =
  "inline-flex items-center gap-3 rounded-lg px-5 py-2.5 font-medium transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-950";
const button = `${base} bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white`;
const outline = `${base} border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-500 dark:hover:border-gray-400`;

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" />
    </svg>
  );
}

export function Download({ home, lang, downloads }: { home: Content["home"]; lang: Lang; downloads: number | null }) {
  const [os, setOs] = useState<OS | null>(null);
  useEffect(() => setOs(detectOS(navigator.userAgent)), []);

  const meta = [home.free, home.version, downloads !== null && formatDownloads(downloads, lang, home.downloads)]
    .filter(Boolean)
    .join(" · ");

  if (!os) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-3">
          {PLATFORMS.map((platform) => (
            <a key={platform} href={DOWNLOADS[platform]} className={outline}>
              <ArrowDown />
              {home.platforms[platform]}
            </a>
          ))}
        </div>
        <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{meta}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <a data-testid="download" href={DOWNLOADS[os]} className={button}>
        <ArrowDown />
        {home.download[os]}
      </a>
      <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
        {meta} · {home.requirements[os]}
      </p>
      <p className="text-sm">
        {home.download.also}{" "}
        {PLATFORMS.filter((platform) => platform !== os).map((platform, index) => (
          <span key={platform}>
            {index > 0 && " · "}
            <a href={DOWNLOADS[platform]} className={link}>
              {home.platforms[platform]}
            </a>
          </span>
        ))}
      </p>
      {os === "mac" && (
        <p className="text-sm">
          {home.brew}{" "}
          <code data-testid="brew" className="select-all rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800 dark:bg-neutral-800 dark:text-gray-200">
            {BREW}
          </code>
        </p>
      )}
    </div>
  );
}
