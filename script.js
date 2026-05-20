/* ═══════════════════════════════════════════════════════
   Indian Freelancer Tax Calculator — FY 2026-27
   script.js  |  Vanilla JS — zero startup dependencies
   Chart: inline SVG donut (no Chart.js)
═══════════════════════════════════════════════════════ */

/* ─── Consolidated State Object (#10) ───────────────── */
/*
 * All mutable runtime state lives here.
 * lastResult lets features like dark-mode re-render and
 * future extensions (savings tips, URL sharing, etc.)
 * read the latest calculated data without re-running
 * the engine.
 */
const state = {
  debounce:    null,   // setTimeout handle for debounced recalculation
  hasCalc:     false,  // true once first valid calculation has completed
  altOpen:     false,  // true when "Compare Other Options" grid is open
  activeToast: null,   // reference to the currently visible toast element
  lastResult:  null,   // { takeHome, netPayable, expenses } — for re-renders
};

function resetState() {
  clearTimeout(state.debounce);
  state.hasCalc    = false;
  state.altOpen    = false;
  state.lastResult = null;
  dismissToast();
}

/* ─── Dynamic Script Loader ─────────────────────────── */
/* Only used for html2pdf (PDF export). Chart.js removed. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

/* ─── Formatting Utilities ───────────────────────────── */
function formatINR(val) {
  if (!isFinite(val) || val === null || val === undefined) return 'N/A';
  return '₹\u202f' + Math.round(val).toLocaleString('en-IN');
}

function parseNumber(str) {
  if (typeof str !== 'string') str = String(str || '');
  const val = parseFloat(str.replace(/,/g, '').trim());
  return isNaN(val) ? 0 : val;
}

function formatIndianNumber(val) {
  const num = Math.round(Math.abs(Number(val) || 0));
  return num === 0 ? '' : num.toLocaleString('en-IN');
}

/* ─── Currency Input Fields ──────────────────────────── */
const CURRENCY_FIELDS = [
  'grossReceipts', 'cashReceipts', 'exportIncome', 'interestIncome',
  'rentalIncome', 'expenses', 'deduction80C', 'deduction80CCD',
  'deduction80D', 'homeLoanInterest', 'tdsDeducted'
];

function setupInputFormatting() {
  CURRENCY_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    /* Format with Indian commas on blur */
    el.addEventListener('blur', () => {
      const raw = parseNumber(el.value);
      if (el.value.trim() !== '' && raw >= 0) el.value = formatIndianNumber(raw);
    });

    /* Strip commas on focus so user can edit cleanly */
    el.addEventListener('focus', () => {
      const raw = parseNumber(el.value);
      if (raw !== 0) el.value = raw;
      else if (el.value.trim() !== '' && el.value !== '0') el.value = '';
      el.select();
    });

    /* Validate + trigger conditional logic + schedule recalc */
    el.addEventListener('input', () => {
      const val = parseFloat(el.value.replace(/,/g, ''));
      if (!isNaN(val) && val < 0) showFieldError(el, 'Value cannot be negative');
      else clearFieldError(el);
      if (id === 'grossReceipts') updateConditionalFields();
      scheduleCalculation();
    });
  });
}

/* ─── Field Validation ───────────────────────────────── */
function showFieldError(el, msg) {
  el.classList.add('input-error');
  let err = el.parentElement.querySelector('.field-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'field-error';
    el.parentElement.appendChild(err);
  }
  err.textContent = msg;
}

function clearFieldError(el) {
  el.classList.remove('input-error');
  el.parentElement.querySelector('.field-error')?.remove();
}

/* ─── Conditional Fields ─────────────────────────────── */
function updateConditionalFields() {
  const gross     = parseNumber(document.getElementById('grossReceipts').value);
  const cashGroup = document.getElementById('cashGroup');
  if (gross > 5000000) {
    if (cashGroup.style.display === 'none' || cashGroup.style.display === '') {
      cashGroup.style.display = '';
      cashGroup.classList.remove('slide-in');
      void cashGroup.offsetWidth; /* force reflow so animation restarts */
      cashGroup.classList.add('slide-in');
    }
  } else {
    cashGroup.style.display = 'none';
    const cashInput = document.getElementById('cashReceipts');
    if (cashInput) cashInput.value = '0';
  }
}

/* ─── Accordion ──────────────────────────────────────── */
function toggleDeductions() {
  const content = document.getElementById('deductionsContent');
  const chevron = document.getElementById('deductionsChevron');
  const toggle  = document.getElementById('deductionsToggle');
  const hint    = document.getElementById('deductionsHint');
  const isOpen  = content.classList.contains('open');
  content.classList.toggle('open', !isOpen);
  chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  toggle.setAttribute('aria-expanded', String(!isOpen));
  content.setAttribute('aria-hidden', String(isOpen));
  hint.style.display = isOpen ? '' : 'none';
}

/* ─── Alternatives Toggle ────────────────────────────── */
function toggleAlternatives() {
  const grid    = document.getElementById('alternativesGrid');
  const chevron = document.getElementById('altChevron');
  state.altOpen = !state.altOpen;
  grid.style.display          = state.altOpen ? 'grid' : 'none';
  chevron.style.transform     = state.altOpen ? 'rotate(180deg)' : '';
}

/* ─── Dark Mode ──────────────────────────────────────── */
function isDarkMode() {
  return document.documentElement.classList.contains('dark-mode') ||
    (!document.documentElement.classList.contains('light-mode') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function initDarkMode() {
  const stored = localStorage.getItem('theme');
  const toggle = document.getElementById('darkToggle');
  if (!toggle) return;
  if (stored === 'dark')  { document.documentElement.classList.add('dark-mode');  toggle.textContent = '☀️'; }
  else if (stored === 'light') { document.documentElement.classList.add('light-mode'); toggle.textContent = '🌙'; }
  else { toggle.textContent = isDarkMode() ? '☀️' : '🌙'; }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem('theme') && document.getElementById('darkToggle')) {
      document.getElementById('darkToggle').textContent = isDarkMode() ? '☀️' : '🌙';
    }
    /* Refresh SVG text colours when OS theme changes */
    if (state.lastResult) {
      renderSVGDonut(state.lastResult.takeHome, state.lastResult.netPayable, state.lastResult.expenses);
    }
  });
}

function toggleDarkMode() {
  const html   = document.documentElement;
  const toggle = document.getElementById('darkToggle');
  const dark   = isDarkMode();
  html.classList.toggle('dark-mode',  !dark);
  html.classList.toggle('light-mode',  dark);
  toggle.textContent = dark ? '🌙' : '☀️';
  localStorage.setItem('theme', dark ? 'light' : 'dark');
  /* Re-render SVG donut so center text uses correct colour */
  if (state.lastResult) {
    renderSVGDonut(state.lastResult.takeHome, state.lastResult.netPayable, state.lastResult.expenses);
  }
}

/* ─── Toast Notifications ────────────────────────────── */
function showToast(message, type = 'warning') {
  const container = document.getElementById('toastContainer');
  if (state.activeToast) { state.activeToast.remove(); state.activeToast = null; }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML =
    `<span class="toast-icon">${type === 'warning' ? '⚠️' : 'ℹ️'}</span>` +
    `<span class="toast-msg">${message}</span>` +
    `<button class="toast-close" onclick="dismissToast()" aria-label="Close">×</button>`;
  container.appendChild(toast);
  state.activeToast = toast;
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast-show')));
  setTimeout(dismissToast, 6000);
}

function dismissToast() {
  if (!state.activeToast) return;
  state.activeToast.classList.remove('toast-show');
  const t = state.activeToast;
  state.activeToast = null;
  setTimeout(() => t.parentElement && t.remove(), 380);
}

/* ─── Sticky Mobile Bar ──────────────────────────────── */
function updateStickyBar(amount) {
  const bar = document.getElementById('stickyBar');
  const el  = document.getElementById('stickyAmount');
  if (!bar || !el) return;
  el.textContent = formatINR(amount);
  if (state.hasCalc) bar.classList.add('visible');
}

/* ─── Tooltip Setup ──────────────────────────────────── */
function setupTooltips() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tip-btn');
    if (btn) {
      e.stopPropagation();
      document.querySelectorAll('.tip-bubble.visible').forEach(b => { if (b !== btn._bubble) b.classList.remove('visible'); });
      if (!btn._bubble) {
        const bubble = document.createElement('div');
        bubble.className   = 'tip-bubble';
        bubble.textContent = btn.dataset.tip;
        btn.closest('.input-group').appendChild(bubble);
        btn._bubble = bubble;
      }
      btn._bubble.classList.toggle('visible');
      return;
    }
    document.querySelectorAll('.tip-bubble.visible').forEach(b => b.classList.remove('visible'));
  });
}

/* ─── Tax Engine ─────────────────────────────────────── */
/*
 * FY 2026-27 | Budget 2025
 *
 * New Regime: 87A rebate ₹60,000 → zero tax up to ₹12L.
 *   Marginal relief: tax ≤ (income − ₹12L) for ₹12L < income < ₹12,70,588.
 *
 * Old Regime: 87A rebate ₹12,500 → zero tax up to ₹5L.
 *   Marginal relief: tax ≤ (income − ₹5L)  for ₹5L  < income < ₹5,15,625.
 *
 * Marginal relief prevents the "tax cliff" where crossing the threshold by
 * ₹1 would cost the taxpayer ₹60,000 / ₹12,500 in extra tax.
 */
function getTaxDetails(income, regime) {
  if (income <= 0) return { baseTax: 0, surcharge: 0, cess: 0, total: 0 };

  let tax = 0;

  /* ── New Regime ── */
  if (regime === 'new') {
    if      (income <= 400000)  tax = 0;
    else if (income <= 800000)  tax = (income - 400000)  * 0.05;
    else if (income <= 1200000) tax = 20000  + (income - 800000)  * 0.10;
    else if (income <= 1600000) tax = 60000  + (income - 1200000) * 0.15;
    else if (income <= 2000000) tax = 120000 + (income - 1600000) * 0.20;
    else if (income <= 2400000) tax = 200000 + (income - 2000000) * 0.25;
    else                        tax = 300000 + (income - 2400000) * 0.30;

    /* Sec 87A rebate + marginal relief (#2 fix) */
    if   (income <= 1200000) tax = 0;
    else                     tax = Math.min(tax, income - 1200000);

    let surcharge = 0;
    if      (income > 20000000) surcharge = tax * 0.25;
    else if (income > 10000000) surcharge = tax * 0.15;
    else if (income > 5000000)  surcharge = tax * 0.10;

    const cess = (tax + surcharge) * 0.04;
    return { baseTax: tax, surcharge, cess, total: tax + surcharge + cess };
  }

  /* ── Old Regime ── */
  if (regime === 'old') {
    if      (income <= 250000)  tax = 0;
    else if (income <= 500000)  tax = (income - 250000)  * 0.05;
    else if (income <= 1000000) tax = 12500  + (income - 500000)  * 0.20;
    else                        tax = 112500 + (income - 1000000) * 0.30;

    /* Sec 87A rebate + marginal relief (#2 fix) */
    if   (income <= 500000) tax = 0;
    else                    tax = Math.min(tax, income - 500000);

    let surcharge = 0;
    if      (income > 50000000) surcharge = tax * 0.37;
    else if (income > 20000000) surcharge = tax * 0.25;
    else if (income > 10000000) surcharge = tax * 0.15;
    else if (income > 5000000)  surcharge = tax * 0.10;

    const cess = (tax + surcharge) * 0.04;
    return { baseTax: tax, surcharge, cess, total: tax + surcharge + cess };
  }

  return { baseTax: 0, surcharge: 0, cess: 0, total: 0 };
}

/* ─── SVG Donut Chart (#6 — replaces Chart.js) ───────── */
/*
 * Pure SVG + HTML legend. Zero external dependencies.
 * Renders instantly (no async CDN fetch). ~40 lines.
 * Re-renders on dark mode toggle using state.lastResult.
 */
function renderSVGDonut(takeHome, taxesPaid, expenses) {
  const svgEl    = document.getElementById('summaryChart');
  const legendEl = document.getElementById('chartLegend');
  if (!svgEl) return;

  const sliceData = [
    { val: Math.max(0, takeHome),  color: '#2563eb', label: 'Take-Home Pay'      },
    { val: Math.max(0, taxesPaid), color: '#ef4444', label: 'Taxes Paid'          },
    { val: Math.max(0, expenses),  color: '#10b981', label: 'Business Expenses'   },
  ];
  const total  = sliceData.reduce((s, d) => s + d.val, 0);
  const slices = sliceData.filter(d => d.val > 0);

  const cx = 160, cy = 120, R = 105, r = 65;
  const dark   = isDarkMode();
  const fill1  = dark ? '#e2e8f0' : '#0f172a';  /* center value text */
  const fill2  = dark ? '#64748b' : '#94a3b8';  /* center label text */
  const bgFill = dark ? '#0d1b2e' : '#ffffff';  /* donut hole background */

  /* ── Build arc paths ── */
  let arcs = '';
  if (total <= 0) {
    /* Empty state: grey ring */
    arcs = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#e2e8f0"/>`;
  } else if (slices.length === 1) {
    /* Single slice: full circle */
    arcs = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${slices[0].color}"/>`;
  } else {
    let angle = -Math.PI / 2; /* Start at 12 o'clock */
    arcs = slices.map(slice => {
      const span = (slice.val / total) * 2 * Math.PI;
      const end  = angle + span;
      const lg   = span > Math.PI ? 1 : 0;
      const fmt  = n => n.toFixed(3);
      const d = [
        `M ${fmt(cx + R * Math.cos(angle))} ${fmt(cy + R * Math.sin(angle))}`,
        `A ${R} ${R} 0 ${lg} 1 ${fmt(cx + R * Math.cos(end))} ${fmt(cy + R * Math.sin(end))}`,
        `L ${fmt(cx + r * Math.cos(end))} ${fmt(cy + r * Math.sin(end))}`,
        `A ${r} ${r} 0 ${lg} 0 ${fmt(cx + r * Math.cos(angle))} ${fmt(cy + r * Math.sin(angle))}`,
        'Z',
      ].join(' ');
      angle = end;
      return `<path d="${d}" fill="${slice.color}" class="donut-slice"><title>${slice.label}: ${formatINR(slice.val)}</title></path>`;
    }).join('');
  }

  /* ── Donut hole + centre text ── */
  const hole = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bgFill}"/>`;
  const center = total > 0
    ? `<text x="${cx}" y="${cy - 8}"  text-anchor="middle" class="donut-center-label" fill="${fill2}">Total Income</text>` +
      `<text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-center-value" fill="${fill1}">${formatINR(total)}</text>`
    : '';

  svgEl.innerHTML = arcs + hole + center;

  /* ── HTML Legend (outside SVG for responsive layout) ── */
  if (legendEl) {
    legendEl.innerHTML = sliceData.map(d =>
      `<div class="legend-item">` +
        `<span class="legend-dot" style="background:${d.color}"></span>` +
        `<span class="legend-label">${d.label}</span>` +
        `<span class="legend-value">${formatINR(d.val)}</span>` +
      `</div>`
    ).join('');
  }
}

/* ─── Advance Tax Schedule ───────────────────────────── */
function renderAdvanceSchedule(netPayable, scenarioName) {
  const table = document.getElementById('advanceSchedule');
  if (netPayable <= 0) {
    table.innerHTML = '<tr><th>Note</th><td>No advance tax is due. Your liability is fully covered by TDS or a refund is expected.</td></tr>';
    return;
  }
  if (scenarioName.includes('44ADA')) {
    table.innerHTML =
      '<tr><th>Due Date</th><th>Instalment</th><th>Amount</th></tr>' +
      `<tr><td>15 March</td><td>100%</td><td>${formatINR(netPayable)}</td></tr>`;
    return;
  }
  const instalments = [
    { date: '15 June',  pct: 15 },
    { date: '15 Sept',  pct: 30 },
    { date: '15 Dec',   pct: 30 },
    { date: '15 March', pct: 25 },
  ];
  let rows = '<tr><th>Due Date</th><th>Instalment</th><th>Amount</th></tr>';
  let sum  = 0;
  instalments.forEach(({ date, pct }) => {
    const amt = Math.round((netPayable * pct) / 100);
    sum += amt;
    rows += `<tr><td>${date}</td><td>${pct}%</td><td>${formatINR(amt)}</td></tr>`;
  });
  const diff = Math.round(netPayable - sum);
  if (diff !== 0) rows += `<tr><td colspan="2"><strong>Rounding Adjustment</strong></td><td><strong>${formatINR(diff)}</strong></td></tr>`;
  table.innerHTML = rows;
}

/* ─── Hero & Alternative Cards ───────────────────────── */
const SCENARIO_META = {
  '44ADA + New Regime':   'Presumptive: 50% of receipts deemed profit. No investment deductions needed.',
  '44ADA + Old Regime':   'Presumptive 50% profit with Old Regime Chapter VI-A deductions applied.',
  'Regular + New Regime': 'Actual expenses deducted. Simple — no 80C/NPS/HI tracking required.',
  'Regular + Old Regime': 'Actual expenses + all Old Regime deductions (80C, NPS, Health Ins, Home Loan).',
};

function renderHeroCard(best) {
  document.getElementById('heroName').textContent      = best.name;
  document.getElementById('heroTaxAmount').textContent = formatINR(best.details.total);
  document.getElementById('heroIncome').textContent    = formatINR(best.income);
  document.getElementById('heroNote').textContent      = SCENARIO_META[best.name] || '';
}

function renderAlternativeCards(allScenarios, best, is44ADAElig) {
  document.getElementById('alternativesGrid').innerHTML = allScenarios
    .filter(s => s.name !== best.name)
    .map(s => {
      const na  = !is44ADAElig && s.name.includes('44ADA');
      return (
        `<div class="alt-card${na ? ' alt-card-disabled' : ''}">` +
          `<h4>${s.name}</h4>` +
          `<div class="alt-tax">${na ? 'Not Eligible' : formatINR(s.details.total)}</div>` +
          `<p class="alt-income">Taxable Income: ${na ? 'N/A' : formatINR(s.income)}</p>` +
          `<p class="alt-note">${SCENARIO_META[s.name] || ''}</p>` +
        `</div>`
      );
    }).join('');
}

/* ─── PDF Export ─────────────────────────────────────── */
function downloadReport() {
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js')
    .then(() => {
      html2pdf()
        .set({ margin: 10, filename: 'freelancer-tax-report.pdf', html2canvas: { scale: 2 } })
        .from(document.getElementById('report'))
        .save();
    })
    .catch(err => console.error('html2pdf failed to load:', err));
}

/* ─── Breakdown Toggle ───────────────────────────────── */
function toggleBreakdown() {
  const bd = document.getElementById('breakdown');
  bd.style.display = bd.style.display === 'block' ? 'none' : 'block';
}

/* ─── Debounced Auto-Calculation ─────────────────────── */
function scheduleCalculation() {
  clearTimeout(state.debounce);
  state.debounce = setTimeout(calculateTaxes, 350);
}

/* ─── Main Calculation ───────────────────────────────── */
function calculateTaxes() {
  /* Parse all inputs */
  const grossReceipts    = parseNumber(document.getElementById('grossReceipts').value);
  const cashReceipts     = parseNumber(document.getElementById('cashReceipts')?.value || '0');
  const exportIncome     = parseNumber(document.getElementById('exportIncome').value);
  const expenses         = parseNumber(document.getElementById('expenses').value);
  const interestIncome   = parseNumber(document.getElementById('interestIncome').value);
  const rentalIncome     = parseNumber(document.getElementById('rentalIncome').value);
  const deduction80C     = parseNumber(document.getElementById('deduction80C').value);
  const deduction80CCD   = parseNumber(document.getElementById('deduction80CCD').value);
  const deduction80D     = parseNumber(document.getElementById('deduction80D').value);
  const homeLoanInterest = parseNumber(document.getElementById('homeLoanInterest').value);
  const tdsDeducted      = parseNumber(document.getElementById('tdsDeducted').value);

  /* Validate — reject negatives */
  const fields = {
    grossReceipts, cashReceipts, exportIncome, expenses, interestIncome,
    rentalIncome, deduction80C, deduction80CCD, deduction80D, homeLoanInterest, tdsDeducted
  };
  let hasError = false;
  for (const [id, val] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (val < 0) { showFieldError(el, 'Value cannot be negative'); hasError = true; }
  }
  if (hasError) return;

  /* Nothing meaningful yet */
  if (grossReceipts === 0 && interestIncome === 0 && rentalIncome === 0) return;

  /* ── 44ADA eligibility ── */
  const cashPct     = grossReceipts > 0 ? (cashReceipts / grossReceipts) * 100 : 0;
  const limit44ADA  = cashPct <= 5 ? 7500000 : 5000000;
  const is44ADAElig = grossReceipts <= limit44ADA;

  /* ── Sec 24(a): 30% standard deduction on rental income (both regimes) ── */
  const rentalNet = rentalIncome * 0.70;

  /* ── Chapter VI-A deductions (Old Regime only) ── */
  const chapVIA =
    Math.min(deduction80C,     150000) +
    Math.min(deduction80CCD,    50000) +
    Math.min(deduction80D,      50000) +
    Math.min(homeLoanInterest, 200000);

  const otherNew    = interestIncome + rentalNet;
  const otherOld    = interestIncome + rentalNet - chapVIA;

  /* ── Four scenarios ── */
  const incRegNew   = Math.max(0, grossReceipts - expenses + otherNew);
  const incRegOld   = Math.max(0, grossReceipts - expenses + otherOld);
  const inc44ADANew = is44ADAElig ? Math.max(0, grossReceipts * 0.5 + otherNew) : 0;
  const inc44ADAOld = is44ADAElig ? Math.max(0, grossReceipts * 0.5 + otherOld) : 0;

  const NA = { total: Infinity, baseTax: 0, surcharge: 0, cess: 0 };

  const allScenarios = [
    { name: 'Regular + New Regime', details: getTaxDetails(incRegNew,   'new'), income: incRegNew   },
    { name: 'Regular + Old Regime', details: getTaxDetails(incRegOld,   'old'), income: incRegOld   },
    { name: '44ADA + New Regime',   details: is44ADAElig ? getTaxDetails(inc44ADANew, 'new') : NA, income: inc44ADANew },
    { name: '44ADA + Old Regime',   details: is44ADAElig ? getTaxDetails(inc44ADAOld, 'old') : NA, income: inc44ADAOld },
  ];

  const valid      = is44ADAElig ? allScenarios : allScenarios.slice(0, 2);
  const best       = valid.reduce((b, c) => c.details.total < b.details.total ? c : b);
  const netPayable = Math.max(0, best.details.total - tdsDeducted);
  const taxRefund  = Math.max(0, tdsDeducted - best.details.total);
  const totalIncome = grossReceipts + interestIncome + rentalIncome;
  const takeHome    = Math.max(0, totalIncome - expenses - netPayable);

  /* ── Store result for dark-mode re-renders & future features ── */
  state.lastResult = { takeHome, netPayable, expenses };

  /* ── Update DOM ── */
  renderHeroCard(best);
  renderAlternativeCards(allScenarios, best, is44ADAElig);

  document.getElementById('net-tax').textContent    = formatINR(netPayable);
  document.getElementById('tax-refund').textContent = formatINR(taxRefund);
  document.getElementById('itr-recommendation').textContent =
    best.name.includes('44ADA')
      ? 'ITR-4 (Sugam) — Sec 44ADA eligible.'
      : 'ITR-3 — Maintain Balance Sheet & P&L.';

  document.getElementById('breakdownScenario').textContent  = best.name;
  document.getElementById('breakdownBaseTax').textContent   = formatINR(best.details.baseTax);
  document.getElementById('breakdownSurcharge').textContent = formatINR(best.details.surcharge);
  document.getElementById('breakdownCess').textContent      = formatINR(best.details.cess);
  document.getElementById('breakdownTotalTax').textContent  = formatINR(best.details.total);

  /* SVG donut — no external library, renders synchronously */
  renderSVGDonut(takeHome, netPayable, expenses);

  renderAdvanceSchedule(netPayable, best.name);

  /* GST warning toast */
  const domesticReceipts = Math.max(0, grossReceipts - exportIncome);
  if (grossReceipts > 2000000) {
    showToast(
      `Gross receipts exceed ₹20,00,000. GST registration likely mandatory for domestic services. ` +
      `Domestic: ${formatINR(domesticReceipts)} · Export: ${formatINR(exportIncome)}.`,
      'warning'
    );
  } else {
    dismissToast();
  }

  updateStickyBar(netPayable);

  /* Reveal results section on first successful calculation */
  if (!state.hasCalc) {
    document.getElementById('skeletonState').style.display = 'none';
    document.getElementById('report').style.display        = '';
    document.getElementById('exportBtn').style.display     = '';
    document.getElementById('printBtn').style.display      = '';
    state.hasCalc = true;
  }
}

/* ─── Init ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  setupInputFormatting();
  setupTooltips();
});
