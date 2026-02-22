/**
 * NPS InsightX – Goal-Based Planning Logic
 */

let goalChart = null;

function runGoalPlanner() {
  const desiredMonthlyPension = parseFloat(document.getElementById('goalPension').value);
  const age = parseInt(document.getElementById('goalAge').value);
  const retirementAge = parseInt(document.getElementById('goalRetAge').value);
  const returnRate = parseFloat(document.getElementById('goalReturn').value);
  const inflationRate = parseFloat(document.getElementById('goalInflation').value);
  const currentContrib = parseFloat(document.getElementById('goalCurrentContrib').value) || 0;

  if (isNaN(desiredMonthlyPension) || desiredMonthlyPension <= 0) {
    alert('Please enter a valid desired monthly pension.');
    return;
  }
  if (retirementAge <= age) {
    alert('Retirement age must be greater than current age.');
    return;
  }

  const years = retirementAge - age;

  // Target real corpus using 4% withdrawal rule
  const targetRealCorpus = desiredMonthlyPension * 12 / 0.04;

  // Required contribution via reverse calculation
  const requiredContrib = reverseCalculateContribution({
    desiredMonthlyPension,
    years,
    returnRate,
    inflationRate,
  });

  // Gap between required and current
  const gap = requiredContrib - currentContrib;

  // Current corpus if someone is already contributing
  let currentResult = null;
  if (currentContrib > 0) {
    currentResult = calculateCorpus({ age, retirementAge, monthlyContrib: currentContrib, returnRate, inflationRate });
  }

  // KPI Updates
  animateCount(document.getElementById('goalRequiredContrib'), formatCurrency(requiredContrib) + '/mo');
  animateCount(document.getElementById('goalTargetCorpus'), formatCurrency(targetRealCorpus));
  animateCount(document.getElementById('goalGap'), gap > 0 ? '+' + formatCurrency(gap) + '/mo' : '✅ Covered');
  animateCount(document.getElementById('goalYears'), years + ' Years');

  // Feasibility indicators
  updateFeasibility(requiredContrib, currentContrib, years, gap, desiredMonthlyPension, targetRealCorpus, currentResult);

  // Chart
  updateGoalChart(age, retirementAge, requiredContrib, currentContrib, returnRate, inflationRate, targetRealCorpus);
}

function updateFeasibility(requiredContrib, currentContrib, years, gap, desiredPension, targetCorpus, currentResult) {
  // Coverage ratio
  const coverage = currentContrib > 0 ? Math.min(currentContrib / requiredContrib * 100, 100) : 0;
  // Time score
  const timeScore = Math.min(years / 30 * 100, 100);
  // Achievement based on current result
  const achieveRatio = currentResult ? Math.min(currentResult.realCorpus / targetCorpus * 100, 100) : 0;

  // Update bars
  setBar('goalAchieveFill', 'goalAchieveVal', achieveRatio, achieveRatio >= 80 ? 'teal' : achieveRatio >= 50 ? 'yellow' : 'red');
  setBar('contribCovFill', 'contribCovVal', coverage, coverage >= 80 ? 'green' : coverage >= 50 ? 'yellow' : 'red');
  setBar('timeAdequacyFill', 'timeAdequacyVal', timeScore, timeScore >= 70 ? 'teal' : timeScore >= 40 ? 'yellow' : 'red');

  // Banner
  const banner = document.getElementById('feasibilityBanner');
  const bannerIcon = document.getElementById('feasBannerIcon');
  const bannerTitle = document.getElementById('feasBannerTitle');
  const bannerText = document.getElementById('feasBannerText');

  if (currentContrib >= requiredContrib) {
    banner.className = 'alert alert-success';
    bannerIcon.textContent = '✅';
    bannerTitle.textContent = 'Goal Fully Achievable!';
    bannerText.textContent = `Your current contribution of ${formatCurrency(currentContrib)}/mo already exceeds the required ${formatCurrency(requiredContrib)}/mo. You are on track to achieve your desired monthly pension of ${formatCurrency(desiredPension)}.`;
  } else if (coverage >= 70) {
    banner.className = 'alert alert-info';
    bannerIcon.textContent = '📈';
    bannerTitle.textContent = 'Almost There!';
    bannerText.textContent = `You need to increase your contribution by ${formatCurrency(gap)}/mo (${((gap / currentContrib) * 100).toFixed(1)}% increase) to fully achieve your goal.`;
  } else if (currentContrib > 0) {
    banner.className = 'alert alert-warning';
    bannerIcon.textContent = '⚠️';
    bannerTitle.textContent = 'Significant Gap Detected';
    bannerText.textContent = `Your contributions need to increase by ${formatCurrency(gap)}/mo. Consider a ${((gap / requiredContrib) * 100).toFixed(0)}% boost to get on track for your ₹${desiredPension.toLocaleString('en-IN')} monthly pension goal.`;
  } else {
    banner.className = 'alert alert-danger';
    bannerIcon.textContent = '🚨';
    bannerTitle.textContent = 'Action Required';
    bannerText.textContent = `You need to start contributing ${formatCurrency(requiredContrib)}/mo to achieve your desired monthly pension of ${formatCurrency(desiredPension)}. Start as early as possible!`;
  }

  // Suggestions
  buildSuggestions(requiredContrib, currentContrib, gap, years);
}

function setBar(fillId, valId, pct, colorClass) {
  const fill = document.getElementById(fillId);
  const val = document.getElementById(valId);
  if (fill) {
    fill.style.width = Math.round(pct) + '%';
    fill.className = 'indicator-fill ' + colorClass;
  }
  if (val) val.textContent = Math.round(pct) + '%';
}

function buildSuggestions(requiredContrib, currentContrib, gap, years) {
  const el = document.getElementById('suggestions');
  if (!el) return;

  const suggestions = [];

  if (gap > 0) {
    const increasePercent = ((gap / Math.max(currentContrib, 1)) * 100).toFixed(0);
    suggestions.push({
      icon: '💡',
      title: 'Increase Contribution by ' + increasePercent + '%',
      text: `Adding ${formatCurrency(gap)}/mo will fully bridge your pension gap. Consider a systematic annual step-up of 5-10%.`,
      cls: 'alert-info',
    });
  }

  if (years < 20) {
    suggestions.push({
      icon: '⏰',
      title: 'Limited Time Horizon',
      text: `With only ${years} years to retirement, maximising contributions now is critical. Every month of delay reduces your corpus significantly.`,
      cls: 'alert-warning',
    });
  }

  if (gap > requiredContrib * 0.5) {
    suggestions.push({
      icon: '📅',
      title: 'Consider Extending Retirement Age',
      text: `Delaying retirement by 3-5 years can dramatically reduce the required monthly contribution and grow your corpus further.`,
      cls: 'alert-info',
    });
  }

  suggestions.push({
    icon: '📈',
    title: 'Step-Up Strategy',
    text: `Increase your NPS contribution by 5-10% every year in line with salary raises. This automatic escalation builds wealth without feeling the pinch.`,
    cls: 'alert-success',
  });

  el.innerHTML = suggestions.map(s => `
    <div class="alert ${s.cls}" style="margin-bottom:0.75rem">
      <div class="alert-icon">${s.icon}</div>
      <div class="alert-body">
        <h4>${s.title}</h4>
        <p>${s.text}</p>
      </div>
    </div>
  `).join('');
}

function updateGoalChart(age, retirementAge, requiredContrib, currentContrib, returnRate, inflationRate, targetRealCorpus) {
  const years = retirementAge - age;
  const labels = [];
  const requiredData = [];
  const currentData = [];
  const targetLine = [];

  const reqMonthlyRate = returnRate / 100 / 12;
  const curMonthlyRate = returnRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    labels.push('Age ' + (age + y));
    const months = y * 12;
    const inflFactor = Math.pow(1 + inflationRate / 100, y);

    const reqNominal = reqMonthlyRate === 0
      ? requiredContrib * months
      : requiredContrib * ((Math.pow(1 + reqMonthlyRate, months) - 1) / reqMonthlyRate) * (1 + reqMonthlyRate);
    requiredData.push(Math.round(reqNominal / inflFactor));

    if (currentContrib > 0) {
      const curNominal = curMonthlyRate === 0
        ? currentContrib * months
        : currentContrib * ((Math.pow(1 + curMonthlyRate, months) - 1) / curMonthlyRate) * (1 + curMonthlyRate);
      currentData.push(Math.round(curNominal / inflFactor));
    }

    targetLine.push(Math.round(targetRealCorpus));
  }

  const defaults = getChartDefaults();
  const datasets = [
    {
      label: 'Required Corpus Path',
      data: requiredData,
      borderColor: '#06d6a0',
      backgroundColor: 'rgba(6,214,160,0.06)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointRadius: 2,
    },
    {
      label: 'Target Corpus',
      data: targetLine,
      borderColor: 'rgba(255,183,3,0.6)',
      borderWidth: 1.5,
      borderDash: [8, 4],
      fill: false,
      pointRadius: 0,
    },
  ];

  if (currentContrib > 0) {
    datasets.splice(1, 0, {
      label: 'Current Contribution Path',
      data: currentData,
      borderColor: '#00b4d8',
      backgroundColor: 'rgba(0,180,216,0.05)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      borderDash: [5, 3],
    });
  }

  const ctx = document.getElementById('goalChart');
  if (goalChart) goalChart.destroy();
  goalChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: { ...defaults, animation: { duration: 800 } },
  });
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
  runGoalPlanner();
});
