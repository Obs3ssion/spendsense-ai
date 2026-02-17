(function () {
  const uploadPayload = document.getElementById('uploadPayload');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadMessage = document.getElementById('uploadMessage');
  const csvFileInput = document.getElementById('csvFile');
  const uploadCsvBtn = document.getElementById('uploadCsvBtn');
  const resetBtn = document.getElementById('resetBtn');
  const downloadSampleCsv = document.getElementById('downloadSampleCsv');
  const transactionCountEl = document.getElementById('transactionCount');
  const selectedFileNameEl = document.getElementById('selectedFileName');
  const windowDaysInput = document.getElementById('windowDays');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultsPlaceholder = document.getElementById('resultsPlaceholder');
  const resultsSummary = document.getElementById('resultsSummary');
  const weeklySummaryEl = document.getElementById('weeklySummary');
  const riskLevelEl = document.getElementById('riskLevel');
  const alertsList = document.getElementById('alertsList');
  const subscriptionsList = document.getElementById('subscriptionsList');
  const fullJsonEl = document.getElementById('fullJson');
  const debugDetails = document.querySelector('.debug-details');

  function setUploadMessage(text, isError) {
    uploadMessage.textContent = text;
    uploadMessage.className = 'message' + (isError ? ' error' : ' success');
  }

  function setTransactionCount(count) {
    transactionCountEl.textContent = 'Total transactions: ' + count;
  }

  function clearResultsSection() {
    resultsPlaceholder.hidden = false;
    resultsPlaceholder.setAttribute('aria-hidden', 'false');
    resultsPlaceholder.textContent = 'Upload transactions, then run analysis to see your insights.';
    resultsSummary.hidden = true;
    resultsSummary.setAttribute('aria-hidden', 'true');
  }

  async function fetchTransactionCount() {
    try {
      const res = await fetch('/transactions');
      const data = await res.json();
      if (res.ok && data.transactions) setTransactionCount(data.transactions.length);
    } catch (e) {
      setTransactionCount(0);
    }
  }

  if (csvFileInput) {
    csvFileInput.addEventListener('change', function () {
      const file = csvFileInput.files && csvFileInput.files[0];
      selectedFileNameEl.textContent = file ? 'Selected file: ' + file.name : 'Selected file: none';
    });
  }

  if (uploadCsvBtn) {
    uploadCsvBtn.addEventListener('click', async function () {
      const file = csvFileInput.files && csvFileInput.files[0];
      if (!file) {
        setUploadMessage('Please choose a CSV file first.', true);
        return;
      }
      setUploadMessage('Uploading CSV…', false);
      try {
        const text = await new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function () { resolve(reader.result); };
          reader.onerror = reject;
          reader.readAsText(file);
        });
        const res = await fetch('/transactions/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setUploadMessage('Error: ' + (data.error || res.status) + (data.details ? ' – ' + data.details.join(' ') : ''), true);
          return;
        }
        setUploadMessage('Added ' + data.addedCount + ' transaction(s). Total: ' + data.totalCount + '.', false);
        setTransactionCount(data.totalCount);
      } catch (e) {
        setUploadMessage('Request failed: ' + e.message, true);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async function () {
      setUploadMessage('Resetting…', false);
      try {
        const res = await fetch('/transactions', { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
          setUploadMessage('Reset failed: ' + (data.error || res.status), true);
          return;
        }
        setUploadMessage(data.message || 'All transactions cleared.', false);
        setTransactionCount(0);
        clearResultsSection();
      } catch (e) {
        setUploadMessage('Reset failed: ' + e.message, true);
      }
    });
  }

  if (downloadSampleCsv) {
    downloadSampleCsv.addEventListener('click', function () {
      const sample = 'date,description,category,amount\n2026-02-01,Netflix,Subscriptions,15.99\n2026-02-02,Groceries,Groceries,85.00\n2026-02-03,Coffee,Dining,5.50';
      const blob = new Blob([sample], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spendsense-sample.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  fetchTransactionCount();

  uploadBtn.addEventListener('click', async function () {
    let payload;
    try {
      payload = JSON.parse(uploadPayload.value.trim());
    } catch (e) {
      setUploadMessage('Invalid JSON: ' + e.message, true);
      return;
    }
    if (!payload.transactions && !payload.csv) {
      setUploadMessage('JSON must contain "transactions" or "csv".', true);
      return;
    }
    setUploadMessage('Uploading…', false);
    try {
      const res = await fetch('/transactions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadMessage('Error: ' + (data.error || res.status) + (data.details ? ' – ' + data.details.join(' ') : ''), true);
        return;
      }
      setUploadMessage('Added ' + data.addedCount + ' transaction(s). Total: ' + data.totalCount + '.', false);
      setTransactionCount(data.totalCount);
    } catch (e) {
      setUploadMessage('Request failed: ' + e.message, true);
    }
  });

  function getAnalyzeBody() {
    const days = Math.max(1, Math.min(365, parseInt(windowDaysInput.value, 10) || 30));
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  analyzeBtn.addEventListener('click', async function () {
    const body = getAnalyzeBody();
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        resultsPlaceholder.textContent = 'Error: ' + (data.error || res.status);
        resultsPlaceholder.hidden = false;
        resultsPlaceholder.setAttribute('aria-hidden', 'false');
        resultsSummary.hidden = true;
        resultsSummary.setAttribute('aria-hidden', 'true');
        return;
      }
      renderResults(data);
    } catch (e) {
      resultsPlaceholder.textContent = 'Request failed: ' + e.message;
      resultsPlaceholder.hidden = false;
      resultsPlaceholder.setAttribute('aria-hidden', 'false');
      resultsSummary.hidden = true;
      resultsSummary.setAttribute('aria-hidden', 'true');
    }
  });

  function renderResults(data) {
    resultsPlaceholder.hidden = true;
    resultsPlaceholder.setAttribute('aria-hidden', 'true');
    resultsSummary.hidden = false;
    resultsSummary.setAttribute('aria-hidden', 'false');

    weeklySummaryEl.textContent = data.weeklySummary || data.summary || '—';
    var riskLabel = (data.riskLevel || 'low').charAt(0).toUpperCase() + (data.riskLevel || 'low').slice(1);
    riskLevelEl.textContent = 'Risk: ' + riskLabel;
    riskLevelEl.className = 'risk-badge risk-' + (data.riskLevel || 'low');
    riskLevelEl.setAttribute('aria-label', 'Risk level: ' + riskLabel);

    alertsList.innerHTML = '';
    if (data.alerts && data.alerts.length) {
      data.alerts.forEach(function (a) {
        const li = document.createElement('li');
        li.textContent = a.message || (a.type + ': ' + JSON.stringify(a.evidence || {}));
        if (a.severity) li.classList.add('severity-' + a.severity);
        alertsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'No alerts.';
      alertsList.appendChild(li);
    }

    subscriptionsList.innerHTML = '';
    if (data.subscriptions && data.subscriptions.length) {
      data.subscriptions.forEach(function (s) {
        const li = document.createElement('li');
        li.textContent = (s.merchant || '—') + ': $' + (s.totalSpent != null ? Number(s.totalSpent).toFixed(2) : '0') + ' (' + (s.count || 0) + ')';
        subscriptionsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'None detected.';
      subscriptionsList.appendChild(li);
    }

    fullJsonEl.textContent = JSON.stringify(data, null, 2);
    if (debugDetails) debugDetails.open = false;
  }
})();
