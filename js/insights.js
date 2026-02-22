/**
 * NPS InsightX – AI Insights Engine Logic
 */

function runAIInsights() {
  const age = parseInt(document.getElementById('aiAge').value);
  const retirementAge = parseInt(document.getElementById('aiRetAge').value);
  const monthlyContrib = parseFloat(document.getElementById('aiContrib').value);
  const returnRate = parseFloat(document.getElementById('aiReturn').value);
  const inflationRate = parseFloat(document.getElementById('aiInflation').value);
  const desiredPension = parseFloat(document.getElementById('aiDesiredPension').value);
  const riskAppetite = document.getElementById('aiRiskAppetite').value;

  if (isNaN(age) || isNaN(retirementAge) || retirementAge <= age || isNaN(monthlyContrib)) {
    alert('Please enter valid profile information.');
    return;
  }

  const params = { age, retirementAge, monthlyContrib, returnRate, inflationRate };
  const result = calculateCorpus(params);
  if (!result) return;

  const years = retirementAge - age;
  const requiredContrib = reverseCalculateContribution({ desiredMonthlyPension: desiredPension, years, returnRate, inflationRate });
  const gap = requiredContrib - monthlyContrib;
  const pensionGap = desiredPension - result.monthlyPension;

  // Update gauge
  const scoreEl = document.getElementById('aiGaugeScore');
  const fillEl = document.getElementById('aiGaugeFill');
  if (scoreEl) scoreEl.textContent = result.healthScore;
  if (fillEl) fillEl.style.width = result.healthScore + '%';

  // Score breakdown
  updateScoreBreakdown(result, years, monthlyContrib, returnRate, inflationRate);

  // Shortfall alert
  updateShortfallAlert(result.monthlyPension, desiredPension, pensionGap, result.realCorpus);

  // Suggestions
  buildAISuggestions(result, gap, years, monthlyContrib, requiredContrib, riskAppetite, returnRate, inflationRate, desiredPension);

  // Tips to improve score
  buildImproveTips(result.healthScore, years, monthlyContrib, returnRate, inflationRate);

  // Fund allocation
  buildAllocationAdvice(riskAppetite, age, years);
}

function updateScoreBreakdown(result, years, contrib, returnRate, inflationRate) {
  const el = document.getElementById('aiScoreBreakdown');
  if (!el) return;

  const realReturn = returnRate - inflationRate;
  const timeScore = Math.round(Math.min(years / 35 * 30, 30));
  const contribScore = Math.round(Math.min(contrib / 50000 * 25, 25));
  const returnScore = Math.round(Math.min(Math.max(realReturn / 8 * 20, 0), 20));
  const corpusScore = Math.round(Math.min(result.realCorpus / 1e7 * 25, 25));

  const items = [
    { label: 'Time Horizon', score: timeScore, max: 30, color: 'teal' },
    { label: 'Contribution Level', score: contribScore, max: 25, color: 'green' },
    { label: 'Real Return Buffer', score: returnScore, max: 20, color: 'yellow' },
    { label: 'Corpus Adequacy', score: corpusScore, max: 25, color: 'teal' },
  ];

  el.innerHTML = items.map(item => `
    <div class="indicator-bar" style="margin-bottom:0.5rem">
      <div class="indicator-label" style="width:160px">${item.label}</div>
      <div class="indicator-track">
        <div class="indicator-fill ${item.color}" style="width:${Math.round(item.score / item.max * 100)}%"></div>
      </div>
      <div class="indicator-val">${item.score}/${item.max}</div>
    </div>
  `).join('');
}

function updateShortfallAlert(projectedPension, desiredPension, pensionGap, realCorpus) {
  const el = document.getElementById('aiShortfallAlert');
  if (!el) return;

  if (pensionGap > 0) {
    el.style.display = 'block';
    el.innerHTML = `
      <div class="alert alert-danger" style="margin-bottom:1.5rem">
        <div class="alert-icon">🚨</div>
        <div class="alert-body">
          <h4>Retirement Shortfall Predicted!</h4>
          <p>
            Your projected monthly pension is <strong>${formatCurrency(projectedPension)}</strong>, which is
            <strong>${formatCurrency(pensionGap)}/month below</strong> your desired <strong>${formatCurrency(desiredPension)}</strong>.
            Your current plan generates a real corpus of <strong>${formatCurrency(realCorpus)}</strong>.
            Immediate action is recommended to close this gap.
          </p>
        </div>
      </div>
    `;
  } else {
    el.style.display = 'block';
    const surplus = Math.abs(pensionGap);
    el.innerHTML = `
      <div class="alert alert-success" style="margin-bottom:1.5rem">
        <div class="alert-icon">✅</div>
        <div class="alert-body">
          <h4>Pension Goal Achievable!</h4>
          <p>
            Your projected monthly pension of <strong>${formatCurrency(projectedPension)}</strong> exceeds
            your goal of <strong>${formatCurrency(desiredPension)}</strong> by
            <strong>${formatCurrency(surplus)}/month</strong>. Great financial discipline!
          </p>
        </div>
      </div>
    `;
  }
}

function buildAISuggestions(result, gap, years, contrib, requiredContrib, riskAppetite, returnRate, inflationRate, desiredPension) {
  const el = document.getElementById('aiSuggestions');
  if (!el) return;

  const suggestions = [];
  const score = result.healthScore;

  // Core gap suggestion
  if (gap > 0) {
    const gapPct = ((gap / contrib) * 100).toFixed(0);
    suggestions.push({
      icon: '💰',
      priority: 'High Priority',
      priorityCls: 'tag-red',
      title: `Increase Monthly Contribution by ₹${Math.round(gap).toLocaleString('en-IN')}`,
      text: `Your current contribution of ${formatCurrency(contrib)}/mo is ${gapPct}% below the required ${formatCurrency(requiredContrib)}/mo to achieve your pension goal. Consider a step-up SIP: increase by 5-10% annually to gradually bridge this gap.`,
    });
  }

  // Score-based suggestions
  if (score < 50) {
    suggestions.push({
      icon: '📅',
      priority: 'High Priority',
      priorityCls: 'tag-red',
      title: 'Start an NPS Step-Up Strategy',
      text: `Your health score of ${score}/100 indicates vulnerability. Implement a 10% annual contribution increase. Starting with ${formatCurrency(contrib)}/mo and stepping up yearly, you could double your corpus within the same retirement horizon.`,
    });
  }

  if (years > 15 && riskAppetite === 'conservative') {
    suggestions.push({
      icon: '📈',
      priority: 'Recommended',
      priorityCls: 'tag-teal',
      title: 'Consider Higher Equity Allocation',
      text: `With ${years} years to retirement, a conservative allocation may underperform inflation over the long term. Consider shifting to a moderate allocation (50% equity) in NPS Tier I to capture better growth during your accumulation phase.`,
    });
  }

  if (riskAppetite === 'aggressive' && years < 10) {
    suggestions.push({
      icon: '🛡️',
      priority: 'Caution',
      priorityCls: 'tag-yellow',
      title: 'Reduce Equity Exposure as Retirement Nears',
      text: `With only ${years} years left, consider gradually de-risking your NPS portfolio. Shift from high-equity (E class) towards Government Securities (G class) to protect accumulated corpus from market volatility.`,
    });
  }

  const realReturn = returnRate - inflationRate;
  if (realReturn < 3) {
    suggestions.push({
      icon: '⚠️',
      priority: 'Alert',
      priorityCls: 'tag-yellow',
      title: 'Low Real Return Warning',
      text: `Your real return (${realReturn.toFixed(1)}%) after inflation is below the recommended 3-4% minimum. Review your NPS fund selection. Equity-linked funds have historically delivered 8-12% annualised returns, comfortably beating inflation.`,
    });
  }

  if (years >= 25) {
    suggestions.push({
      icon: '🌱',
      priority: 'Opportunity',
      priorityCls: 'tag-green',
      title: 'Maximise Tax Benefits Under NPS',
      text: `You have ${years} years of NPS contributions ahead. Maximize the ₹1.5L under Section 80C and the additional ₹50,000 under Section 80CCD(1B) for compounded tax savings. Reinvesting tax savings into NPS creates a powerful compounding loop.`,
    });
  }

  suggestions.push({
    icon: '🔄',
    priority: 'Best Practice',
    priorityCls: 'tag-teal',
    title: 'Annual Portfolio Review',
    text: 'Review and rebalance your NPS allocation annually. Adjust equity/debt ratio as you age using the life-cycle fund or manual rebalancing. Revisit your contribution level every time you receive a salary increment.',
  });

  el.innerHTML = suggestions.map(s => `
    <div class="insight-card" style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
        <span style="font-size:1.4rem">${s.icon}</span>
        <span class="tag ${s.priorityCls}">${s.priority}</span>
      </div>
      <h3>${s.title}</h3>
      <p>${s.text}</p>
    </div>
  `).join('');
}

function buildImproveTips(score, years, contrib, returnRate, inflationRate) {
  const el = document.getElementById('aiTips');
  if (!el) return;

  const tips = [];

  if (score < 80) {
    const pointsNeeded = 80 - score;
    tips.push({
      icon: '🎯',
      title: `${pointsNeeded} Points to Reach "Good" (80/100)`,
      text: 'Focus on: (1) increasing monthly contribution, (2) extending time horizon by retiring slightly later, and (3) optimising fund selection for better returns.',
    });
  }

  tips.push({
    icon: '💡',
    title: 'Tip 1: Automate Step-Up Contributions',
    text: 'Set up an automatic 5% annual increase in NPS contribution. This mirrors salary growth and dramatically improves your final corpus without requiring active decision-making.',
  });

  tips.push({
    icon: '💡',
    title: 'Tip 2: Optimise NPS Fund Allocation',
    text: `If you are ${years > 15 ? 'more than 15' : 'less than 15'} years from retirement, ${years > 15 ? 'increasing equity allocation to 60-75% (E class) can add significant alpha over your investment horizon' : 'gradually shifting towards G-class (Government Securities) protects your accumulated wealth'}.`,
  });

  tips.push({
    icon: '💡',
    title: 'Tip 3: Leverage Tax Benefits Fully',
    text: 'Ensure you are claiming all NPS tax deductions: ₹1.5L under 80C, ₹50,000 under 80CCD(1B). Reinvesting these tax savings into NPS can boost your final corpus by 8-15%.',
  });

  tips.push({
    icon: '💡',
    title: 'Tip 4: Voluntary Contributions During Bonuses',
    text: 'Redirect year-end bonuses or windfalls into NPS as voluntary contributions. Even one extra monthly salary per year significantly boosts your corpus through compounding.',
  });

  const realReturn = returnRate - inflationRate;
  if (realReturn < 4) {
    tips.push({
      icon: '💡',
      title: 'Tip 5: Switch to Higher Return Fund',
      text: `Your current projected real return is ${realReturn.toFixed(1)}%. Review your NPS Pension Fund Manager's performance. Top-performing equity NPS funds have delivered 12-15% returns over 10-year periods.`,
    });
  }

  el.innerHTML = tips.map(t => `
    <div class="alert alert-info" style="margin-bottom:0.75rem">
      <div class="alert-icon">${t.icon}</div>
      <div class="alert-body"><h4>${t.title}</h4><p>${t.text}</p></div>
    </div>
  `).join('');
}

function buildAllocationAdvice(riskAppetite, age, years) {
  const el = document.getElementById('aiAllocation');
  if (!el) return;

  const allocations = {
    conservative: { E: 25, C: 40, G: 35, label: 'Conservative', description: 'Low risk — capital preservation focus with steady income.' },
    moderate: { E: 50, C: 30, G: 20, label: 'Moderate', description: 'Balanced growth and stability — suitable for most investors.' },
    aggressive: { E: 75, C: 15, G: 10, label: 'Aggressive', description: 'High equity for maximum long-term wealth creation.' },
  };

  // Age-based life-cycle adjustment
  let adj = allocations[riskAppetite];
  if (age >= 50) {
    adj = { E: Math.max(adj.E - 20, 10), C: adj.C + 10, G: adj.G + 10, label: adj.label + ' (Age-Adjusted)', description: adj.description + ' Reduced equity due to proximity to retirement.' };
  }

  el.innerHTML = `
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
      <div class="kpi-card" style="flex:1;min-width:130px;text-align:center">
        <div class="kpi-icon" style="background:rgba(0,180,216,0.15);color:var(--teal);margin:0 auto 0.5rem">📊</div>
        <div class="kpi-value" style="font-size:1.5rem;color:var(--teal)">${adj.E}%</div>
        <div class="kpi-label">Equity (E Class)</div>
        <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">High Growth</div>
      </div>
      <div class="kpi-card" style="flex:1;min-width:130px;text-align:center">
        <div class="kpi-icon" style="background:rgba(6,214,160,0.15);color:var(--accent);margin:0 auto 0.5rem">🏢</div>
        <div class="kpi-value" style="font-size:1.5rem;color:var(--accent)">${adj.C}%</div>
        <div class="kpi-label">Corporate Bonds (C)</div>
        <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">Moderate Return</div>
      </div>
      <div class="kpi-card" style="flex:1;min-width:130px;text-align:center">
        <div class="kpi-icon" style="background:rgba(255,183,3,0.15);color:var(--accent-warn);margin:0 auto 0.5rem">🏛️</div>
        <div class="kpi-value" style="font-size:1.5rem;color:var(--accent-warn)">${adj.G}%</div>
        <div class="kpi-label">Gov. Securities (G)</div>
        <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">Safe / Stable</div>
      </div>
    </div>
    <div class="alert alert-info">
      <div class="alert-icon">📋</div>
      <div class="alert-body">
        <h4>${adj.label} Allocation Profile</h4>
        <p>${adj.description} ${years > 10 ? 'With ' + years + ' years to go, this allocation allows adequate time for equity cycles to play out.' : 'Consider gradually de-risking as you approach retirement.'}</p>
      </div>
    </div>
  `;
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
  runAIInsights();
});
