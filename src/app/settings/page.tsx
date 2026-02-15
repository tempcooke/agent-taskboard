"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/hooks/use-session";
import { useRepos } from "@/hooks/use-repos";
import { ArrowLeft, LogOut, Check, Sun, Moon, Monitor } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, trackedRepos: sessionRepos } = useSession();
  const { repos, isLoading: reposLoading } = useRepos();
  const [tracked, setTracked] = useState<string[]>([]);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTracked(sessionRepos);
  }, [sessionRepos]);

  useEffect(() => {
    // Load theme from localStorage
    const storedTheme = localStorage.getItem("theme") as "system" | "light" | "dark" | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  const toggleRepo = (fullName: string) => {
    setTracked((prev) =>
      prev.includes(fullName)
        ? prev.filter((r) => r !== fullName)
        : [...prev, fullName]
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackedRepos: tracked, theme }),
    });
    setSaving(false);
    router.push("/");
  };

  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme);
    // Apply theme immediately and store in localStorage
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: newTheme } }));
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </header>

      <div className="flex-1 space-y-6 p-4">
        {/* Account */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            GitHub Account
          </h2>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{user?.name || user?.login}</p>
                <p className="text-sm text-muted-foreground">@{user?.login}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Choose your preferred theme for the app.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-accent"
              }`}
            >
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-accent"
              }`}
            >
              <Moon className="h-6 w-6" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => handleThemeChange("system")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                theme === "system"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-accent"
              }`}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </section>

        {/* Tracked Repos */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tracked Repositories
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Select repos to monitor for agent activity.
          </p>
          <div className="space-y-2">
            {reposLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl border bg-muted"
                  />
                ))}
              </>
            ) : (
              repos.map((repo: { fullName: string; description: string | null; private: boolean }) => (
                <button
                  key={repo.fullName}
                  onClick={() => toggleRepo(repo.fullName)}
                  className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent"
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      tracked.includes(repo.fullName)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {tracked.includes(repo.fullName) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{repo.fullName}</p>
                    {repo.description && (
                      <p className="truncate text-sm text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  {repo.private && (
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Private
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
