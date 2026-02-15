"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "agent-taskboard-show-completed";

export function useShowCompleted() {
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setShowCompleted(stored === "true");
      }
    } catch (error) {
      // localStorage may be blocked or unavailable (e.g., private browsing)
      console.warn("Failed to access localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  const toggleShowCompleted = (value?: boolean) => {
    const newValue = value !== undefined ? value : !showCompleted;
    setShowCompleted(newValue);
    try {
      localStorage.setItem(STORAGE_KEY, String(newValue));
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  };

  return { showCompleted, toggleShowCompleted, isLoaded };
}
