# Automated Developer Framework

A GitHub template repository pre-configured with Claude Code automation. Clone it, configure it, and every future project inherits AI-powered issue handling and code review.

## What You Get

- **`@claude` on issues and PRs** — mention `@claude` in any issue or PR comment, and Claude reads the repo, implements the request, and pushes commits or opens a PR
- **Automatic code review** — every PR is reviewed by Claude when opened or updated, with inline comments and a summary
- **Daily digest** — every morning, Claude creates a summary issue with what was completed, what needs your review (with risk assessment), and what's blocked. One push notification per project on your phone.
- **PR risk labeling** — Claude labels every PR it creates as `auto-merge`, `needs-review`, or `blocked` so you can triage across multiple projects
- **Template sync** — when this template is updated, downstream repos automatically receive a PR with the changes
- **Max-first auth** — uses your Max subscription first (already paid for), falls back to API key only when needed

## How You Work With Claude

| Where | What you do | What Claude does |
|---|---|---|
| **GitHub Issues** | Create issue with `@claude` + task description | Reads issue, implements, opens PR (issue closes when PR merges) |
| **Issue comments** | Reply with `@claude` + follow-up or correction | Continues work on same issue, adjusts approach |
| **PR comments** | Comment `@claude fix X` on Claude's PR | Pushes new commits to the PR branch |
| **PR review** | Submit review with `@claude` in body | Addresses review feedback, pushes fixes |
| **Your own PRs** | Just open a PR | Claude auto-reviews with inline comments |
| **Daily digest** | Read the daily-digest issue (mobile notification) | Created automatically — summarizes activity, flags what needs you |
| **Actions tab** | Check workflow runs for cost, turn count, errors | Logs show every step Claude took |

**Automation boundaries:**
- Claude works autonomously within a single issue/PR until it completes or hits `--max-turns`
- It does NOT chain tasks (finishing issue A doesn't make it start issue B)
- It does NOT act without a trigger (`@claude` mention or PR open)
- You control pace by controlling when you create issues and respond to PRs

**Multi-project management:**
- Each project has its own daily digest — one mobile notification per project per day
- https://github.com/pulls shows all open PRs across repos in one view
- GitHub notification settings let you filter by repo/label

## Setup After Cloning

### Step 1: Create your repo from this template

**Option A — GitHub UI:**
Click **"Use this template"** > **"Create a new repository"** on the template's GitHub page.

**Option B — CLI:**
```bash
gh repo create my-new-project --template <your-username>/automated-developer-framework --public
gh repo clone my-new-project
cd my-new-project
```

### Step 2: Create an Anthropic workspace for this project

Each project should have its own workspace so you can set independent spend limits.

1. Go to https://console.anthropic.com → **Settings** → **Workspaces**
2. Click **Create Workspace**
3. Name it after your project (e.g., "my-new-project")
4. Go to the workspace's **Limits** tab and set a monthly spend limit (e.g., $25/month)
5. Create an API key inside this workspace — save it for Step 4

This workspace limit is your cost control. If multiple projects share one Anthropic account, each project's workspace has its own independent ceiling.

### Step 3: Install the Claude GitHub App

The Claude GitHub App is required for Claude to interact with your repo (comment on issues, push to branches, post reviews).

**Option A — Via Claude Code CLI (recommended):**
```bash
claude /install-github-app
```

**Option B — Manual install:**
1. Go to https://github.com/apps/claude
2. Click **Install**
3. Select your account or organization
4. Choose **"Only select repositories"** and pick your new repo
5. Click **Install**

### Step 4: Add your secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** and add:

| Secret | Source | Required? |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Run `claude setup-token` in your terminal | Recommended (uses your Max subscription) |
| `ANTHROPIC_API_KEY` | From the workspace you created in Step 2 | Recommended (fallback when Max is rate-limited) |
| `TEMPLATE_SYNC_PAT` | GitHub PAT with `repo`, `read:org`, `workflow` scopes (see Step 5) | Required if template repo is private |

You need **at least one** of the first two. Both is ideal — see [How Auth Works](#how-auth-works) below.

### Step 5: Configure template sync

Open `.github/workflows/template-sync.yml` and replace `<owner>/automated-developer-framework` with the actual GitHub path to your template repo (e.g., `myusername/automated-developer-framework`).

**If your template repo is private**, the sync workflow needs a Personal Access Token to read from it:

1. Go to https://github.com/settings/tokens → **Generate new token (classic)**
2. Name: `TEMPLATE_SYNC_PAT`, Expiration: your choice, Scopes: **`repo`**, **`read:org`**, **`workflow`**
3. Add it as a secret: `gh secret set TEMPLATE_SYNC_PAT -R <your-repo>`

**Why these scopes:**
- `repo` — read the private template repository
- `read:org` — required by the sync action's `gh auth login`
- `workflow` — push changes to `.github/workflows/` files

**Required repo setting:** Go to your repo → **Settings** → **Actions** → **General** → scroll to "Workflow permissions" → check **"Allow GitHub Actions to create and approve pull requests"** → Save. Without this, the sync can push the branch but can't open the PR.

If your template repo is public, this step is unnecessary — the default `GITHUB_TOKEN` can read public repos.

If you don't want automatic sync, delete this workflow file.

### Step 6: Customize CLAUDE.md

Open `CLAUDE.md` and fill in every section. This is the single most impactful thing you can do — it tells Claude how your project works, what conventions to follow, and what commands to run.

At minimum, fill in:
- **Project Overview** — what the project does
- **Tech Stack** — languages and frameworks
- **Development Commands** — how to build, test, and lint

Delete the HTML comments (`<!-- ... -->`) as you fill in real content. Keep CLAUDE.md under 500 lines — it loads into every run and longer files waste tokens. Move detailed workflow instructions into `.claude/rules/` or skills as the project grows.

### Step 7: Add your project code

Add your source files, commit, and push:
```bash
git add .
git commit -m "Initial project setup"
git push origin main
```

## How Auth Works

The workflows use a **Max-first, API-fallback** pattern:

```
Request comes in (@claude mention or PR opened)
  │
  ├─ CLAUDE_CODE_OAUTH_TOKEN is set?
  │   ├─ Yes → Try Max subscription
  │   │        ├─ Success → Done (no API cost)
  │   │        ├─ Hit turn limit → Done (work was completed, no fallback)
  │   │        └─ Auth failed (rate-limited/expired) → Fall back to API key
  │   └─ No → Skip straight to API key
  │
  └─ ANTHROPIC_API_KEY handles the request (pay-per-token)
```

**Double-charge protection:** If the Max step completes work but hits the turn limit, the fallback is automatically skipped. This prevents paying for the same work twice. The fallback only triggers on genuine auth failures.

**Why this order:** Your Max subscription is already paid for. Using it first means automation runs at no additional cost until you hit the 5-hour rolling usage limit. The API key catches overflow.

**Configuration options:**
- **Both secrets set (recommended):** Max handles most runs for free; API key covers rate-limited periods
- **Only `CLAUDE_CODE_OAUTH_TOKEN`:** Free automation, but workflows fail if Max is rate-limited or token expires
- **Only `ANTHROPIC_API_KEY`:** Every run costs money, but no rate-limit interruptions

**OAuth token refresh:** Tokens from `claude setup-token` can expire. If you notice the Max step consistently failing, re-run `claude setup-token` and update the secret. The `/install-github-app` flow handles refresh more reliably.

## Daily Digest & Auto-Merge

### Daily digest

The `daily-digest.yml` workflow runs every morning at 8am UTC. It reviews the last 24 hours of activity and creates a GitHub issue labeled `daily-digest` with:

- **Completed** — PRs merged and issues closed
- **Needs Review** — open PRs with risk assessment (critical / normal / low risk)
- **Blocked** — anything that failed or needs your input
- **Upcoming** — open issues assigned to Claude

If there was no activity, no issue is created.

**Mobile workflow:** Install the [GitHub mobile app](https://github.com/mobile). The digest issue creates a push notification. Open it, scan the summary, and tap into any PRs that need you.

**Change the schedule:** Edit the cron in `daily-digest.yml`. Use [crontab.guru](https://crontab.guru) to set your preferred time.

### Auto-merge setup (optional)

Claude labels every PR it creates with a risk level (configured in CLAUDE.md). To let low-risk PRs merge automatically:

1. Go to your repo → **Settings** → **General** → check **Allow auto-merge**
2. Go to **Settings** → **Branches** → **Add branch protection rule** for `main`:
   - Check **Require a pull request before merging**
   - Check **Require status checks to pass before merging** (select your CI checks)
   - Check **Require approvals** → set to 0 (or 1 if you want to approve manually)
3. Claude's PRs labeled `auto-merge` will merge automatically once CI passes
4. PRs labeled `needs-review` or `blocked` wait for you

**Start conservative:** Leave auto-merge disabled until you trust your CI coverage. The daily digest still tells you which PRs are low-risk even without auto-merge enabled.

## Cost Control

Cost is controlled at the Anthropic console level — no in-repo watchdog needed:

1. **One workspace per project** — independent monthly spend limits per project
2. **Workspace limits are hard caps** — Anthropic stops API calls when the limit is reached
3. **`--max-turns` caps per workflow** — prevents any single run from consuming excessive tokens

**Cost guidance (API key usage only — Max runs are free):**
- Auto-reviews (5 turns, Sonnet) ≈ $0.01-0.05 per review
- `@claude` implementations (25 turns) ≈ $0.10-1.00 depending on complexity
- Set workspace limits to match your comfort level per project

**Monitor spend:** View per-workspace cost breakdowns at [platform.claude.com/claude-code](https://platform.claude.com/claude-code) or the Usage page in your [Anthropic console](https://console.anthropic.com).

**Note on workspaces:** When you first authenticate Claude Code, a workspace called "Claude Code" is auto-created. This is separate from the per-project workspaces you create manually.

## Test That It Works

### Test 1: Reactive workflow
Open a new issue with this body:
```
@claude List all files in this repository and describe what each one does.
```
Within a couple of minutes, Claude should post a comment on the issue with the answer.

### Test 2: Auto-review
Open a PR with any small change (edit the README, add a file, etc.). The **Claude Code Review** workflow should trigger automatically and post a review comment on the PR.

### Test 3: Implementation
Open an issue with this body:
```
@claude Create a simple hello world script in the language specified in CLAUDE.md.
Open a PR with the implementation.
```
Claude should create a branch, add the file, and open a PR.

### Test 4: Verify auth fallback
Check the **Actions** tab after a workflow run. You'll see which step executed — "Run with Max subscription" or "Fallback to API key." If Max succeeded, the fallback step shows as skipped.

If anything fails, check the **Actions** tab in your repo for workflow run logs.

## Staying Updated

GitHub templates are a one-time copy — your project doesn't automatically get updates when the template improves. The `template-sync.yml` workflow solves this.

**How it works:**
- Runs on the 1st of every month (and on manual trigger)
- Compares your repo against the template
- Opens a PR with any new changes, labeled `template_sync`
- You review and merge (or close) the PR
- Project-specific files (`CLAUDE.md`, `README.md`, `.gitignore`, `.claude/`) are excluded via `.templatesyncignore`

**Trigger manually:**
Go to **Actions** > **Template Sync** > **Run workflow** to check for updates now.

**Resolve conflicts:**
If the PR has merge conflicts (because you changed a workflow file the template also changed), resolve them in the PR branch like any normal conflict.

## Improving CLAUDE.md Over Time

When Claude makes wrong assumptions or doesn't follow your preferences, feed corrections back into `CLAUDE.md` so they stick:

```
@claude Update CLAUDE.md to add this rule: always use vitest, not jest, for tests
```

Claude will commit the change directly. Over time, your CLAUDE.md becomes a living document that captures your project's accumulated knowledge.

## Customization

### Adjust max-turns (cost vs. capability)
Edit the `claude_args` line in each workflow file (update both the Max and fallback steps):

| Workflow | Default | What it controls |
|---|---|---|
| `.github/workflows/claude.yml` | `--max-turns 25` | How many steps Claude takes on `@claude` requests |
| `.github/workflows/claude-review.yml` | `--max-turns 5` | How many steps Claude takes during review |
| `.github/workflows/daily-digest.yml` | `--max-turns 10` | How many steps Claude takes generating the digest |

Lower = cheaper and faster. Higher = Claude can handle more complex tasks.

### Change the model
Add `--model` to `claude_args` in the workflow files:
```yaml
claude_args: "--max-turns 25 --dangerously-skip-permissions --model claude-sonnet-4-5-20250929"
```

Available models:
- `claude-sonnet-4-5-20250929` — fast, cost-effective, good for most tasks (default)
- `claude-opus-4-6` — strongest reasoning, use for complex implementation

### Change the trigger phrase
Add the `trigger_phrase` input to the claude.yml workflow steps:
```yaml
with:
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  trigger_phrase: "/ai"
  claude_args: "--max-turns 25 --dangerously-skip-permissions"
```
Then use `/ai` instead of `@claude` in comments.

## What This Template Does NOT Do (v1)

- **CI failure auto-fix** — Claude does not automatically respond to failed CI runs
- **Auto-update CLAUDE.md** — use the manual `@claude update CLAUDE.md` pattern described above
- **Cross-repo digest** — each project gets its own daily digest; there's no single summary across all projects

These can all be added later as separate workflow files.

## File Overview

```
.github/workflows/
  claude.yml            Reactive workflow — responds to @claude mentions
  claude-review.yml     Auto-review — reviews every PR on open/push
  daily-digest.yml      Daily summary of activity and PRs needing review
  template-sync.yml     Monthly sync from template repo (opens PRs with updates)
CLAUDE.md               Project memory — fill this in for your project
.templatesyncignore     Files excluded from template sync (project-specific files)
.gitignore              Language-agnostic defaults
README.md               This file
```

## Resources

- [Claude Code Action repository](https://github.com/anthropics/claude-code-action)
- [Claude Code GitHub Actions docs](https://code.claude.com/docs/en/github-actions)
- [CLAUDE.md best practices](https://code.claude.com/docs/en/memory)
- [Anthropic API console](https://console.anthropic.com)
- [Anthropic workspaces](https://support.anthropic.com/en/articles/9796807-creating-and-managing-workspaces)
- [Managing costs](https://code.claude.com/docs/en/costs)
- [Analytics dashboard](https://code.claude.com/docs/en/analytics)
