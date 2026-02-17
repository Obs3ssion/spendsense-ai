const path = require('path');
const express = require('express');
const cors = require('cors');

const transactionsRouter = require('./routes/transactions');
const healthRouter = require('./routes/health');
const analyzeRouter = require('../routes/analyze');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ type: 'application/json' }));
app.use(express.text({ type: 'text/csv', limit: '1mb' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/health', healthRouter);
app.use('/transactions', transactionsRouter);
app.use('/analyze', analyzeRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

module.exports = app;
