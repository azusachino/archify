# harus fork of Archify

`azusachino/archify` snapshots [tt-a1i/archify](https://github.com/tt-a1i/archify) and carries a small patch set for the harus workstation. `main` is upstream plus these patches. The workstation, Apricot, the blog and the cluster site builder run `archify/` straight from a checkout of this `main` (the workstation keeps it at `vendor/archify` behind a thin pointer skill); nothing installs a copy.

## Patches

Patches only add files; no upstream file is edited, so syncs cannot conflict.

| Patch | Files | Why |
| --- | --- | --- |
| Importable render API | `archify/lib/render.mjs`, `archify/test/harus-render.test.mjs` | `renderHtml(type, diagram, { quality, repoRoot })` returns standalone HTML, so a docs build can render committed JSON. It runs the unmodified upstream renderer in a child process. |
| These notes | `HARUS.md` | Patch list and sync procedure. |

Deliberately not patched, handled by the workstation instead:

- **Update check.** Flipping its default breaks 37 upstream tests that assume it is enabled. Set `ARCHIFY_UPDATE_CHECK_DISABLED=1` in the environment.
- **Draft folder.** Editing `archify/SKILL.md` requires rebuilding the committed `archify.zip` (upstream's builder accepts only Node 22 with a specific zlib), and a test enforces it. `SKILL.md` already honors a user-named location, so the workstation names it in its own documentation.

## Upstream sync

Sync from upstream `main`, when it carries a fix or feature worth having; there is no schedule. Upstream `main` is the stable line: releases are cut from it and fixes are backported to it, while its website and docs churn is harmless here because only `archify/` is used. Never sync from `dev` (unreleased core work).

```sh
git fetch upstream --tags
git log --oneline main..upstream/main -- archify   # what would change in the package
git switch -c sync/upstream-main-<YYYYMMDD> main
git merge upstream/main                            # resolve conflicts in the patch files above
cd archify && npm ci && timeout 900 npm test
```

Then open a PR into this fork's `main` (`--repo azusachino/archify`; the default target is upstream) and merge it. Fast-forward the workstation checkout (`make sync NAMES=archify`) and rebuild the docs site there; the cluster site builder clones `main` on its next run.

## Personal tags

After each merged sync, tag the fork's `main` as `harus-<YYYY.MM.DD>` (append `.2` for a second sync the same day) and push the tag. The `harus-` prefix keeps these apart from upstream's `v*` release tags, which arrive with every fetch. A tag names a known-good package to return to: check it out in `vendor/archify` or point a build at it when a later sync misbehaves. `git describe --tags --match 'v*'` still shows which upstream release a tag builds on.
