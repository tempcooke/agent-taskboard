"use client";

import Link from "next/link";
import { GitPullRequest, CircleDot } from "lucide-react";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

interface ConversationItemProps {
  conversation: Conversation;
}

const ATTENTION_STYLES = {
  urgent: "border-l-4 border-l-red-500",
  review: "border-l-4 border-l-yellow-500",
  working: "border-l-4 border-l-sky-500",
  info: "border-l-4 border-l-blue-500",
  none: "",
};

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { id, type, number, title, repo, updatedAt, body, author, attentionLevel, labels } =
    conversation;

  return (
    <Link
      href={`/conversations/${id}`}
      className={cn(
        "flex gap-3 rounded-xl border p-4 transition-colors hover:bg-accent",
        ATTENTION_STYLES[attentionLevel]
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {type === "pull_request" ? (
          <GitPullRequest className="h-5 w-5 text-purple-500" />
        ) : (
          <CircleDot className="h-5 w-5 text-green-500" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(updatedAt)}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {repo.fullName} #{number}
        </p>

        {body && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {truncate(body.replace(/[#*`_~\[\]]/g, ""), 120)}
          </p>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {labels.slice(0, 3).map((label) => (
              <span
                key={label.name}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
