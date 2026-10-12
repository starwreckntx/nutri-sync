# Contributing to NutriSync

Conventions for branches, commits, validation and merging. Short on purpose — this repo moves fast.

## Branch naming

| Prefix | Use | Example |
|---|---|---|
| `feat/` | New feature or user-visible behavior | `feat/connectors-spark-banner` |
| `fix/` | Bug fix or correction | `fix/native-mode-default` |
| `docs/` | Documentation only | `docs/readme-quickstart` |
| `chore/` | Tooling, deps, repo hygiene | `chore/update-deps` |

One logical change per branch. Always branch from an up-to-date `main`:

```bash
git checkout main && git pull origin main
git checkout -b feat/your-change
```

## Commits

- Imperative, prefixed summary: `feat(connectors): add Spark native-mode banner card`
- Scope in parentheses when obvious (`connectors`, `spark`, `mcp`, `docs`, `readme`).
- One commit per coherent step; the merge commit carries the PR context.

## Validation before opening a PR

```bash
npm run build                                # tsc + vite production build — must pass
bash -c "python3 scripts/validate_zero_dep.py"   # zero-dep schema + skill checks
```

- `node` in some environments is a managed shim — drive Node scripts through bash, never spawn
  them from Python subprocesses.
- MCP protocol changes additionally require the round-trip suite in `scripts/validate.py`
  (responses recorded via bash, assertions in Python).

## Pull requests

- Target `main`. Open the PR from your pushed branch; describe **what**, **validation performed**,
  and **behavior notes** (what didn't change is as important as what did).
- Self-merge is acceptable for single-maintainer work, but only after the checks above pass on
  the branch tip.
- Merge with a **merge commit** (`--no-ff` equivalent) — keep feature-branch history visible.

## Runtime modes

Spark integration is dual-mode; **Mode B (native cloud / Google Sheet) is the default** for
docs, schedules and UI copy. Mode A (local MCP pipe) stays documented as the opt-in path.
New docs or UI should say "default" explicitly rather than imply both modes are equal.

## Don't

- No force-push to `main`, no direct `--amend` of pushed commits — fix forward with a new commit.
- No secrets, API keys or personal data in any committed file (Skills especially — they are
  reusable instructions, not a secure store).
- No invented numbers in skills, docs or coach output — data comes from the connected source only.
