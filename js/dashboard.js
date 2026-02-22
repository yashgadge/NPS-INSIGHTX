/**
 * NPS InsightX – Retirement Forecast Dashboard Logic
 */

let corpusChart = null;

function runForecast() {
  const age = parseInt(document.getElementById('inputAge').value);
  const retirementAge = parseInt(document.getElementById('inputRetirementAge').value);
  const monthlyContrib = parseFloat(document.getElementById('inputContrib').value);
  const returnRate = parseFloat(document.getElementById('inputReturn').value);
  const inflationRate = parseFloat(document.getElementById('inputInflation').value);

  // Validation
  if (isNaN(age) || isNaN(retirementAge) || isNaN(monthlyContrib)) {
    alert('Please enter valid numbers for all fields.');
    return;
  }
  if (retirementAge <= age) {
    alert('Retirement age must be greater than current age.');
    return;
  }
  if (monthlyContrib <= 0) {
    alert('Monthly contribution must be positive.');
    return;
  }

  const params = { age, retirementAge, monthlyContrib, returnRate, inflationRate };
  const result = calculateCorpus(params);
  const projection = buildYearlyProjection(params);

  if (!result) return;

  // Update KPIs
  animateCount(document.getElementById('kpiCorpus'), formatCurrency(result.nominalCorpus));
  animateCount(document.getElementById('kpiRealCorpus'), formatCurrency(result.realCorpus));
  animateCount(document.getElementById('kpiPension'), formatCurrency(result.monthlyPension) + '/mo');
  animateCount(document.getElementById('kpiYears'), result.years + ' Years');

  // Update Gauge
  updateGauge(result.healthScore);
  updateScoreInterpretation(result.healthScore);

  // Update Chart
  updateCorpusChart(projection);

  // Update Table
  updateProjectionTable(projection, monthlyContrib);
}

function updateScoreInterpretation(score) {
  const el = document.getElementById('scoreInterpretation');
  if (!el) return;
  let text, cls;
  if (score >= 80) {
    text = '🟢 Excellent – Your retirement plan is on a very strong track!';
    cls = 'alert-success';
  } else if (score >= 60) {
    text = '🟡 Good – A few tweaks can push you to an excellent score.';
    cls = 'alert-info';
  } else if (score >= 40) {
    text = '🟠 Fair – Consider increasing contributions or extending your horizon.';
    cls = 'alert-warning';
  } else {
    text = '🔴 Needs Attention – Your current plan may lead to a retirement shortfall.';
    cls = 'alert-danger';
  }
  el.textContent = text;
  el.className = '';
  el.style.cssText = 'font-size:0.8rem;text-align:center;margin-top:0.5rem';
}

function updateCorpusChart(projection) {
  const labels = projection.map(p => 'Age ' + p.age);
  const nominalData = projection.map(p => Math.round(p.nominal));
  const realData = projection.map(p => Math.round(p.real));

  const defaults = getChartDefaults();
  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Nominal Corpus',
          data: nominalData,
          borderColor: '#00b4d8',
          backgroundColor: 'rgba(0,180,216,0.07)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00b4d8',
        },
        {
          label: 'Real Corpus (Inflation-Adj.)',
          data: realData,
          borderColor: '#06d6a0',
          backgroundColor: 'rgba(6,214,160,0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#06d6a0',
          borderDash: [5, 3],
        },
      ]
    },
    options: {
      ...defaults,
      animation: { duration: 800 },
    }
  };

  const ctx = document.getElementById('corpusChart');
  if (corpusChart) {
    corpusChart.destroy();
  }
  corpusChart = new Chart(ctx, chartConfig);
}

function updateProjectionTable(projection, monthlyContrib) {
  const tbody = document.getElementById('projectionBody');
  const section = document.getElementById('tableSection');
  if (!tbody || !section) return;

  tbody.innerHTML = '';
  const annualContrib = monthlyContrib * 12;

  // Show every 5 years + final year
  const selected = projection.filter((p, i) => (p.year % 5 === 0) || i === projection.length - 1);

  selected.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.year}</td>
      <td>${p.age}</td>
      <td style="color:var(--teal);font-weight:600">${formatCurrency(p.nominal)}</td>
      <td style="color:var(--accent);font-weight:600">${formatCurrency(p.real)}</td>
      <td>${formatCurrency(annualContrib)}</td>
    `;
    tbody.appendChild(tr);
  });

  section.style.display = 'block';
}

// Auto-calculate on page load with defaults
document.addEventListener('DOMContentLoaded', () => {
  runForecast();
});
