import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Support } from "./components/Legal";
import { CONTACT, content } from "./content";

describe("support", () => {
  it("offers a button to write to support, since writing is the one thing people come to this page to do", () => {
    const html = renderToStaticMarkup(<Support c={content.es} />);
    expect(html).toContain(`data-testid="support-email" href="mailto:${CONTACT}"`);
    expect(html).toContain(content.es.support.email);
  });
});
