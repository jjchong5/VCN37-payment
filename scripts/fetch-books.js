import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const booksDir = join(dataDir, "books");

const catalog = JSON.parse(readFileSync(join(dataDir, "catalog.json"), "utf-8"));

if (!existsSync(booksDir)) mkdirSync(booksDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const { id, title } of catalog) {
  const dest = join(booksDir, `${id}.txt`);
  if (existsSync(dest)) {
    console.log(`Skipping ${id} (${title}) — already downloaded`);
    continue;
  }

  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  console.log(`Fetching ${id} (${title}) from ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "vcn37-paywall-demo/1.0 (one-time seed script; contact: jjchong@msn.com)",
    },
  });

  if (!res.ok) {
    console.error(`  Failed: HTTP ${res.status} for id ${id}`);
    continue;
  }

  const text = await res.text();
  writeFileSync(dest, text, "utf-8");
  console.log(`  Saved ${dest} (${text.length} bytes)`);

  await delay(1500);
}

console.log("Done.");
