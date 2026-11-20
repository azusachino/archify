# harus fork of Archify

`azusachino/archify` snapshots [tt-a1i/archify](https://github.com/tt-a1i/archify) and carries a small patch set for the harus workstation. `main` is upstream plus these patches. The workstation, Apricot and the blog install `archify/` as a package from a tarball on this fork's releases (see Personal releases); `vendor/archify` is only for working on the fork.

## Patches

Patches only add files; no upstream file is edited, so syncs cannot conflict.

| Patch | Files | Why |
| --- | --- | --- |
| Importable render API | `archify/lib/render.mjs`, `archify/test/harus-render.test.mjs` | `renderHtml(type, diagram, { quality, repoRoot })` returns standalone HTML, so a docs build can render committed JSON. It runs the unmodified upstream renderer in a child process. |
| Release tarball | `archify/.npmignore` | Keeps demo pages, tests, generators and `skill-release.json` out of the `npm pack` tarball consumers install. Without the release metadata the update check stops before any cache write or fetch. |
| Runtime contract test | `archify/test/harus-runtime.test.mjs` | Fails when a sync ships the release metadata again or adds a network call to the shipped code. |
| These notes | `HARUS.md` | Patch list and sync procedure. |

Deliberately not patched, handled by the workstation instead:

- **Update check code.** Flipping its default breaks 37 upstream tests that assume it is enabled; leaving its release metadata out of the tarball disarms it instead.
- **Draft folder.** Editing `archify/SKILL.md` requires rebuilding the committed `archify.zip` (upstream's builder accepts only Node 22 with a specific zlib), and a test enforces it. `SKILL.md` already honors a user-named location, so the workstation names it in its own documentation.

## Runtime contract

For the workstation, the blog and Apricot, the release tarball is a render runtime and nothing else. It turns diagram JSON into standalone HTML and checks that HTML locally (schema validation, layout gates, a headless browser check). It never reaches the network, never writes outside the input and output paths it is given and the system temp directory, and never opens an application unless a person passes `--open`. Its update notices and install instructions do not apply here: consumers move between releases by changing the pinned URL.

Run `node --test test/harus-runtime.test.mjs test/harus-render.test.mjs` in `archify/` before every release; the first enforces this contract.

## Upstream sync

Sync from upstream `main`, when it carries a fix or feature worth having; there is no schedule. Upstream `main` is the stable line: releases are cut from it and fixes are backported to it, while its website and docs churn is harmless here because only `archify/` is used. Never sync from `dev` (unreleased core work).

```sh
git fetch upstream --tags
git log --oneline main..upstream/main -- archify   # what would change in the package
git switch -c sync/upstream-main-<YYYYMMDD> main
git merge upstream/main                            # resolve conflicts in the patch files above
cd archify && npm ci && timeout 900 npm test && node --test test/harus-*.test.mjs
```

Then open a PR into this fork's `main` (`--repo azusachino/archify`; the default target is upstream) and merge it. Then cut a personal release and move each consumer to its tarball.

## Personal releases

Consumers install the package from a tarball attached to a release of this fork, pinned by URL in their `package.json`; nothing reads a checkout. After each merged sync or patch, from an up-to-date `main`:

```sh
tag=harus-$(date +%Y.%m.%d)                      # append .2 for a second release the same day
(cd archify && npm pack --pack-destination ../.tmp-release)
asset=archify-$(jq -r .version archify/package.json)-${tag#harus-}.tgz
mv .tmp-release/archify-*.tgz ".tmp-release/$asset"
git tag -a "$tag" -m "archify $tag" main && git push origin "$tag"
gh release create "$tag" ".tmp-release/$asset" --repo azusachino/archify --title "$tag" --notes "<upstream revision and what changed>"
rm -r .tmp-release
```

`archify/.npmignore` keeps the rendered example pages, tests and generators out of the tarball. The `harus-` prefix keeps these tags apart from upstream's `v*` release tags; `git describe --tags --match 'v*'` still shows which upstream release one builds on. To upgrade a consumer, change the URL in its `package.json` to the new asset and reinstall; to roll back, point it at an earlier one.
