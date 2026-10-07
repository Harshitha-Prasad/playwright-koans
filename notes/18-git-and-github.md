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

Source: [Git - git-add Documentation](https://git-scm.com/docs/git-add), and checked by running the code.

**Everyday commands?**
`clone, status, add, commit, push, pull, fetch, branch, checkout/switch, merge, rebase, log, diff, stash, tag, remote, reset, revert, cherry-pick, blame, bisect`.

Source: [Git - Reference](https://git-scm.com/docs), and checked by running the code.

**`git fetch` vs `git pull`?**
`fetch` downloads remote changes and updates only the remote-tracking branches (`origin/main`), not your branch; `pull` = fetch + integrate. By default `pull` only fast-forwards: if your branch has diverged it stops and asks you to choose `--no-rebase` (merge) or `--rebase`, or to set `pull.rebase`. Prefer fetch + explicit merge/rebase to see what's coming.

Source: [Git - git-fetch Documentation](https://git-scm.com/docs/git-fetch), [Git - git-pull Documentation](https://git-scm.com/docs/git-pull), and checked by running the code.

**Merge vs rebase?**
Merge preserves history with a merge commit; rebase rewrites your commits on top of the target for a linear history. Never rebase shared/public branches. Typical: rebase your feature branch on `main` before opening a PR, merge (or squash-merge) into `main`.

Source: [Git - git-merge Documentation](https://git-scm.com/docs/git-merge), [Git - git-rebase Documentation](https://git-scm.com/docs/git-rebase), and checked by running the code.

**Fast-forward vs three-way merge? Squash merge?**
Fast-forward: pointer moves when no divergence. Three-way: creates a merge commit. Squash: collapses the feature branch into one commit on `main`, clean history, loses granular commits.

Source: [Git - git-merge Documentation](https://git-scm.com/docs/git-merge), [About merge methods on GitHub - GitHub Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github), and checked by running the code.

**`git reset` (soft/mixed/hard) vs `git revert`?**
`reset` moves the branch pointer (soft keeps staged, mixed unstages, hard discards), rewriting history; only on local/unpushed commits. `revert` creates a new commit undoing another, safe on shared branches.

Source: [Git - git-reset Documentation](https://git-scm.com/docs/git-reset), [Git - git-revert Documentation](https://git-scm.com/docs/git-revert), and checked by running the code.

**How do you resolve a merge conflict?**
Open conflicted files, resolve markers (`<<<<<<<`, `=======`, `>>>>>>>`), `git add`, continue merge/rebase. Tools: VS Code, `git mergetool`. Prevent conflicts with small PRs and frequent rebasing.

Source: [Git - git-merge Documentation](https://git-scm.com/docs/git-merge), and checked by running the code.

**`git stash`, `cherry-pick`, `bisect`?**
Stash shelves uncommitted changes to tracked files (`-u` includes untracked files). Cherry-pick applies a specific commit elsewhere (hotfixes). Bisect binary-searches history to find the commit that introduced a bug, great for RCA of a regression: `git bisect start; git bisect bad; git bisect good <sha>; run tests`.

Source: [Git - git-stash Documentation](https://git-scm.com/docs/git-stash), [Git - git-cherry-pick Documentation](https://git-scm.com/docs/git-cherry-pick), [Git - git-bisect Documentation](https://git-scm.com/docs/git-bisect), and checked by running the code.

**`.gitignore` and what should never be committed in a test repo?**
`node_modules`, `test-results/`, `playwright-report/`, traces/videos, `.env` and secrets, storageState files with real tokens, OS/IDE files. Use `.env.example`.

Source: [Git - gitignore Documentation](https://git-scm.com/docs/gitignore), and checked by running the code.

**Branching strategies?**
Git Flow (develop/release/hotfix, heavy), GitHub Flow (short-lived feature branches → PR → main → deploy), trunk-based development (tiny branches or direct commits with feature flags, best for CI/CD). Be able to say which your team uses and the trade-offs.

Source: [GitHub flow - GitHub Docs](https://docs.github.com/en/get-started/using-github/github-flow), [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/), [Trunk Based Development: Introduction](https://trunkbaseddevelopment.com/)

**Conventional commits and why they matter?**
`feat:`, `fix:`, `test:`, `chore:` prefixes enable changelog generation and semantic release. Good commit hygiene = reviewable PRs and easier bisecting.

Source: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)

### GitHub

**Pull request workflow?**
Branch → commits → PR with description linking the ticket → CI checks → review (comments, suggestions, approvals) → resolve → merge → delete branch. Draft PRs for early feedback.

Source: [GitHub flow - GitHub Docs](https://docs.github.com/en/get-started/using-github/github-flow), [Pull requests - GitHub Docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)

**Branch protection rules and required checks?**
Require PR reviews (CODEOWNERS), required status checks (lint, type-check, unit, E2E smoke), up-to-date branches, signed commits, no force push. As QA you should own the test-check requirement.

Source: [About protected branches - GitHub Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

**What is CODEOWNERS?**
File mapping paths to owners who are auto-requested as reviewers, put the QA team on `tests/` and `playwright.config.ts`.

Source: [About code owners - GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

**GitHub Issues, Projects, Discussions, Releases, Tags?**
Issues for bugs/tasks with templates and labels; Projects for tables, boards and roadmaps; Discussions for open-ended questions and announcements; Releases attached to tags with notes and artefacts.

Source: [About issues - GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues), [About Projects - GitHub Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects), [About discussions - GitHub Docs](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions), [About releases - GitHub Docs](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

**Dependabot / Renovate?**
Automated dependency update PRs, keep Playwright and browsers current with CI verifying each bump.

Source: [Dependabot version updates - GitHub Docs](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates), [Renovate Docs](https://docs.renovatebot.com/)

**How would you review a test-automation PR?**
Check: test independence, locator quality, web-first assertions, no sleeps, meaningful names, data cleanup, no secrets, config changes justified, CI green including flaky check (`--repeat-each` for new tests), reports/traces attached for reference.

Source: experience, not documentation.
