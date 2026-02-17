"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const { author, body, createdAt, agentType } = message;

  if (!body.trim()) return null;

  const getAgentBadge = () => {
    if (!author.isBot) return null;

    switch (agentType) {
      case "plan":
        return (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Plan Agent
          </span>
        );
      case "review":
        return (
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            Review Agent
          </span>
        );
      case "implement":
        return (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Implement Agent
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium text-muted-foreground">
            Agent
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <img
        src={author.avatarUrl}
        alt={author.login}
        className="mt-1 h-7 w-7 shrink-0 rounded-full"
      />

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] space-y-1",
          isCurrentUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-2">
          {author.isBot ? (
            getAgentBadge()
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {author.login}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isCurrentUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-secondary text-secondary-foreground"
          )}
        >
          <div
            className={cn(
              "prose prose-sm max-w-none",
              isCurrentUser
                ? "prose-invert"
                : "dark:prose-invert"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
