# Agent Taskboard

A mobile-first PWA for managing AI coding agents through a chat-like interface. GitHub issues are conversations, comments are messages, and new tasks are issue creation.

## What It Does

- **Wraps GitHub into a messaging UI** — issues and PRs become chat threads, making it easy to interact with AI agents on the go
- **Plan-first workflow** — new tasks get a `planning` label, the agent posts a plan, you approve with one tap, and implementation begins
- **Dashboard surfaces what needs you** — blocked agents, PRs needing review, agent questions asking for input
- **All data lives in GitHub** — no database, no vendor lock-in. Every message is a comment, every conversation is an issue.
- **PWA with push notifications** — install on your phone's home screen, get notified when agents finish work or need help

## How It Works

1. **Create a task** — pick a repo, type a description. The app creates a GitHub issue with `@claude` and a `planning` label.
2. **Agent plans** — Claude analyzes the codebase and posts an implementation plan as a comment.
3. **Approve & implement** — tap "Approve Plan & Implement" to remove the `planning` label and trigger the agent to start coding.
4. **Review** — the agent opens a PR. Dashboard shows it under "Needs Your Attention" with risk labels (`auto-merge`, `needs-review`, `blocked`).

Behind the scenes, the app uses GitHub webhooks to detect agent activity and the [Automated Developer Framework](https://github.com/AdamCooke00/automated-developer-framework)'s GitHub Actions workflows (`claude.yml`, `claude-review.yml`, `daily-digest.yml`) to power the agent.

## Key Views

- **Dashboard** (`/`) — "Needs Your Attention" cards (blocked, review, questions) + recent activity feed
- **Conversations** (`/conversations`) — all issues/PRs across tracked repos, filterable by repo
- **Chat** (`/conversations/:id`) — chat-style message thread for an issue/PR, with markdown rendering. Shows "Planning" badge and "Approve Plan" button when in planning mode.
- **New Task** (`/new`) — pick a repo, describe the task, sends it off
- **Settings** (`/settings`) — select tracked repos, theme (light/dark/system), GitHub account management

## Setup

### Prerequisites

- Node.js 18+
- A GitHub OAuth App (for user login — distinct from the Claude GitHub App used by the framework)

### Steps

1. **Clone the repo**
   ```bash
   git clone https://github.com/AdamCooke00/agent-taskboard.git
   cd agent-taskboard
   ```

2. **Create a GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `http://localhost:3000` (or your Vercel URL)
   - Callback URL: `http://localhost:3000/api/auth/callback`
   - Note the Client ID and Client Secret

3. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in the required values:
     - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — from the OAuth App
     - `SESSION_SECRET` — any random 32+ character string
     - `GITHUB_WEBHOOK_SECRET` — (optional) for webhook signature verification
     - VAPID keys — (optional) for push notifications. Generate with `npx web-push generate-vapid-keys`

4. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000

5. **Deploy to Vercel**
   - Connect the repo to Vercel
   - Set environment variables in the Vercel dashboard
   - Update OAuth App callback URL to your Vercel URL

## Connection to Automated Developer Framework

This app is the UI companion to the [Automated Developer Framework](https://github.com/AdamCooke00/automated-developer-framework) template.

- The framework provides the GitHub Actions workflows that power the AI agent (`claude.yml`, `claude-review.yml`, `daily-digest.yml`, etc.)
- This app provides the mobile-friendly front-end for interacting with those agents
- Any repo using the framework's workflows can be tracked in this app — just add it in Settings

## Tech Stack

- **Next.js 14** (App Router) + **React 18**
- **TypeScript** strict mode
- **Tailwind CSS** + shadcn/ui patterns
- **SWR** for data fetching
- **iron-session** for auth (encrypted cookies)
- **Octokit** for GitHub API
- **web-push** for notifications
- Deployed on **Vercel**

## Development

```bash
npm run dev    # Start dev server
npm run build  # Production build (includes type checking)
npm run lint   # Run ESLint
```
