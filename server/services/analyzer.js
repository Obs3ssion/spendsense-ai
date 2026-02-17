/**
 * Behavioral finance analysis engine.
 * Deterministic, rule-based. No external APIs.
 */

const transactionStore = require('../src/models/Transaction');

const DISCRETIONARY_SET = transactionStore.DISCRETIONARY_SET;

const SUBSCRIPTION_KEYWORDS = [
  'netflix',
  'spotify',
  'apple',
  'prime',
  'amazon prime',
  'hulu',
  'gym',
  'icloud',
  'disney',
  'hbo',
  'youtube premium',
  'adobe',
  'microsoft 365',
  'dropbox',
  'audible',
  'kindle',
  'patreon',
  'linkedin',
  'canva',
  'notion',
  'subscription',
  'monthly',
  'annual',
  'recurring',
];

const ALERT_TYPES = {
  CATEGORY_SPIKE: 'CATEGORY_SPIKE',
  DISCRETIONARY_HIGH: 'DISCRETIONARY_HIGH',
  LARGE_SINGLE_PURCHASE: 'LARGE_SINGLE_PURCHASE',
  MULTIPLE_SUBSCRIPTIONS: 'MULTIPLE_SUBSCRIPTIONS',
  RAPID_SPIKE: 'RAPID_SPIKE',
};

function filterByDate(transactions, startDate, endDate) {
  if (!startDate && !endDate) return transactions;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  return transactions.filter((t) => {
    const d = new Date(t.date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

function amountWithinTolerance(a, b, pct = 0.05) {
  if (a === 0 && b === 0) return true;
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  return max === 0 || min / max >= 1 - pct;
}

function descriptionMatchesSubscription(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.trim().toLowerCase();
  return SUBSCRIPTION_KEYWORDS.some((kw) => lower.includes(kw));
}

function detectSubscriptions(transactions) {
  const byKey = new Map();

  for (const t of transactions) {
    const desc = (t.description || '').trim().toLowerCase();
    const merchant = (t.merchant || t.description || '').trim().toLowerCase();
    const key = merchant || desc || null;
    if (!key) continue;

    const isKeywordMatch =
      descriptionMatchesSubscription(t.description || '') ||
      descriptionMatchesSubscription(t.merchant || '');

    if (!byKey.has(key)) {
      byKey.set(key, { list: [], keywordMatch: isKeywordMatch });
    }
    const entry = byKey.get(key);
    entry.list.push({ date: t.date, amount: t.amount, ...t });
    if (isKeywordMatch) entry.keywordMatch = true;
  }

  const subscriptions = [];

  for (const [name, { list, keywordMatch }] of byKey) {
    const count = list.length;
    const total = list.reduce((s, x) => s + x.amount, 0);
    const avg = count ? total / count : 0;

    const byWeek = new Map();
    for (const item of list) {
      const wk = getWeekKey(item.date);
      if (!byWeek.has(wk)) byWeek.set(wk, []);
      byWeek.get(wk).push(item);
    }
    const weeks = [...byWeek.keys()].sort();
    const isRecurringByWeek =
      weeks.length >= 2 && list.every((x) => amountWithinTolerance(x.amount, avg));

    if (keywordMatch || (count >= 2 && isRecurringByWeek)) {
      subscriptions.push({
        merchant: name,
        totalSpent: Math.round(total * 100) / 100,
        count,
      });
    }
  }

  return subscriptions;
}

function buildAlerts(transactions, totalSpend, byCategory, discretionaryShare, subscriptions, avgTransaction) {
  const alerts = [];

  // CATEGORY_SPIKE: >50% of total
  for (const [category, amount] of byCategory) {
    if (totalSpend <= 0) continue;
    const percent = amount / totalSpend;
    if (percent > 0.5) {
      // medium: 50–65%, high: 65%+
      let severity = 'medium';
      if (percent >= 0.65) severity = 'high';

      alerts.push({
        type: ALERT_TYPES.CATEGORY_SPIKE,
        severity,
        message: `${category} dominates spend (${Math.round(percent * 100)}%).`,
        evidence: {
          category,
          percent: Math.round(percent * 1000) / 1000,
          amount: Math.round(amount * 100) / 100,
        },
      });
    }
  }

  // DISCRETIONARY_HIGH: >60% of total (medium 60–70, high 70+)
  if (discretionaryShare > 0.6) {
    let severity = 'medium';
    if (discretionaryShare >= 0.7) severity = 'high';

    alerts.push({
      type: ALERT_TYPES.DISCRETIONARY_HIGH,
      severity,
      message: `Discretionary spending is ${Math.round(discretionaryShare * 100)}% of total.`,
      evidence: {
        discretionaryShare: Math.round(discretionaryShare * 1000) / 1000,
        amount:
          Math.round(
            transactions
              .filter((t) => DISCRETIONARY_SET.has(t.category))
              .reduce((s, t) => s + t.amount, 0) * 100
          ) / 100,
      },
    });
  }

  // LARGE_SINGLE_PURCHASE: >40% of total
  if (transactions.length > 0 && totalSpend > 0) {
    const largest = transactions.reduce((max, t) => (t.amount > (max?.amount ?? 0) ? t : max), null);
    if (largest && largest.amount / totalSpend > 0.4) {
      alerts.push({
        type: ALERT_TYPES.LARGE_SINGLE_PURCHASE,
        severity: 'high',
        message: `A single purchase (${largest.description || 'Unknown'}) is ${Math.round((largest.amount / totalSpend) * 100)}% of total spend.`,
        evidence: {
          description: largest.description,
          amount: Math.round(largest.amount * 100) / 100,
          percentOfTotal: Math.round((largest.amount / totalSpend) * 1000) / 1000,
        },
      });
    }
  }

  // MULTIPLE_SUBSCRIPTIONS: 3+ subs
  if (subscriptions.length >= 3) {
    const totalSub = subscriptions.reduce((s, sub) => s + sub.totalSpent, 0);
    alerts.push({
      type: ALERT_TYPES.MULTIPLE_SUBSCRIPTIONS,
      severity: 'medium',
      message: `You have ${subscriptions.length} recurring subscriptions ($${totalSub.toFixed(2)} total).`,
      evidence: {
        subscriptionCount: subscriptions.length,
        totalSpent: Math.round(totalSub * 100) / 100,
        merchants: subscriptions.map((s) => s.merchant),
      },
    });
  }

  // RAPID_SPIKE: largest > 2.5x average
  if (avgTransaction > 0 && transactions.length >= 3) {
    const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
    const topAmount = sorted[0].amount;
    if (topAmount > avgTransaction * 2.5) {
      alerts.push({
        type: ALERT_TYPES.RAPID_SPIKE,
        severity: 'medium',
        message: `Your largest transaction ($${topAmount.toFixed(2)}) is ${(topAmount / avgTransaction).toFixed(1)}x your average ($${avgTransaction.toFixed(2)}).`,
        evidence: {
          largestAmount: Math.round(topAmount * 100) / 100,
          averageAmount: Math.round(avgTransaction * 100) / 100,
          ratio: Math.round((topAmount / avgTransaction) * 100) / 100,
        },
      });
    }
  }

  return alerts;
}

function buildPatterns(transactions, totalSpend) {
  const byMerchant = new Map();
  for (const t of transactions) {
    const key = (t.merchant || t.description || '').trim() || 'Unknown';
    byMerchant.set(key, (byMerchant.get(key) || 0) + 1);
  }
  const repeatMerchants = [...byMerchant.entries()]
    .filter(([, count]) => count >= 2)
    .map(([name, count]) => ({ merchant: name, count }))
    .sort((a, b) => b.count - a.count);

  let largestSinglePurchase = {};
  if (transactions.length > 0) {
    const largest = transactions.reduce((max, t) => (t.amount > (max?.amount ?? 0) ? t : max), null);
    if (largest) {
      largestSinglePurchase = {
        description: largest.description,
        merchant: largest.merchant,
        amount: Math.round(largest.amount * 100) / 100,
        date: largest.date,
      };
    }
  }

  const sortedByAmount = [...transactions].sort((a, b) => b.amount - a.amount);
  const top1 = sortedByAmount.slice(0, 1).reduce((s, t) => s + t.amount, 0);
  const top3 = sortedByAmount.slice(0, 3).reduce((s, t) => s + t.amount, 0);
  const spendConcentration = {
    top1Pct: totalSpend > 0 ? Math.round((top1 / totalSpend) * 1000) / 1000 : 0,
    top3Pct: totalSpend > 0 ? Math.round((top3 / totalSpend) * 1000) / 1000 : 0,
  };

  let weekday = 0;
  let weekend = 0;
  for (const t of transactions) {
    const d = new Date(t.date);
    const day = d.getDay();
    if (day === 0 || day === 6) weekend += t.amount;
    else weekday += t.amount;
  }
  const weekdayVsWeekend = {
    weekday: Math.round(weekday * 100) / 100,
    weekend: Math.round(weekend * 100) / 100,
  };

  return {
    repeatMerchants,
    largestSinglePurchase,
    spendConcentration,
    weekdayVsWeekend,
  };
}

function buildWeeklySummary(transactions, totalSpend, topCategory, discretionaryShare, subscriptions, riskLevel, weekdayVsWeekend) {
  if (transactions.length === 0 || totalSpend <= 0) {
    return 'No spending in this period. Add transactions to get behavioral insights.';
  }

  const parts = [];
  const mainDriver =
    topCategory?.name && topCategory.amount > 0
      ? `${topCategory.name} drove most of your spend ($${topCategory.amount.toFixed(2)}). `
      : 'Your spending is spread across categories. ';
  parts.push(mainDriver);

  let positive = '';
  if (discretionaryShare <= 0.45) {
    positive = 'Your discretionary share is in a healthy range—good job keeping lifestyle spend under control. ';
  } else if (subscriptions.length === 0) {
    positive = 'You have no detected subscriptions, which keeps fixed costs predictable. ';
  } else if (weekdayVsWeekend && weekdayVsWeekend.weekday >= weekdayVsWeekend.weekend) {
    positive = 'Most of your spend falls on weekdays, which often reflects planned essentials. ';
  } else if (weekdayVsWeekend) {
    positive = 'Weekend spend is visible; consider a small weekend budget to stay on track. ';
  }
  parts.push(positive);

  let improvement = '';
  if (riskLevel === 'high' || discretionaryShare > 0.5) {
    improvement = 'Focus this week: cap discretionary spending to 40% of total and track daily.';
  } else if (subscriptions.length > 2) {
    improvement = 'Consider canceling one subscription you use least—small cuts compound over time.';
  } else if (topCategory?.amount > totalSpend * 0.4) {
    improvement = 'Your top category is very concentrated; try shifting one or two purchases to a cheaper alternative.';
  } else {
    improvement = 'Keep logging every transaction; consistency is the foundation of behavioral change.';
  }
  parts.push(improvement);

  return parts.filter(Boolean).join('').trim();
}

/** Risk scoring based on alert severities (deterministic). */
function scoreAlert(alert) {
  if (!alert || !alert.severity) return 0;
  if (alert.severity === 'low') return 1;
  if (alert.severity === 'medium') return 2;
  if (alert.severity === 'high') return 3;
  return 0;
}

function riskFromScore(score) {
  if (score <= 2) return 'low';
  if (score <= 5) return 'medium';
  return 'high';
}

function runAnalysis(startDate, endDate) {
  const all = transactionStore.getAll();
  const transactions = filterByDate(all, startDate, endDate);

  const totalSpend = transactions.reduce((s, t) => s + t.amount, 0);
  const avgTransaction = transactions.length > 0 ? totalSpend / transactions.length : 0;

  const byCategory = new Map();
  for (const t of transactions) {
    const cat = t.category || 'Other';
    byCategory.set(cat, (byCategory.get(cat) || 0) + t.amount);
  }

  let topCategory = { name: 'Other', amount: 0 };
  for (const [name, amount] of byCategory) {
    if (amount > topCategory.amount) topCategory = { name, amount };
  }

  const discretionaryTotal = transactions
    .filter((t) => DISCRETIONARY_SET.has(t.category))
    .reduce((s, t) => s + t.amount, 0);
  const discretionaryShare = totalSpend > 0 ? discretionaryTotal / totalSpend : 0;

  const subscriptions = detectSubscriptions(transactions);
  const subscriptionCount = subscriptions.length;

  // Build alerts first
  const alerts = buildAlerts(
    transactions,
    totalSpend,
    byCategory,
    discretionaryShare,
    subscriptions,
    avgTransaction
  );

  // Risk is determined from alert severity score
  const totalRiskScore = alerts.reduce((sum, a) => sum + scoreAlert(a), 0);
  const riskLevel = riskFromScore(totalRiskScore);

  const patterns = buildPatterns(transactions, totalSpend);

  const weeklySummary = buildWeeklySummary(
    transactions,
    totalSpend,
    topCategory,
    discretionaryShare,
    subscriptions,
    riskLevel,
    patterns.weekdayVsWeekend
  );

  const summary =
    totalSpend === 0
      ? 'No spending in the selected period.'
      : `Total spend: $${totalSpend.toFixed(2)}. Top category: ${topCategory.name} ($${topCategory.amount.toFixed(2)}). ` +
        `Discretionary share: ${(discretionaryShare * 100).toFixed(0)}%. Risk level: ${riskLevel}.`;

  const suggestions = [];
  if (subscriptionCount > 0) {
    const totalSub = subscriptions.reduce((s, x) => s + x.totalSpent, 0);
    const topSub = [...subscriptions].sort((a, b) => b.totalSpent - a.totalSpent)[0];
    suggestions.push(
      `You spent $${totalSub.toFixed(2)} on ${subscriptionCount} subscription(s). Consider canceling 1–2 (e.g. "${topSub.merchant}").`
    );
  }
  if (discretionaryShare > 0.45) {
    suggestions.push(
      `Discretionary spending is ${(discretionaryShare * 100).toFixed(0)}% of total. Aim for under 45% by capping dining and entertainment.`
    );
  }
  if (topCategory.amount > 0 && totalSpend > 0) {
    const pct = (topCategory.amount / totalSpend) * 100;
    if (pct > 40) {
      suggestions.push(
        `"${topCategory.name}" is ${pct.toFixed(0)}% of spend. Look for one or two cuts in this category.`
      );
    }
  }
  if (transactions.length >= 5 && avgTransaction > 0) {
    suggestions.push(
      `Average transaction is $${avgTransaction.toFixed(2)}. Review small recurring purchases—they add up.`
    );
  }
  if (riskLevel === 'high') {
    suggestions.push('Set a weekly discretionary cap (e.g. 30% of take-home) and track daily.');
  }

  return {
    summary,
    riskLevel,
    weeklySummary,
    metrics: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      topCategory: {
        name: topCategory.name,
        amount: Math.round(topCategory.amount * 100) / 100,
      },
      discretionaryShare: Math.round(discretionaryShare * 1000) / 1000,
      subscriptionCount,
    },
    subscriptions,
    alerts,
    patterns,
    suggestions: suggestions.slice(0, 5),
  };
}

module.exports = { runAnalysis };