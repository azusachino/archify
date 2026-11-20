// harus fork: the release tarball is a render runtime. It renders and checks
// locally and never reaches the network. Fails when an upstream sync adds a
// network call or ships the release metadata that arms the update check.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' }))[0]
  .files.map((file) => file.path);

test('the tarball leaves out release metadata, demo pages and contributor files', () => {
  assert.ok(!packed.includes('skill-release.json'));
  assert.deepEqual(packed.filter((p) => /^examples\/.*\.html$|^test\/|^scripts\/generate-/.test(p)), []);
  for (const required of ['bin/archify.mjs', 'lib/render.mjs', 'SKILL.md', 'assets/template.html']) {
    assert.ok(packed.includes(required), `${required} must ship`);
  }
});

test('the only network call in shipped code is the update check', () => {
  const network = /\bfetch(Impl)?\(|\bhttps?\.(get|request)\(|net\.connect\(|new WebSocket\(|sendBeacon\(/;
  const callers = packed.filter((p) => /\.(mjs|js)$/.test(p))
    .filter((p) => network.test(readFileSync(path.join(root, p), 'utf8')));
  assert.deepEqual(callers, ['scripts/check-update.mjs']);
});

test('without release metadata the update check returns before fetching', async () => {
  const { checkForUpdate } = await import(path.join(root, 'scripts', 'check-update.mjs'));
  delete process.env.ARCHIFY_UPDATE_CHECK_DISABLED; // prove it without the opt-out
  let fetched = false;
  const result = await checkForUpdate({
    releasePath: path.join(root, 'no-such-skill-release.json'),
    cacheDirectory: path.join(root, '..', '.tmp-harus-cache-never-written'),
    fetchImpl: async () => { fetched = true; throw new Error('must not fetch'); },
  });
  assert.equal(fetched, false);
  assert.match(JSON.stringify(result), /invalid-local-release/);
});
