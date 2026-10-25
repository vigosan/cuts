export type ThemeChoice = "system" | "light" | "dark";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];

export function nextChoice(choice: ThemeChoice): ThemeChoice {
  return ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
}

export const THEME_SCRIPT = `(function () {
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function stored() {
    try { return window.localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function applyTheme() {
    var choice = stored();
    if (choice !== "light" && choice !== "dark") choice = "system";
    var root = window.document.documentElement;
    root.dataset.choice = choice;
    root.dataset.theme = choice === "system" ? (media.matches ? "dark" : "light") : choice;
  }
  window.applyTheme = applyTheme;
  media.addEventListener("change", applyTheme);
  applyTheme();
})();`;
