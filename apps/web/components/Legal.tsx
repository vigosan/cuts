import { CONTACT, FFMPEG_FILES, type Content } from "@/content";
import { link, Page, Paragraph } from "./Page";

export function Privacy({ c }: { c: Content }) {
  return (
    <Page c={c} current="privacy">
      <article className="flex flex-col gap-6">
        <h1 className="text-lg font-medium text-ink">{c.privacy.title}</h1>
        <p className="text-sm text-faint">{c.privacy.updated}</p>
        {c.privacy.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-4">
            <h2 className="font-medium text-ink">{section.heading}</h2>
            {section.body.map((text) => (
              <Paragraph key={text} text={text} />
            ))}
          </section>
        ))}
      </article>
    </Page>
  );
}

export function Support({ c }: { c: Content }) {
  return (
    <Page c={c} current="support">
      <article className="flex flex-col gap-6">
        <h1 className="text-lg font-medium text-ink">{c.support.title}</h1>
        {c.support.body.map((text) => (
          <Paragraph key={text} text={text} />
        ))}
        <p>
          <span aria-hidden className="mr-3 text-accent">→</span>
          <a data-testid="support-email" href={`mailto:${CONTACT}`} className={link}>
            {c.support.email}
          </a>
        </p>
      </article>
    </Page>
  );
}

export function Ffmpeg({ c }: { c: Content }) {
  const files = Object.entries(FFMPEG_FILES).map(([key, href]) => ({ href, label: c.ffmpeg.links[key as keyof typeof FFMPEG_FILES] }));
  return (
    <Page c={c} current="ffmpeg">
      <article className="flex flex-col gap-6">
        <h1 className="text-lg font-medium text-ink">{c.ffmpeg.title}</h1>
        {c.ffmpeg.body.map((text) => (
          <Paragraph key={text} text={text} />
        ))}
        <ul className="flex flex-col gap-3">
          {files.map((file) => (
            <li key={file.href} className="border-l-2 border-line pl-4 hover:border-line-strong sm:pl-6">
              <a href={file.href} className={link}>
                {file.label}
              </a>
            </li>
          ))}
        </ul>
      </article>
    </Page>
  );
}
