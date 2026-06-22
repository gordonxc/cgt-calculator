'use strict';

/* ==============================================
 * Capital Gains Tax Calculator
 * Multi-stock · Multiple buy lots · Live FX
 * ============================================== */

// --- State ---
let stockIdCounter = 0;
const stocks = []; // { id, name, lots: [{price, qty}], sellPrice, sellQty }

// --- DOM ---
const els = {
  fxRate:     document.getElementById('fxRate'),
  allowance:  document.getElementById('allowance'),
  stockList:  document.getElementById('stockList'),
  addStock:   document.getElementById('addStock'),
  totalGain:  document.getElementById('totalGainGbp'),
  remaining:  document.getElementById('remainingAllowance'),
  warning:    document.getElementById('warning'),
  fxRefresh:  document.getElementById('fxRefresh'),
  fxSource:   document.getElementById('fxSource'),
  preset3000: document.getElementById('preset3000'),
  preset6000: document.getElementById('preset6000'),
  barFill:    document.getElementById('allowanceBarFill'),
  barUsed:    document.getElementById('allowanceUsed'),
  barPct:     document.getElementById('allowancePct'),
};

// --- Helpers ---
function num(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

function fmtUsd(v) {
  return (v >= 0 ? '' : '-') + '$' + Math.abs(v).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
function fmtGbp(v) {
  return (v >= 0 ? '' : '-') + '£' + Math.abs(v).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// --- Stock CRUD ---
function addStock(data = {}) {
  const id = ++stockIdCounter;
  const stock = {
    id,
    name: data.name || '',
    lots: data.lots || [{price: 0, qty: 0}],
    sellPrice: data.sellPrice || 0,
    sellQty: data.sellQty || 0,
  };
  stocks.push(stock);
  renderStock(stock);
  recalc();
  return stock;
}

function removeStock(id) {
  const idx = stocks.findIndex(s => s.id === id);
  if (idx === -1) return;
  stocks.splice(idx, 1);
  document.getElementById(`stock-${id}`)?.remove();
  recalc();
}

function addLot(stockId) {
  const stock = stocks.find(s => s.id === stockId);
  if (!stock) return;
  stock.lots.push({price: 0, qty: 0});
  renderStockLots(stock);
  recalc();
}

function removeLot(stockId, lotIdx) {
  const stock = stocks.find(s => s.id === stockId);
  if (!stock || stock.lots.length <= 1) return;
  stock.lots.splice(lotIdx, 1);
  renderStockLots(stock);
  recalc();
}

// --- Read live values from DOM into state ---
function syncStockFromDOM(stock) {
  const card = document.getElementById(`stock-${stock.id}`);
  if (!card) return;

  stock.name = card.querySelector('.stock-name').value;
  stock.sellPrice = parseFloat(card.querySelector('.sell-input').value) || 0;
  stock.sellQty = parseFloat(card.querySelector('.sell-qty-input').value) || 0;

  stock.lots = [];
  card.querySelectorAll('.lot-row').forEach(row => {
    stock.lots.push({
      price: parseFloat(row.querySelector('.lot-price').value) || 0,
      qty:   parseFloat(row.querySelector('.lot-qty').value) || 0,
    });
  });
}

// --- Render ---
function renderStock(stock) {
  const div = document.createElement('div');
  div.className = 'stock-card';
  div.id = `stock-${stock.id}`;
  div.innerHTML = `
    <div class="stock-header">
      <input type="text" class="stock-name" placeholder="股票代號" value="${stock.name}">
      <span class="stock-gain-badge positive" data-gain-badge></span>
      <button class="btn-remove-stock" data-remove-stock="${stock.id}">✕</button>
    </div>
    <div class="buy-lots" data-lots></div>
    <button class="btn-add-lot" data-add-lot="${stock.id}">+ 買入批次</button>
    <div class="stock-result" data-stats></div>
    <div class="sell-section">
      <div class="sell-row">
        <label>賣出價<span class="currency-hint">USD</span></label>
        <input type="number" class="sell-input" step="0.01" min="0" placeholder="0.00" value="${stock.sellPrice}">
      </div>
      <div class="sell-row">
        <label>賣出股數</label>
        <input type="number" class="sell-qty-input" step="1" min="0" placeholder="0" value="${stock.sellQty}">
      </div>
      <div class="sell-gain-row">
        <span class="label-tag">此股盈利</span>
        <span class="sell-stat" data-sell-gain>£0.00</span>
      </div>
    </div>
  `;
  els.stockList.appendChild(div);

  renderStockLots(stock);

  // Listeners
  div.addEventListener('input', () => { syncStockFromDOM(stock); recalc(); });
  div.querySelector('.btn-remove-stock').addEventListener('click', () => removeStock(stock.id));
  div.querySelector('.btn-add-lot').addEventListener('click', () => addLot(stock.id));
}

function renderStockLots(stock) {
  const lotsContainer = document.querySelector(`#stock-${stock.id} [data-lots]`);
  lotsContainer.innerHTML = stock.lots.map((lot, i) => `
    <div class="lot-row">
      <div class="lot-input input-wrap">
        <span class="lot-prefix">$</span>
        <input type="number" class="lot-price" step="0.01" min="0" placeholder="買入價" value="${lot.price}">
      </div>
      <div class="lot-input input-wrap">
        <span class="lot-prefix">×</span>
        <input type="number" class="lot-qty" step="1" min="0" placeholder="數量" value="${lot.qty}">
      </div>
      ${stock.lots.length > 1
        ? `<button class="btn-remove-lot" data-lot-idx="${i}">✕</button>`
        : '<div style="width:32px"></div>'}
    </div>
  `).join('');

  // Re-bind lot remove buttons
  lotsContainer.querySelectorAll('.btn-remove-lot').forEach(btn => {
    btn.addEventListener('click', () => removeLot(stock.id, parseInt(btn.dataset.lotIdx)));
  });
}

function renderStockStats(stock) {
  const fx = num('fxRate');
  const card = document.getElementById(`stock-${stock.id}`);
  if (!card) return;

  // Calculate weighted average cost
  const totalCost = stock.lots.reduce((sum, l) => sum + l.price * l.qty, 0);
  const totalShares = stock.lots.reduce((sum, l) => sum + l.qty, 0);
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

  const gainUsd = stock.sellPrice - avgCost;
  const gainGbp = fx > 0 ? gainUsd / fx : 0;
  const totalGainGbp = stock.sellQty * gainGbp;

  // Stats grid
  const statsEl = card.querySelector('[data-stats]');
  statsEl.innerHTML = `
    <div class="stock-stat">
      <div class="stock-stat-label">加權平均成本</div>
      <div class="stock-stat-value">${fmtUsd(avgCost)}</div>
    </div>
    <div class="stock-stat">
      <div class="stock-stat-label">每股盈利（GBP）</div>
      <div class="stock-stat-value ${gainGbp >= 0 ? 'green' : 'red'}">${fmtGbp(gainGbp)}</div>
    </div>
    <div class="stock-stat">
      <div class="stock-stat-label">總持倉</div>
      <div class="stock-stat-value">${totalShares.toLocaleString('en-US')} 股</div>
    </div>
    <div class="stock-stat">
      <div class="stock-stat-label">總賣出額（USD）</div>
      <div class="stock-stat-value">${fmtUsd(stock.sellQty * stock.sellPrice)}</div>
    </div>
  `;

  // Gain badge
  const badge = card.querySelector('[data-gain-badge]');
  if (gainGbp > 0) {
    badge.className = 'stock-gain-badge positive';
    badge.textContent = `+${fmtGbp(gainGbp)}/股`;
  } else if (gainGbp < 0) {
    badge.className = 'stock-gain-badge negative';
    badge.textContent = `${fmtGbp(gainGbp)}/股`;
  } else {
    badge.className = 'stock-gain-badge positive';
    badge.textContent = '—';
  }

  // Sell gain
  const sellGainEl = card.querySelector('[data-sell-gain]');
  sellGainEl.textContent = (totalGainGbp >= 0 ? '+' : '') + fmtGbp(totalGainGbp);
  sellGainEl.className = 'sell-stat ' + (totalGainGbp >= 0 ? 'green' : 'red');
}

// --- Global Recalc ---
function recalc() {
  const fx = num('fxRate');
  const allowance = num('allowance');

  // Sync all stocks from DOM first
  stocks.forEach(s => syncStockFromDOM(s));

  // Per-stock stats
  stocks.forEach(s => renderStockStats(s));

  // Total gain
  const totalGain = stocks.reduce((sum, s) => {
    const totalCost = s.lots.reduce((a, l) => a + l.price * l.qty, 0);
    const totalShares = s.lots.reduce((a, l) => a + l.qty, 0);
    const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
    const gainGbp = fx > 0 ? (s.sellPrice - avgCost) / fx : 0;
    return sum + s.sellQty * gainGbp;
  }, 0);

  const remaining = allowance - totalGain;

  // Summary
  els.totalGain.textContent = (totalGain >= 0 ? '+' : '') + fmtGbp(totalGain);
  els.totalGain.className = 'summary-value ' + (totalGain > allowance ? 'amber' : 'green');

  els.remaining.textContent = fmtGbp(remaining);
  els.remaining.className = 'summary-value ' + (remaining < 0 ? 'amber' : '');

  // Bar
  const pct = allowance > 0 ? Math.min(totalGain / allowance * 100, 100) : 0;
  const exactPct = allowance > 0 ? totalGain / allowance * 100 : 0;
  els.barFill.style.width = pct + '%';
  els.barFill.className = 'allowance-bar-fill' + (totalGain > allowance ? ' over' : '');
  els.barUsed.textContent = `${fmtGbp(totalGain)} / ${fmtGbp(allowance)}`;
  els.barPct.textContent = exactPct.toFixed(1) + '%';

  // Warning
  if (totalGain > allowance && allowance > 0) {
    els.warning.style.display = 'block';
    els.warning.textContent = `⚠️ 總盈利 ${fmtGbp(totalGain)} 超過免稅額 ${fmtGbp(allowance)}，超出 ${fmtGbp(totalGain - allowance)} 需要交 CGT。`;
  } else if (totalGain > 0 && remaining < allowance * 0.05) {
    els.warning.style.display = 'block';
    els.warning.textContent = `⚠️ 已用 ${exactPct.toFixed(1)}% 免稅額，剩餘 ${fmtGbp(remaining)}。`;
  } else {
    els.warning.style.display = 'none';
  }
}

// --- Live FX Rate ---
async function fetchFxRate() {
  const btn = els.fxRefresh;
  const src = els.fxSource;
  btn.classList.remove('fail', 'success');
  btn.classList.add('loading');
  btn.textContent = '⟳';
  src.textContent = '獲取中…';

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const rate = data.rates.USD;
    els.fxRate.value = rate.toFixed(4);
    src.textContent = `✓ 已更新 · ${new Date(data.date).toLocaleDateString('en-GB')} · 來源：Frankfurter / ECB`;
    btn.classList.remove('loading');
    btn.classList.add('success');
    btn.textContent = '✓';
    setTimeout(() => { btn.classList.remove('success'); btn.textContent = '🔄'; }, 2000);
    recalc();
  } catch {
    btn.classList.remove('loading');
    btn.classList.add('fail');
    btn.textContent = '✕';
    src.textContent = '獲取失敗，請手動輸入';
    setTimeout(() => { btn.classList.remove('fail'); btn.textContent = '🔄'; }, 3000);
  }
}

// --- Event Listeners ---
['fxRate', 'allowance'].forEach(id => {
  document.getElementById(id).addEventListener('input', recalc);
});
els.fxRefresh.addEventListener('click', fetchFxRate);
els.preset3000.addEventListener('click', () => { els.allowance.value = 3000; recalc(); });
els.preset6000.addEventListener('click', () => { els.allowance.value = 6000; recalc(); });
els.addStock.addEventListener('click', () => addStock());

// --- Init with demo data ---
addStock({
  name: 'AAPL',
  lots: [{price: 150, qty: 50}, {price: 165, qty: 30}],
  sellPrice: 190,
  sellQty: 40,
});
addStock({
  name: 'MSFT',
  lots: [{price: 380, qty: 20}],
  sellPrice: 420,
  sellQty: 0,
});

fetchFxRate();
