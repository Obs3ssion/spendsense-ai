const express = require('express');
const { validateAnalyzeBody } = require('../src/middleware/validation');
const { runAnalysis } = require('../services/analyzer');

const router = express.Router();

/**
 * POST /analyze
 * Body (optional): { startDate?: string, endDate?: string }
 * Returns: summary, riskLevel, weeklySummary, metrics, subscriptions, alerts, patterns, suggestions
 */
router.post('/', (req, res, next) => {
  try {
    const result = validateAnalyzeBody(req.body);
    if (!result.valid) {
      return res.status(400).json({
        error: 'Invalid request',
        details: result.errors,
      });
    }

    const insight = runAnalysis(result.startDate, result.endDate);
    res.json(insight);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
