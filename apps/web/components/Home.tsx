import { DARK_SCREENSHOTS, DROPS_VIDEO, type Content } from "@/content";
import { fetchDownloads } from "@/downloads";
import { splitKeys } from "@/keys";
import { Download } from "./Download";
import { LoopVideo } from "./LoopVideo";
import { Page } from "./Page";
import { Screenshot } from "./Screenshot";

function Keys({ text }: { text: string }) {
  return splitKeys(text).map((part, index) =>
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
  );
}

export async function Home({ c }: { c: Content }) {
  const downloads = await fetchDownloads();

  return (
    <Page c={c} current="home">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-medium text-balance text-gray-800 dark:text-gray-100">{c.home.tagline}</h1>
        <p className="max-w-xl text-pretty">{c.home.intro}</p>
        <Download home={c.home} lang={c.lang} downloads={downloads} />
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
          dark={`/screenshots/${c.lang}-${DROPS_VIDEO.darkVideo}`}
          darkPoster={`/screenshots/${c.lang}-${DROPS_VIDEO.darkPoster}`}
          label={c.home.dropsAlt}
          width={1440}
          height={900}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.featuresTitle}</h2>
        <ol className="border-b border-gray-200 dark:border-gray-800">
          {c.home.features.map((group, groupIndex) => (
            <li
              key={group.title}
              data-testid="feature-group"
              className="grid gap-4 border-t border-gray-200 py-6 sm:grid-cols-[11rem_1fr] sm:gap-8 dark:border-gray-800"
            >
              <h3 className="flex items-baseline gap-3 text-gray-800 dark:text-gray-100">
                <span className="text-xs tabular-nums text-gray-400 dark:text-gray-600">{String(groupIndex + 1).padStart(2, "0")}</span>
                <span className="font-medium">{group.title}</span>
              </h3>
              <ul className="flex flex-col gap-3 text-sm leading-relaxed">
                {group.items.map((item, itemIndex) => (
                  <li key={item} className="grid grid-cols-[2.5rem_1fr]">
                    <span className="text-xs leading-6 tabular-nums text-gray-300 dark:text-gray-700">
                      {groupIndex + 1}.{itemIndex + 1}
                    </span>
                    <span>
                      <Keys text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="text-sm">
          <Keys text={c.home.shortcuts} />
        </p>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.timelineTitle}</h2>
        <p>{c.home.timelineText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-timeline.png`}
          dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.timeline}.png`}
          alt={c.home.timelineAlt}
          width={2032}
          height={312}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{c.home.framingTitle}</h2>
        <p>{c.home.framingText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-framing.png`}
          dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.framing}.png`}
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
