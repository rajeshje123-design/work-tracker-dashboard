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
