# Autonomous Build Prompt (Lean)

> Concise template for multi-agent builds. Trust the LLM to fill gaps.

---

## PROJECT: Zoom Participant Randomizer

**Overview:** I want to create an app that allows the host or co-host to click a button and ranodmize all the current participants in a meeting, then paste the results in the zoom chat for all participants to see. The purpose is to determine the order in which participants will share or speak and this needs to occur multiple times in a meeting.

**Stack:** No preference

**Libraries:** No preferences

---

## ENVIRONMENT VARIABLES

```
[VAR_1]= Not sure if we need variables.
```

---

## CONSTRAINTS

1. **Autonomous execution** - Don't ask "should I proceed?" Just proceed.
2. **Credentials first** - Collect ALL env vars before implementation.
3. **Flexibility** - If a better approach is discovered, propose changes before implementing.
4. **Error recovery** - Attempt 3 fixes autonomously before asking user.
5. **Documentation** - Write phase artifacts to `agent-docs/`.
6. **Metrics** - Track progress in `agent-docs/METRICS.md`.

---

## PHASES

| # | Phase | Agent | Output |
|---|-------|-------|--------|
| 0 | Environment Setup | orchestrator | Credentials validated |
| 1 | Research | general-purpose | `phase1-research.md` |
| 2 | Architecture | Plan | `phase2-architecture.md` |
| 3 | Implementation | general-purpose | Working code |
| 4 | Testing | orchestrator | Bugs fixed |
| 5 | Deployment | orchestrator | Live service |

[Customize phases as needed. Combine or split based on complexity.]

---

## MANUAL INPUTS (ONLY THESE)

1. **Credentials** (Phase 0) - Ask for each env var
2. **Ambiguous requirements** - Only if genuinely unclear
3. **Blocking errors** - After 3 failed attempts
4. **Deployment confirmation** - Before going live

---

## FIRST ACTION

1. Create `.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)", "Bash(npx:*)", "Bash(yarn:*)", "Bash(pip:*)",
      "Bash(node:*)", "Bash(python:*)", "Bash(git:*)",
      "Bash(ls:*)", "Bash(mkdir:*)", "Bash(cp:*)", "Bash(mv:*)",
      "Bash(curl:*)", "Bash(docker:*)", "Bash(make:*)",
      "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)",
      "Bash(pwd:*)", "Bash(which:*)", "Bash(chmod:*)", "Bash(touch:*)",
      "Read", "Edit", "Write", "Glob", "Grep", "WebSearch", "WebFetch"
    ],
    "deny": [
      "Bash(rm -rf /:*)", "Bash(sudo rm:*)", "Bash(> /dev:*)",
      "Read(.env)", "Read(.env.*)", "Read(**/secrets/**)"
    ]
  }
}
```
2. Create `agent-docs/` directory
3. Create `agent-docs/METRICS.md` with build start time
4. Begin Phase 0 - collect credentials
5. Proceed through phases sequentially

**Begin now.**
