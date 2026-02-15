"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "agent-taskboard-show-completed";

export function useShowCompleted() {
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setShowCompleted(stored === "true");
    }
    setIsLoaded(true);
  }, []);

  const toggleShowCompleted = (value?: boolean) => {
    const newValue = value !== undefined ? value : !showCompleted;
    setShowCompleted(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  return { showCompleted, toggleShowCompleted, isLoaded };
}
