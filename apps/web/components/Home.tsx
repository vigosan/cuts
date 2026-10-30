import { DARK_SCREENSHOTS, DROPS_VIDEO, type Content } from "@/content";
import { fetchDownloads } from "@/downloads";
import { splitKeys } from "@/keys";
import { Download } from "./Download";
import { LoopVideo } from "./LoopVideo";
import { Page } from "./Page";
import { frame, Screenshot } from "./Screenshot";

const heading = "text-2xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-50";

function Keys({ text }: { text: string }) {
  return splitKeys(text).map((part, index) =>
    "key" in part ? (
      <kbd
        key={index}
        className="mx-0.5 rounded-md border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
      <div aria-hidden className="scroll-playhead">
        <div className="scroll-playhead-head" />
      </div>
      <section className="flex flex-col items-center gap-6 pt-4 text-center lg:pt-10">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl dark:text-gray-50">
          {c.home.tagline}
        </h1>
        <p className="max-w-xl text-lg text-pretty">{c.home.intro}</p>
        <Download home={c.home} lang={c.lang} downloads={downloads} />
        <div className="scroll-straighten mt-6 w-full">
          <LoopVideo
            src={`/screenshots/${c.lang}-${DROPS_VIDEO.video}`}
            poster={`/screenshots/${c.lang}-${DROPS_VIDEO.poster}`}
            dark={`/screenshots/${c.lang}-${DROPS_VIDEO.darkVideo}`}
            darkPoster={`/screenshots/${c.lang}-${DROPS_VIDEO.darkPoster}`}
            label={c.home.dropsAlt}
            width={1440}
            height={900}
          />
        </div>
      </section>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.dropsTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.home.dropsText}</p>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.featuresTitle}</h2>
        <ol className="border-b border-gray-200 dark:border-gray-800">
          {c.home.features.map((group, groupIndex) => (
            <li
              key={group.title}
              data-testid="feature-group"
              className="scroll-track grid gap-4 border-t border-gray-200 py-6 sm:grid-cols-[11rem_1fr] sm:gap-8 dark:border-gray-800"
            >
              <h3 className="flex items-baseline gap-3 text-gray-800 dark:text-gray-100">
                <span className="scroll-track-number font-mono text-xs tabular-nums text-gray-400 dark:text-gray-600">{String(groupIndex + 1).padStart(2, "0")}</span>
                <span className="font-medium">{group.title}</span>
              </h3>
              <ul className="flex flex-col gap-3 leading-relaxed">
                {group.items.map((item, itemIndex) => (
                  <li key={item} className="grid grid-cols-[2.5rem_1fr]">
                    <span className="font-mono text-xs leading-7 tabular-nums text-gray-300 dark:text-gray-700">
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
        <p className="text-sm text-gray-500">
          <Keys text={c.home.shortcuts} />
        </p>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.timelineTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.home.timelineText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-timeline.png`}
          dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.timeline}.png`}
          alt={c.home.timelineAlt}
          width={2032}
          height={312}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.framingTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.home.framingText}</p>
        <Screenshot
          src={`/screenshots/${c.lang}-framing.png`}
          dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.framing}.png`}
          alt={c.home.framingAlt}
          width={1600}
          height={1000}
        />
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.darkTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.home.darkText}</p>
        <div className="relative">
          <img
            src={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.dark}.png`}
            alt=""
            width={1600}
            height={1000}
            loading="lazy"
            className={frame}
          />
          <img
            src={`/screenshots/${c.lang}-dark.png`}
            alt={c.home.darkAlt}
            width={1600}
            height={1000}
            loading="lazy"
            className="scroll-wipe absolute inset-0 w-full rounded-xl"
          />
        </div>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.privacyTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.home.privacy}</p>
      </article>
      <section data-testid="closing" className="flex flex-col items-center gap-6 border-t border-gray-200 pt-16 text-center dark:border-gray-800">
        <h2 className={heading}>{c.home.closingTitle}</h2>
        <Download home={c.home} lang={c.lang} downloads={downloads} brew />
      </section>
    </Page>
  );
}
