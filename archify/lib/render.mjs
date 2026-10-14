// harus fork: an importable render API for build-time callers such as a docs
// site. It runs the unmodified upstream renderer in a child process, so no
// upstream file changes and monthly upstream syncs stay conflict-free.
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DIAGRAM_TYPES = ['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle', 'erd', 'class', 'tree', 'timeline', 'waterfall'];

/**
 * Render one typed Archify diagram to standalone HTML.
 * @param {string} type one of DIAGRAM_TYPES
 * @param {object} diagram the parsed candidate JSON
 * @param {{ quality?: 'standard' | 'showcase', repoRoot?: string }} [options]
 * @returns {Promise<string>} the rendered HTML
 */
export async function renderHtml(type, diagram, { quality, repoRoot } = {}) {
  if (!DIAGRAM_TYPES.includes(type)) {
    throw new Error(`Unknown diagram type "${type}". Expected one of: ${DIAGRAM_TYPES.join(', ')}`);
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'archify-render-'));
  try {
    const input = path.join(dir, `diagram.${type}.json`);
    const output = path.join(dir, `diagram.${type}.html`);
    // The schema requires meta.output; point it at our temporary output.
    const meta = { ...diagram.meta, output: path.basename(output) };
    await fs.writeFile(input, JSON.stringify({ ...diagram, meta }));
    const renderer = path.join(skillRoot, 'renderers', type, `render-${type}.mjs`);
    await new Promise((resolve, reject) => {
      execFile(process.execPath, [renderer, input, output], {
        cwd: dir,
        env: {
          ...process.env,
          ...(quality ? { ARCHIFY_QUALITY_PROFILE: quality } : {}),
          ...(repoRoot ? { ARCHIFY_REPO_ROOT: path.resolve(repoRoot) } : {}),
        },
        maxBuffer: 16 * 1024 * 1024,
      }, (error, _stdout, stderr) => {
        if (error) reject(new Error(`archify ${type} render failed:\n${stderr || error.message}`));
        else resolve();
      });
    });
    return await fs.readFile(output, 'utf8');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
