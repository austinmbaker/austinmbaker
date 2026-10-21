// Prefixes root-relative URLs in every HTML file with BASE_PATH, so the site
// works when GitHub Pages serves it from a subpath (austinmbaker.github.io/austinmbaker/).
// Runs on the build copy in the deploy workflow; source files keep plain "/..." paths.
// With a custom domain, BASE_PATH is empty and this is a no-op.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = (process.env.BASE_PATH || "").replace(/\/+$/, "");
const root = process.argv[2] || ".";

if (!base) {
  console.log("No base path; leaving URLs unchanged.");
  process.exit(0);
}
if (!/^\/[\w.-]+(\/[\w.-]+)*$/.test(base)) throw new Error(`Unexpected BASE_PATH: ${base}`);

const ATTR = /\b(href|src|data-include|action)="\/(?!\/)/g;
let changedFiles = 0;

for (const file of await htmlFiles(root)) {
  const html = await readFile(file, "utf8");
  const next = html.replace(ATTR, `$1="${base}/`);
  if (next !== html) {
    await writeFile(file, next);
    changedFiles++;
  }
}
console.log(`Applied base path ${base} to ${changedFiles} HTML files.`);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith(".html")) out.push(path);
  }
  return out;
}
