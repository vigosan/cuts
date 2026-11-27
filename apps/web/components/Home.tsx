import { AUDIO_VIDEO, DARK_SCREENSHOTS, DROPS_VIDEO, type Content } from "@/content";
import { splitKeys } from "@/keys";
import { fetchStats } from "@/stats";
import { Download } from "./Download";
import { HeroStats } from "./HeroStats";
import { IPhone } from "./IPhone";
import { LoopVideo } from "./LoopVideo";
import { Page } from "./Page";
import { frame, Screenshot } from "./Screenshot";

const heading = "text-lg font-medium text-ink";

const prose = "text-body text-pretty";

function Keys({ text }: { text: string }) {
  return splitKeys(text).map((part, index) =>
    "key" in part ? (
      <kbd
        key={index}
        className="mx-0.5 rounded border border-line px-1.5 py-0.5 text-xs font-medium text-ink"
      >
        {part.key}
      </kbd>
    ) : (
      part.text
    ),
  );
}

export async function Home({ c }: { c: Content }) {
  const stats = await fetchStats();

  return (
    <Page c={c} current="home">
      <section className="flex flex-col gap-6">
        <p className={prose}>{c.home.intro}</p>
        <Download home={c.home} />
        {stats && <HeroStats c={c} stats={stats} />}
        <div>
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
        <p className={prose}>{c.home.dropsText}</p>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.audioTitle}</h2>
        <p className={prose}>{c.home.audioText}</p>
        <div>
          <LoopVideo
            src={`/screenshots/${c.lang}-${AUDIO_VIDEO.video}`}
            poster={`/screenshots/${c.lang}-${AUDIO_VIDEO.poster}`}
            dark={`/screenshots/${c.lang}-${AUDIO_VIDEO.darkVideo}`}
            darkPoster={`/screenshots/${c.lang}-${AUDIO_VIDEO.darkPoster}`}
            label={c.home.audioAlt}
            width={1440}
            height={900}
          />
        </div>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.timelineTitle}</h2>
        <p className={prose}>{c.home.timelineText}</p>
        <div>
          <Screenshot
            src={`/screenshots/${c.lang}-timeline.png`}
            dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.timeline}.png`}
            alt={c.home.timelineAlt}
            width={2144}
            height={314}
          />
        </div>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.framingTitle}</h2>
        <p className={prose}>{c.home.framingText}</p>
        <div>
          <Screenshot
            src={`/screenshots/${c.lang}-framing.png`}
            dark={`/screenshots/${c.lang}-${DARK_SCREENSHOTS.framing}.png`}
            alt={c.home.framingAlt}
            width={1600}
            height={1000}
          />
        </div>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.darkTitle}</h2>
        <p className={prose}>{c.home.darkText}</p>
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
            className={`scroll-wipe absolute inset-0 ${frame}`}
          />
        </div>
      </article>
      <IPhone c={c} />
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.featuresTitle}</h2>
        <ol className="flex flex-col gap-6">
          {c.home.features.map((group, groupIndex) => (
            <li key={group.title} data-testid="feature-group" className="border-l-2 border-line pl-4 hover:border-line-strong sm:pl-6">
              <h3 className="mb-2 flex items-baseline gap-3">
                <span className="text-sm tabular-nums text-faint">{String(groupIndex + 1).padStart(2, "0")}</span>
                <span className="font-medium text-ink">{group.title}</span>
              </h3>
              <ul className="flex flex-col gap-2 text-body">
                {group.items.map((item) => (
                  <li key={item}>
                    <Keys text={item} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          <Keys text={c.home.shortcuts} />
        </p>
      </article>
      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.privacyTitle}</h2>
        <p className="font-medium text-pretty text-ink">{c.home.privacy}</p>
      </article>
      <section data-testid="closing" className="flex flex-col gap-6">
        <h2 className={heading}>{c.home.closingTitle}</h2>
        <Download home={c.home} brew />
      </section>
    </Page>
  );
}
