const catalogEl = document.getElementById("catalog");
const buyerInfoEl = document.getElementById("buyer-info");
const readerEl = document.getElementById("reader");
const readerTitleEl = document.getElementById("reader-title");
const readerAuthorEl = document.getElementById("reader-author");
const readerTextEl = document.getElementById("reader-text");
const statusOverlay = document.getElementById("status-overlay");
const statusText = document.getElementById("status-text");
const howItWorksPanel = document.getElementById("how-it-works");

document.getElementById("how-it-works-btn").addEventListener("click", () => {
  howItWorksPanel.classList.toggle("hidden");
});

document.getElementById("close-reader").addEventListener("click", () => {
  readerEl.classList.add("hidden");
  catalogEl.parentElement.classList.remove("hidden");
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

async function loadCatalog() {
  const res = await fetch("/api/catalog");
  const { catalog, buyerAddress } = await res.json();

  buyerInfoEl.textContent = `Buying agent wallet: ${buyerAddress} (Base Sepolia testnet)`;

  catalogEl.innerHTML = "";
  for (const book of catalog) {
    const card = document.createElement("div");
    card.className = "book-card";
    card.innerHTML = `
      <h3>${book.title}</h3>
      <p>${book.author}</p>
      <button class="buy-btn">Buy for $0.01</button>
    `;
    card.querySelector(".buy-btn").addEventListener("click", () => buyBook(book));
    catalogEl.appendChild(card);
  }
}

async function buyBook(book) {
  showStatus(`Requesting GET /books/${book.id} with no payment...`);
  await sleep(700);

  showStatus(`402 Payment Required — signing a $0.01 USDC payment authorization...`);
  await sleep(900);

  showStatus(`Retrying with X-PAYMENT header — settling on Base Sepolia...`);

  try {
    const res = await fetch(`/api/buy/${book.id}`);
    const data = await res.json();

    if (!res.ok) {
      showStatus(`Error: ${data.error || "request failed"}`);
      await sleep(2500);
      hideStatus();
      return;
    }

    hideStatus();
    openReader(data.book, data.payment);
  } catch (err) {
    showStatus(`Error: ${err.message}`);
    await sleep(2500);
    hideStatus();
  }
}

function openReader(book, payment) {
  readerTitleEl.textContent = book.title;
  readerAuthorEl.textContent = book.author;

  let proofHtml = "";
  if (payment && payment.transaction) {
    const explorerUrl = `https://sepolia.basescan.org/tx/${payment.transaction}`;
    proofHtml = `<div id="payment-proof">
      ✅ Paid $0.01 USDC on Base Sepolia<br/>
      tx: <a href="${explorerUrl}" target="_blank" rel="noopener">${payment.transaction}</a>
    </div>`;
  }

  const existingProof = document.getElementById("payment-proof");
  if (existingProof) existingProof.remove();

  const proofContainer = document.createElement("div");
  proofContainer.innerHTML = proofHtml;
  readerTextEl.parentElement.insertBefore(proofContainer, readerTextEl);

  readerTextEl.textContent = book.text;

  catalogEl.parentElement.classList.add("hidden");
  readerEl.classList.remove("hidden");
}

loadCatalog();
