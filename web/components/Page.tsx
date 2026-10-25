import Link from "next/link";
import { CONTACT, content, type Content } from "@/content";

export const link = "underline font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1";

type Route = keyof Content["routes"];

export function Page({ c, current, children }: { c: Content; current: Route; children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-12 text-gray-500 dark:text-gray-400 antialiased lg:gap-16 lg:py-16"
      style={{ fontFamily: "monospace" }}
    >
      <header className="flex items-center justify-between">
        <Link
          href={c.routes.home}
          className="flex items-center gap-3 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <img src="/icon.png" alt="" width={36} height={36} />
          <span className="font-medium tracking-wide text-gray-800 dark:text-gray-100">Cuts</span>
        </Link>
        <Link href={content[c.other].routes[current]} hrefLang={c.other} className={link}>
          {c.switchLabel}
        </Link>
      </header>
      <main className="flex flex-1 flex-col gap-8 lg:gap-12">{children}</main>
      <footer className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={c.routes.privacy} className={link}>
          {c.footer.privacy}
        </Link>
        <Link href={c.routes.support} className={link}>
          {c.footer.support}
        </Link>
        <Link href={c.routes.ffmpeg} className={link}>
          {c.footer.ffmpeg}
        </Link>
        <span className="sm:ml-auto">
          {c.footer.by}{" "}
          <a href="https://vicent.io" className={link}>
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
