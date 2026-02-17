# SpendSense AI – Backend

Behavioral budgeting assistant backend. In-memory storage; deterministic “AI” analysis (no external APIs).

## Run locally

```bash
cd server
cp .env.example .env
npm install
npm start
```

With auto-reload during development:

```bash
npm run dev
```

Server listens on `http://localhost:3000` (or `PORT` from `.env`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. Returns `{ "status": "ok" }`. |
| GET | `/transactions` | List all transactions. Returns `{ "transactions": Transaction[] }`. |
| POST | `/transactions/upload` | Add transactions (JSON or CSV). Returns `{ "addedCount", "totalCount" }`. |
| POST | `/analyze` | Run behavioral analysis. Optional body: `{ "startDate?", "endDate?" }`. Returns insight JSON. |

### POST /transactions/upload

- **JSON:** `{ "transactions": [ { "date", "description", "category", "amount", "merchant?" } ] }`
  - `date`: YYYY-MM-DD  
  - `amount`: number, positive = expense  
- **CSV:** `{ "csv": "string" }` with header row: `date,description,category,amount` (optional column: `merchant`).

Invalid rows are rejected with `400` and a `details` array of error messages.

### POST /analyze

- Optional body: `{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }`.
- Response: `summary`, `riskLevel` (low|medium|high), `weeklySummary`, `metrics`, `subscriptions` (array of `{ merchant, totalSpent, count }`), `alerts` (each: `type`, `severity`, `message`, `evidence`), `patterns` (repeatMerchants, largestSinglePurchase, spendConcentration, weekdayVsWeekend), `suggestions[]`.

## Project structure

```
server/
├── src/
│   ├── index.js          # Entry, starts HTTP server
│   ├── app.js            # Express app, CORS, routes, error handler
│   ├── models/
│   │   └── Transaction.js # In-memory store, IDs, category normalization
│   ├── routes/
│   │   ├── transactions.js # GET /transactions, POST /transactions/upload
│   │   ├── analyze.js      # POST /analyze
│   │   └── health.js       # GET /health
│   ├── services/
│   │   ├── analyzer.js       # Behavioral analysis engine (alerts, patterns, subscriptions)
│   │   └── analyzeService.js  # Re-exports analyzer
│   ├── fixtures/
│   │   └── testData.js       # balancedSpending & overspending fixtures for manual testing
│   ├── middleware/
│   │   ├── errorHandler.js  # Centralized JSON error responses
│   │   └── validation.js    # Transaction & date validation
│   └── utils/
│       └── csvParser.js     # CSV → rows with date, description, category, amount
├── package.json
├── .env.example
└── README.md
```

## Data model

- **Transaction:** `id`, `date` (YYYY-MM-DD), `description`, `category`, `amount` (positive = expense), `merchant?`
- Discretionary categories: Dining, Entertainment, Shopping, Subscriptions, Other. Unknown categories are normalized to “Other”.

## Responsible AI

- **No external AI model usage.** This backend does not call any third-party or cloud AI/LLM APIs. All logic is rule-based code in this repository.
- **Deterministic financial analysis.** Insights (risk level, alerts, subscriptions, patterns, suggestions) are computed from fixed rules and your transaction data only. Same inputs produce the same outputs; there is no generative or stochastic behavior.
- **No automated financial advice.** Outputs are for informational and educational use only. They are not personalized financial, tax, or legal advice. You are responsible for your own spending and budgeting decisions.
- **User data not persisted.** Transactions and analysis results are held in memory only. Restarting the server clears all data. Nothing is written to a database or sent to external services.
- **Limitations.** The system may misclassify categories, miss subscriptions, or misestimate risk. It does not see your income, debts, or full financial picture. Always verify important decisions with your own judgment or a qualified professional.
