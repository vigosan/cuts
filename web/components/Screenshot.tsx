export function Screenshot({ src, dark, alt, width, height }: { src: string; dark?: string; alt: string; width: number; height: number }) {
  return (
    <picture>
      {dark && <source srcSet={dark} media="(prefers-color-scheme: dark)" />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full rounded-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] dark:ring-white/10"
      />
    </picture>
  );
}
