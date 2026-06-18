import "dotenv/config";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
});

const fetchWithPay = wrapFetchWithPayment(fetch, walletClient);

console.log(`Agent ${account.address} browsing /books...`);

const catalogRes = await fetch("http://localhost:4021/books");
const catalog = await catalogRes.json();

const bookId = process.argv[2] ? Number(process.argv[2]) : catalog[0].id;
const picked = catalog.find((book) => book.id === bookId);

if (!picked) {
  console.error(`No book with id ${bookId} in catalog. Available ids: ${catalog.map((b) => b.id).join(", ")}`);
  process.exit(1);
}

console.log(`Buying "${picked.title}" by ${picked.author} (id ${picked.id}) for $0.01...`);

const res = await fetchWithPay(`http://localhost:4021/books/${picked.id}`);
const data = await res.json();

console.log(`Got "${data.title}" — ${data.text.length} characters of text.`);
console.log(data.text.slice(0, 300) + "...");
