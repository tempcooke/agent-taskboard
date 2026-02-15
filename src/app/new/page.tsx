"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ArrowLeft, FolderGit2, Send } from "lucide-react";
import { extractIssueTitle } from "@/lib/utils";

export default function NewTaskPage() {
  const router = useRouter();
  const { trackedRepos } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedRepo || !message.trim()) return;
    setCreating(true);

    const [owner, repo] = selectedRepo.split("/");
    const title = extractIssueTitle(message);
    const body = `@claude ${message}`;

    const res = await fetch("/api/github/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, title, body }),
    });

    const issue = await res.json();
    setCreating(false);

    // Navigate to the new conversation
    router.push(`/conversations/${owner}-${repo}-issue-${issue.number}`);
  };

  // Step 1: Pick a repo
  if (!selectedRepo) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">New Task</h1>
          </div>
        </header>

        <div className="flex-1 p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Which repo should the agent work in?
          </p>

          {trackedRepos.length === 0 ? (
            <div className="py-16 text-center">
              <FolderGit2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No repos tracked. Go to Settings first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {trackedRepos.map((repoName) => (
                <button
                  key={repoName}
                  onClick={() => setSelectedRepo(repoName)}
                  className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent"
                >
                  <FolderGit2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{repoName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-20" />
        <MobileNav />
      </div>
    );
  }

  // Step 2: Describe the task (chat-like composer)
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedRepo(null)} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold">{selectedRepo}</h1>
            <p className="text-xs text-muted-foreground">New task</p>
          </div>
        </div>
      </header>

      {/* Chat-like area */}
      <div className="flex flex-1 flex-col justify-end p-4">
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground">
            Describe what the agent should work on.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            This will create a GitHub issue that triggers the agent.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 flex items-end gap-2 border-t bg-background p-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What should the agent build?"
          rows={3}
          className="max-h-[160px] min-h-[80px] flex-1 resize-none rounded-2xl border bg-secondary px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleCreate}
          disabled={!message.trim() || creating}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
