import type { Content } from "@/content";
import { Download } from "./Download";
import { Page } from "./Page";

export function Home({ c }: { c: Content }) {
  return (
    <Page c={c} current="home">
      <article className="flex flex-col gap-6">
        <h1 className="text-2xl font-medium text-gray-800">{c.home.tagline}</h1>
        <p>{c.home.intro}</p>
        <p className="text-gray-800">
          {c.home.availability} <span className="text-gray-500">· {c.home.version}</span>
        </p>
        <Download home={c.home} />
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
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800">{c.home.timelineTitle}</h2>
        <p>{c.home.timelineText}</p>
        <img
          src={`/screenshots/${c.lang}-timeline.png`}
          alt={c.home.timelineAlt}
          width={2039}
          height={322}
          className="w-full rounded-lg border border-gray-200"
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800">{c.home.framingTitle}</h2>
        <p>{c.home.framingText}</p>
        <img
          src={`/screenshots/${c.lang}-framing.png`}
          alt={c.home.framingAlt}
          width={1600}
          height={1000}
          className="w-full rounded-lg border border-gray-200"
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800">{c.home.darkTitle}</h2>
        <p>{c.home.darkText}</p>
        <img
          src={`/screenshots/${c.lang}-dark.png`}
          alt={c.home.darkAlt}
          width={1600}
          height={1000}
          className="w-full rounded-lg border border-gray-200"
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800">{c.home.privacyTitle}</h2>
        <p>{c.home.privacy}</p>
      </article>
    </Page>
  );
}
