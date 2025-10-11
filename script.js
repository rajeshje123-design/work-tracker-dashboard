// ... (previous code) ...

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

// ... (rest of your code) ...
