/**
 * Validation helpers for Transaction and request bodies.
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_MAX_LENGTH = 100;
const AMOUNT_MAX = 999999999.99;

function isValidDate(str) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!DATE_REGEX.test(trimmed)) return false;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = trimmed.split('-').map(Number);
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== day) {
    return false;
  }
  return true;
}

function validateTransaction(raw, index) {
  const errors = [];
  if (raw == null || typeof raw !== 'object') {
    return { valid: false, errors: ['Transaction must be an object'] };
  }

  if (raw.date == null || String(raw.date).trim() === '') {
    errors.push('date is required');
  } else {
    const dateStr = String(raw.date).trim();
    if (!DATE_REGEX.test(dateStr)) {
      errors.push('date must be YYYY-MM-DD');
    } else {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) {
        errors.push('date must be a valid date');
      } else {
        const [y, m, day] = dateStr.split('-').map(Number);
        if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== day) {
          errors.push('date must be a valid calendar date (e.g. not 2024-02-30)');
        }
      }
    }
  }

  if (raw.description == null || String(raw.description).trim() === '') {
    errors.push('description is required');
  }

  if (raw.category == null) {
    errors.push('category is required');
  } else if (typeof raw.category !== 'string') {
    errors.push('category must be a string');
  } else {
    const categoryTrimmed = String(raw.category).trim();
    if (categoryTrimmed === '') {
      errors.push('category cannot be empty');
    } else if (categoryTrimmed.length > CATEGORY_MAX_LENGTH) {
      errors.push(`category must be at most ${CATEGORY_MAX_LENGTH} characters`);
    }
  }

  const amount = raw.amount;
  if (amount == null || amount === '') {
    errors.push('amount is required');
  } else {
    const num = Number(amount);
    if (Number.isNaN(num)) {
      errors.push('amount must be a number');
    } else if (!Number.isFinite(num)) {
      errors.push('amount must be finite');
    } else if (num < 0) {
      errors.push('amount must be non-negative (positive = expense)');
    } else if (num > AMOUNT_MAX) {
      errors.push(`amount must be at most ${AMOUNT_MAX}`);
    }
  }

  const rowLabel = index != null ? `Row ${index + 1}` : 'Transaction';
  return {
    valid: errors.length === 0,
    errors: errors.length ? [`${rowLabel}: ${errors.join('; ')}`] : [],
  };
}

function validateAnalyzeBody(body) {
  const errors = [];
  if (body == null || typeof body !== 'object') return { valid: true, startDate: undefined, endDate: undefined };

  let startDate = body.startDate;
  let endDate = body.endDate;

  if (startDate != null && startDate !== '') {
    startDate = String(startDate).trim();
    if (!DATE_REGEX.test(startDate) || Number.isNaN(new Date(startDate).getTime())) {
      errors.push('startDate must be YYYY-MM-DD');
    }
  } else {
    startDate = undefined;
  }

  if (endDate != null && endDate !== '') {
    endDate = String(endDate).trim();
    if (!DATE_REGEX.test(endDate) || Number.isNaN(new Date(endDate).getTime())) {
      errors.push('endDate must be YYYY-MM-DD');
    }
  } else {
    endDate = undefined;
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push('startDate must be before or equal to endDate');
  }

  return {
    valid: errors.length === 0,
    errors,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
}

module.exports = {
  isValidDate,
  validateTransaction,
  validateAnalyzeBody,
};
