// Update docs/data/docs.js to include the current doc ID as `current: true`
// and set previous entries to current: false. Also update the date.
// - Extracts ID from main.tex (\\newcommand{\\docid}{...})
// - Extracts date from the ID (YYYY-MM-DD) or uses today's date

import fs from 'node:fs/promises';

async function readText(path) {
  return fs.readFile(path, 'utf8');
}

function extractDocId(tex) {
  const m = tex.match(/\\newcommand\{\\docid\}\{([^}]+)\}/);
  return m ? m[1].trim() : null;
}

function dateFromId(id) {
  if (!id) return null;
  const m = id.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function parseRegistry(src) {
  // Execute in a sandboxed Function to obtain window.DOCS
  const fn = Function('window', `${src}; return window.DOCS;`);
  const win = { DOCS: [] };
  try {
    const arr = fn(win);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function serializeRegistry(arr) {
  const header = `// Registry of known document IDs and their status.\n// This file is auto-updated by CI.\n`;
  return `${header}window.DOCS = ${JSON.stringify(arr, null, 2)};\n`;
}

async function main() {
  const tex = await readText('main.tex');
  const id = extractDocId(tex);
  const updated_at = dateFromId(id) || today();

  const regPath = 'docs/data/docs.js';
  const src = await readText(regPath).catch(() => 'window.DOCS = [];');
  const docs = parseRegistry(src);

  // Flip all to non-current first
  for (const r of docs) r.current = false;

  const existing = docs.find(r => r.id === id);
  if (existing) {
    existing.current = true;
    existing.updated_at = updated_at;
    existing.source = 'latest/main.tex';
    existing.note = existing.note || 'Auto-published from main.tex';
  } else {
    docs.push({ id, current: true, updated_at, source: 'latest/main.tex', note: 'Auto-published from main.tex' });
  }

  // Sort by updated_at desc if ISO date format; keep stable otherwise
  docs.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  await fs.writeFile(regPath, serializeRegistry(docs), 'utf8');
}

main().catch(err => { console.error(err); process.exit(1); });

