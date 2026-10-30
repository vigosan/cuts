"use client";

import { useEffect, useState } from "react";
import { nextChoice, type ThemeChoice } from "@/theme";

const icons: Record<ThemeChoice, React.ReactNode> = {
  system: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
};

export function ThemeToggle({ labels }: { labels: Record<ThemeChoice, string> }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => setChoice((document.documentElement.dataset.choice as ThemeChoice) ?? "system"), []);

  const toggle = () => {
    const next = nextChoice(choice);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    (window as unknown as { applyTheme: () => void }).applyTheme();
    setChoice(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={labels[choice]}
      title={labels[choice]}
      className="grid size-8 cursor-pointer place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    >
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {icons[choice]}
      </svg>
    </button>
  );
}
