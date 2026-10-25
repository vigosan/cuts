export type OS = "mac" | "windows" | "linux";

export function detectOS(userAgent: string): OS | null {
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return null;
  if (/Windows/i.test(userAgent)) return "windows";
  if (/Mac/i.test(userAgent)) return "mac";
  if (/Linux|X11/i.test(userAgent)) return "linux";
  return null;
}
