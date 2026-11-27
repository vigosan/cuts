export const frame =
  "w-full rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-24px_rgba(15,23,42,0.25)] ring-1 ring-black/5 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_48px_-24px_rgba(0,0,0,0.7)] dark:ring-white/10";

export function Screenshot({ src, dark, alt, width, height }: { src: string; dark?: string; alt: string; width: number; height: number }) {
  if (!dark) return <img src={src} alt={alt} width={width} height={height} loading="lazy" className={frame} />;
  return (
    <>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" className={`${frame} dark:hidden`} />
      <img src={dark} alt={alt} width={width} height={height} loading="lazy" className={`${frame} hidden dark:block`} />
    </>
  );
}
