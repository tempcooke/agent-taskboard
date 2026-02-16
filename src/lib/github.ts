import { Octokit } from "@octokit/rest";
import type { Conversation, Message, MessageAuthor, LinkedPR, Label } from "./types";

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

// --- Repo Operations ---

export async function listUserRepos(token: string) {
  const octokit = createOctokit(token);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
    type: "owner",
  });
  return data.map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    openIssueCount: repo.open_issues_count,
    private: repo.private,
  }));
}

// --- Issue/PR → Conversation Mapping ---

export async function listConversations(
  token: string,
  repos: string[],
  currentUser: string
): Promise<Conversation[]> {
  const octokit = createOctokit(token);
  const conversations: Conversation[] = [];

  for (const repoFullName of repos) {
    const [owner, repo] = repoFullName.split("/");

    // Fetch all issues (includes PRs in GitHub API) - both open and closed
    // Increased per_page to 100 to ensure we get enough open issues after filtering
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "all",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    });

    for (const issue of issues) {
      const isPR = !!issue.pull_request;
      const labels = (issue.labels || [])
        .map((l) => (typeof l === "string" ? { name: l, color: "888888" } : { name: l.name || "", color: l.color || "888888" }))
        .filter((l) => l.name);

      const author: MessageAuthor = {
        login: issue.user?.login || "unknown",
        avatarUrl: issue.user?.avatar_url || "",
        isBot: issue.user?.type === "Bot",
      };

      const attentionLevel = computeAttentionLevel(labels, null, currentUser, isPR ? "pull_request" : "issue");

      conversations.push({
        id: `${owner}-${repo}-${isPR ? "pr" : "issue"}-${issue.number}`,
        repo: { owner, name: repo, fullName: repoFullName },
        type: isPR ? "pull_request" : "issue",
        number: issue.number,
        title: issue.title,
        state: issue.state as "open" | "closed",
        labels,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        body: issue.body || "",
        author,
        lastMessage: null, // Populated separately if needed
        linkedPRs: [],
        attentionLevel,
        unreadCount: 0,
      });
    }
  }

  // Sort all conversations by most recently updated
  conversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return conversations;
}

// --- Messages (Comments) ---

export async function listMessages(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  currentUser: string
): Promise<Message[]> {
  const octokit = createOctokit(token);

  // Get the issue/PR body as first message
  const { data: issue } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const messages: Message[] = [
    {
      id: issue.id,
      author: {
        login: issue.user?.login || "unknown",
        avatarUrl: issue.user?.avatar_url || "",
        isBot: issue.user?.type === "Bot",
      },
      body: issue.body || "",
      createdAt: issue.created_at,
      type: issue.pull_request ? "pr_body" : "issue_body",
    },
  ];

  // Get all comments
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  for (const comment of comments) {
    messages.push({
      id: comment.id,
      author: {
        login: comment.user?.login || "unknown",
        avatarUrl: comment.user?.avatar_url || "",
        isBot: comment.user?.type === "Bot",
      },
      body: comment.body || "",
      createdAt: comment.created_at,
      type: "comment",
    });
  }

  return messages;
}

// --- Create Issue ---

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels?: string[]
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels: labels || [],
  });
  return data;
}

// --- Label Management ---

export async function addLabel(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  label: string
) {
  const octokit = createOctokit(token);
  await octokit.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
}

export async function removeLabel(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  label: string
) {
  const octokit = createOctokit(token);
  await octokit.issues.removeLabel({
    owner,
    repo,
    issue_number: issueNumber,
    name: label,
  });
}

export async function getIssueLabels(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<string[]> {
  const octokit = createOctokit(token);
  const { data } = await octokit.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number: issueNumber,
  });
  return data.map((l) => l.name);
}

// --- Post Comment ---

export async function postComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  return data;
}

// --- Attention Logic ---

function computeAttentionLevel(
  labels: Label[],
  lastComment: Message | null,
  _currentUser: string,
  type: "issue" | "pull_request" = "issue"
): Conversation["attentionLevel"] {
  const labelNames = labels.map((l) => l.name.toLowerCase());

  // Blocked status takes priority over working to surface urgent issues
  if (labelNames.includes("blocked")) return "urgent";
  if (labelNames.includes("claude-working")) return "working";
  if (labelNames.includes("needs-review")) return "review";
  if (labelNames.includes("planning")) return "review";

  if (lastComment?.author.isBot && containsQuestion(lastComment.body)) {
    return "urgent";
  }

  // Unlabeled open PRs default to needs-review so they don't slip through
  if (type === "pull_request" && !labelNames.includes("auto-merge")) {
    return "review";
  }

  return "none";
}

export function containsQuestion(body: string): boolean {
  const patterns = [
    /\?\s*$/m,
    /should I/i,
    /do you want/i,
    /please (clarify|confirm|specify)/i,
    /I('m| am) (unsure|not sure)/i,
    /which (approach|option|method)/i,
    /could you (help|explain|tell)/i,
    /what .* prefer/i,
    /need .* (input|decision|guidance)/i,
  ];
  return patterns.some((p) => p.test(body));
}
