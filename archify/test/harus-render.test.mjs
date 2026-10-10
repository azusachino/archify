// harus fork: lib/render.mjs regression coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { DIAGRAM_TYPES, renderHtml } from '../lib/render.mjs';

const examples = {
  architecture: 'web-app.architecture.json',
  workflow: 'agent-tool-call.workflow.json',
  sequence: 'cache-miss-request.sequence.json',
  dataflow: 'product-analytics.dataflow.json',
  lifecycle: 'deployment-release.lifecycle.json',
};

const load = (file) => JSON.parse(fs.readFileSync(new URL(`../examples/${file}`, import.meta.url), 'utf8'));

for (const type of DIAGRAM_TYPES) {
  test(`renderHtml renders the ${type} example deterministically and self-contained`, async () => {
    const first = await renderHtml(type, load(examples[type]));
    const second = await renderHtml(type, load(examples[type]));
    assert.match(first, /^<!DOCTYPE html>/i);
    assert.match(first, /<svg[\s>]/);
    assert.equal(first, second);
    assert.doesNotMatch(first, /(src|href)="https?:/);
  });
}

test('renderHtml rejects an unknown diagram type', async () => {
  await assert.rejects(renderHtml('chart', {}), /Unknown diagram type "chart"/);
});

test('renderHtml surfaces renderer validation failures', async () => {
  await assert.rejects(renderHtml('sequence', { meta: {} }), /archify sequence render failed/);
});
