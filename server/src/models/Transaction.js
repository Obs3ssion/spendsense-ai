/**
 * Transaction model and in-memory store.
 * amount: positive = expense (outflow).
 *
 * Category classification:
 * - Essential: necessary for living (groceries, utilities, transport, healthcare, housing).
 * - Discretionary: lifestyle / optional (dining out, entertainment, shopping, subscriptions).
 * - Other: uncategorized; treated as discretionary for risk analysis.
 */

const ESSENTIAL_CATEGORIES = [
  'Groceries',
  'Utilities',
  'Transport',
  'Healthcare',
  'Housing',
  'Insurance',
];

const DISCRETIONARY_CATEGORIES = [
  'Dining',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Other',
];

const CATEGORY_TYPE = Object.freeze({
  essential: 'essential',
  discretionary: 'discretionary',
});

const ESSENTIAL_SET = new Set(ESSENTIAL_CATEGORIES);
const DISCRETIONARY_SET = new Set(DISCRETIONARY_CATEGORIES);

function getCategoryType(category) {
  if (ESSENTIAL_SET.has(category)) return CATEGORY_TYPE.essential;
  if (DISCRETIONARY_SET.has(category)) return CATEGORY_TYPE.discretionary;
  return CATEGORY_TYPE.discretionary;
}

const NORMALIZED_CATEGORY_MAP = Object.freeze({
  dining: 'Dining',
  food: 'Dining',
  restaurant: 'Dining',
  restaurants: 'Dining',
  "dining out": 'Dining',
  "eat out": 'Dining',
  coffee: 'Dining',
  lunch: 'Dining',
  dinner: 'Dining',
  "food & drink": 'Dining',
  "food and drink": 'Dining',
  takeout: 'Dining',
  delivery: 'Dining',
  groceries: 'Groceries',
  grocery: 'Groceries',
  supermarket: 'Groceries',
  entertainment: 'Entertainment',
  movies: 'Entertainment',
  movie: 'Entertainment',
  games: 'Entertainment',
  recreation: 'Entertainment',
  shopping: 'Shopping',
  retail: 'Shopping',
  clothes: 'Shopping',
  clothing: 'Shopping',
  apparel: 'Shopping',
  merchandise: 'Shopping',
  subscriptions: 'Subscriptions',
  subscription: 'Subscriptions',
  recurring: 'Subscriptions',
  streaming: 'Subscriptions',
  utilities: 'Utilities',
  utility: 'Utilities',
  electric: 'Utilities',
  gas: 'Utilities',
  water: 'Utilities',
  internet: 'Utilities',
  phone: 'Utilities',
  transport: 'Transport',
  transportation: 'Transport',
  transit: 'Transport',
  fuel: 'Transport',
  "gas station": 'Transport',
  parking: 'Transport',
  healthcare: 'Healthcare',
  health: 'Healthcare',
  medical: 'Healthcare',
  pharmacy: 'Healthcare',
  housing: 'Housing',
  rent: 'Housing',
  mortgage: 'Housing',
  insurance: 'Insurance',
  other: 'Other',
});

const transactions = [];
let idCounter = 1;

function generateId() {
  return `txn_${Date.now()}_${idCounter++}`;
}

function normalizeCategory(category) {
  if (!category || typeof category !== 'string') return 'Other';
  const key = category.trim().toLowerCase();
  return NORMALIZED_CATEGORY_MAP[key] ?? 'Other';
}

function createTransaction(raw) {
  const category = normalizeCategory(raw.category);
  return {
    id: raw.id ?? generateId(),
    date: String(raw.date).trim(),
    description: String(raw.description ?? '').trim(),
    category,
    amount: Number(raw.amount),
    merchant: raw.merchant != null ? String(raw.merchant).trim() : undefined,
  };
}

function getAll() {
  return [...transactions];
}

function addMany(items) {
  const added = [];
  for (const item of items) {
    const txn = createTransaction(item);
    transactions.push(txn);
    added.push(txn);
  }
  return added;
}

function getCount() {
  return transactions.length;
}

function clear() {
  transactions.length = 0;
}

function getDiscretionaryCategories() {
  return [...DISCRETIONARY_CATEGORIES];
}

function getEssentialCategories() {
  return [...ESSENTIAL_CATEGORIES];
}

module.exports = {
  transactions,
  getAll,
  addMany,
  getCount,
  clear,
  CATEGORY_TYPE,
  ESSENTIAL_CATEGORIES,
  DISCRETIONARY_CATEGORIES,
  DISCRETIONARY_SET,
  ESSENTIAL_SET,
  getDiscretionaryCategories,
  getEssentialCategories,
  getCategoryType,
  createTransaction,
  normalizeCategory,
};
