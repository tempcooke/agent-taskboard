"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fetch and apply theme on mount
    const applyTheme = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const theme: Theme = data.theme || "system";
          updateTheme(theme);
        }
      } catch (error) {
        // If fetch fails, default to system theme
        updateTheme("system");
      }
    };

    applyTheme();

    // Listen for theme updates from settings page
    const handleThemeChange = (e: CustomEvent<{ theme: Theme }>) => {
      updateTheme(e.detail.theme);
    };

    window.addEventListener("theme-change" as any, handleThemeChange);
    return () => {
      window.removeEventListener("theme-change" as any, handleThemeChange);
    };
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

function updateTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "system") {
    // Remove dark class and let CSS media query handle it
    root.classList.remove("dark", "light");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    }
  } else if (theme === "dark") {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}
