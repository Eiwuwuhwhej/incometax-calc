/* ═══════════════════════════════════════════════════════
   Indian Freelancer Tax Calculator — FY 2026-27
   script.js  |  Vanilla JS, no dependencies at startup
═══════════════════════════════════════════════════════ */

/* ─── State ─────────────────────────────────────────── */
let summaryChart    = null;
let debounceTimer   = null;
let hasCalculated   = false;
let altOpen         = false;
let activeToast     = null;

/* ─── Dynamic Script Loader ─────────────────────────── */
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
  const cleaned = str.replace(/,/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function formatIndianNumber(val) {
  const num = Math.round(Math.abs(Number(val) || 0));
  if (num === 0) return '';
  return num.toLocaleString('en-IN');
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
      if (el.value.trim() !== '' && raw >= 0) {
        el.value = formatIndianNumber(raw);
      }
    });

    /* Strip commas on focus so user can edit the number cleanly */
    el.addEventListener('focus', () => {
      const raw = parseNumber(el.value);
      if (raw !== 0) el.value = raw;
      else if (el.value.trim() !== '' && el.value !== '0') el.value = '';
      el.select();
    });

    /* Validate, conditional fields, schedule recalculation */
    el.addEventListener('input', () => {
      const raw = el.value.replace(/,/g, '');
      const val = parseFloat(raw);
      if (!isNaN(val) && val < 0) {
        showFieldError(el, 'Value cannot be negative');
      } else {
        clearFieldError(el);
      }
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
  const err = el.parentElement.querySelector('.field-error');
  if (err) err.remove();
}

/* ─── Conditional Fields ─────────────────────────────── */
function updateConditionalFields() {
  const gross    = parseNumber(document.getElementById('grossReceipts').value);
  const cashGroup = document.getElementById('cashGroup');
  if (gross > 5000000) {
    if (cashGroup.style.display === 'none' || cashGroup.style.display === '') {
      cashGroup.style.display = '';
      cashGroup.classList.remove('slide-in');
      void cashGroup.offsetWidth; /* reflow for animation restart */
      cashGroup.classList.add('slide-in');
    }
  } else {
    cashGroup.style.display = 'none';
    /* Reset cash value when hidden so it doesn't affect calculations */
    const cashInput = document.getElementById('cashReceipts');
    if (cashInput) cashInput.value = '0';
  }
}

/* ─── Accordion (Deductions) ─────────────────────────── */
function toggleDeductions() {
  const content  = document.getElementById('deductionsContent');
  const chevron  = document.getElementById('deductionsChevron');
  const toggle   = document.getElementById('deductionsToggle');
  const hint     = document.getElementById('deductionsHint');
  const isOpen   = content.classList.contains('open');

  if (isOpen) {
    content.classList.remove('open');
    chevron.style.transform = '';
    toggle.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
    hint.style.display = '';
  } else {
    content.classList.add('open');
    chevron.style.transform = 'rotate(180deg)';
    toggle.setAttribute('aria-expanded', 'true');
    content.setAttribute('aria-hidden', 'false');
    hint.style.display = 'none';
  }
}

/* ─── Alternatives Toggle ────────────────────────────── */
function toggleAlternatives() {
  const grid    = document.getElementById('alternativesGrid');
  const chevron = document.getElementById('altChevron');
  altOpen = !altOpen;
  if (altOpen) {
    grid.style.display = 'grid';
    chevron.style.transform = 'rotate(180deg)';
  } else {
    grid.style.display = 'none';
    chevron.style.transform = '';
  }
}

/* ─── Dark Mode ──────────────────────────────────────── */
function initDarkMode() {
  const stored = localStorage.getItem('theme');
  const toggle = document.getElementById('darkToggle');
  if (!toggle) return;

  if (stored === 'dark') {
    document.documentElement.classList.add('dark-mode');
    toggle.textContent = '☀️';
  } else if (stored === 'light') {
    document.documentElement.classList.add('light-mode');
    toggle.textContent = '🌙';
  } else {
    /* Follow OS */
    toggle.textContent = window.matchMedia('(prefers-color-scheme: dark)').matches ? '☀️' : '🌙';
  }

  /* Sync toggle icon when OS preference changes */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      toggle.textContent = e.matches ? '☀️' : '🌙';
    }
  });
}

function toggleDarkMode() {
  const html   = document.documentElement;
  const toggle = document.getElementById('darkToggle');
  const isDark = html.classList.contains('dark-mode') ||
    (!html.classList.contains('light-mode') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    html.classList.remove('dark-mode');
    html.classList.add('light-mode');
    toggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.remove('light-mode');
    html.classList.add('dark-mode');
    toggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
  /* Redraw chart with correct legend colour */
  if (summaryChart) {
    const isDarkNow = html.classList.contains('dark-mode') ||
      (!html.classList.contains('light-mode') &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    summaryChart.options.plugins.legend.labels.color = isDarkNow ? '#94a3b8' : '#475569';
    summaryChart.update();
  }
}

/* ─── Toast Notifications ────────────────────────────── */
function showToast(message, type = 'warning') {
  const container = document.getElementById('toastContainer');
  if (activeToast) { activeToast.remove(); activeToast = null; }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML =
    `<span class="toast-icon">${type === 'warning' ? '⚠️' : 'ℹ️'}</span>` +
    `<span class="toast-msg">${message}</span>` +
    `<button class="toast-close" onclick="dismissToast()" aria-label="Close">×</button>`;
  container.appendChild(toast);
  activeToast = toast;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-show'));
  });

  /* Auto-dismiss after 6 s */
  setTimeout(() => dismissToast(), 6000);
}

function dismissToast() {
  if (!activeToast) return;
  activeToast.classList.remove('toast-show');
  const t = activeToast;
  activeToast = null;
  setTimeout(() => { if (t.parentElement) t.remove(); }, 380);
}

/* ─── Sticky Mobile Bar ──────────────────────────────── */
function updateStickyBar(amount) {
  const bar      = document.getElementById('stickyBar');
  const amountEl = document.getElementById('stickyAmount');
  if (!bar || !amountEl) return;
  amountEl.textContent = formatINR(amount);
  if (hasCalculated) bar.classList.add('visible');
}

/* ─── Tooltip Setup ──────────────────────────────────── */
function setupTooltips() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tip-btn');
    if (btn) {
      e.stopPropagation();
      /* Close others */
      document.querySelectorAll('.tip-bubble.visible').forEach(b => {
        if (b !== btn._bubble) b.classList.remove('visible');
      });
      /* Create bubble once */
      if (!btn._bubble) {
        const bubble = document.createElement('div');
        bubble.className = 'tip-bubble';
        bubble.textContent = btn.dataset.tip;
        btn.closest('.input-group').appendChild(bubble);
        btn._bubble = bubble;
      }
      btn._bubble.classList.toggle('visible');
      return;
    }
    /* Click outside dismisses all */
    document.querySelectorAll('.tip-bubble.visible').forEach(b => b.classList.remove('visible'));
  });
}

/* ─── Tax Engine ─────────────────────────────────────── */
/*
 * FY 2026-27 slabs as per Budget 2025.
 * New Regime:  87A rebate up to ₹12,00,000 (₹60,000 max rebate).
 * Old Regime:  87A rebate up to ₹ 5,00,000 (₹12,500 max rebate).
 */
function getTaxDetails(income, regime) {
  if (income <= 0) return { baseTax: 0, surcharge: 0, cess: 0, total: 0 };

  let tax = 0;

  /* ── New Regime ── */
  if (regime === 'new') {
    if      (income <= 400000)  tax = 0;
    else if (income <= 800000)  tax = (income - 400000) * 0.05;
    else if (income <= 1200000) tax = 20000  + (income - 800000)  * 0.10;
    else if (income <= 1600000) tax = 60000  + (income - 1200000) * 0.15;
    else if (income <= 2000000) tax = 120000 + (income - 1600000) * 0.20;
    else if (income <= 2400000) tax = 200000 + (income - 2000000) * 0.25;
    else                        tax = 300000 + (income - 2400000) * 0.30;

    /* BUG FIX: Sec 87A rebate for New Regime — up to ₹12L (FY 2026-27) */
    if (income <= 1200000) tax = 0;

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
    else if (income <= 1000000) tax = 12500 + (income - 500000)  * 0.20;
    else                        tax = 112500 + (income - 1000000) * 0.30;

    /* BUG FIX: Sec 87A rebate for Old Regime — up to ₹5L only */
    if (income <= 500000) tax = 0;

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

/* ─── Chart ──────────────────────────────────────────── */
function updateChart(takeHome, taxesPaid, businessExpenses) {
  loadScript('https://cdn.jsdelivr.net/npm/chart.js')
    .then(() => {
      const ctx = document.getElementById('summaryChart').getContext('2d');
      if (summaryChart) summaryChart.destroy();

      const isDark = document.documentElement.classList.contains('dark-mode') ||
        (!document.documentElement.classList.contains('light-mode') &&
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      const legendColor = isDark ? '#94a3b8' : '#475569';

      summaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Take-Home Pay', 'Taxes Paid', 'Business Expenses'],
          datasets: [{
            data: [Math.max(0, takeHome), Math.max(0, taxesPaid), Math.max(0, businessExpenses)],
            backgroundColor: ['#2563eb', '#ef4444', '#10b981'],
            borderWidth: 0,
            hoverOffset: 10,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          layout: { padding: 10 },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: legendColor, padding: 22, font: { size: 13, family: 'Inter, Segoe UI, sans-serif' } }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ${formatINR(ctx.raw)}`
              }
            }
          }
        }
      });
    })
    .catch(err => console.error('Chart.js failed to load:', err));
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
    { date: '15 June',    pct: 15 },
    { date: '15 Sept',    pct: 30 },
    { date: '15 Dec',     pct: 30 },
    { date: '15 March',   pct: 25 },
  ];
  let rows  = '<tr><th>Due Date</th><th>Instalment</th><th>Amount</th></tr>';
  let total = 0;
  instalments.forEach(inst => {
    const amt = Math.round((netPayable * inst.pct) / 100);
    total += amt;
    rows += `<tr><td>${inst.date}</td><td>${inst.pct}%</td><td>${formatINR(amt)}</td></tr>`;
  });
  const diff = Math.round(netPayable - total);
  if (diff !== 0) {
    rows += `<tr><td colspan="2"><strong>Rounding Adjustment</strong></td><td><strong>${formatINR(diff)}</strong></td></tr>`;
  }
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
  document.getElementById('heroName').textContent        = best.name;
  document.getElementById('heroTaxAmount').textContent   = formatINR(best.details.total);
  document.getElementById('heroIncome').textContent      = formatINR(best.income);
  document.getElementById('heroNote').textContent        = SCENARIO_META[best.name] || '';
}

function renderAlternativeCards(allScenarios, best, is44ADAEligible) {
  const grid = document.getElementById('alternativesGrid');
  const alts = allScenarios.filter(s => s.name !== best.name);

  grid.innerHTML = alts.map(s => {
    const notEligible = !is44ADAEligible && s.name.includes('44ADA');
    const taxStr = notEligible
      ? 'Not Eligible'
      : (s.details.total === Infinity ? 'N/A' : formatINR(s.details.total));
    const incStr = notEligible ? 'N/A' : formatINR(s.income);
    const cls    = 'alt-card' + (notEligible ? ' alt-card-disabled' : '');
    return (
      `<div class="${cls}">` +
        `<h4>${s.name}</h4>` +
        `<div class="alt-tax">${taxStr}</div>` +
        `<p class="alt-income">Taxable Income: ${incStr}</p>` +
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
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(calculateTaxes, 350);
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

  /* Validate — no negatives */
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

  /* Nothing meaningful entered yet */
  if (grossReceipts === 0 && interestIncome === 0 && rentalIncome === 0) return;

  /* ── 44ADA eligibility ── */
  const cashPct      = grossReceipts > 0 ? (cashReceipts / grossReceipts) * 100 : 0;
  const limit44ADA   = cashPct <= 5 ? 7500000 : 5000000;
  const is44ADAElig  = grossReceipts <= limit44ADA;

  /* ── Sec 24(a): 30% standard deduction on rental income — BOTH regimes ── */
  const rentalNet = rentalIncome * 0.70;

  /* ── Chapter VI-A deductions (Old Regime only) ── */
  const chapVIA =
    Math.min(deduction80C,     150000) +
    Math.min(deduction80CCD,    50000) +
    Math.min(deduction80D,      50000) +
    Math.min(homeLoanInterest, 200000);

  /* ── Income bases ── */
  // "Other income" after applicable deductions
  const otherNew = interestIncome + rentalNet;
  const otherOld = interestIncome + rentalNet - chapVIA;

  // Regular Method
  const incRegNew   = Math.max(0, grossReceipts - expenses + otherNew);
  const incRegOld   = Math.max(0, grossReceipts - expenses + otherOld);

  // 44ADA Method
  const inc44ADANew = is44ADAElig ? Math.max(0, grossReceipts * 0.5 + otherNew) : 0;
  const inc44ADAOld = is44ADAElig ? Math.max(0, grossReceipts * 0.5 + otherOld) : 0;

  const NA_DETAILS = { total: Infinity, baseTax: 0, surcharge: 0, cess: 0 };

  const allScenarios = [
    { name: 'Regular + New Regime', details: getTaxDetails(incRegNew,   'new'), income: incRegNew   },
    { name: 'Regular + Old Regime', details: getTaxDetails(incRegOld,   'old'), income: incRegOld   },
    { name: '44ADA + New Regime',   details: is44ADAElig ? getTaxDetails(inc44ADANew, 'new') : NA_DETAILS, income: inc44ADANew },
    { name: '44ADA + Old Regime',   details: is44ADAElig ? getTaxDetails(inc44ADAOld, 'old') : NA_DETAILS, income: inc44ADAOld },
  ];

  const validScenarios = is44ADAElig ? allScenarios : allScenarios.slice(0, 2);
  const best = validScenarios.reduce((b, c) => c.details.total < b.details.total ? c : b);

  /* ── Net payable / refund ── */
  const netPayable = Math.max(0, best.details.total - tdsDeducted);
  const taxRefund  = Math.max(0, tdsDeducted - best.details.total);

  /* ── Update DOM ── */
  renderHeroCard(best);
  renderAlternativeCards(allScenarios, best, is44ADAElig);

  document.getElementById('net-tax').textContent          = formatINR(netPayable);
  document.getElementById('tax-refund').textContent       = formatINR(taxRefund);
  document.getElementById('itr-recommendation').textContent =
    best.name.includes('44ADA')
      ? 'ITR-4 (Sugam) — Sec 44ADA eligible.'
      : 'ITR-3 — Maintain Balance Sheet & P&L.';

  /* Breakdown panel */
  document.getElementById('breakdownScenario').textContent  = best.name;
  document.getElementById('breakdownBaseTax').textContent   = formatINR(best.details.baseTax);
  document.getElementById('breakdownSurcharge').textContent = formatINR(best.details.surcharge);
  document.getElementById('breakdownCess').textContent      = formatINR(best.details.cess);
  document.getElementById('breakdownTotalTax').textContent  = formatINR(best.details.total);

  /* Chart: take-home uses gross total income */
  const totalIncome = grossReceipts + interestIncome + rentalIncome;
  const takeHome    = Math.max(0, totalIncome - expenses - netPayable);
  updateChart(takeHome, netPayable, expenses);

  /* Advance tax schedule */
  renderAdvanceSchedule(netPayable, best.name);

  /* GST warning toast */
  const domesticReceipts = Math.max(0, grossReceipts - exportIncome);
  if (grossReceipts > 2000000) {
    showToast(
      `Your gross receipts exceed ₹20,00,000. GST registration is likely mandatory for domestic services. ` +
      `Domestic: ${formatINR(domesticReceipts)} · Export: ${formatINR(exportIncome)}.`,
      'warning'
    );
  } else {
    dismissToast();
  }

  /* Sticky mobile bar */
  updateStickyBar(netPayable);

  /* Reveal results on first calc */
  if (!hasCalculated) {
    document.getElementById('skeletonState').style.display = 'none';
    document.getElementById('report').style.display        = '';
    document.getElementById('exportBtn').style.display     = '';
    hasCalculated = true;
  }
}

/* ─── Init ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  setupInputFormatting();
  setupTooltips();
});
