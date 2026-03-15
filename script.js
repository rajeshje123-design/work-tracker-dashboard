const STORAGE_KEY = 'timeTrackerEntries';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytu8P_ix12DQwps8Rh08gpWLzp0-SfVtiI93k46y1-deKfosymdUAzKEDbOejxSOg/exec';

const charts = {};
let allEntries = [];
let filteredEntries = [];
let isRemoteStorage = false;

const entryForm = document.getElementById('entryForm');
const entryDate = document.getElementById('entryDate');
const entryCustomer = document.getElementById('entryCustomer');
const entryWorkLevel = document.getElementById('entryWorkLevel');
const entryTask = document.getElementById('entryTask');
const entryHours = document.getElementById('entryHours');
const entryDescription = document.getElementById('entryDescription');

const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const customerFilter = document.getElementById('customerFilter');
const workLevelFilter = document.getElementById('workLevelFilter');
const applyFiltersBtn = document.getElementById('applyFilters');
const resetFiltersBtn = document.getElementById('resetFilters');
const syncNowBtn = document.getElementById('syncNow');

const storageModeEl = document.getElementById('storageMode');
const totalHoursEl = document.getElementById('totalHours');
const totalCustomersEl = document.getElementById('totalCustomers');
const totalWorkLevelsEl = document.getElementById('totalWorkLevels');
const totalEntriesEl = document.getElementById('totalEntries');
const entriesTableBody = document.getElementById('entriesTableBody');

document.addEventListener('DOMContentLoaded', async () => {
  entryDate.value = new Date().toISOString().split('T')[0];
  setDefaultFilterRange();
  bindEvents();
  await loadEntries();
});

function bindEvents() {
  entryForm.addEventListener('submit', saveEntry);
  applyFiltersBtn.addEventListener('click', applyFilters);

  resetFiltersBtn.addEventListener('click', () => {
    setDefaultFilterRange();
    customerFilter.value = '';
    workLevelFilter.value = '';
    applyFilters();
  });

  syncNowBtn.addEventListener('click', async () => {
    if (!isRemoteStorage) return;
    await loadEntries();
  });

  entriesTableBody.addEventListener('click', event => {
    const btn = event.target.closest('button[data-id]');
    if (!btn) return;
    deleteEntry(btn.dataset.id);
  });
}

function setDefaultFilterRange() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
  endDate.value = today.toISOString().split('T')[0];
}

function seedEntries() {
  return [
    createEntry('Acme Corp', 'Implementation', 'Onboarding workshop', 2.5, 'Kickoff call and requirements', new Date()),
    createEntry('Globex', 'Support', 'Bug triage', 1.75, 'Investigated reported bug', new Date(Date.now() - 86400000)),
  ];
}

function createEntry(customer, workLevel, task, hours, description, date) {
  return {
    id: crypto.randomUUID(),
    date: new Date(date).toISOString().split('T')[0],
    customer: customer.trim(),
    workLevel: workLevel.trim(),
    task: task.trim(),
    hours: Number(hours),
    description: description.trim(),
  };
}

async function loadEntries() {
  isRemoteStorage = Boolean(GOOGLE_SCRIPT_URL.trim());
  setStorageMode();

  if (isRemoteStorage) {
    try {
      allEntries = await fetchRemoteEntries();
      applyStateAfterLoad();
      return;
    } catch (error) {
      console.error('Remote load failed, falling back to localStorage:', error);
      storageModeEl.textContent = 'Remote sync failed. Using Local Storage fallback.';
    }
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  allEntries = raw ? JSON.parse(raw) : seedEntries();
  persistLocalEntries();
  applyStateAfterLoad();
}

function applyStateAfterLoad() {
  allEntries = allEntries
    .map(normalizeEntry)
    .filter(entry => entry.id && entry.date && entry.customer && entry.workLevel && entry.task && entry.hours > 0);
  populateFilters();
  applyFilters();
}

function normalizeEntry(entry) {
  return {
    id: String(entry.id || crypto.randomUUID()),
    date: new Date(entry.date).toISOString().split('T')[0],
    customer: String(entry.customer || '').trim(),
    workLevel: String(entry.workLevel || '').trim(),
    task: String(entry.task || '').trim(),
    hours: Number(entry.hours || 0),
    description: String(entry.description || '').trim(),
  };
}

function setStorageMode() {
  storageModeEl.textContent = isRemoteStorage
    ? 'Storage: Google Drive (Google Sheets via Apps Script)'
    : 'Storage: Browser Local Storage (single device)';
  syncNowBtn.disabled = !isRemoteStorage;
}

async function fetchRemoteEntries() {
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=list`, { method: 'GET' });
  if (!response.ok) throw new Error(`Load failed: ${response.status}`);
  const payload = await response.json();
  if (!payload.entries || !Array.isArray(payload.entries)) return [];
  return payload.entries;
}

async function persistEntries() {
  if (isRemoteStorage) {
    await persistRemoteEntries(allEntries);
    return;
  }

  persistLocalEntries();
}

function persistLocalEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allEntries));
}

async function persistRemoteEntries(entries) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'save', entries }),
  });

  if (!response.ok) throw new Error(`Save failed: ${response.status}`);
}

async function saveEntry(event) {
  event.preventDefault();
  const entry = createEntry(
    entryCustomer.value,
    entryWorkLevel.value,
    entryTask.value,
    entryHours.value,
    entryDescription.value,
    entryDate.value
  );

  if (!entry.customer || !entry.workLevel || !entry.task || !entry.date || entry.hours <= 0) {
    return;
  }

  allEntries.unshift(entry);
  try {
    await persistEntries();
  } catch (error) {
    console.error(error);
    alert('Unable to save to Google Drive right now. Please check your Apps Script URL/deployment.');
    return;
  }

  entryForm.reset();
  entryDate.value = new Date().toISOString().split('T')[0];
  populateFilters();
  applyFilters();
}

async function deleteEntry(id) {
  allEntries = allEntries.filter(entry => entry.id !== id);

  try {
    await persistEntries();
  } catch (error) {
    console.error(error);
    alert('Unable to delete from Google Drive right now. Please retry.');
    return;
  }

  populateFilters();
  applyFilters();
}

function populateFilters() {
  populateSelect(customerFilter, uniqueValues(allEntries, 'customer'));
  populateSelect(workLevelFilter, uniqueValues(allEntries, 'workLevel'));
}

function uniqueValues(entries, key) {
  return [...new Set(entries.map(item => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function populateSelect(selectEl, values) {
  const firstOption = selectEl.firstElementChild.cloneNode(true);
  const selectedValue = selectEl.value;
  selectEl.innerHTML = '';
  selectEl.appendChild(firstOption);

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  if (values.includes(selectedValue)) {
    selectEl.value = selectedValue;
  }
}

function applyFilters() {
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  end.setHours(23, 59, 59, 999);

  filteredEntries = allEntries.filter(entry => {
    const entryDateValue = new Date(entry.date);
    const dateMatch = entryDateValue >= start && entryDateValue <= end;
    const customerMatch = !customerFilter.value || entry.customer === customerFilter.value;
    const workLevelMatch = !workLevelFilter.value || entry.workLevel === workLevelFilter.value;
    return dateMatch && customerMatch && workLevelMatch;
  });

  updateDashboard();
}

function updateDashboard() {
  updateSummaryCards();
  renderTable();
  renderDailyHoursChart();
  renderCustomerHoursChart();
  renderWorkLevelHoursChart();
}

function updateSummaryCards() {
  totalHoursEl.textContent = filteredEntries.reduce((sum, item) => sum + item.hours, 0).toFixed(2);
  totalCustomersEl.textContent = new Set(filteredEntries.map(item => item.customer)).size;
  totalWorkLevelsEl.textContent = new Set(filteredEntries.map(item => item.workLevel)).size;
  totalEntriesEl.textContent = filteredEntries.length;
}

function renderTable() {
  entriesTableBody.innerHTML = '';

  if (!filteredEntries.length) {
    entriesTableBody.innerHTML = '<tr><td colspan="7">No entries found for this filter.</td></tr>';
    return;
  }

  filteredEntries.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.customer}</td>
      <td>${entry.workLevel}</td>
      <td>${entry.task}</td>
      <td>${entry.hours.toFixed(2)}</td>
      <td>${entry.description || '-'}</td>
      <td><button type="button" data-id="${entry.id}">Delete</button></td>
    `;
    entriesTableBody.appendChild(row);
  });
}

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function renderDailyHoursChart() {
  destroyChart('dailyHoursChart');
  const grouped = groupSum(filteredEntries, 'date');
  const labels = Object.keys(grouped).sort();

  charts.dailyHoursChart = new Chart(document.getElementById('dailyHoursChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Hours', data: labels.map(key => grouped[key]), borderColor: '#35d0ff', backgroundColor: 'rgba(53,208,255,0.2)', fill: true, tension: 0.25 }],
    },
    options: { responsive: true, plugins: { legend: { labels: { color: '#e8ecf6' } } }, scales: { x: { ticks: { color: '#aeb9ce' } }, y: { ticks: { color: '#aeb9ce' } } } },
  });
}

function renderCustomerHoursChart() {
  destroyChart('customerHoursChart');
  const grouped = groupSum(filteredEntries, 'customer');
  charts.customerHoursChart = new Chart(document.getElementById('customerHoursChart'), {
    type: 'bar',
    data: { labels: Object.keys(grouped), datasets: [{ label: 'Hours', data: Object.values(grouped), backgroundColor: '#35d0ff' }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#e8ecf6' } } }, scales: { x: { ticks: { color: '#aeb9ce' } }, y: { ticks: { color: '#aeb9ce' } } } },
  });
}

function renderWorkLevelHoursChart() {
  destroyChart('workLevelHoursChart');
  const grouped = groupSum(filteredEntries, 'workLevel');
  charts.workLevelHoursChart = new Chart(document.getElementById('workLevelHoursChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(grouped),
      datasets: [{ data: Object.values(grouped), backgroundColor: ['#35d0ff', '#6b90ff', '#5ff5c5', '#ffca6b', '#ff7ea6'] }],
    },
    options: { responsive: true, plugins: { legend: { labels: { color: '#e8ecf6' } } } },
  });
}

function groupSum(entries, key) {
  return entries.reduce((acc, entry) => {
    acc[entry[key]] = (acc[entry[key]] || 0) + entry.hours;
    return acc;
  }, {});
}
