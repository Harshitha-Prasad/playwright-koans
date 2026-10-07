# 18 · Git and GitHub

No koans here. The Git and GitHub questions a test engineer is asked, from the staging area to reviewing a pull request.

## Cheat sheet

```
git switch -c feat/x        git fetch && git rebase origin/main
git add -p                  git commit -m "test: add checkout smoke"
git stash / git stash pop   git log --oneline --graph --all
git revert <sha>            git reset --soft HEAD~1
git bisect start; git bisect bad; git bisect good <sha>
```

## Interviewers ask

### Git fundamentals

**Working directory, staging area (index), repository?**
Changes are made in the working directory, selected into the staging area with `git add`, and recorded as a commit into the repository with `git commit`.

Source: interview handbook, not checked against documentation.

**Everyday commands?**
`clone, status, add, commit, push, pull, fetch, branch, checkout/switch, merge, rebase, log, diff, stash, tag, remote, reset, revert, cherry-pick, blame, bisect`.

Source: interview handbook, not checked against documentation.

**`git fetch` vs `git pull`?**
`fetch` downloads remote changes without touching your branch; `pull` = fetch + merge (or rebase with `--rebase`). Prefer fetch + explicit merge/rebase to see what's coming.

Source: interview handbook, not checked against documentation.

**Merge vs rebase?**
Merge preserves history with a merge commit; rebase rewrites your commits on top of the target for a linear history. Never rebase shared/public branches. Typical: rebase your feature branch on `main` before opening a PR, merge (or squash-merge) into `main`.

Source: interview handbook, not checked against documentation.

**Fast-forward vs three-way merge? Squash merge?**
Fast-forward: pointer moves when no divergence. Three-way: creates a merge commit. Squash: collapses the feature branch into one commit on `main`, clean history, loses granular commits.

Source: interview handbook, not checked against documentation.

**`git reset` (soft/mixed/hard) vs `git revert`?**
`reset` moves the branch pointer (soft keeps staged, mixed unstages, hard discards), rewriting history; only on local/unpushed commits. `revert` creates a new commit undoing another, safe on shared branches.

Source: interview handbook, not checked against documentation.

**How do you resolve a merge conflict?**
Open conflicted files, resolve markers (`<<<<<<<`, `=======`, `>>>>>>>`), `git add`, continue merge/rebase. Tools: VS Code, `git mergetool`. Prevent conflicts with small PRs and frequent rebasing.

Source: interview handbook, not checked against documentation.

**`git stash`, `cherry-pick`, `bisect`?**
Stash shelves uncommitted changes. Cherry-pick applies a specific commit elsewhere (hotfixes). Bisect binary-searches history to find the commit that introduced a bug, great for RCA of a regression: `git bisect start; git bisect bad; git bisect good <sha>; run tests`.

Source: interview handbook, not checked against documentation.

**`.gitignore` and what should never be committed in a test repo?**
`node_modules`, `test-results/`, `playwright-report/`, traces/videos, `.env` and secrets, storageState files with real tokens, OS/IDE files. Use `.env.example`.

Source: interview handbook, not checked against documentation.

**Branching strategies?**
Git Flow (develop/release/hotfix, heavy), GitHub Flow (short-lived feature branches → PR → main → deploy), trunk-based development (tiny branches or direct commits with feature flags, best for CI/CD). Be able to say which your team uses and the trade-offs.

Source: interview handbook, not checked against documentation.

**Conventional commits and why they matter?**
`feat:`, `fix:`, `test:`, `chore:` prefixes enable changelog generation and semantic release. Good commit hygiene = reviewable PRs and easier bisecting.

Source: interview handbook, not checked against documentation.

### GitHub

**Pull request workflow?**
Branch → commits → PR with description linking the ticket → CI checks → review (comments, suggestions, approvals) → resolve → merge → delete branch. Draft PRs for early feedback.

Source: interview handbook, not checked against documentation.

**Branch protection rules and required checks?**
Require PR reviews (CODEOWNERS), required status checks (lint, type-check, unit, E2E smoke), up-to-date branches, signed commits, no force push. As QA you should own the test-check requirement.

Source: interview handbook, not checked against documentation.

**What is CODEOWNERS?**
File mapping paths to owners who are auto-requested as reviewers, put the QA team on `tests/` and `playwright.config.ts`.

Source: interview handbook, not checked against documentation.

**GitHub Issues, Projects, Discussions, Releases, Tags?**
Issues for bugs/tasks with templates and labels; Projects for boards; Releases attached to tags with notes and artefacts.

Source: interview handbook, not checked against documentation.

**Dependabot / Renovate?**
Automated dependency update PRs, keep Playwright and browsers current with CI verifying each bump.

Source: interview handbook, not checked against documentation.

**How would you review a test-automation PR?**
Check: test independence, locator quality, web-first assertions, no sleeps, meaningful names, data cleanup, no secrets, config changes justified, CI green including flaky check (`--repeat-each` for new tests), reports/traces attached for reference.

Source: interview handbook, not checked against documentation.
