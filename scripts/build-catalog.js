import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const TARGET_COUNT = 500;
const catalog = [];
let url = "https://gutendex.com/books/?languages=en&sort=popular";

while (url && catalog.length < TARGET_COUNT) {
  console.log(`Fetching ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "vcn37-paywall-demo/1.0 (catalog build; contact: jjchong@msn.com)" },
  });
  if (!res.ok) throw new Error(`gutendex request failed: HTTP ${res.status}`);
  const page = await res.json();

  for (const book of page.results) {
    if (catalog.length >= TARGET_COUNT) break;
    const hasPlainText = Object.keys(book.formats).some((k) => k.startsWith("text/plain"));
    if (!hasPlainText) continue;

    catalog.push({
      id: book.id,
      title: book.title,
      author: book.authors.map((a) => a.name).join(", ") || "Unknown",
    });
  }

  url = page.next;
}

writeFileSync(join(dataDir, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n", "utf-8");
console.log(`Wrote ${catalog.length} entries to data/catalog.json`);
