import { DARK_SCREENSHOTS, DROPS_VIDEO, type Content } from "@/content";
import { splitKeys } from "@/keys";
import { Download } from "./Download";
import { LoopVideo } from "./LoopVideo";
import { Page } from "./Page";
import { Screenshot } from "./Screenshot";

export function Home({ c }: { c: Content }) {
  return (
    <Page c={c} current="home">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-medium text-balance text-gray-800 dark:text-gray-100">{c.home.tagline}</h1>
        <p className="max-w-xl text-pretty">{c.home.intro}</p>
        <Download home={c.home} />
      </section>
      <Screenshot
        src={`/screenshots/${c.lang}-overview.png`}
        dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.overview}.png`}
        alt={c.home.screenshotAlt}
        width={2880}
        height={1800}
      />
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.dropsTitle}</h2>
        <p>{c.home.dropsText}</p>
        <LoopVideo
          src={`/screenshots/${c.lang}-${DROPS_VIDEO.video}`}
          poster={`/screenshots/${c.lang}-${DROPS_VIDEO.poster}`}
          label={c.home.dropsAlt}
          width={1440}
          height={900}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.featuresTitle}</h2>
        <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {c.home.features.map((feature) => (
            <li key={feature} className="border-l-2 border-gray-300 dark:border-gray-700 pl-4 hover:border-gray-500 dark:hover:border-gray-400">
              {splitKeys(feature).map((part, index) =>
                "key" in part ? (
                  <kbd
                    key={index}
                    className="mx-0.5 rounded-md border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    {part.key}
                  </kbd>
                ) : (
                  part.text
                ),
              )}
            </li>
          ))}
        </ul>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.timelineTitle}</h2>
        <p>{c.home.timelineText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-timeline.png`}
          alt={c.home.timelineAlt}
          width={2039}
          height={322}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.framingTitle}</h2>
        <p>{c.home.framingText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-framing.png`}
          alt={c.home.framingAlt}
          width={1600}
          height={1000}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.darkTitle}</h2>
        <p>{c.home.darkText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-dark.png`}
          dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.dark}.png`}
          alt={c.home.darkAlt}
          width={1600}
          height={1000}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.privacyTitle}</h2>
        <p>{c.home.privacy}</p>
      </article>
    </Page>
  );
}
