"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMessages, sendMessage } from "@/hooks/use-messages";
import { useSession } from "@/hooks/use-session";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import {
  ArrowLeft,
  GitPullRequest,
  CircleDot,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { Message } from "@/lib/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function parseConversationId(id: string) {
  const parts = id.split("-");
  const number = parseInt(parts.pop()!, 10);
  const type = parts.pop()!;
  const joinedBack = parts.join("-");
  const firstHyphen = joinedBack.indexOf("-");
  const owner = joinedBack.slice(0, firstHyphen);
  const repo = joinedBack.slice(firstHyphen + 1);
  return { owner, repo, type, number };
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSession();
  const id = params.id as string;

  const { owner, repo, type, number } = parseConversationId(id);
  const { messages, isLoading, mutate } = useMessages(owner, repo, number);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch labels for this issue to detect planning mode
  const { data: labelsData, mutate: mutateLabels } = useSWR(
    type === "issue"
      ? `/api/github/labels?owner=${owner}&repo=${repo}&number=${number}`
      : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const labels: string[] = labelsData?.labels || [];
  const isPlanning = labels.includes("planning");
  const isWorking = labels.includes("claude-working");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (body: string) => {
    if (!user) return;
    setSending(true);

    const messageBody = `@claude ${body}`;

    const optimisticMessage: Message = {
      id: Date.now(),
      author: {
        login: user.login,
        avatarUrl: user.avatar_url,
        isBot: false,
      },
      body: messageBody,
      createdAt: new Date().toISOString(),
      type: "comment",
    };

    mutate([...messages, optimisticMessage], false);

    await sendMessage(owner, repo, number, messageBody);
    setSending(false);
    mutate();
  };

  const handleApprove = useCallback(async () => {
    if (!user || approving) return;
    setApproving(true);

    // 1. Remove the "planning" label
    await fetch("/api/github/labels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, number, label: "planning" }),
    });

    // 2. Post approval comment to trigger implementation
    const approvalBody = "@claude Plan approved. Proceed with implementation.";
    const optimisticMessage: Message = {
      id: Date.now(),
      author: {
        login: user.login,
        avatarUrl: user.avatar_url,
        isBot: false,
      },
      body: approvalBody,
      createdAt: new Date().toISOString(),
      type: "comment",
    };

    mutate([...messages, optimisticMessage], false);
    await sendMessage(owner, repo, number, approvalBody);

    setApproving(false);
    mutateLabels();
    mutate();
  }, [user, approving, owner, repo, number, messages, mutate, mutateLabels]);

  const githubUrl = `https://github.com/${owner}/${repo}/${type === "pr" ? "pull" : "issues"}/${number}`;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {type === "pr" ? (
                <GitPullRequest className="h-4 w-4 shrink-0 text-purple-500" />
              ) : (
                <CircleDot className="h-4 w-4 shrink-0 text-green-500" />
              )}
              <span className="truncate text-sm font-semibold">
                {owner}/{repo} #{number}
              </span>
            </div>
            {isWorking && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Agent working
              </span>
            )}
            {!isWorking && isPlanning && (
              <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Planning
              </span>
            )}
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={!msg.author.isBot && msg.author.login === user?.login}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Approve Plan Button (shown when in planning mode and agent has responded) */}
      {isPlanning && messages.some((m) => m.author.isBot) && (
        <div className="border-t bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {approving ? "Approving..." : "Approve Plan & Implement"}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0">
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          placeholder={isPlanning ? "Discuss the plan..." : "Reply to agent..."}
        />
      </div>
    </div>
  );
}
