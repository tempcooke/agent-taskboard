"use client";

import useSWR from "swr";
import type { GitHubUser } from "@/lib/types";

interface SessionResponse {
  authenticated: boolean;
  user?: GitHubUser;
  trackedRepos?: string[];
  theme?: "system" | "light" | "dark";
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (res.status === 401) return { authenticated: false };
    return res.json();
  });

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<SessionResponse>(
    "/api/auth/session",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    user: data?.user ?? null,
    trackedRepos: data?.trackedRepos ?? [],
    theme: data?.theme ?? "system",
    isAuthenticated: data?.authenticated ?? false,
    isLoading,
    error,
    mutate,
  };
}

export async function signOut() {
  await fetch("/api/auth/session", { method: "DELETE" });
  window.location.href = "/login";
}
