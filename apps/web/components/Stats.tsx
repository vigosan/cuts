import type { Content, Lang } from "@/content";
import { type Day, fetchStats, installsInLast, lastTwelveMonths, type Stats as StatsData, weeklyMacInstalls } from "@/stats";
import { Page } from "./Page";

const heading = "text-2xl font-semibold tracking-tight text-balance text-gray-900 dark:text-gray-50";
const axis = "fill-gray-400 font-mono text-[22px] sm:text-[11px] dark:fill-gray-500";
const grid = "stroke-gray-200 dark:stroke-gray-800";

const W = 720;
const LEFT = 52;
const RIGHT = 12;
const TOP = 12;
const BOTTOM = 36;

function niceMax(value: number): number {
  const step = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((n) => n * 4 >= value) ?? step * 10;
  return nice * 4;
}

const ticks = (max: number) => [0, 1, 2, 3, 4].map((i) => (max / 4) * i);

function formatter(lang: Lang) {
  const number = new Intl.NumberFormat(lang, { useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
  return {
    number: (n: number) => number.format(n),
    month: (date: string) => new Date(date).toLocaleDateString(lang, { month: "short", timeZone: "UTC" }),
    day: (date: string) => new Date(date).toLocaleDateString(lang, { day: "numeric", month: "long", timeZone: "UTC" }),
  };
}

type Format = ReturnType<typeof formatter>;

function monthStarts(from: string, to: string): string[] {
  const starts: string[] = [];
  const d = new Date(from);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.toISOString().slice(0, 10) <= to) {
    starts.push(d.toISOString().slice(0, 10));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return starts;
}

function Grid({ max, y, format }: { max: number; y: (v: number) => number; format: Format }) {
  return ticks(max).map((v) => (
    <g key={v}>
      <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} className={grid} />
      <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" className={axis}>
        {format.number(v)}
      </text>
    </g>
  ));
}

function CumulativeChart({ days, label, format }: { days: Day[]; label: string; format: Format }) {
  const H = 260;
  const first = Date.parse(days[0].date);
  const span = Math.max(Date.parse(days[days.length - 1].date) - first, 1);
  const max = niceMax(days[days.length - 1].mac);
  const x = (date: string) => LEFT + ((Date.parse(date) - first) / span) * (W - LEFT - RIGHT);
  const y = (v: number) => TOP + (1 - v / max) * (H - TOP - BOTTOM);
  const points = (list: Day[]) => list.map((d) => `${x(d.date)},${y(d.mac)}`).join(" ");
  const split = days.findIndex((d) => !d.estimated);
  const estimated = split === -1 ? days : days.slice(0, split + 1);
  const measured = split === -1 ? [] : days.slice(split);
  const last = days[days.length - 1];
  const slot = (W - LEFT - RIGHT) / Math.max(days.length - 1, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={label}>
      <Grid max={max} y={y} format={format} />
      {monthStarts(days[0].date, last.date).map((m) => (
        <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className={axis}>
          {format.month(m)}
        </text>
      ))}
      <polygon points={`${x(days[0].date)},${y(0)} ${points(days)} ${x(last.date)},${y(0)}`} className="fill-gray-800 opacity-10 dark:fill-gray-100" />
      <polyline points={points(estimated)} fill="none" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" className="stroke-gray-800 dark:stroke-gray-100" />
      {measured.length > 1 && (
        <polyline points={points(measured)} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-gray-800 dark:stroke-gray-100" />
      )}
      <circle cx={x(last.date)} cy={y(last.mac)} r={4} className="fill-accent" />
      {days.map((d) => (
        <rect key={d.date} x={x(d.date) - slot / 2} y={TOP} width={slot} height={H - TOP - BOTTOM} fill="transparent">
          <title>{`${format.day(d.date)}: ${format.number(d.mac)}`}</title>
        </rect>
      ))}
    </svg>
  );
}

function WeeklyChart({ days, label, format }: { days: Day[]; label: string; format: Format }) {
  const H = 180;
  const weeks = weeklyMacInstalls(days);
  const max = niceMax(Math.max(...weeks.map((w) => w.count)));
  const band = (W - LEFT - RIGHT) / weeks.length;
  const y = (v: number) => TOP + (1 - v / max) * (H - TOP - BOTTOM);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={label}>
      <Grid max={max} y={y} format={format} />
      {weeks.map((w, i) => (
        <g key={w.week}>
          <rect x={LEFT + i * band + band * 0.15} y={y(w.count)} width={band * 0.7} height={y(0) - y(w.count)} rx={2} className="fill-gray-800 dark:fill-gray-100" />
          <rect x={LEFT + i * band} y={TOP} width={band} height={H - TOP - BOTTOM} fill="transparent">
            <title>{`${format.day(w.week)}: +${format.number(w.count)}`}</title>
          </rect>
          {(i === 0 || w.week.slice(0, 7) !== weeks[i - 1].week.slice(0, 7)) && (
            <text x={LEFT + i * band + band / 2} y={H - 6} textAnchor="middle" className={axis}>
              {format.month(w.week)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Figure({ value, label, testid }: { value: string; label: string; testid: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-gray-200 pt-3 dark:border-gray-800">
      <span data-testid={testid} className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
        {value}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function StatsView({ c, stats }: { c: Content; stats: StatsData }) {
  const format = formatter(c.lang);
  const days = stats.days;
  const latest = days[days.length - 1];
  const measuredSince = days.find((d) => !d.estimated)?.date ?? latest.date;
  const maxUpdates = Math.max(...stats.macUpdates.map((u) => u.count), 1);

  return (
    <>
      <section className="flex flex-col gap-3">
        <p data-testid="stats-total" className="text-6xl font-semibold tracking-tight tabular-nums text-gray-900 sm:text-7xl dark:text-gray-50">
          {format.number(latest.mac + latest.windows + latest.linux)}
        </p>
        <p>{c.stats.total.replace("{date}", format.day(days[0].date))}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Figure value={format.number(latest.mac)} label={c.stats.mac} testid="stats-mac" />
          <Figure value={format.number(latest.windows)} label={c.stats.windows} testid="stats-windows" />
          <Figure value={format.number(latest.linux)} label={c.stats.linux} testid="stats-linux" />
        </div>
      </section>

      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.stats.macTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.stats.macText}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>
            <b className="font-mono text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">+{format.number(installsInLast(days, 7))}</b> {c.stats.lastWeek}
          </span>
          <span>
            <b className="font-mono text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">+{format.number(installsInLast(days, 30))}</b> {c.stats.lastMonth}
          </span>
        </div>
        <CumulativeChart days={lastTwelveMonths(days)} label={c.stats.chartLabel} format={format} />
        <p className="text-xs text-gray-500">{c.stats.estimated}</p>
      </article>

      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.stats.weeklyTitle}</h2>
        <WeeklyChart days={days} label={c.stats.weeklyTitle} format={format} />
      </article>

      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.stats.updatesTitle}</h2>
        <p className="max-w-2xl text-pretty">{c.stats.updatesText}</p>
        <ul className="flex flex-col gap-2.5">
          {stats.macUpdates.map((u) => (
            <li key={u.version} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="font-mono text-xs text-gray-800 dark:text-gray-100">{u.version}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <span className="block h-full rounded-full bg-gray-800 dark:bg-gray-100" style={{ width: `${(u.count / maxUpdates) * 100}%` }} />
              </span>
              <span className="text-right font-mono tabular-nums">{format.number(u.count)}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="flex flex-col gap-6">
        <h2 className={heading}>{c.stats.howTitle}</h2>
        <ul className="flex flex-col gap-3 leading-relaxed">
          {[...c.stats.how, c.stats.measuredSince.replace("{date}", format.day(measuredSince))].map((item, index) => (
            <li key={item} className="sm:grid sm:grid-cols-[2.5rem_1fr]">
              <span className="hidden font-mono text-xs leading-7 tabular-nums text-gray-400 sm:inline dark:text-gray-600">{String(index + 1).padStart(2, "0")}</span>
              <span data-testid={index === c.stats.how.length ? "stats-measured-since" : undefined}>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}

export async function Stats({ c }: { c: Content }) {
  const stats = await fetchStats();

  return (
    <Page c={c} current="stats">
      <section className="flex flex-col gap-5">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl dark:text-gray-50">{c.stats.title}</h1>
        <p className="max-w-xl text-lg text-pretty">{c.stats.lede}</p>
      </section>
      {stats ? <StatsView c={c} stats={stats} /> : <p data-testid="stats-error">{c.stats.error}</p>}
    </Page>
  );
}
