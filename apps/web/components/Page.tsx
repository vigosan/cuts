import Link from "next/link";
import { CONTACT, content, REPO, type Content } from "@/content";
import { CookieSettings } from "./Analytics";
import { LangSwitch } from "./LangSwitch";
import { ThemeToggle } from "./ThemeToggle";

export const link = "link px-1 font-medium underline";

const quiet = "link px-1 underline";

type Route = keyof Content["routes"];

export function Page({ c, current, children }: { c: Content; current: Route; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-6 py-12 text-muted antialiased lg:gap-24 lg:px-24 lg:py-16">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col">
          <Link href={c.routes.home} className="link self-start">
            <span className="font-medium text-ink">Cuts</span>
          </Link>
          {current === "home" ? <h1>{c.home.tagline}</h1> : <span>{c.home.tagline}</span>}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle labels={c.theme} />
          <LangSwitch lang={c.other} href={content[c.other].routes[current]} className={quiet}>
            {c.switchLabel}
          </LangSwitch>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-8 lg:gap-12">{children}</main>
      <footer className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
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
  if (after === undefined) return <p className="text-body">{text}</p>;
  return (
    <p className="text-body">
      {before}
      <a href={`mailto:${CONTACT}`} className={link}>
        {CONTACT}
      </a>
      {after}
    </p>
  );
}
