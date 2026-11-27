import type { Content } from "@/content";
import { installsInLast, type Stats, totalInstalls } from "@/stats";
import { link } from "./Page";
import { formatter } from "./Stats";

const SPARK_W = 56;
const SPARK_H = 18;
const SPARK_DAYS = 60;

function Sparkline({ stats }: { stats: Stats }) {
  const installs = stats.days.slice(-SPARK_DAYS).map((d) => d.mac + d.windows);
  const min = installs[0];
  const span = Math.max(installs[installs.length - 1] - min, 1);
  const x = (i: number) => (i / Math.max(installs.length - 1, 1)) * (SPARK_W - 2) + 1;
  const y = (count: number) => SPARK_H - 2 - ((count - min) / span) * (SPARK_H - 4);
  const last = installs.length - 1;

  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} aria-hidden className="flex-none overflow-visible text-gray-800 dark:text-gray-100">
      <polyline points={installs.map((count, i) => `${x(i)},${y(count)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(installs[last])} r={2} fill="currentColor" />
    </svg>
  );
}

export function HeroStats({ c, stats }: { c: Content; stats: Stats }) {
  const format = formatter(c.lang);
  const total = totalInstalls(stats);
  const week = installsInLast(stats.days, 7);
  const label = new Intl.PluralRules(c.lang).select(total) === "one" ? c.home.downloads.one : c.home.downloads.other;

  return (
    <p
      data-testid="hero-stats"
      className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-gray-200 px-3.5 py-1.5 text-[0.8125rem] text-gray-500 dark:border-gray-800 dark:text-gray-400"
    >
      <Sparkline stats={stats} />
      <span>
        <b data-testid="hero-stats-total" className="font-semibold tabular-nums text-gray-900 dark:text-gray-50">
          {format.number(total)}
        </b>{" "}
        {label}
        {week > 0 && (
          <>
            {" · "}
            <span data-testid="hero-stats-week" className="tabular-nums text-gray-900 dark:text-gray-50">
              +{format.number(week)}
            </span>{" "}
            {c.stats.lastWeek}
          </>
        )}
      </span>
      <a data-testid="hero-stats-link" href={c.routes.stats} className={`${link} -my-1.5 inline-block py-1.5`}>
        {c.footer.stats} →
      </a>
    </p>
  );
}
