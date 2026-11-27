import Link from "next/link";
import { CONTACT, content, REPO, type Content } from "@/content";
import { CookieSettings } from "./Analytics";
import { LangSwitch } from "./LangSwitch";
import { ThemeToggle } from "./ThemeToggle";

const focus = "rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400";

export const link = `${focus} font-medium text-gray-900 underline-offset-4 hover:underline dark:text-gray-100`;

const quiet = `${focus} transition-colors duration-150 hover:text-gray-900 dark:hover:text-gray-100`;

export const base =
  "inline-flex items-center gap-3 rounded-lg px-5 py-2.5 font-medium transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950";
export const button = `${base} bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white`;

type Route = keyof Content["routes"];

export function Page({ c, current, children }: { c: Content; current: Route; children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-10 px-6 py-12 font-sans text-gray-600 dark:text-gray-400 antialiased lg:gap-16 lg:py-16"
    >
      <header className="flex items-center justify-between">
        <Link
          href={c.routes.home}
          className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
        >
          <img src="/icon.png" alt="" width={36} height={36} />
          <span className="font-semibold text-gray-900 dark:text-gray-50">Cuts</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle labels={c.theme} />
          <LangSwitch lang={c.other} href={content[c.other].routes[current]} className={quiet}>
            {c.switchLabel}
          </LangSwitch>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-20 lg:gap-28">{children}</main>
      <footer className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={c.routes.privacy} className={quiet}>
          {c.footer.privacy}
        </Link>
        <Link href={c.routes.support} className={quiet}>
          {c.footer.support}
        </Link>
        <Link href={c.routes.ffmpeg} className={quiet}>
          {c.footer.ffmpeg}
        </Link>
        <Link href={c.routes.stats} className={quiet}>
          {c.footer.stats}
        </Link>
        <CookieSettings label={c.footer.cookies} className={quiet} />
        <a href={REPO} className={quiet}>
          {c.footer.github}
        </a>
        <span className="sm:ml-auto">
          {c.footer.by}{" "}
          <a href="https://vicent.io" className={quiet}>
            Vicent Gozalbes
          </a>
        </span>
      </footer>
    </div>
  );
}

export function Paragraph({ text }: { text: string }) {
  const [before, after] = text.split(CONTACT);
  if (after === undefined) return <p>{text}</p>;
  return (
    <p>
      {before}
      <a href={`mailto:${CONTACT}`} className={link}>
        {CONTACT}
      </a>
      {after}
    </p>
  );
}
