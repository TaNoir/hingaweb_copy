// Shared helpers for the check scripts. Node built-ins only.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const ROOT = process.cwd();

/** Recursively list files under dir (relative to ROOT) whose extension is in exts. */
export function walk(dir, exts) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(abs, name);
    if (statSync(full).isDirectory()) out.push(...walk(relative(ROOT, full), exts));
    else if (exts.some((e) => name.endsWith(e)))
      out.push(relative(ROOT, full).split(sep).join('/'));
  }
  return out.sort();
}

export function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/** Flatten a nested copy object into [ ['a.b.c', 'value'], ... ]. */
export function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key));
    else if (Array.isArray(v)) v.forEach((item, i) => out.push([`${key}.${i}`, String(item)]));
    else out.push([key, String(v)]);
  }
  return out;
}
