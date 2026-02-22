/**
 * NPS InsightX – Risk Simulation Logic
 */

let riskChart = null;

function runRiskSimulation() {
  const age = parseInt(document.getElementById('riskAge').value);
  const retirementAge = parseInt(document.getElementById('riskRetAge').value);
  const monthlyContrib = parseFloat(document.getElementById('riskContrib').value);
  const returnRate = parseFloat(document.getElementById('riskReturn').value);
  const inflationRate = parseFloat(document.getElementById('riskInflation').value);

  const downturnPct = parseFloat(document.getElementById('downturnPct').value); // negative
  const inflSpike = parseFloat(document.getElementById('inflSpike').value);
  const contribGapYears = parseInt(document.getElementById('contribGap').value);

  if (isNaN(age) || isNaN(retirementAge) || retirementAge <= age) {
    alert('Please enter valid parameters.');
    return;
  }

  // Base scenario
  const base = calculateCorpus({ age, retirementAge, monthlyContrib, returnRate, inflationRate });

  // Market Downturn scenario
  const downturnReturn = Math.max(returnRate + downturnPct, 0);
  const downturn = calculateCorpus({ age, retirementAge, monthlyContrib, returnRate: downturnReturn, inflationRate });

  // Inflation Spike scenario
  const spikedInflation = inflationRate + inflSpike;
  const inflation = calculateCorpus({ age, retirementAge, monthlyContrib, returnRate, inflationRate: spikedInflation });

  // Contribution Gap scenario (zero contribution for gap years, then resume)
  const gapResult = calculateWithContribGap({ age, retirementAge, monthlyContrib, returnRate, inflationRate, contribGapYears });

  // Worst case: all three combined
  const worst = calculateCorpus({
    age,
    retirementAge,
    monthlyContrib: monthlyContrib * (1 - Math.min(contribGapYears / (retirementAge - age), 0.9)),
    returnRate: downturnReturn,
    inflationRate: spikedInflation,
  });

  if (!base) return;

  // Update KPIs
  animateCount(document.getElementById('riskBaseCorpus'), formatCurrency(base.realCorpus));
  animateCount(document.getElementById('riskDownturnCorpus'), formatCurrency(downturn ? downturn.realCorpus : 0));
  animateCount(document.getElementById('riskInflationCorpus'), formatCurrency(inflation ? inflation.realCorpus : 0));
  animateCount(document.getElementById('riskGapCorpus'), formatCurrency(gapResult));

  // Impact percentages (how much the corpus drops)
  const downturnImpact = base.realCorpus > 0 ? Math.abs((base.realCorpus - (downturn ? downturn.realCorpus : 0)) / base.realCorpus * 100) : 0;
  const inflImpact = base.realCorpus > 0 ? Math.abs((base.realCorpus - (inflation ? inflation.realCorpus : 0)) / base.realCorpus * 100) : 0;
  const gapImpact = base.realCorpus > 0 ? Math.abs((base.realCorpus - gapResult) / base.realCorpus * 100) : 0;
  const worstImpact = base.realCorpus > 0 && worst ? Math.abs((base.realCorpus - worst.realCorpus) / base.realCorpus * 100) : 0;

  // Update bars
  setRiskBar('downturnImpactFill', 'downturnImpactVal', downturnImpact);
  setRiskBar('inflImpactFill', 'inflImpactVal', inflImpact);
  setRiskBar('gapImpactFill', 'gapImpactVal', gapImpact);
  setRiskBar('worstImpactFill', 'worstImpactVal', worstImpact);

  // Risk tolerance indicator
  updateRiskTolerance(downturnImpact, inflImpact, gapImpact);

  // Alerts
  buildRiskAlerts(downturnImpact, inflImpact, gapImpact, worstImpact, base.realCorpus, worst ? worst.realCorpus : 0);

  // Chart
  updateRiskChart(age, retirementAge, monthlyContrib, returnRate, inflationRate, downturnReturn, spikedInflation, contribGapYears);
}

function calculateWithContribGap({ age, retirementAge, monthlyContrib, returnRate, inflationRate, contribGapYears }) {
  // Simulate gap: first contribGapYears no contribution, then full contribution
  const years = retirementAge - age;
  const monthlyRate = returnRate / 100 / 12;
  const inflFactor = Math.pow(1 + inflationRate / 100, years);

  if (contribGapYears >= years) {
    return 0;
  }

  // FV of phase 1 (zero contribution for gap years – corpus starts from 0, so effectively 0 accumulated)
  const gapMonths = contribGapYears * 12;
  const postMonths = (years - contribGapYears) * 12;

  let fvPhase2;
  if (monthlyRate === 0) {
    fvPhase2 = monthlyContrib * postMonths;
  } else {
    fvPhase2 = monthlyContrib * ((Math.pow(1 + monthlyRate, postMonths) - 1) / monthlyRate) * (1 + monthlyRate);
  }

  return fvPhase2 / inflFactor;
}

function setRiskBar(fillId, valId, pct) {
  const fill = document.getElementById(fillId);
  const val = document.getElementById(valId);
  const capped = Math.min(pct, 100);
  if (fill) {
    fill.style.width = capped.toFixed(1) + '%';
    fill.className = 'indicator-fill ' + (pct < 20 ? 'green' : pct < 40 ? 'yellow' : 'red');
  }
  if (val) val.textContent = pct.toFixed(1) + '%';
}

function updateRiskTolerance(downturnImpact, inflImpact, gapImpact) {
  const avgImpact = (downturnImpact + inflImpact + gapImpact) / 3;
  const el = document.getElementById('riskToleranceIndicator');
  if (!el) return;

  let label, color, dots;
  if (avgImpact < 20) {
    label = '🟢 Low Risk – Your plan is resilient to typical market shocks.';
    color = 'var(--accent)';
    dots = 3;
  } else if (avgImpact < 40) {
    label = '🟡 Moderate Risk – Some vulnerability exists; consider buffer contributions.';
    color = 'var(--accent-warn)';
    dots = 6;
  } else {
    label = '🔴 High Risk – Your plan is significantly exposed to the simulated shocks.';
    color = 'var(--accent-danger)';
    dots = 10;
  }

  let dotsHtml = '<div class="risk-meter">';
  for (let i = 0; i < 10; i++) {
    const cls = i < dots ? (dots <= 3 ? 'active-low' : dots <= 6 ? 'active-medium' : 'active-high') : '';
    dotsHtml += `<div class="risk-dot ${cls}"></div>`;
  }
  dotsHtml += '</div>';

  el.innerHTML = `
    <div style="font-size:0.85rem;color:${color};margin-bottom:0.5rem">${label}</div>
    ${dotsHtml}
    <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.4rem">Average portfolio impact: ${avgImpact.toFixed(1)}%</div>
  `;
}

function buildRiskAlerts(downturnImpact, inflImpact, gapImpact, worstImpact, baseCorpus, worstCorpus) {
  const el = document.getElementById('riskAlerts');
  if (!el) return;

  const alerts = [];

  if (downturnImpact > 30) {
    alerts.push({ icon: '📉', cls: 'alert-danger', title: 'High Market Downturn Sensitivity', text: `A market downturn reduces your corpus by ${downturnImpact.toFixed(1)}%. Consider diversifying into safer NPS tiers (Government Securities) for a portion of your portfolio.` });
  }

  if (inflImpact > 25) {
    alerts.push({ icon: '🌡️', cls: 'alert-warning', title: 'Inflation Exposure Alert', text: `Inflation spike erodes ${inflImpact.toFixed(1)}% of your real corpus. Equity-heavy NPS allocations (Tier I - E Class) provide better inflation-beating returns long-term.` });
  }

  if (gapImpact > 20) {
    alerts.push({ icon: '⏸️', cls: 'alert-warning', title: 'Contribution Gap Risk', text: `Missed contributions reduce your corpus by ${gapImpact.toFixed(1)}%. Set up auto-debit to avoid gaps. Even partial contributions during lean periods help preserve compounding.` });
  }

  if (worstImpact > 50) {
    alerts.push({ icon: '🚨', cls: 'alert-danger', title: 'Worst-Case Shortfall Predicted', text: `In the worst-case combined scenario, your corpus drops from ${formatCurrency(baseCorpus)} to ${formatCurrency(worstCorpus)} — a ${worstImpact.toFixed(1)}% reduction. Build a 20-30% contribution buffer above the minimum required.` });
  }

  if (alerts.length === 0) {
    alerts.push({ icon: '✅', cls: 'alert-success', title: 'Plan is Resilient', text: 'Your retirement plan shows good resilience to the simulated risk scenarios. Keep contributing consistently and review annually.' });
  }

  el.innerHTML = alerts.map(a => `
    <div class="alert ${a.cls}" style="margin-bottom:0.75rem">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-body"><h4>${a.title}</h4><p>${a.text}</p></div>
    </div>
  `).join('');
}

function updateRiskChart(age, retirementAge, contrib, returnRate, inflationRate, downturnReturn, spikedInflation, contribGapYears) {
  const years = retirementAge - age;
  const labels = [];
  const baseData = [], downturnData = [], inflData = [], gapData = [];

  for (let y = 1; y <= years; y++) {
    labels.push('Age ' + (age + y));
    const months = y * 12;
    const inflFactor = Math.pow(1 + inflationRate / 100, y);
    const inflFactorSpike = Math.pow(1 + spikedInflation / 100, y);

    const calcFV = (rate, m) => {
      const r = rate / 100 / 12;
      if (r === 0) return contrib * m;
      return contrib * ((Math.pow(1 + r, m) - 1) / r) * (1 + r);
    };

    baseData.push(Math.round(calcFV(returnRate, months) / inflFactor));
    downturnData.push(Math.round(calcFV(downturnReturn, months) / inflFactor));
    inflData.push(Math.round(calcFV(returnRate, months) / inflFactorSpike));

    // Gap: no contribution for first contribGapYears
    if (y <= contribGapYears) {
      gapData.push(0);
    } else {
      const postMonths = (y - contribGapYears) * 12;
      const gapFV = calcFV(returnRate, postMonths);
      gapData.push(Math.round(gapFV / inflFactor));
    }
  }

  const defaults = getChartDefaults();
  const ctx = document.getElementById('riskChart');
  if (riskChart) riskChart.destroy();
  riskChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Base Plan', data: baseData, borderColor: '#00b4d8', borderWidth: 2.5, fill: false, tension: 0.4, pointRadius: 2 },
        { label: 'Market Downturn', data: downturnData, borderColor: '#ef233c', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 2, borderDash: [4, 3] },
        { label: 'Inflation Spike', data: inflData, borderColor: '#ffb703', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 2, borderDash: [6, 3] },
        { label: 'Contribution Gap', data: gapData, borderColor: '#a8dadc', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 2, borderDash: [3, 3] },
      ]
    },
    options: { ...defaults, animation: { duration: 800 } },
  });
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
  runRiskSimulation();
});
