const express = require('express');
const transactionStore = require('../models/Transaction');
const { validateTransaction } = require('../middleware/validation');
const { parseCSV } = require('../utils/csvParser');

const router = express.Router();

/**
 * POST /transactions/upload
 * Body: { transactions: Transaction[] } OR { csv: string }
 */
router.post('/upload', (req, res, next) => {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: 'Request body must be JSON object with "transactions" or "csv"',
      });
    }

    let toAdd = [];
    const invalidRows = [];

    if (body.transactions !== undefined) {
      const arr = body.transactions;
      if (!Array.isArray(arr)) {
        return res.status(400).json({
          error: '"transactions" must be an array',
        });
      }
      for (let i = 0; i < arr.length; i++) {
        const result = validateTransaction(arr[i], i);
        if (result.valid) {
          toAdd.push(transactionStore.createTransaction(arr[i]));
        } else {
          invalidRows.push(...result.errors);
        }
      }
    } else if (body.csv !== undefined) {
      if (typeof body.csv !== 'string') {
        return res.status(400).json({
          error: '"csv" must be a string',
        });
      }
      const { rows, errors: csvErrors } = parseCSV(body.csv);
      if (csvErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid CSV',
          details: csvErrors,
        });
      }
      for (let i = 0; i < rows.length; i++) {
        const result = validateTransaction(rows[i], i);
        if (result.valid) {
          toAdd.push(rows[i]);
        } else {
          invalidRows.push(...result.errors);
        }
      }
    } else {
      return res.status(400).json({
        error: 'Request body must contain "transactions" (array) or "csv" (string)',
      });
    }

    if (invalidRows.length > 0) {
      return res.status(400).json({
        error: 'Validation failed for one or more rows',
        details: invalidRows,
      });
    }

    transactionStore.addMany(toAdd);
    const totalCount = transactionStore.getCount();

    res.status(200).json({
      addedCount: toAdd.length,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /transactions
 */
router.get('/', (req, res, next) => {
  try {
    const transactions = transactionStore.getAll();
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /transactions
 * Clear all transactions from in-memory storage.
 */
router.delete('/', (req, res, next) => {
  try {
    transactionStore.clear();
    res.json({ ok: true, message: 'All transactions cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
