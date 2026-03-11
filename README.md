# Work Tracker Dashboard

A lightweight time-tracking website to log hours at both **customer level** and **work level**.

## Features

- Add time entries with date, customer, work level, task, hours, and description.
- Filter by date range, customer, and work level.
- View summary cards for total hours, customers, work levels, and entries.
- Charts for daily trend, customer-wise hours, and work-level split.
- Supports **Google Drive storage** using Google Sheets + Apps Script for multi-device use.
- Falls back to local storage if Google Script URL is not configured.

## Finalized data format

Your finalized entry structure (used in app + Google Sheet):

```json
{
  "id": "uuid",
  "date": "YYYY-MM-DD",
  "customer": "Customer name",
  "workLevel": "Implementation | Support | Consulting | Development | Documentation",
  "task": "Short task title",
  "hours": 1.5,
  "description": "Work details"
}
```

- A ready-to-use starter dataset is included in [`finalized-data.json`](./finalized-data.json).

## Finalized Google Sheet columns

Use this exact header row in your Google Sheet:

```text
id | date | customer | workLevel | task | hours | description
```

## Finalized steps for you to work on

### 1) Setup Google Drive storage

1. Create a Google Sheet in Google Drive.
2. Open **Extensions → Apps Script**.
3. Paste this script:

```javascript
const SHEET_NAME = 'Entries';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'date', 'customer', 'workLevel', 'task', 'hours', 'description']);
  }
  return sheet;
}

function doGet(e) {
  const action = (e.parameter.action || 'list').toLowerCase();
  if (action !== 'list') return jsonOutput({ entries: [] });

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const rows = values.slice(1).filter(r => r[0]);
  const entries = rows.map(row => {
    const item = {};
    headers.forEach((h, i) => (item[h] = row[i] ?? ''));
    item.hours = Number(item.hours || 0);
    return item;
  });

  return jsonOutput({ entries });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const entries = Array.isArray(body.entries) ? body.entries : [];

  const sheet = getSheet();
  sheet.clearContents();
  sheet.appendRow(['id', 'date', 'customer', 'workLevel', 'task', 'hours', 'description']);

  if (entries.length) {
    const rows = entries.map(x => [x.id, x.date, x.customer, x.workLevel, x.task, x.hours, x.description || '']);
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }

  return jsonOutput({ ok: true, count: entries.length });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

4. Deploy as **Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone with the link** (or your org users)
5. Copy the deployment URL.

### 2) Connect your app

1. Open `script.js`.
2. Set `GOOGLE_SCRIPT_URL` to your deployment URL.
3. Save and reload the app.
4. You should see: `Storage: Google Drive (Google Sheets via Apps Script)`.

### 3) Load starter data (optional)

1. Open `finalized-data.json`.
2. Copy rows into your Google Sheet (same columns/order), or just start entering from UI.
3. Click **Sync from Google Drive** in the app.

### 4) Daily workflow

1. Add entries from the form.
2. Use filters for date/customer/work level.
3. Review summary cards + charts weekly.
4. Export Google Sheet whenever you want backup/reporting.


## Use on iPhone

To use this from your iPhone, host the files on a reachable URL (for example GitHub Pages, Netlify, or your own server), then:

1. Open the hosted URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from your home screen for an app-like full-screen experience.
4. Keep `GOOGLE_SCRIPT_URL` configured so data syncs via Google Drive across devices.

> Note: opening `index.html` directly from your laptop will not make it accessible on iPhone unless it is hosted.

## Run locally

Open `index.html` in your browser (or serve via `python -m http.server`).
