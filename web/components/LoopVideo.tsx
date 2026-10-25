"use client";

import { useEffect, useRef } from "react";
import { frame } from "./Screenshot";

export function LoopVideo({ src, poster, label, width, height }: { src: string; poster: string; label: string; width: number; height: number }) {
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
      className={frame}
    />
  );
}
