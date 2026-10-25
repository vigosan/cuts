"use client";

import { useEffect, useState } from "react";
import { DOWNLOADS, type Content } from "@/content";
import { detectOS, type OS } from "@/os";
import { link } from "./Page";

const PLATFORMS: OS[] = ["mac", "windows", "linux"];

export function Download({ home }: { home: Content["home"] }) {
  const [os, setOs] = useState<OS | null>(null);
  useEffect(() => setOs(detectOS(navigator.userAgent)), []);

  if (!os) {
    return (
      <p className="flex flex-wrap gap-x-4 gap-y-2">
        {PLATFORMS.map((platform) => (
          <a key={platform} href={DOWNLOADS[platform]} className={link}>
            {home.download[platform]}
          </a>
        ))}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <a
        data-testid="download"
        href={DOWNLOADS[os]}
        className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        {home.download[os]}
      </a>
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
    </div>
  );
}
