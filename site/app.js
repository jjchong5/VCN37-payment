import { createWalletClient, custom } from "https://esm.sh/viem@2.52.2";
import { baseSepolia } from "https://esm.sh/viem@2.52.2/chains";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "https://esm.sh/x402-fetch@1.2.0?deps=viem@2.52.2";

const DEFAULT_SELLER_URL = "https://x402-book-seller.onrender.com";
const BASE_SEPOLIA_CHAIN_ID_HEX = "0x14a34"; // 84532

const params = new URLSearchParams(window.location.search);
let sellerUrl =
  params.get("seller") || localStorage.getItem("sellerUrl") || DEFAULT_SELLER_URL;

let walletClient = null;
let fetchWithPay = null;

const connectBtn = document.getElementById("connect-btn");
const walletStatus = document.getElementById("wallet-status");
const catalogEl = document.getElementById("catalog");
const buyerInfoEl = document.getElementById("buyer-info");
const readerEl = document.getElementById("reader");
const readerTitleEl = document.getElementById("reader-title");
const readerAuthorEl = document.getElementById("reader-author");
const readerTextEl = document.getElementById("reader-text");
const paymentProofEl = document.getElementById("payment-proof");
const downloadBtn = document.getElementById("download-btn");
const statusOverlay = document.getElementById("status-overlay");
const statusText = document.getElementById("status-text");
const howItWorksPanel = document.getElementById("how-it-works");
const settingsPanel = document.getElementById("settings");
const sellerUrlInput = document.getElementById("seller-url-input");

sellerUrlInput.value = sellerUrl;

document.getElementById("how-it-works-btn").addEventListener("click", () => {
  howItWorksPanel.classList.toggle("hidden");
});

document.getElementById("settings-btn").addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

document.getElementById("save-settings-btn").addEventListener("click", () => {
  sellerUrl = sellerUrlInput.value.trim() || DEFAULT_SELLER_URL;
  localStorage.setItem("sellerUrl", sellerUrl);
  settingsPanel.classList.add("hidden");
  loadCatalog();
});

document.getElementById("close-reader").addEventListener("click", () => {
  readerEl.classList.add("hidden");
  catalogEl.parentElement.classList.remove("hidden");
});

downloadBtn.addEventListener("click", () => {
  const title = readerTitleEl.textContent;
  const blob = new Blob([readerTextEl.textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function showStatus(text) {
  statusText.textContent = text;
  statusOverlay.classList.remove("hidden");
}

function hideStatus() {
  statusOverlay.classList.add("hidden");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

connectBtn.addEventListener("click", connectWallet);

async function connectWallet() {
  if (!window.ethereum) {
    walletStatus.textContent = "No wallet found — install MetaMask (or another browser wallet) and reload.";
    walletStatus.className = "warning";
    return;
  }

  const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });

  await ensureBaseSepolia();

  walletClient = createWalletClient({
    account: address,
    chain: baseSepolia,
    transport: custom(window.ethereum),
  });
  fetchWithPay = wrapFetchWithPayment(fetch, walletClient);

  walletStatus.textContent = `Connected: ${address}`;
  walletStatus.className = "connected";
  connectBtn.textContent = "Wallet Connected";
  connectBtn.disabled = true;

  buyerInfoEl.textContent = `Buying as ${address} on Base Sepolia`;
  buyerInfoEl.classList.remove("hidden");

  enableBuyButtons(true);
}

async function ensureBaseSepolia() {
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === BASE_SEPOLIA_CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
            chainName: "Base Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

function enableBuyButtons(enabled) {
  for (const btn of document.querySelectorAll(".buy-btn")) {
    btn.disabled = !enabled;
  }
}

async function loadCatalog() {
  const res = await fetch(`${sellerUrl}/books`);
  const catalog = await res.json();

  catalogEl.innerHTML = "";
  for (const book of catalog) {
    const card = document.createElement("div");
    card.className = "book-card";
    card.innerHTML = `
      <h3>${book.title}</h3>
      <p>${book.author}</p>
      <button class="buy-btn" disabled>Buy for $0.01</button>
    `;
    card.querySelector(".buy-btn").addEventListener("click", () => buyBook(book));
    catalogEl.appendChild(card);
  }

  enableBuyButtons(Boolean(walletClient));
}

async function buyBook(book) {
  if (!fetchWithPay) {
    showStatus("Connect your wallet first.");
    await sleep(1500);
    hideStatus();
    return;
  }

  const url = `${sellerUrl}/books/${book.id}`;

  showStatus(`Requesting GET /books/${book.id} with no payment...`);
  await sleep(600);

  showStatus(`402 Payment Required — sign the $0.01 USDC payment in your wallet...`);

  try {
    const res = await fetchWithPay(url);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showStatus(`Error: ${body.error || `request failed (${res.status})`}`);
      await sleep(2500);
      hideStatus();
      return;
    }

    showStatus(`Settling on Base Sepolia...`);
    await sleep(400);

    const data = await res.json();
    const paymentHeader = res.headers.get("x-payment-response");
    const payment = paymentHeader ? decodeXPaymentResponse(paymentHeader) : null;

    hideStatus();
    openReader(data, payment);
  } catch (err) {
    showStatus(`Error: ${err.message}`);
    await sleep(3000);
    hideStatus();
  }
}

function openReader(book, payment) {
  readerTitleEl.textContent = book.title;
  readerAuthorEl.textContent = book.author;

  if (payment && payment.transaction) {
    const explorerUrl = `https://sepolia.basescan.org/tx/${payment.transaction}`;
    paymentProofEl.innerHTML = `✅ Paid $0.01 USDC on Base Sepolia<br/>
      tx: <a href="${explorerUrl}" target="_blank" rel="noopener">${payment.transaction}</a>`;
  } else {
    paymentProofEl.innerHTML = "";
  }

  readerTextEl.textContent = book.text;

  catalogEl.parentElement.classList.add("hidden");
  readerEl.classList.remove("hidden");
}

loadCatalog();
