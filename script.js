// --- IMPORTANT: Ensure this SCRIPT_URL is correct ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyktm_t4CX3XUzK5XfRNZHhaxpia31254CkmvACOaM-qcy-RJf744S3x_FjOv4jwzFriA/exec';

let allData = [];
let filteredData = [];
let charts = {}; // To store chart instances

// --- DOM Elements ---
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const companyFilter = document.getElementById('companyFilter');
const natureFilter = document.getElementById('natureFilter');
const typeFilter = document.getElementById('typeFilter');
const applyFiltersBtn = document.getElementById('applyFilters');
const resetFiltersBtn = document.getElementById('resetFilters');
const totalHoursElem = document.getElementById('totalHours');
const totalCompaniesElem = document.getElementById('totalCompanies');
const uniqueNaturesElem = document.getElementById('uniqueNatures');
const dataTableBody = document.querySelector('#dataTable tbody');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Set default date range (e.g., last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];

    fetchData(); // Fetch data when the page loads
    setupEventListeners();
});

function setupEventListeners() {
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);

    // --- NEW: Add change listeners for cascading filters ---
    companyFilter.addEventListener('change', onCompanyFilterChange);
    natureFilter.addEventListener('change', onNatureFilterChange);
    // typeFilter change doesn't need to trigger other filter updates, only applyFilters
}

// --- JSONP Callback Function ---
function handleAppsScriptResponse(data) {
    console.log("Data received via JSONP:", data);
    allData = data.map(row => {
        const dateStr = row.Date;
        const timeHrs = parseFloat(row.Time_hrs);
        const company = row.Company_Worked_For;
        const nature = row.Nature_of_Work;
        const type = row.Type_of_Work;
        const description = row.Description_of_Work;

        return {
            ...row,
            parsedDate: dateStr ? new Date(dateStr) : null,
            Time_hrs: isNaN(timeHrs) ? 0 : timeHrs,
            Company_Worked_For: company || 'N/A',
            Nature_of_Work: nature || 'N/A',
            Type_of_Work: type || 'N/A',
            Description_of_Work: description || 'N/A'
        };
    }).filter(row => row.parsedDate !== null);

    // Initial population of company filter and then trigger applyFilters
    populateCompanyFilter();
    applyFilters();
}

// --- Data Fetching (modified to use JSONP) ---
function fetchData() {
    const script = document.createElement('script');
    script.src = SCRIPT_URL + '?callback=handleAppsScriptResponse';
    document.body.appendChild(script);

    script.onerror = () => {
        console.error('Error loading Apps Script data via JSONP. Check URL and Apps Script deployment.');
        alert('Failed to load data. Please check the Apps Script URL and deployment.');
    };

    script.onload = () => {
        setTimeout(() => {
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        }, 100);
    };
}

// --- Filter Population Functions (Refactored for cascading) ---

function populateCompanyFilter() {
    const companies = [...new Set(allData.map(item => item.Company_Worked_For))].sort();
    populateSelect(companyFilter, companies);
    // After populating, ensure the currently selected value is valid, or reset to 'All'
    if (!companies.includes(companyFilter.value) && companyFilter.value !== '') {
        companyFilter.value = '';
    }
}

function populateNatureFilter(dataContext) {
    const natures = [...new Set(dataContext.map(item => item.Nature_of_Work))].sort();
    populateSelect(natureFilter, natures);
    // Reset if current value is no longer valid
    if (!natures.includes(natureFilter.value) && natureFilter.value !== '') {
        natureFilter.value = '';
    }
}

function populateTypeFilter(dataContext) {
    const types = [...new Set(dataContext.map(item => item.Type_of_Work))].sort();
    populateSelect(typeFilter, types);
    // Reset if current value is no longer valid
    if (!types.includes(typeFilter.value) && typeFilter.value !== '') {
        typeFilter.value = '';
    }
}

function populateSelect(selectElement, options) {
    const currentValue = selectElement.value; // Store current selection
    // Keep 'All' option, then add new options
    while (selectElement.children.length > 1) {
        selectElement.removeChild(selectElement.lastChild);
    }
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        selectElement.appendChild(opt);
    });
    // Try to restore previous selection if it's still valid, otherwise default to 'All'
    if (options.includes(currentValue)) {
        selectElement.value = currentValue;
    } else {
        selectElement.value = ''; // Reset to 'All'
    }
}


// --- Event Handlers for Cascading Filters ---
function onCompanyFilterChange() {
    // Filter `allData` by selected company AND current date range
    const currentStartDate = new Date(startDateInput.value);
    const currentEndDate = new Date(endDateInput.value);
    currentEndDate.setHours(23, 59, 59, 999);

    const dataFilteredByCompanyAndDate = allData.filter(row => {
        const rowDate = row.parsedDate;
        const companyMatch = companyFilter.value === '' || row.Company_Worked_For === companyFilter.value;
        return rowDate && rowDate >= currentStartDate && rowDate <= currentEndDate && companyMatch;
    });

    populateNatureFilter(dataFilteredByCompanyAndDate); // Populate Nature based on company and date
    populateTypeFilter(dataFilteredByCompanyAndDate); // Also update type based on company and date
    applyFilters(); // Re-apply all filters to update dashboard
}

function onNatureFilterChange() {
    // Filter `allData` by selected company, nature AND current date range
    const currentStartDate = new Date(startDateInput.value);
    const currentEndDate = new Date(endDateInput.value);
    currentEndDate.setHours(23, 59, 59, 999);

    const dataFilteredByCompanyNatureAndDate = allData.filter(row => {
        const rowDate = row.parsedDate;
        const companyMatch = companyFilter.value === '' || row.Company_Worked_For === companyFilter.value;
        const natureMatch = natureFilter.value === '' || row.Nature_of_Work === natureFilter.value;
        return rowDate && rowDate >= currentStartDate && rowDate <= currentEndDate && companyMatch && natureMatch;
    });

    populateTypeFilter(dataFilteredByCompanyNatureAndDate); // Populate Type based on company, nature and date
    applyFilters(); // Re-apply all filters to update dashboard
}


// --- Filtering Logic (now cleaner as population is handled elsewhere) ---
function applyFilters() {
    const start = new Date(startDateInput.value);
    const end = new Date(endDateInput.value);
    end.setHours(23, 59, 59, 999);

    const selectedCompany = companyFilter.value;
    const selectedNature = natureFilter.value;
    const selectedType = typeFilter.value;

    filteredData = allData.filter(row => {
        const rowDate = row.parsedDate;
        const companyMatch = selectedCompany === '' || row.Company_Worked_For === selectedCompany;
        const natureMatch = selectedNature === '' || row.Nature_of_Work === selectedNature;
        const typeMatch = selectedType === '' || row.Type_of_Work === selectedType;

        return rowDate && rowDate >= start && rowDate <= end && companyMatch && natureMatch && typeMatch;
    });

    updateDashboard();
}

function resetFilters() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];

    // Reset select filters to 'All'
    companyFilter.value = '';
    natureFilter.value = '';
    typeFilter.value = '';

    // Re-populate and apply
    populateCompanyFilter(); // This will also cascade reset others
    onCompanyFilterChange(); // Trigger the change handler for company to reset nature/type options
    // applyFilters will be called by onCompanyFilterChange
}

// --- Dashboard Update (Summary, Charts, Table) ---
function updateDashboard() {
    updateSummaryCards();
    renderDailyHoursChart();
    renderCompanyHoursChart();
    renderNatureHoursChart();
    renderTypeHoursChart();
    renderDataTable();
}

function updateSummaryCards() {
    const totalHours = filteredData.reduce((sum, row) => sum + row.Time_hrs, 0);
    totalHoursElem.textContent = totalHours.toFixed(2);

    const uniqueCompanies = new Set(filteredData.map(row => row.Company_Worked_For)).size;
    totalCompaniesElem.textContent = uniqueCompanies;

    const uniqueNatures = new Set(filteredData.map(row => row.Nature_of_Work)).size;
    uniqueNaturesElem.textContent = uniqueNatures;
}

function renderDataTable() {
    dataTableBody.innerHTML = ''; // Clear existing rows

    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align: center; color: #c0c0d8;">No data available for the selected filters.</td>`;
        dataTableBody.appendChild(tr);
        return;
    }

    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Date || 'N/A'}</td>
            <td>${row.Time_hrs !== undefined ? row.Time_hrs.toFixed(2) : 'N/A'}</td>
            <td>${row.Company_Worked_For || 'N/A'}</td>
            <td>${row.Nature_of_Work || 'N/A'}</td>
            <td>${row.Type_of_Work || 'N/A'}</td>
            <td>${row.Description_of_Work || 'N/A'}</td>
        `;
        dataTableBody.appendChild(tr);
    });
}

// --- Chart Rendering Functions ---
function destroyChart(chartId) {
    if (charts[chartId]) {
        charts[chartId].destroy();
        delete charts[chartId];
    }
}

// Chart 1: Daily Hours Trend
function renderDailyHoursChart() {
    destroyChart('dailyHoursChart');
    const ctx = document.getElementById('dailyHoursChart').getContext('2d');

    const dailyHours = filteredData.reduce((acc, row) => {
        if (row.parsedDate) {
            const dateKey = row.parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
            acc[dateKey] = (acc[dateKey] || 0) + row.Time_hrs;
        }
        return acc;
    }, {});

    const labels = Object.keys(dailyHours).sort();
    const data = labels.map(label => dailyHours[label]);

    charts.dailyHoursChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours',
                data: data,
                borderColor: '#00bcd4', /* Vibrant teal */
                backgroundColor: 'rgba(0, 188, 212, 0.2)', /* Lighter teal fill */
                fill: true,
                tension: 0.3 /* Slightly smoother curve */
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'MMM D, YYYY' // e.g., 'Jan 1, 2024'
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#c0c0d8' // Light text for axis title
                    },
                    ticks: {
                        color: '#a0aec0' // Light text for axis ticks
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Light grid lines
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours',
                        color: '#c0c0d8'
                    },
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.7)', // Dark tooltip background
                    titleColor: '#00bcd4', // Teal tooltip title
                    bodyColor: '#e0e0e0' // Light tooltip body text
                },
                legend: {
                    labels: {
                        color: '#c0c0d8' // Light text for legend
                    }
                }
            }
        }
    });
}

// Chart 2: Hours by Company
function renderCompanyHoursChart() {
    destroyChart('companyHoursChart');
    const ctx = document.getElementById('companyHoursChart').getContext('2d');

    const companyData = filteredData.reduce((acc, row) => {
        acc[row.Company_Worked_For] = (acc[row.Company_Worked_For] || 0) + row.Time_hrs;
        return acc;
    }, {});

    const labels = Object.keys(companyData);
    const data = labels.map(label => companyData[label]);

    charts.companyHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours',
                data: data,
                backgroundColor: [
                    '#00bcd4', '#8bc34a', '#ffeb3b', '#ff5722', '#673ab7', '#e91e63', '#009688', '#ffc107'
                ], /* Vibrant color palette */
                borderColor: [
                    '#00a8bd', '#7cb342', '#fdd835', '#e64a19', '#5e35b1', '#d81b60', '#00796b', '#ffa000'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Make it a horizontal bar chart
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours',
                        color: '#c0c0d8'
                    },
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Company',
                        color: '#c0c0d8'
                    },
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // No need for legend in single dataset bar chart
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    titleColor: '#00bcd4',
                    bodyColor: '#e0e0e0'
                }
            }
        }
    });
}

// Chart 3: Hours by Nature of Work (Pie/Doughnut)
function renderNatureHoursChart() {
    destroyChart('natureHoursChart');
    const ctx = document.getElementById('natureHoursChart').getContext('2d');

    const natureData = filteredData.reduce((acc, row) => {
        acc[row.Nature_of_Work] = (acc[row.Nature_of_Work] || 0) + row.Time_hrs;
        return acc;
    }, {});

    const labels = Object.keys(natureData);
    const data = labels.map(label => natureData[label]);

    charts.natureHoursChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours',
                data: data,
                backgroundColor: [
                    '#00bcd4', '#8bc34a', '#ffeb3b', '#ff5722', '#673ab7', '#e91e63', '#009688', '#ffc107', '#2196f3', '#f44336'
                ], /* Vibrant color palette */
                hoverOffset: 8 /* Slightly larger hover offset */
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // <--- ADD THIS LINE
            aspectRatio: 1, // You can play with this, e.g., 1 for square, 1.5 for wider, 0.8 for taller
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#c0c0d8' // Light text for legend
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    titleColor: '#00bcd4',
                    bodyColor: '#e0e0e0',
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toFixed(2) + ' hours';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Chart 4: Hours by Type of Work (Bar)
function renderTypeHoursChart() {
    destroyChart('typeHoursChart');
    const ctx = document.getElementById('typeHoursChart').getContext('2d');

    const typeData = filteredData.reduce((acc, row) => {
        acc[row.Type_of_Work] = (acc[row.Type_of_Work] || 0) + row.Time_hrs;
        return acc;
    }, {});

    const labels = Object.keys(typeData);
    const data = labels.map(label => typeData[label]);

    charts.typeHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours',
                data: data,
                backgroundColor: '#673ab7', /* Deep purple accent */
                borderColor: '#5e35b1',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // <--- ADD THIS LINE
            aspectRatio: 2, // <--- You can adjust this for bar charts (e.g., 2 makes it twice as wide as tall)
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Type of Work',
                        color: '#c0c0d8'
                    },
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours',
                        color: '#c0c0d8'
                    },
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    titleColor: '#00bcd4',
                    bodyColor: '#e0e0e0'
                }
            }
        }
    });
}
