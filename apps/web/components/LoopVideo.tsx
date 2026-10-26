"use client";

import { useEffect, useRef } from "react";
import { frame } from "./Screenshot";

type Props = { src: string; poster: string; label: string; width: number; height: number };

function Video({ src, poster, label, width, height, className }: Props & { className: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void video.current?.play().catch(() => {});
  }, []);
  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      aria-label={label}
      width={width}
      height={height}
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
    />
  );
}

export function LoopVideo({ dark, darkPoster, ...props }: Props & { dark: string; darkPoster: string }) {
  return (
    <>
      <Video {...props} className={`${frame} dark:hidden`} />
      <Video {...props} src={dark} poster={darkPoster} className={`${frame} hidden dark:block`} />
    </>
  );
}
