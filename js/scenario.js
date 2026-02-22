/**
 * NPS InsightX – Scenario Comparison Logic
 */

let scenarioChart = null;

function runScenarios() {
  const age = parseInt(document.getElementById('scAge').value);
  const retirementAge = parseInt(document.getElementById('scRetAge').value);
  const monthlyContrib = parseFloat(document.getElementById('scContrib').value);
  const returnRate = parseFloat(document.getElementById('scReturn').value);
  const inflationRate = parseFloat(document.getElementById('scInflation').value);

  if (isNaN(age) || isNaN(retirementAge) || isNaN(monthlyContrib) || retirementAge <= age) {
    alert('Please enter valid parameters. Retirement age must be greater than current age.');
    return;
  }

  // Base Scenario
  const base = calculateCorpus({ age, retirementAge, monthlyContrib, returnRate, inflationRate });
  // +10% Contribution Scenario
  const plus = calculateCorpus({ age, retirementAge, monthlyContrib: monthlyContrib * 1.1, returnRate, inflationRate });
  // +5 Years Delay Scenario (start 5 years later, fewer years to invest)
  const delayAge = age + 5;
  const delay = delayAge < retirementAge
    ? calculateCorpus({ age: delayAge, retirementAge, monthlyContrib, returnRate, inflationRate })
    : null;

  if (!base || !plus) return;

  // Update Cards
  document.getElementById('baseCorpus').textContent = formatCurrency(base.realCorpus);
  document.getElementById('basePension').textContent = formatCurrency(base.monthlyPension) + '/mo';
  document.getElementById('baseScore').textContent = base.healthScore + '/100';

  document.getElementById('plusCorpus').textContent = formatCurrency(plus.realCorpus);
  document.getElementById('plusPension').textContent = formatCurrency(plus.monthlyPension) + '/mo';
  const plusPct = ((plus.realCorpus - base.realCorpus) / base.realCorpus * 100).toFixed(1);
  document.getElementById('plusImprovement').textContent = '+' + plusPct + '% corpus';

  if (delay) {
    document.getElementById('delayCorpus').textContent = formatCurrency(delay.realCorpus);
    document.getElementById('delayPension').textContent = formatCurrency(delay.monthlyPension) + '/mo';
    const delayPct = ((base.realCorpus - delay.realCorpus) / base.realCorpus * 100).toFixed(1);
    document.getElementById('delayLoss').textContent = '-' + delayPct + '% corpus';
  } else {
    document.getElementById('delayCorpus').textContent = 'N/A';
    document.getElementById('delayPension').textContent = 'N/A';
    document.getElementById('delayLoss').textContent = 'Too late';
  }

  // Build projection data for chart
  const baseProj = buildYearlyProjection({ age, retirementAge, monthlyContrib, returnRate, inflationRate });
  const plusProj = buildYearlyProjection({ age, retirementAge, monthlyContrib: monthlyContrib * 1.1, returnRate, inflationRate });

  const maxYears = base.years;
  const labels = baseProj.map(p => 'Age ' + p.age);

  // Delay projection padded with nulls for first 5 years
  let delayProjectionReal = new Array(5).fill(null);
  if (delay) {
    const dp = buildYearlyProjection({ age: delayAge, retirementAge, monthlyContrib, returnRate, inflationRate });
    delayProjectionReal = [...delayProjectionReal, ...dp.map(p => Math.round(p.real))];
  }
  // Pad or trim to same length
  while (delayProjectionReal.length < maxYears) delayProjectionReal.push(null);
  delayProjectionReal = delayProjectionReal.slice(0, maxYears);

  const defaults = getChartDefaults();
  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Base Scenario',
          data: baseProj.map(p => Math.round(p.real)),
          borderColor: '#00b4d8',
          backgroundColor: 'rgba(0,180,216,0.06)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: '+10% Contribution',
          data: plusProj.map(p => Math.round(p.real)),
          borderColor: '#06d6a0',
          backgroundColor: 'rgba(6,214,160,0.05)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: '+5 Years Delay',
          data: delayProjectionReal,
          borderColor: '#ef233c',
          backgroundColor: 'rgba(239,35,60,0.04)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderDash: [5, 3],
          spanGaps: false,
        },
      ]
    },
    options: {
      ...defaults,
      animation: { duration: 900 },
    }
  };

  const ctx = document.getElementById('scenarioChart');
  if (scenarioChart) scenarioChart.destroy();
  scenarioChart = new Chart(ctx, chartConfig);

  // Show insights
  showInsights(base, plus, delay);
}

function showInsights(base, plus, delay) {
  const panel = document.getElementById('scenarioInsight');
  const textEl = document.getElementById('insightText');
  if (!panel || !textEl) return;

  const plusPct = ((plus.realCorpus - base.realCorpus) / base.realCorpus * 100).toFixed(1);
  const plusRupees = formatCurrency(plus.realCorpus - base.realCorpus);
  let delayText = '';
  if (delay) {
    const delayPct = ((base.realCorpus - delay.realCorpus) / base.realCorpus * 100).toFixed(1);
    const delayRupees = formatCurrency(base.realCorpus - delay.realCorpus);
    delayText = `
      <div class="alert alert-warning">
        <div class="alert-icon">⏳</div>
        <div class="alert-body">
          <h4>Cost of a 5-Year Delay</h4>
          <p>Delaying by 5 years reduces your real corpus by <strong>${delayPct}%</strong> (approx. <strong>${delayRupees}</strong>).
          This is the compounding penalty of starting late — every year counts!</p>
        </div>
      </div>`;
  }

  textEl.innerHTML = `
    <div class="alert alert-success" style="margin-bottom:0.75rem">
      <div class="alert-icon">🚀</div>
      <div class="alert-body">
        <h4>Power of 10% More Contribution</h4>
        <p>Increasing your monthly contribution by just 10% improves your real corpus by <strong>${plusPct}%</strong>
        — that's an extra <strong>${plusRupees}</strong> in today's money. A small raise today = significant retirement wealth.</p>
      </div>
    </div>
    ${delayText}
    <div class="alert alert-info">
      <div class="alert-icon">💡</div>
      <div class="alert-body">
        <h4>Optimal Strategy</h4>
        <p>Start early and increase contributions incrementally each year. Even a 5% annual raise in contribution
        can dramatically improve your retirement health score and monthly pension estimate.</p>
      </div>
    </div>
  `;
  panel.style.display = 'block';
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
  runScenarios();
});
