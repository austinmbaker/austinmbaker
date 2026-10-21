// Pulls the Orbital Dawn RSS feed from Substack and writes data/signals.json.
// Runs in the deploy workflow; no dependencies (Node 20+).
//   SIGNALS_FEED_URL  override the feed (default: Orbital Dawn)
//   SIGNALS_OUT       override the output path (default: data/signals.json)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const FEED_URL = process.env.SIGNALS_FEED_URL || "https://orbitaldawn.substack.com/feed";
const OUT = process.env.SIGNALS_OUT || "data/signals.json";
const SOURCE = "https://orbitaldawn.substack.com";
const MAX_ITEMS = 24;
const EXCERPT_MAX = 240;

// Substack's bot protection rejects bare custom user agents from datacenter
// IPs (403 on GitHub Actions); identify as a feed reader, as Feedly etc. do.
const res = await fetch(FEED_URL, {
  headers: {
    "user-agent": "Mozilla/5.0 (compatible; AustinBakerSite/1.0; +https://austinmbaker.github.io/austinmbaker/)",
    accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
  },
});
if (!res.ok) throw new Error(`Feed request failed: ${res.status} ${res.statusText}`);
const xml = await res.text();

const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)]
  .map(([, block]) => {
    const url = text(block, "link");
    const date = new Date(text(block, "pubDate"));
    const enclosure = block.match(/<enclosure\b[^>]*\burl="([^"]+)"/);
    return {
      title: text(block, "title"),
      url,
      date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      excerpt: truncate(stripTags(text(block, "description", { raw: true }))),
      image: enclosure && isHttps(decodeEntities(enclosure[1])) ? decodeEntities(enclosure[1]) : null,
    };
  })
  .filter((item) => item.title && isHttps(item.url))
  .slice(0, MAX_ITEMS);

if (items.length === 0) throw new Error("Feed parsed but contained no usable items; leaving existing data in place.");

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ source: SOURCE, items }, null, 2) + "\n");
console.log(`Wrote ${items.length} signals to ${OUT}`);

function text(block, tag, { raw = false } = {}) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return "";
  const value = match[1].trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1");
  return raw ? value : decodeEntities(value).trim();
}

function stripTags(value) {
  const html = !value.includes("<") && value.includes("&lt;") ? decodeEntities(value) : value;
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function truncate(value) {
  if (value.length <= EXCERPT_MAX) return value;
  return value.slice(0, value.lastIndexOf(" ", EXCERPT_MAX)).replace(/[,.;:—-]+$/, "") + "…";
}

function decodeEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function isHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
