"use client";

import { useConversations } from "@/hooks/use-conversations";
import { useSession } from "@/hooks/use-session";
import { useShowCompleted } from "@/hooks/use-show-completed";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { ConversationItem } from "@/components/conversation/conversation-item";
import { Settings, RefreshCw, Inbox, Archive } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function getAttentionReason(conversation: { attentionLevel: string; labels: { name: string }[] }): string {
  switch (conversation.attentionLevel) {
    case "urgent":
      if (conversation.labels.some((l) => l.name.toLowerCase() === "blocked"))
        return "Agent is blocked and needs your help";
      return "Agent is asking you a question";
    case "review":
      return "Pull request needs your review";
    case "working":
      return "Agent is actively working on this task";
    case "info":
      return "Task completed";
    default:
      return "";
  }
}

export default function DashboardPage() {
  const { user, trackedRepos } = useSession();
  const { conversations, isLoading, mutate } = useConversations();
  const { showCompleted, toggleShowCompleted, isLoaded } = useShowCompleted();

  // Filter out closed items unless showCompleted is true
  // While loading preference (!isLoaded), show all conversations to avoid empty state flash
  const filteredConversations = !isLoaded || showCompleted
    ? conversations
    : conversations.filter((c) => c.state === "open");

  // Separate attention items from regular activity
  const attentionItems = filteredConversations.filter(
    (c) => c.attentionLevel !== "none"
  );
  const recentActivity = filteredConversations.slice(0, 10);

  // Not configured yet
  if (trackedRepos.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Agent Taskboard</h1>
            <Link href="/settings" className="p-1.5">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Inbox className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Welcome{user ? `, ${user.login}` : ""}!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select repos to track in Settings to get started.
          </p>
          <Link
            href="/settings"
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Open Settings
          </Link>
        </div>

        <div className="h-20" />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Agent Taskboard</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleShowCompleted()}
              className={cn(
                "p-1.5 transition-colors",
                showCompleted
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={showCompleted ? "Hide completed" : "Show completed"}
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={() => mutate()}
              className="p-1.5 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link href="/settings" className="p-1.5">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border bg-muted"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Attention items */}
            {attentionItems.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Needs Your Attention
                </h2>
                <div className="space-y-2">
                  {attentionItems.map((conv) => (
                    <AttentionCard
                      key={conv.id}
                      conversation={conv}
                      reason={getAttentionReason(conv)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recent activity */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((conv) => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <div className="h-20" />
      <MobileNav />
    </div>
  );
}
