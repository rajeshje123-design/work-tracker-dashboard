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
}

// --- JSONP Callback Function ---
// This function will be called by the Apps Script response
function handleAppsScriptResponse(data) {
    console.log("Data received via JSONP:", data);
    // Process raw data: convert date strings to Date objects, ensure numeric 'Time (hrs)'
    allData = data.map(row => {
        // --- NOTE: These column names must match the cleaned headers in your Apps Script ---
        // For example, 'Time (hrs)' in your sheet becomes 'Time_hrs' in the script
        const dateStr = row.Date;
        const timeHrs = parseFloat(row.Time_hrs);
        const company = row.Company_Worked_For;
        const nature = row.Nature_of_Work;
        const type = row.Type_of_Work;
        const description = row.Description_of_Work; // Ensure Description is also captured

        return {
            ...row, // Keep all original fields for table display if needed
            parsedDate: dateStr ? new Date(dateStr) : null,
            Time_hrs: isNaN(timeHrs) ? 0 : timeHrs, // Ensure it's a number
            Company_Worked_For: company || 'N/A',
            Nature_of_Work: nature || 'N/A',
            Type_of_Work: type || 'N/A',
            Description_of_Work: description || 'N/A' // Add description
        };
    }).filter(row => row.parsedDate !== null); // Filter out rows with invalid dates

    populateFilterOptions();
    applyFilters(); // Apply initial filters to show data
}


// --- Data Fetching (modified to use JSONP) ---
function fetchData() {
    // Dynamically create a script tag to make a JSONP request
    const script = document.createElement('script');
    // The callback function name 'handleAppsScriptResponse' must match the function we defined above
    script.src = SCRIPT_URL + '?callback=handleAppsScriptResponse';
    document.body.appendChild(script);

    script.onerror = () => {
        console.error('Error loading Apps Script data via JSONP. Check URL and Apps Script deployment.');
        alert('Failed to load data. Please check the Apps Script URL and deployment.');
    };

    // Clean up the script tag after it's loaded (or failed).
    // This is important to prevent too many script tags in the DOM over time.
    script.onload = () => {
        // A small delay ensures the script has fully executed its callback
        setTimeout(() => {
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        }, 100);
    };
}


// --- Filter Population ---
function populateFilterOptions() {
    const companies = [...new Set(allData.map(item => item.Company_Worked_For))].sort();
    const natures = [...new Set(allData.map(item => item.Nature_of_Work))].sort();
    const types = [...new Set(allData.map(item => item.Type_of_Work))].sort();

    populateSelect(companyFilter, companies);
    populateSelect(natureFilter, natures);
    populateSelect(typeFilter, types);
}

function populateSelect(selectElement, options) {
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
}

// --- Filtering Logic ---
function applyFilters() {
    const start = new Date(startDateInput.value);
    const end = new Date(endDateInput.value);
    // Adjust end date to include the whole day
    end.setHours(23, 59, 59, 999);

    const selectedCompany = companyFilter.value;
    const selectedNature = natureFilter.value;
    const selectedType = typeFilter.value;

    filteredData = allData.filter(row => {
        const rowDate = row.parsedDate;
        const companyMatch = selectedCompany === '' || row.Company_Worked_For === selectedCompany;
        const natureMatch = selectedNature === '' || row.Nature_of_Work === selectedNature;
        const typeMatch = selectedType === '' || row.Type_of_Work === selectedType;

        // Ensure rowDate is valid before comparison
        return rowDate && rowDate >= start && rowDate <= end && companyMatch && natureMatch && typeMatch;
    });

    updateDashboard();
}

function resetFilters() {
    // Reset date range (e.g., last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];

    // Reset select filters
    companyFilter.value = '';
    natureFilter.value = '';
    typeFilter.value = '';

    applyFilters(); // Re-apply filters with reset values
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

    // Only render if filteredData is not empty
    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align: center;">No data available for the selected filters.</td>`;
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
// Helper to destroy existing chart instances before re-rendering
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

    // Group hours by date
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
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'PPP' // e.g., 'Jan 1, 2024'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
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
                    'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                    'rgba(200, 100, 200, 0.7)', 'rgba(100, 200, 100, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
                    'rgba(200, 100, 200, 1)', 'rgba(100, 200, 100, 1)'
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
                        text: 'Hours'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // No need for legend in single dataset bar chart
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
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                    '#FF5733', '#C70039', '#900C3F', '#581845', '#1E88E5', '#D81B60'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
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
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Type of Work'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}
