import "dotenv/config";
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const booksDir = join(dataDir, "books");
const catalogPath = join(dataDir, "catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
const catalogById = new Map(catalog.map((book) => [String(book.id), book]));

// Parses the standard Gutenberg "The Project Gutenberg eBook of <Title>, by <Author>"
// header line. Falls back to "Unknown" since older texts don't always have it.
function parseGutenbergHeader(text) {
  const match = text.match(/Project Gutenberg eBook of (.+?)(?:,)? by (.+)/i);
  return {
    title: match ? match[1].trim() : "Unknown",
    author: match ? match[2].trim().split("\n")[0].trim() : "Unknown",
  };
}

async function fetchAndCacheBook(id) {
  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  const res = await fetch(url, {
    headers: { "User-Agent": "vcn37-paywall-demo/1.0 (on-demand fetch; contact: jjchong@msn.com)" },
  });
  if (!res.ok) return null;

  const text = await res.text();
  if (!existsSync(booksDir)) mkdirSync(booksDir, { recursive: true });
  writeFileSync(join(booksDir, `${id}.txt`), text, "utf-8");

  const { title, author } = parseGutenbergHeader(text);
  const book = { id, title, author };
  catalog.push(book);
  catalogById.set(String(id), book);
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n", "utf-8");

  return { book, text };
}

const app = express();

// Public demo: any origin can browse the catalog and pay for a book directly
// from the browser, so the buyer-facing static site can be hosted separately.
app.use(
  cors({
    exposedHeaders: ["X-PAYMENT-RESPONSE"],
  })
);

// The wallet address that receives payments (yours)
const payTo = process.env.PAY_TO_ADDRESS;

app.use(
  paymentMiddleware(payTo, {
    "/weather": {
      price: "$0.001",
      network: "base-sepolia",
      config: {
        description: "Current weather data",
      },
    },
    "/books/[id]": {
      price: "$0.01",
      network: "base-sepolia",
      config: {
        description: "Full text of a public-domain Project Gutenberg book",
      },
    },
  })
);

app.get("/", (req, res) => {
  res.json({
    name: "x402 Pay-Per-Book Library — seller API",
    endpoints: {
      "GET /books": "free catalog listing",
      "GET /books/:id": "$0.01 USDC on base-sepolia, returns the book text",
      "GET /weather": "$0.001 USDC on base-sepolia, returns a stub weather payload",
    },
    frontend: "https://x402-book-demo.onrender.com",
  });
});

app.get("/weather", (req, res) => {
  res.json({
    location: "San Francisco",
    forecast: "sunny",
    temperature: 68,
    paidFor: true,
  });
});

// Free catalog listing so buyers know what's available before paying.
app.get("/books", (req, res) => {
  res.json(catalog);
});

app.get("/books/:id", async (req, res) => {
  const id = req.params.id;
  const book = catalogById.get(id);

  if (book) {
    const textPath = join(booksDir, `${book.id}.txt`);
    if (existsSync(textPath)) {
      return res.json({ ...book, text: readFileSync(textPath, "utf-8") });
    }
  }

  // Not in the local catalog (or seeded but missing its text file) — the buyer
  // already paid for this route, so try fetching it from Gutenberg live rather
  // than 404ing on a paid request.
  if (!/^\d+$/.test(id)) {
    return res.status(404).json({ error: "Unknown book id" });
  }

  const fetched = await fetchAndCacheBook(id);
  if (!fetched) {
    return res.status(404).json({ error: `No Gutenberg book found for id ${id}` });
  }

  res.json({ ...fetched.book, text: fetched.text });
});

const PORT = process.env.PORT || 4021;
app.listen(PORT, () => {
  console.log(`Paywall live on http://localhost:${PORT}/weather`);
  console.log(`Paywall live on http://localhost:${PORT}/books/:id (catalog at /books)`);
  console.log(`Payments go to: ${payTo}`);
});
