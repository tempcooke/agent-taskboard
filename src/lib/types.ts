export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface SessionData {
  githubToken: string;
  githubUser: GitHubUser;
  trackedRepos: string[]; // ["owner/repo", ...]
  theme: "system" | "light" | "dark";
}

export interface Conversation {
  id: string; // "{owner}-{repo}-{type}-{number}"
  repo: { owner: string; name: string; fullName: string };
  type: "issue" | "pull_request";
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  labels: Label[];
  createdAt: string;
  updatedAt: string;
  body: string;
  author: MessageAuthor;
  lastMessage: Message | null;
  linkedPRs: LinkedPR[];
  attentionLevel: AttentionLevel;
  unreadCount: number;
}

export interface Message {
  id: number; // GitHub comment ID
  author: MessageAuthor;
  body: string; // Markdown content
  createdAt: string;
  type: "issue_body" | "comment" | "pr_body" | "review_comment" | "system";
  agentType?: AgentType; // only set for bot messages
}

export interface MessageAuthor {
  login: string;
  avatarUrl: string;
  isBot: boolean;
}

export interface LinkedPR {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  riskLabel: "auto-merge" | "needs-review" | "blocked" | null;
  additions: number;
  deletions: number;
}

export interface Label {
  name: string;
  color: string;
}

export type AgentType = "plan" | "review" | "implement" | null;

export type AttentionLevel = "urgent" | "review" | "working" | "info" | "none";

export interface AttentionItem {
  conversation: Conversation;
  reason: string;
  priority: number; // 1 = urgent, 2 = needs action, 3 = informational
  timestamp: string;
}

export interface TrackedRepo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  openIssueCount: number;
  openPRCount: number;
}

export interface NotificationPrefs {
  agentBlocked: boolean;
  agentQuestion: boolean;
  prNeedsReview: boolean;
  taskCompleted: boolean;
  dailyDigest: boolean;
}

export interface UserSettings {
  trackedRepos: string[];
  notifications: NotificationPrefs;
  theme: "system" | "light" | "dark";
}
