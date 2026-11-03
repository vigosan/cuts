import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Download } from "./components/Download";
import { APP_STORE, content } from "./content";

const render = (brew: boolean) => renderToStaticMarkup(<Download home={content.es.home} lang="es" downloads={null} brew={brew} />);

describe("download", () => {
  it("offers the Mac App Store next to the hero download too, not only at the foot of the page", () => {
    expect(render(false)).toContain(`data-testid="app-store" href="${APP_STORE}"`);
  });

  it("keeps the Homebrew command for the foot of the page", () => {
    expect(render(false)).not.toContain('data-testid="brew"');
    expect(render(true)).toContain('data-testid="brew"');
  });
});
