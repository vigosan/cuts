import type { Content } from "@/content";
import { link, Page, Paragraph } from "./Page";

export function Privacy({ c }: { c: Content }) {
  return (
    <Page c={c} current="privacy">
      <article className="flex flex-col gap-6">
        <h1 className="text-2xl font-medium text-gray-800">{c.privacy.title}</h1>
        <p className="text-sm text-gray-400">{c.privacy.updated}</p>
        {c.privacy.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-gray-800">{section.heading}</h2>
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
        <h1 className="text-2xl font-medium text-gray-800">{c.support.title}</h1>
        {c.support.body.map((text) => (
          <Paragraph key={text} text={text} />
        ))}
      </article>
    </Page>
  );
}

export function Ffmpeg({ c }: { c: Content }) {
  const files = [
    { href: "/ffmpeg/ffmpeg-9.0.2.tar.xz", label: c.ffmpeg.links.source },
    { href: "/ffmpeg/BUILD-FFmpeg.txt", label: c.ffmpeg.links.build },
    { href: "/ffmpeg/LICENSE-FFmpeg.txt", label: c.ffmpeg.links.license },
  ];
  return (
    <Page c={c} current="ffmpeg">
      <article className="flex flex-col gap-6">
        <h1 className="text-2xl font-medium text-gray-800">{c.ffmpeg.title}</h1>
        {c.ffmpeg.body.map((text) => (
          <Paragraph key={text} text={text} />
        ))}
        <ul className="flex flex-col gap-3">
          {files.map((file) => (
            <li key={file.href} className="border-l-2 border-gray-300 pl-4 hover:border-gray-500 sm:pl-6">
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
