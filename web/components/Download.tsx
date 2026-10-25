"use client";

import { useEffect, useState } from "react";
import { DOWNLOADS, type Content } from "@/content";
import { detectOS, type OS } from "@/os";
import { link } from "./Page";

const PLATFORMS: OS[] = ["mac", "windows", "linux"];

const base =
  "inline-flex items-center gap-3 rounded-lg px-4 py-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";
const button = `${base} bg-gray-800 text-white hover:bg-gray-700`;
const outline = `${base} border border-gray-300 text-gray-800 hover:border-gray-500`;

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" />
    </svg>
  );
}

export function Download({ home }: { home: Content["home"] }) {
  const [os, setOs] = useState<OS | null>(null);
  useEffect(() => setOs(detectOS(navigator.userAgent)), []);

  const meta = (
    <span>
      {home.version} · {home.free}
    </span>
  );

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
        <p className="text-sm">{meta}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <a data-testid="download" href={DOWNLOADS[os]} className={button}>
        <ArrowDown />
        {home.download[os]}
      </a>
      <p className="text-xs text-gray-400">{home.requirements[os]}</p>
      <p className="text-sm">
        {meta} · {home.download.also}{" "}
        {PLATFORMS.filter((platform) => platform !== os).map((platform, index) => (
          <span key={platform}>
            {index > 0 && " · "}
            <a href={DOWNLOADS[platform]} className={link}>
              {home.platforms[platform]}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
