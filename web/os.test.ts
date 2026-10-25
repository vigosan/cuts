import { describe, expect, it } from "vitest";
import { detectOS } from "./os";

describe("detectOS", () => {
  it("offers the Mac build to Safari, Chrome and Firefox on macOS, including Apple Silicon Macs that report Intel", () => {
    expect(detectOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")).toBe("mac");
    expect(detectOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe("mac");
  });

  it("offers the Windows installer on Windows", () => {
    expect(detectOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")).toBe("windows");
  });

  it("offers the AppImage on desktop Linux", () => {
    expect(detectOS("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")).toBe("linux");
    expect(detectOS("Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe("linux");
  });

  it("offers nothing to phones and tablets, which would download a file they cannot run", () => {
    expect(detectOS("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36")).toBeNull();
    expect(detectOS("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBeNull();
    expect(detectOS("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBeNull();
  });
});
