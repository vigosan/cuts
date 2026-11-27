"use client";

import { useEffect, useState } from "react";
import { APP_STORE, BREW, DOWNLOADS, type Content } from "@/content";
import { detectOS, isIPhone, type OS } from "@/os";
import { link } from "./Page";

const PLATFORMS: OS[] = ["mac", "windows", "linux"];

const highlight = "flex flex-col gap-2 border-l-2 border-accent pl-4 sm:pl-6";

const primary = `${link} text-ink`;

function Arrow() {
  return (
    <span aria-hidden className="mr-3 text-accent">
      →
    </span>
  );
}

export function Meta({ items }: { items: string[] }) {
  return (
    <p className="flex flex-wrap gap-x-4 text-sm text-faint">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
}

export function PhoneDownload({ home }: { home: Content["home"] }) {
  return (
    <div className={highlight}>
      <p>
        <Arrow />
        <a data-testid="download" href={APP_STORE} className={primary}>
          {home.iphone.download}
        </a>
      </p>
      <Meta items={[home.free, home.version, home.iphone.requirements]} />
    </div>
  );
}

export function Download({ home, brew = false }: { home: Content["home"]; brew?: boolean }) {
  const [detected, setDetected] = useState<OS | null | undefined>(undefined);
  const [iphone, setIPhone] = useState(false);
  useEffect(() => {
    setDetected(detectOS(navigator.userAgent));
    setIPhone(isIPhone(navigator.userAgent));
  }, []);
  const os = detected === undefined ? "mac" : detected;

  const meta = [home.free, home.version];

  if (iphone) return <PhoneDownload home={home} />;

  if (!os) {
    return (
      <div className={highlight}>
        <ul className="flex flex-col gap-1">
          {PLATFORMS.map((platform) => (
            <li key={platform}>
              <Arrow />
              <a href={DOWNLOADS[platform]} className={primary}>
                {home.platforms[platform]}
              </a>
            </li>
          ))}
        </ul>
        <Meta items={meta} />
      </div>
    );
  }

  return (
    <div className={`${highlight} transition-opacity duration-200 ease-out ${detected === undefined ? "opacity-0" : ""}`}>
      <p>
        <Arrow />
        <a data-testid="download" href={DOWNLOADS[os]} className={primary}>
          {home.download[os]}
        </a>
      </p>
      <Meta items={[...meta, home.requirements[os]]} />
      <p className="text-sm">
        {home.download.also}{" "}
        {PLATFORMS.filter((platform) => platform !== os).map((platform) => (
          <span key={platform}>
            <a href={DOWNLOADS[platform]} className={link}>
              {home.platforms[platform]}
            </a>
            {" · "}
          </span>
        ))}
        <a data-testid="iphone-link" href={APP_STORE} className={link}>
          {home.iphone.link}
        </a>
        {os === "mac" && (
          <>
            {" · "}
            <a data-testid="app-store" href={APP_STORE} className={link}>
              {home.appStore.link}
            </a>
          </>
        )}
      </p>
      {brew && os === "mac" && (
        <p className="text-sm">
          {home.brew}{" "}
          <code data-testid="brew" className="select-all rounded bg-wash px-1.5 py-0.5 text-xs text-ink">
            {BREW}
          </code>
        </p>
      )}
    </div>
  );
}
