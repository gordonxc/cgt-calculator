'use strict';

/* ==============================================
 * Capital Gains Tax Calculator
 * Calculates max shares to sell within CGT allowance
 * ============================================== */

// --- DOM ---
const els = {
  buyPrice:    document.getElementById('buyPrice'),
  sellPrice:   document.getElementById('sellPrice'),
  fxRate:      document.getElementById('fxRate'),
  allowance:   document.getElementById('allowance'),
  maxShares:   document.getElementById('maxShares'),
  gainUsd:     document.getElementById('gainUsd'),
  gainGbp:     document.getElementById('gainGbp'),
  totalSellUsd:document.getElementById('totalSellUsd'),
  totalGainGbp:document.getElementById('totalGainGbp'),
  remaining:   document.getElementById('remainingAllowance'),
  warning:     document.getElementById('warning'),
  fxRefresh:   document.getElementById('fxRefresh'),
  fxSource:    document.getElementById('fxSource'),
  preset3000:  document.getElementById('preset3000'),
};

// --- Main Calculation ---
function calc() {
  const buy      = parseFloat(els.buyPrice.value) || 0;
  const sell     = parseFloat(els.sellPrice.value) || 0;
  const fx       = parseFloat(els.fxRate.value) || 0;
  const allowance= parseFloat(els.allowance.value) || 0;

  const gainUsd = sell - buy;
  const gainGbp = fx > 0 ? gainUsd / fx : 0;

  let maxShares = 0;
  let warning = '';

  if (gainUsd <= 0) {
    maxShares = Infinity;
    warning = '⚠️ 賣出價 ≤ 買入價，無資本增值，可以隨意賣出。';
  } else if (gainGbp > 0 && allowance > 0) {
    maxShares = Math.floor(allowance / gainGbp);
    if (maxShares === 0) {
      warning = '⚠️ 每股盈利已超過免稅額，賣任何一股都要交稅。';
    }
  }

  // Per-share gain
  els.gainUsd.textContent = (gainUsd >= 0 ? '+' : '') + '$' + gainUsd.toFixed(2);
  els.gainGbp.textContent = (gainGbp >= 0 ? '+' : '') + '£' + gainGbp.toFixed(2);

  // Totals
  const totalSellUsd = maxShares * sell;
  const totalGainGbp = maxShares * gainGbp;
  const remaining    = allowance - totalGainGbp;

  els.totalSellUsd.textContent = '$' + totalSellUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  els.totalGainGbp.textContent = '£' + totalGainGbp.toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  els.remaining.textContent    = '£' + remaining.toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  // Max shares
  els.maxShares.textContent = maxShares === Infinity ? '∞' : maxShares.toLocaleString('en-US');

  // Warning
  if (warning) {
    els.warning.style.display = 'block';
    els.warning.textContent = warning;
  } else {
    els.warning.style.display = 'none';
  }
}

// --- Live FX Rate (Frankfurter API / ECB data) ---
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
    setTimeout(() => {
      btn.classList.remove('success');
      btn.textContent = '🔄';
    }, 2000);

    calc();
  } catch (err) {
    btn.classList.remove('loading');
    btn.classList.add('fail');
    btn.textContent = '✕';
    src.textContent = '獲取失敗，請手動輸入';
    setTimeout(() => {
      btn.classList.remove('fail');
      btn.textContent = '🔄';
    }, 3000);
  }
}

// --- Event Listeners ---
['buyPrice', 'sellPrice', 'fxRate', 'allowance'].forEach(id => {
  document.getElementById(id).addEventListener('input', calc);
});

els.fxRefresh.addEventListener('click', fetchFxRate);

els.preset3000.addEventListener('click', () => {
  els.allowance.value = 3000;
  calc();
});

// --- Init ---
fetchFxRate();
