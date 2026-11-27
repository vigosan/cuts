import { APP_STORE, IPHONE_SCREENSHOTS, type Content } from "@/content";
import { Meta } from "./Download";

const phone = "w-full rounded-[1.75rem] border border-line";

export function IPhone({ c }: { c: Content }) {
  const { iphone } = c.home;
  return (
    <article id="iphone" className="flex scroll-mt-24 flex-col gap-6">
      <h2 className="text-lg font-medium text-ink">{iphone.title}</h2>
      <p className="text-body text-pretty">{iphone.text}</p>
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
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
      <div className="flex flex-col items-start gap-2">
        <a
          data-testid="iphone-app-store"
          href={APP_STORE}
          className="link -m-1 p-1"
        ><img src={`/badges/app-store-${c.lang}.svg`} alt={iphone.download} width={132} height={44} /></a>
        <Meta items={[c.home.free, iphone.requirements]} />
      </div>
    </article>
  );
}
