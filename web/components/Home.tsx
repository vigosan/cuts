import type { Content } from "@/content";
import { Page } from "./Page";

export function Home({ c }: { c: Content }) {
  return (
    <Page c={c} current="home">
      <article className="flex flex-col gap-6">
        <img src="/icon.png" alt="" width={96} height={96} />
        <h1 className="text-2xl font-medium text-gray-800">{c.home.tagline}</h1>
        <p>{c.home.intro}</p>
        <p className="text-gray-800">{c.home.availability}</p>
      </article>
      <img
        src={`/screenshots/${c.lang}-overview.png`}
        alt={c.home.screenshotAlt}
        width={2880}
        height={1800}
        className="w-full rounded-lg border border-gray-200"
      />
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800">{c.home.featuresTitle}</h2>
        <ul className="flex flex-col gap-3">
          {c.home.features.map((feature) => (
            <li key={feature} className="border-l-2 border-gray-300 pl-4 hover:border-gray-500 sm:pl-6">
              {feature}
            </li>
          ))}
        </ul>
      </article>
      <img
        src={`/screenshots/${c.lang}-zoom.png`}
        alt={c.home.zoomAlt}
        width={2880}
        height={1800}
        className="w-full rounded-lg border border-gray-200"
      />
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800">{c.home.privacyTitle}</h2>
        <p>{c.home.privacy}</p>
      </article>
    </Page>
  );
}
