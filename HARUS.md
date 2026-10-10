# harus fork of Archify

`azusachino/archify` snapshots [tt-a1i/archify](https://github.com/tt-a1i/archify) and carries a small patch set for the harus workstation. `main` is upstream plus these patches; it is installed as a pinned skill source by the workstation's `make skills`.

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

Sync only when the pinned version gives low-quality results that a newer upstream release fixes; there is no schedule. Sync from upstream release tags only, never upstream `main` (website and sponsor churn) or `dev` (unreleased core work).

```sh
git fetch upstream --tags
git tag --list 'v*' --sort=-v:refname | head -3   # pick the new release, e.g. v3.1.0
git switch -c sync/<tag> main
git merge <tag>                                   # resolve conflicts in the patch files above
cd archify && npm ci && gtimeout 900 npm test
```

Then open a PR into this fork's `main` (`--repo azusachino/archify`; the default target is upstream), merge it, bump the workstation's `[[skills.source]]` `ref` to the new `main` SHA, run `make skills` and rebuild the docs site there.
