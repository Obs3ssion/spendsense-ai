/**
 * Parse CSV string with headers: date, description, category, amount
 * Returns array of raw row objects; does not validate.
 */

function parseCSV(csvString) {
  if (typeof csvString !== 'string' || csvString.trim() === '') {
    return { rows: [], errors: ['CSV string is empty'] };
  }

  const lines = csvString.trim().split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { rows: [], errors: ['CSV has no lines'] };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const descIdx = headers.indexOf('description');
  const catIdx = headers.indexOf('category');
  const amountIdx = headers.indexOf('amount');

  const missing = [];
  if (dateIdx === -1) missing.push('date');
  if (descIdx === -1) missing.push('description');
  if (catIdx === -1) missing.push('category');
  if (amountIdx === -1) missing.push('amount');

  if (missing.length > 0) {
    return { rows: [], errors: [`CSV must have headers: date, description, category, amount. Missing: ${missing.join(', ')}`] };
  }

  const rows = [];
  const errors = [];
  const merchantIdx = headers.indexOf('merchant');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    if (values.length < 4) {
      errors.push(`Row ${i + 1}: insufficient columns`);
      continue;
    }
    rows.push({
      date: values[dateIdx] ?? '',
      description: values[descIdx] ?? '',
      category: values[catIdx] ?? '',
      amount: values[amountIdx] ?? '',
      merchant: merchantIdx >= 0 ? (values[merchantIdx] ?? undefined) : undefined,
    });
  }

  return { rows, errors };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

module.exports = { parseCSV };
