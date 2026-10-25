export type Part = { text: string } | { key: string };

export function splitKeys(text: string): Part[] {
  return text
    .split(/\[([^\]]+)\]/)
    .map((part, index): Part => (index % 2 === 1 ? { key: part } : { text: part }))
    .filter((part) => !("text" in part) || part.text !== "");
}
