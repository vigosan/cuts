import { APP_STORE, IPHONE_SCREENSHOTS, type Content } from "@/content";
import { Meta } from "./Download";

const phone =
  "w-full rounded-[1.75rem] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-24px_rgba(15,23,42,0.25)] ring-1 ring-black/5 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_48px_-24px_rgba(0,0,0,0.7)] dark:ring-white/10";

export function IPhone({ c }: { c: Content }) {
  const { iphone } = c.home;
  return (
    <article id="iphone" className="flex scroll-mt-24 flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-50">{iphone.title}</h2>
      <p className="max-w-2xl text-pretty">{iphone.text}</p>
      <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:-mx-12">
        {IPHONE_SCREENSHOTS.map((name) => (
          <img
            key={name}
            src={`/screenshots/${c.lang}-iphone-${name}.png`}
            alt={iphone.alts[name]}
            width={660}
            height={1434}
            loading="lazy"
            className={phone}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        <a
          data-testid="iphone-app-store"
          href={APP_STORE}
          className="rounded-[0.6rem] transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
        ><img src={`/badges/app-store-${c.lang}.svg`} alt={iphone.download} width={132} height={44} /></a>
        <Meta items={[c.home.free, iphone.requirements]} />
      </div>
    </article>
  );
}
