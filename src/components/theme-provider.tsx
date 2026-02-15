"use client";

import { useEffect } from "react";

type Theme = "system" | "light" | "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme from localStorage on mount
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const theme: Theme = storedTheme || "system";
    applyTheme(theme);

    // Listen for theme updates from settings page
    const handleThemeChange = (e: CustomEvent<{ theme: Theme }>) => {
      localStorage.setItem("theme", e.detail.theme);
      applyTheme(e.detail.theme);
    };

    window.addEventListener("theme-change" as any, handleThemeChange);

    // Listen for OS preference changes when theme is "system"
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem("theme") as Theme | null;
      if (!currentTheme || currentTheme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      window.removeEventListener("theme-change" as any, handleThemeChange);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  return <>{children}</>;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "system") {
    root.classList.remove("light");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else if (theme === "dark") {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}
