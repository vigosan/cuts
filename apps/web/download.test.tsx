import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Download } from "./components/Download";
import { IPhone } from "./components/IPhone";
import { APP_STORE, content, IPHONE_SCREENSHOTS } from "./content";

const render = (brew: boolean) => renderToStaticMarkup(<Download home={content.es.home} lang="es" downloads={null} brew={brew} />);

describe("download", () => {
  it("offers the Mac App Store next to the hero download too, not only at the foot of the page", () => {
    expect(render(false)).toContain(`data-testid="app-store" href="${APP_STORE}"`);
  });

  it("keeps the Homebrew command for the foot of the page", () => {
    expect(render(false)).not.toContain('data-testid="brew"');
    expect(render(true)).toContain('data-testid="brew"');
  });

  it("says Also once, with the other platforms, the iPhone and the Mac App Store on one line", () => {
    const html = render(false);
    expect(html.split(content.es.home.download.also).length - 1).toBe(1);
    expect(html).toContain('data-testid="iphone-link" href="#iphone"');
  });

  it("the iPhone section says the App Store link is coming, since Apple has not approved it yet", () => {
    const html = renderToStaticMarkup(<IPhone c={content.es} />);
    expect(html).toContain('id="iphone"');
    expect(html).toContain(content.es.home.iphone.soon);
    expect(html.match(/<img /g)).toHaveLength(IPHONE_SCREENSHOTS.length);
  });
});
