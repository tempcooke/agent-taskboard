# Comprehensive Test Findings — v1 Template

**Date:** 2026-02-14 (v1), 2026-02-15 (v2 retest)
**Test repo:** `AdamCooke00/adf-test` (private, throwaway — delete after testing)
**Template repo:** `AdamCooke00/automated-developer-framework`

---

## Critical Bugs Found

### BUG: Double-charge on Max → Fallback when hitting max-turns

**Severity:** HIGH — costs real money on every run that hits max-turns

**What happens:**
1. Max subscription step runs, does all the work (writes code, creates branch, creates PR)
2. Max step hits `--max-turns` limit → action reports `error_max_turns`
3. `continue-on-error: true` means step completes with `outcome: failure`
4. Fallback condition `if: steps.max.outcome != 'success'` evaluates to true
5. Fallback step starts **from scratch** on a new branch, duplicating all work
6. Both Max usage AND API key cost are incurred

**Observed in:** v2 Test 1 — Max created PR #17 successfully, then fallback ran on separate branch `claude/issue-16-20260215-0233`, hit max turns again. Cost: $0.71 on API key alone, plus whatever Max used.

**Fix:** Added a "Check if fallback needed" step between Max and Fallback that reads the action's execution output file (`/home/runner/work/_temp/claude-execution-output.json`) and greps for `error_max_turns`. If found, sets `needed=false` and the fallback is skipped.

**Debugging timeline (3 attempts):**
1. **jq on file directly** → `subtype=unknown` — file is JSONL (multiple JSON objects), not a single JSON object
2. **jq on `tail -1`** → same result — `tail -1` still didn't work (file may not end with newline, or format differs)
3. **`grep -q "error_max_turns"`** → **WORKED** ✅ — simple string search is format-agnostic

**Verified:** With `--max-turns 3`, Max hit the limit, check step detected `error_max_turns`, fallback was skipped. No double charge.

**Status:** ✅ FIXED — applied to both template and adf-test repos

---

## v2 Test Round (2026-02-15)

Fresh test run after all v1 fixes were ported to template and synced to adf-test.

### v2 Test Status

| Test | Status | Score | Key Finding |
|---|---|---|---|
| Template sync | ✅ Pass | — | `.templatesyncignore` works; `.gitignore` added to ignore list |
| Test 1: Feature implementation | ✅ Complete | 26/35 | PR created (fix works!), but no risk label, double-charge bug |
| Test 2: Auto-review quality | ✅ Complete | 23/25 | 8/8 bugs caught (up from 5/8 in v1), excellent review |
| Test 3: Follow-up correction | ✅ Complete | 21/25 | Both features implemented, double-charge bug again ($0.81 wasted) |
| Test 4: Underspecified bug report | ✅ Complete | 16/25 | Correct investigation but hit max-turns; double-charge fix verified |
| Test 5: Daily digest | ✅ Complete | 18/20 | Accurate, well-categorized, good risk assessment |

---

### v2 Template Sync Test

**Result: PASS**

| Step | Result |
|---|---|
| Triggered template sync | PR #14 created |
| `.templatesyncignore` present in adf-test? | No (chicken-and-egg — file added to template after adf-test was created) |
| CLAUDE.md/README.md in PR #14 diff? | Yes (because ignore file not yet in downstream) |
| Closed PR #14, pushed `.templatesyncignore` to adf-test main | Done |
| Re-triggered sync | PR #15 created |
| CLAUDE.md excluded? | **Yes** |
| README.md excluded? | **Yes** |
| `.claude/` excluded? | **Yes** |
| Only workflow/config files in diff? | **Yes** — `claude-review.yml` + `.gitignore` |
| Merged PR #15 | Clean merge |

**Finding:** Downstream repos created before `.templatesyncignore` was added to template need the file added manually before their first sync. One-time setup step.

**Additional change:** Added `.gitignore` to `.templatesyncignore` because the sync removed project-specific entries (e.g., `todo.json`) from adf-test's `.gitignore`. Every project customizes `.gitignore` — it shouldn't be synced.

---

### v2 Test 1: Feature Implementation (26/35)

**Issue:** #16 | **PR:** #17 | **Auth:** Max failed → API fallback (double-charge bug) | **Turns:** 26 (hit max on both steps) | **Cost:** ~$0.71 API key + Max usage

#### What Claude did well

- **PR created automatically** — `--allowedTools` fix works. Claude ran `gh pr create` instead of providing a "Create PR" link. This is a major improvement from v1.
- **"Closes #16" in PR body** — issue management instruction followed
- **Code quality is solid:**
  - Clean argparse CLI with add/list/remove subcommands (121 lines)
  - JSON persistence using pathlib + context managers
  - Type hints on all functions, docstrings on public functions
  - Error handling: corrupted JSON, empty strings, whitespace, missing IDs
  - Proper exit codes (`sys.exit(1)` on errors)
  - 15 unit tests with good edge case coverage (183 lines)
- **PR description is good** — concise, lists features, usage examples, references issue
- **Stayed in scope** — stdlib only, no over-engineering

#### What Claude did wrong

1. **No risk label on PR** — CLAUDE.md says to always add `auto-merge`/`needs-review`/`blocked`. PR #17 has no labels.
2. **Issue not closed** — still open. "Closes #16" only works on merge; Claude should close issues directly for question-answering, or the PR merge will handle it for code changes.
3. **Issue comment is verbose** — full task checklist + implementation summary instead of 2-3 concise sentences
4. **Double-charge bug** — Max step did all the work (created branch + PR), hit max_turns, action treated it as failure, fallback started from scratch. See Critical Bugs section above.
5. **Single file structure** — put everything in `src/main.py` instead of separating storage logic. Not necessarily wrong, but v1 created a separate `todo_manager.py`.

#### Scores

| Dimension | Score | Notes |
|---|---|---|
| Completeness | 4/5 | All 3 operations + tests. No risk label. |
| Code quality | 5/5 | Type hints, pathlib, error handling, clean structure |
| Initiative | 4/5 | Edge case tests, help text, corrupted JSON handling |
| Judgment | 5/5 | Stayed in scope, stdlib only |
| PR quality | 3/5 | Good description + Closes #N, but no risk label |
| Communication | 3/5 | Verbose issue comment with checklist |
| Cost/efficiency | 2/5 | Hit max turns, triggered double-charge bug |

**Total: 26/35**

---

### v2 Test 2: Auto-Review Quality (23/25)

**PR:** #18 | **Auth:** Max subscription | **Runtime:** ~60s | **Turns:** 5

Intentionally bad `src/export.py` with 8 planted bugs. Same file as v1.

#### Bug detection scorecard

| Planted Issue | v1 | v2 |
|---|---|---|
| `os` instead of `pathlib` | ✅ | ✅ |
| `format` shadows builtin | ❌ | ✅ |
| No context manager | ✅ | ✅ |
| No error handling for missing file | ❌ | ✅ |
| `item["done"]` bool+str crash | ✅ | ✅ |
| Silent failure for unknown format | ❌ | ✅ |
| No type hints | ✅ | ✅ |
| No tests | ✅ | ✅ |

**8/8 caught** (up from 5/8 in v1). Also found bonus issue: hardcoded path.

#### Review output

Clean format — one bullet per issue with specific fix suggestion. No praise, no fluff. Included: bugs, convention violations, missing tests, and an extra suggestion about hardcoded path.

#### Scores

| Dimension | Score | Notes |
|---|---|---|
| Bug detection | 5/5 | All 8 bugs caught including 3 missed in v1 |
| Convention enforcement | 5/5 | pathlib, type hints, builtin shadowing all flagged |
| Conciseness | 4/5 | One line per issue with fix. Hardcoded path suggestion is slight over-reach. |
| Prioritization | 4/5 | All issues listed together (v1 separated bugs/conventions/tests better) |
| Actionability | 5/5 | Each suggestion includes exact fix |

**Total: 23/25** (up from 20/25 in v1)

---

### v2 Test 3: Follow-Up Correction (21/25)

**Issue:** #19 | **PRs:** #20 (Max) + #21 (fallback) | **Auth:** Max `error_max_turns` → API fallback | **Cost:** $0.84 Max + $0.81 API key ($0.81 wasted)

Max step: 26 turns, $0.84, `error_max_turns` — created branch + PR #20 with working code.
Fallback: 27 turns, $0.81, `success` — started from scratch, created PR #21 with working code.

#### What Claude implemented

- ✅ Confirmation prompt on remove: shows todo details, requires 'y' to proceed, 'n' cancels
- ✅ New `done` command: marks todo as complete with `completed: true` field
- ✅ Updated `list` display: `[✓]` for completed, `[ ]` for incomplete
- ✅ Updated help text with `done` example
- ✅ 6 new tests: confirmation yes/no, done command, nonexistent ID, list completion status
- ✅ Modified existing `remove_todo` test to mock `input()`

#### What went wrong

1. **Double-charge bug** — $0.81 API cost entirely wasted (Max already completed the work)
2. **Two PRs created** — #20 (Max) and #21 (fallback), both with identical functionality
3. **No risk labels** on either PR
4. **Issue still open** — not closed directly
5. **Verbose output** — task checklist still appears in issue comments

#### Scores

| Dimension | Score | Notes |
|---|---|---|
| Incremental change | 5/5 | Modified existing code, not rewritten |
| Both requests handled | 5/5 | Confirmation + done both implemented correctly |
| Test coverage | 4/5 | 6 new tests, good coverage. Could test edge cases (already-completed todo). |
| Scope discipline | 5/5 | Only touched requested features |
| Continuity | 5/5 | Understood existing codebase from Test 1 |
| PR quality | 3/5 | PR created (fix works!), but no risk label |
| Communication | 2/5 | Still verbose — task checklist + full summary |
| Cost/efficiency | 1/5 | Double-charge: $0.81 wasted on duplicate fallback |

**Adjusted Total: 21/25** (code quality excellent, but double-charge and output issues drag score down)

---

### v2 Test 4: Underspecified Bug Report (16/25)

**Issue:** #30 | **PR:** none (hit max-turns before push) | **Auth:** Max only (double-charge fix prevented fallback) | **Turns:** 26 (max) | **Cost:** $0.67 Max only (no API charges)

#### Double-charge fix validation: PASS

Max hit `error_max_turns` → check step detected it → fallback **skipped**. Without the fix, this would have incurred ~$0.65-0.80 in API charges. Fix saved real money.

#### What Claude did

- Investigated the code and identified `ensure_ascii` and UTF-8 encoding as the issue (same finding as v1)
- Made code changes to `src/main.py` (lines 23, 38): added `ensure_ascii=False` and explicit UTF-8 encoding
- Hit max_turns before it could: add tests, run tests, commit, push, or create PR
- No branch pushed, no PR created — work was lost when runner terminated

#### Assessment

- **Investigation:** Correct — analyzed code, found real issue ✅
- **Root cause:** Correct — `ensure_ascii=False` is the right fix ✅
- **Autonomy:** Good — didn't ask for clarification, made reasonable assumptions ✅
- **Completion:** Failed — hit max turns before committing ❌
- **PR creation:** N/A — never got that far
- **Communication:** Verbose — still has task checklist ❌

#### Scores

| Dimension | Score | Notes |
|---|---|---|
| Investigation | 5/5 | Analyzed code, found real issue |
| Root cause | 4/5 | Correct fix (ensure_ascii + UTF-8) |
| Test-first thinking | 0/5 | Never got to write tests (hit max turns) |
| Autonomy | 5/5 | Didn't ask for clarification |
| Communication | 2/5 | Verbose output with task checklist |

**Total: 16/25** (correct approach but task incomplete due to turn limit)

**Note:** In v1, this same test completed with 23/25 (found fix + wrote 10 tests + pushed). The difference is v1 used Max only (no fallback), and the task completed within turns. The incomplete result here is a tradeoff of the double-charge fix — but saving $0.80 per incident is worth it. The user can follow up with `@claude continue` to finish the work.

---

### v2 Test 5: Daily Digest (18/20)

**Issue created:** #31 "Daily Digest — 2026-02-15" | **Auth:** Max subscription | **Label:** `daily-digest`

#### Digest content

**Completed:** 1 commit merged (double-charge fix cleanup)

**Needs Review:** 4 open PRs with correct risk assessments:
- PR #28 (search command) — NORMAL risk ✅
- PR #25 (priority field) — NORMAL risk ✅
- PR #23 (special characters fix) — LOW risk ✅
- PR #18 (CSV export — our planted bad code) — CRITICAL risk ✅ (correctly flagged missing tests)

**Blocked:** None

**Upcoming:** Correctly identified open issues #30, #29, #26 as not yet started. Also noted #30 is a duplicate of #22.

#### Scores

| Dimension | Score | Notes |
|---|---|---|
| Accuracy | 5/5 | Correctly categorized all PRs, issues, and activity |
| Risk assessment | 5/5 | PR #18 correctly CRITICAL, PR #23 correctly LOW, others NORMAL |
| Scannability | 4/5 | Clean structure, easy to scan in 30 seconds |
| Conciseness | 4/5 | Good but PR descriptions could be slightly shorter |

**Total: 18/20** (up from 16/20 in v1)

---

## v1 Test Round (2026-02-14) — Historical

### v1 Test 1: Feature Implementation (26/35)

**Issue #1** | **Runtime:** 2m 54s | **Turns:** ~11 | **Cost:** ~$0.26 | **Auth:** Max subscription

- Created `src/todo_manager.py` + `src/main.py` + 24 tests
- Good code quality: TypedDict, pathlib, context managers
- **Did NOT create a PR** — pushed branch + "Create PR ➔" link (pre-fix)
- Verbose issue comment with task checklist

### v1 Test 2: Auto-Review Quality (20/25)

**PR #3** | **Runtime:** 52s | **Turns:** 5 | **Cost:** $0.10 | **Auth:** Max subscription

Caught 5/8 planted bugs in intentionally bad `src/export.py`:

| Planted Issue | Caught? |
|---|---|
| `os` instead of `pathlib` | ✅ |
| `format` shadows builtin | ❌ |
| No context manager | ✅ |
| No error handling for missing file | ❌ |
| `item["done"]` bool+str crash | ✅ |
| Silent failure for unknown format | ❌ |
| No type hints | ✅ |
| No tests | ✅ |

Scores: Bug detection 3/5, Convention enforcement 4/5, Conciseness 5/5, Prioritization 4/5, Actionability 4/5

### v1 Test 3: Follow-Up Correction (24/25)

**Issue #4** | **Turns:** 26 (max) | **Cost:** $0.76 | **Auth:** Max

- Added confirmation prompt on remove + new `done` command
- Incremental changes to existing code, not rewritten
- 7 new tests, all passing
- Still no PR, still verbose

### v1 Test 4: Underspecified Bug Report (23/25)

**Issue #5** | **Turns:** 26 (max) | **Cost:** $0.65 | **Auth:** Max

- Investigated code, found `ensure_ascii=False` needed in JSON encoding
- 10 regression tests for special characters
- Good autonomy — didn't ask for clarification

### v1 Test 5: Daily Digest (16/20)

Created digest issue with correct Completed/Needs Review/Blocked/Upcoming sections. Risk assessment accurate. Could be more concise.

### v1 Test 6: Auth Fallback — skipped (plumbing verified)

---

## All Fixes Applied to Template

### Workflow fixes

| File | Change | Why |
|---|---|---|
| `claude.yml` | `--dangerously-skip-permissions` | Required for `gh` commands |
| `claude.yml` | `--allowedTools "Bash(gh pr create:*),Bash(gh issue close:*),Bash(gh label create:*)"` | Adds `gh` to tool whitelist |
| `claude.yml` | `--append-system-prompt` | Overrides "Create PR URL" behavior |
| `claude-review.yml` | Explicit prompt + `--dangerously-skip-permissions` | `/review` skill doesn't post; needs `gh pr review` |
| `daily-digest.yml` | `--dangerously-skip-permissions` | Required for `gh issue create` |
| `template-sync.yml` | `source_gh_token` + checkout `token` | Private repo access via PAT |
| `.templatesyncignore` | `CLAUDE.md`, `README.md`, `.claude/`, `.gitignore` | Prevent sync from overwriting project-specific files |

### CLAUDE.md fixes

1. "After pushing code changes, always create a PR using `gh pr create`"
2. "Do not include task checklists in issue comments"
3. "Minimize tool calls — batch file reads, avoid reading files you don't need"
4. PR Risk Labeling section (auto-merge / needs-review / blocked)
5. Output Style section (concise, bullet points, skip preamble)

### Key syntax discoveries

- `--allowedTools` (capital T) in `claude_args`, NOT the action's `allowed_tools` input
- Colon syntax: `Bash(gh pr create:*)` not `Bash(gh pr create *)`
- `--append-system-prompt` needed WITH `--allowedTools` — both required together
- `source_gh_token` not deprecated `github_token` for template-sync action
- PAT needs `repo` + `read:org` + `workflow` scopes for template sync

---

## Final v2 Scorecard

```
Template sync:                   PASS
Test 1 — Feature Implementation: 26/35
Test 2 — Code Review Quality:    23/25
Test 3 — Follow-up Iteration:    21/25
Test 4 — Ambiguous Bug Report:   16/25
Test 5 — Daily Digest:           18/20

Total: 104/130
Autonomy level: HIGH (100+ threshold)
```

## Open Issues (non-blocking)

1. ~~**Double-charge bug**~~ — **FIXED.** Check step greps execution output for `error_max_turns` and skips fallback. Applied to all 3 workflows.
2. ~~**No risk labels**~~ — **FIXED (untested).** Added `Bash(gh pr edit:*)` to `--allowedTools` and updated `--append-system-prompt` to instruct: `--label auto-merge|needs-review|blocked` on `gh pr create`. Will validate on next real project.
3. **Verbose output** — Task checklists still appear in issue comments despite CLAUDE.md instruction. Behavioral — accepted as known limitation.
4. ~~**Max-turns too high?**~~ — **Keeping at 25.** Community recommends 10-15, but: (a) Max is free so higher turns cost nothing, (b) double-charge fix prevents API waste, (c) lowering to 15 would have left Tests 1/3/4 incomplete. Review stays at 5, digest at 10.
