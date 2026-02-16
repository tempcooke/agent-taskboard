"use client";

import Link from "next/link";
import {
  AlertCircle,
  Eye,
  CheckCircle2,
  GitPullRequest,
  CircleDot,
  Loader2,
} from "lucide-react";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

interface AttentionCardProps {
  conversation: Conversation;
  reason: string;
}

const LEVEL_CONFIG = {
  urgent: {
    icon: AlertCircle,
    iconColor: "text-red-500",
    bg: "bg-red-500/5 border-red-500/20",
    label: "Needs you",
  },
  review: {
    icon: Eye,
    iconColor: "text-yellow-500",
    bg: "bg-yellow-500/5 border-yellow-500/20",
    label: "Review",
  },
  working: {
    icon: Loader2,
    iconColor: "text-sky-500 animate-spin",
    bg: "bg-sky-500/5 border-sky-500/20",
    label: "Agent working",
  },
  info: {
    icon: CheckCircle2,
    iconColor: "text-blue-500",
    bg: "bg-blue-500/5 border-blue-500/20",
    label: "Info",
  },
  none: {
    icon: CircleDot,
    iconColor: "text-muted-foreground",
    bg: "border",
    label: "",
  },
};

export function AttentionCard({ conversation, reason }: AttentionCardProps) {
  const config = LEVEL_CONFIG[conversation.attentionLevel];
  const Icon = config.icon;

  return (
    <Link
      href={`/conversations/${conversation.id}`}
      className={`flex gap-3 rounded-xl border p-4 transition-colors hover:bg-accent ${config.bg}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-medium">
            {conversation.title}
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {conversation.repo.fullName} #{conversation.number}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">{reason}</p>
      </div>
    </Link>
  );
}
