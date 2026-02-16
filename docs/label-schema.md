# Label Schema

This document defines all labels used in the multi-agent planning workflow and their state transitions.

## Label Definitions

| Label | Color | Description | Set By | Read By | Triggers |
|-------|-------|-------------|--------|---------|----------|
| `planning` | `#0052CC` (blue) | Task needs implementation plan | Framework (auto on new issues) | Plan Agent | Plan Agent execution |
| `plan-review` | `#FFA500` (orange) | Plan ready for critique | Plan Agent | Review Agent | Review Agent execution |
| `ready-to-implement` | `#00FF00` (green) | Plan approved, ready for implementation | Review Agent | Implementation Agent | Implementation Agent execution |
| `needs-human-input` | `#FF0000` (red) | Agents need human decision | Review Agent (after 3 cycles) | Human | Human review |
| `claude-working` | `#0969DA` (blue) | Agent actively processing | Framework (auto) | UI | Visual indicator |

## State Transition Diagram

```
[New @claude Issue]
         |
         | (Framework auto-adds)
         v
    [planning]
         |
         | (Plan Agent reads codebase, searches web, drafts plan)
         |
         | (Plan Agent transitions via: gh issue edit --remove-label planning --add-label plan-review)
         v
   [plan-review]
         |
         |---------+
         |         |
         v         v
    [Review OK]  [Review: Needs Revision]  [Review: 3rd Cycle]
         |         |                              |
         |         | (Review Agent:               | (Review Agent:
         |         |  gh issue edit --remove-label|  gh issue edit --remove-label
         |         |  plan-review --add-label     |  plan-review --add-label
         |         |  planning)                   |  needs-human-input)
         |         |                              |
         |         v                              v
         |    [planning] <------------------  [needs-human-input]
         |    (loops back)                    (human decides)
         |
         | (Review Agent: gh issue edit --remove-label plan-review --add-label ready-to-implement)
         v
  [ready-to-implement]
         |
         | (Implementation Agent executes)
         v
    [PR Created]
         |
         | (Framework cleanup: removes ready-to-implement)
         v
      [Done]
```

## Agent Permissions

### Plan Agent
**Can execute:**
- `gh issue edit <NUM> --add-label <LABEL>`
- `gh issue edit <NUM> --remove-label <LABEL>`
- `gh api repos/{owner}/{repo}/issues/comments/{comment_id}/reactions -f content='+1'`

**Label transitions:**
- Removes: `planning`
- Adds: `plan-review`

### Review Agent
**Can execute:**
- `gh issue edit <NUM> --add-label <LABEL>`
- `gh issue edit <NUM> --remove-label <LABEL>`
- `gh api repos/{owner}/{repo}/issues/{issue_num}/events --paginate`
- `gh api repos/{owner}/{repo}/issues/comments/{comment_id}/reactions -f content='+1'`

**Label transitions:**
- Removes: `plan-review`
- Adds: `planning` (send back for revision) OR `ready-to-implement` (approve) OR `needs-human-input` (escalate)

### Implementation Agent
**Can execute:**
- `gh pr create`
- `gh pr edit`
- `gh issue close`
- `gh label create`

**Label transitions:**
- None (reads `ready-to-implement` label, framework cleans up after completion)

## GitHub API Command Reference

### Add Label
```bash
gh issue edit <ISSUE_NUM> --add-label <LABEL_NAME>
```

### Remove Label
```bash
gh issue edit <ISSUE_NUM> --remove-label <LABEL_NAME>
```

### Add Reaction to Comment
```bash
gh api repos/{owner}/{repo}/issues/comments/{comment_id}/reactions -f content='+1'
```

### Check Label History (Count Review Cycles)
```bash
# Get all events for an issue
gh api repos/{owner}/{repo}/issues/{issue_num}/events --paginate

# Count how many times plan-review label was added
gh api repos/{owner}/{repo}/issues/{issue_num}/events --paginate | \
  jq '[.[] | select(.event=="labeled" and .label.name=="plan-review")] | length'
```

### Get Current Labels
```bash
gh issue view <ISSUE_NUM> --json labels --jq '[.labels[].name] | join(",")'
```

## Human Interaction Patterns

### During Planning
- Human posts comment with guidance
- Plan Agent adds ✅ reaction to acknowledge
- Plan Agent incorporates feedback into plan

### During Review
- Human posts comment with preferences
- Review Agent adds ✅ reaction to acknowledge
- Review Agent incorporates guidance into review decision

### After Escalation (`needs-human-input`)
- Human reviews plan and critique
- Human makes decision and posts guidance
- Human manually changes label:
  - `gh issue edit <NUM> --remove-label needs-human-input --add-label planning` (send back to Plan Agent)
  - `gh issue edit <NUM> --remove-label needs-human-input --add-label ready-to-implement` (approve and implement)
  - Or human posts comment and leaves label unchanged (more discussion needed)

## Workflow Triggers

The framework watches for:

1. **Issue opened** with `@claude` → Auto-adds `planning` label → Triggers Plan Agent
2. **Issue labeled** with `planning` and `@claude` → Triggers Plan Agent
3. **Comment created** on issue with `plan-review` label → Triggers Review Agent
4. **Issue labeled** with `plan-review` → Triggers Review Agent
5. **Issue labeled** with `ready-to-implement` → Triggers Implementation Agent
6. **Comment created** on issue with `ready-to-implement` label → Triggers Implementation Agent

## Safety Mechanisms

1. **3-Cycle Limit**: Review Agent automatically escalates to `needs-human-input` after 3 review cycles to prevent infinite loops
2. **Turn Limits**: All agents have 50-turn limits
   - Plan Agent: Must post plan and transition to review before limit
   - Review Agent: Must escalate to human if hitting limit
   - Implementation Agent: Auto-continue mechanism (max 2 retries)
3. **Read-Only Agents**: Plan and Review agents cannot edit files, create branches, or push code
4. **Label Ownership**: Only agents and framework manage labels (UI does not modify them)
