import { Octokit } from "@octokit/rest";
import type { Conversation, Message, MessageAuthor, LinkedPR, Label, AgentType } from "./types";

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
        state: (isPR && issue.pull_request?.merged_at) ? "merged" : (issue.state as "open" | "closed"),
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

async function listLabelEvents(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<Array<{ event: "labeled" | "unlabeled"; label: string; createdAt: string }>> {
  const { data: events } = await octokit.issues.listEvents({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const labelEvents: Array<{ event: "labeled" | "unlabeled"; label: string; createdAt: string }> = [];

  for (const e of events) {
    if ((e.event === "labeled" || e.event === "unlabeled") && "label" in e && e.label?.name) {
      labelEvents.push({
        event: e.event,
        label: e.label.name,
        createdAt: e.created_at || "",
      });
    }
  }

  labelEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return labelEvents;
}

function resolveAgentType(
  commentTimestamp: string,
  labelEvents: Array<{ event: "labeled" | "unlabeled"; label: string; createdAt: string }>
): AgentType {
  const workflowLabels = ["planning", "plan-review", "ready-to-implement"];
  const commentTime = new Date(commentTimestamp).getTime();

  // Filter to relevant events that happened before or at the comment timestamp
  const relevantEvents = labelEvents.filter((e) => {
    return (
      workflowLabels.includes(e.label) &&
      new Date(e.createdAt).getTime() <= commentTime
    );
  });

  // Replay events to determine active workflow labels at comment time
  const activeLabels = new Set<string>();
  for (const event of relevantEvents) {
    if (event.event === "labeled") {
      activeLabels.add(event.label);
    } else {
      activeLabels.delete(event.label);
    }
  }

  // Map active workflow label to agent type (prioritize: implement > review > plan)
  if (activeLabels.has("ready-to-implement")) return "implement";
  if (activeLabels.has("plan-review")) return "review";
  if (activeLabels.has("planning")) return "plan";

  return null;
}

function isHumanComment(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.startsWith("@claude") || trimmed.startsWith("<!-- auto-continue -->");
}

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

  // For PRs, also fetch review submissions
  if (issue.pull_request) {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: issueNumber,
      per_page: 100,
    });

    for (const review of reviews) {
      // Skip reviews with empty bodies (e.g., auto-approvals with no text)
      if (!review.body) continue;

      messages.push({
        id: review.id,
        author: {
          login: review.user?.login || "unknown",
          avatarUrl: review.user?.avatar_url || "",
          isBot: review.user?.type === "Bot",
        },
        body: review.body,
        createdAt: review.submitted_at || "",
        type: "review_comment",
      });
    }
  }

  // Sort messages chronologically
  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Fetch label events and enrich bot messages with agent type
  const labelEvents = await listLabelEvents(octokit, owner, repo, issueNumber);
  for (const message of messages) {
    if (message.type === "issue_body" || message.type === "pr_body") continue;

    if (message.author.isBot) {
      // Already identified as bot (e.g., claude[bot]) — resolve agent type
      message.agentType = resolveAgentType(message.createdAt, labelEvents);
    } else if (!isHumanComment(message.body)) {
      // Not a known human comment pattern — check if posted during agent phase
      const agentType = resolveAgentType(message.createdAt, labelEvents);
      if (agentType) {
        message.author.isBot = true;
        message.agentType = agentType;
      }
    }
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

  // Blocked / human-input take highest priority
  if (labelNames.includes("blocked")) return "urgent";
  if (labelNames.includes("needs-human-input")) return "urgent";
  // Active agent pipeline stages map to working
  if (labelNames.includes("claude-working")) return "working";
  if (labelNames.includes("planning")) return "working";
  if (labelNames.includes("plan-review")) return "working";
  if (labelNames.includes("ready-to-implement")) return "working";
  if (labelNames.includes("needs-review")) return "review";

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
