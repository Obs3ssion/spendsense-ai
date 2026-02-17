/**
 * Test fixtures for manual testing of POST /transactions/upload and POST /analyze.
 *
 * Usage: POST { transactions: balancedSpending } or { transactions: overspending }
 * to /transactions/upload, then POST {} to /analyze. Or require in a script and pass to the store.
 */

const balancedSpending = [
  { date: '2025-02-01', description: 'Groceries', category: 'Groceries', amount: 85 },
  { date: '2025-02-02', description: 'Electric bill', category: 'Utilities', amount: 120 },
  { date: '2025-02-03', description: 'Lunch', category: 'Dining', amount: 14 },
  { date: '2025-02-04', description: 'Gas', category: 'Transport', amount: 45 },
  { date: '2025-02-05', description: 'Coffee', category: 'Dining', amount: 5 },
  { date: '2025-02-06', description: 'Pharmacy', category: 'Healthcare', amount: 28 },
  { date: '2025-02-07', description: 'Movie', category: 'Entertainment', amount: 18 },
  { date: '2025-02-08', description: 'Groceries', category: 'Groceries', amount: 72 },
  { date: '2025-02-09', description: 'Netflix', category: 'Subscriptions', amount: 15.99 },
  { date: '2025-02-10', description: 'Dinner out', category: 'Dining', amount: 42 },
];

const overspending = [
  { date: '2025-02-01', description: 'Netflix', category: 'Subscriptions', amount: 15.99 },
  { date: '2025-02-01', description: 'Spotify', category: 'Subscriptions', amount: 10.99 },
  { date: '2025-02-02', description: 'Apple iCloud', category: 'Subscriptions', amount: 2.99 },
  { date: '2025-02-03', description: 'Amazon Prime', category: 'Subscriptions', amount: 14.99 },
  { date: '2025-02-04', description: 'Designer jacket', category: 'Shopping', amount: 320 },
  { date: '2025-02-05', description: 'Restaurant', category: 'Dining', amount: 95 },
  { date: '2025-02-06', description: 'Bar', category: 'Entertainment', amount: 68 },
  { date: '2025-02-07', description: 'Online shopping', category: 'Shopping', amount: 180 },
  { date: '2025-02-08', description: 'Netflix', category: 'Subscriptions', amount: 15.99 },
  { date: '2025-02-09', description: 'Concert tickets', category: 'Entertainment', amount: 150 },
  { date: '2025-02-10', description: 'Brunch', category: 'Dining', amount: 55 },
  { date: '2025-02-11', description: 'Uber Eats', category: 'Dining', amount: 38 },
  { date: '2025-02-12', description: 'More shopping', category: 'Shopping', amount: 90 },
];

module.exports = {
  balancedSpending,
  overspending,
};
