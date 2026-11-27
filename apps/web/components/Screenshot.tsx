export const frame = "w-full border border-line";

export function Screenshot({ src, dark, alt, width, height }: { src: string; dark?: string; alt: string; width: number; height: number }) {
  if (!dark) return <img src={src} alt={alt} width={width} height={height} loading="lazy" className={frame} />;
  return (
    <>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" className={`${frame} dark:hidden`} />
      <img src={dark} alt={alt} width={width} height={height} loading="lazy" className={`${frame} hidden dark:block`} />
    </>
  );
}
