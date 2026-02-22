/**
 * NPS InsightX – Shared Utility Functions
 */

// ---- Formatting Helpers ----

/**
 * Format a number as Indian Rupee currency
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  if (amount >= 1e7) {
    return '₹' + (amount / 1e7).toFixed(2) + ' Cr';
  } else if (amount >= 1e5) {
    return '₹' + (amount / 1e5).toFixed(2) + ' L';
  }
  return '₹' + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a percentage value
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
function formatPercent(value, decimals = 1) {
  return value.toFixed(decimals) + '%';
}

// ---- Financial Calculation Core ----

/**
 * Calculate NPS corpus using compound interest with monthly contributions
 * @param {Object} params
 * @param {number} params.age            - Current age
 * @param {number} params.retirementAge  - Target retirement age
 * @param {number} params.monthlyContrib - Monthly contribution (₹)
 * @param {number} params.returnRate     - Annual expected return (%)
 * @param {number} params.inflationRate  - Annual inflation rate (%)
 * @returns {Object} results
 */
function calculateCorpus(params) {
  const { age, retirementAge, monthlyContrib, returnRate, inflationRate } = params;
  const years = retirementAge - age;
  if (years <= 0) return null;

  const monthlyRate = returnRate / 100 / 12;
  const months = years * 12;

  // Future Value of annuity (monthly contributions)
  let nominalCorpus;
  if (monthlyRate === 0) {
    nominalCorpus = monthlyContrib * months;
  } else {
    nominalCorpus = monthlyContrib * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  }

  // Adjust for inflation to get real value
  const inflationFactor = Math.pow(1 + inflationRate / 100, years);
  const realCorpus = nominalCorpus / inflationFactor;

  // Estimated monthly pension (4% safe withdrawal rule, monthly)
  const monthlyPension = (realCorpus * 0.04) / 12;

  // Retirement Health Score (0-100)
  const healthScore = calculateHealthScore({ years, monthlyContrib, returnRate, inflationRate, realCorpus, monthlyPension });

  return {
    nominalCorpus,
    realCorpus,
    monthlyPension,
    healthScore,
    years,
  };
}

/**
 * Build a yearly projection array for charting
 * @param {Object} params - same as calculateCorpus
 * @returns {Array} [{year, age, nominal, real}]
 */
function buildYearlyProjection(params) {
  const { age, retirementAge, monthlyContrib, returnRate, inflationRate } = params;
  const years = retirementAge - age;
  const monthlyRate = returnRate / 100 / 12;
  const projection = [];

  for (let y = 1; y <= years; y++) {
    const months = y * 12;
    let nominal;
    if (monthlyRate === 0) {
      nominal = monthlyContrib * months;
    } else {
      nominal = monthlyContrib * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    }
    const real = nominal / Math.pow(1 + inflationRate / 100, y);
    projection.push({
      year: y,
      age: age + y,
      nominal,
      real,
    });
  }
  return projection;
}

/**
 * Calculate Retirement Health Score (0–100)
 */
function calculateHealthScore({ years, monthlyContrib, returnRate, inflationRate, realCorpus, monthlyPension }) {
  let score = 0;
  // Time horizon (max 30 pts)
  score += Math.min(years / 35 * 30, 30);
  // Contribution level (max 25 pts)
  score += Math.min(monthlyContrib / 50000 * 25, 25);
  // Return rate buffer (max 20 pts)
  const realReturn = returnRate - inflationRate;
  score += Math.min(Math.max(realReturn / 8 * 20, 0), 20);
  // Corpus adequacy (max 25 pts) – assume ₹1 Cr as benchmark
  score += Math.min(realCorpus / 1e7 * 25, 25);
  return Math.round(Math.min(score, 100));
}

/**
 * Reverse-calculate required monthly contribution to achieve desired pension
 * @param {Object} params
 * @param {number} params.desiredMonthlyPension
 * @param {number} params.years
 * @param {number} params.returnRate
 * @param {number} params.inflationRate
 * @returns {number} required monthly contribution
 */
function reverseCalculateContribution({ desiredMonthlyPension, years, returnRate, inflationRate }) {
  // Target real corpus from desired pension (4% withdrawal rule)
  const targetRealCorpus = desiredMonthlyPension * 12 / 0.04;
  // Inflate to nominal
  const inflationFactor = Math.pow(1 + inflationRate / 100, years);
  const targetNominalCorpus = targetRealCorpus * inflationFactor;

  const monthlyRate = returnRate / 100 / 12;
  const months = years * 12;

  let requiredContrib;
  if (monthlyRate === 0) {
    requiredContrib = targetNominalCorpus / months;
  } else {
    requiredContrib = targetNominalCorpus / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
  }
  return requiredContrib;
}

// ---- Chart Defaults ----

/**
 * Returns default Chart.js options styled for the NPS InsightX theme
 */
function getChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: '#8b9dc3',
          font: { size: 12 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17,34,64,0.95)',
        titleColor: '#e8f1f2',
        bodyColor: '#8b9dc3',
        borderColor: 'rgba(0,180,216,0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (ctx) {
            return ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y);
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8b9dc3', font: { size: 11 } },
        grid: { color: 'rgba(139,157,195,0.08)' },
        border: { color: 'rgba(139,157,195,0.15)' },
      },
      y: {
        ticks: {
          color: '#8b9dc3',
          font: { size: 11 },
          callback: (v) => formatCurrency(v),
        },
        grid: { color: 'rgba(139,157,195,0.08)' },
        border: { color: 'rgba(139,157,195,0.15)' },
      },
    },
  };
}

// ---- DOM Helpers ----

/**
 * Set element inner text safely
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Animate a number counting up in an element
 */
function animateCount(el, targetText) {
  el.classList.add('fade-in');
  el.textContent = targetText;
}

/**
 * Update gauge bar fill
 */
function updateGauge(scoreValue) {
  const fill = document.getElementById('gaugeFill');
  const scoreEl = document.getElementById('gaugeScore');
  if (fill) fill.style.width = scoreValue + '%';
  if (scoreEl) scoreEl.textContent = scoreValue;
}

// ---- Navigation Active State ----
(function highlightNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes(path)) {
      link.classList.add('active');
    }
  });
})();

// ---- Hamburger Menu ----
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
});
