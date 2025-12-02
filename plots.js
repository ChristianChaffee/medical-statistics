const { ipcRenderer } = require('electron');

let dataName, dataCountry;

let dataSet = [

];

ipcRenderer.on('parse-data', (event, data) => {
    dataSet = [];
    data.parsedData.forEach(item => {
        dataSet.push(item);
    });
    
    console.log(dataSet);

    updateChart();
});

ipcRenderer.on('main-data-update', (event, data) => {
    dataName = data.dataName;
    dataCountry = data.countryName;
    dataSet.label = dataName;
    updateChart();
});

let chart = null;

function updateChart() {

    document.getElementById('status').innerHTML = 
        `Государство: <strong>${dataCountry}</strong><br>
        Тип данных: <strong>${dataName}</strong><br><br>`;

    if (chart) {
        let years = [];
        // Обновляем существующий график
        dataSet.forEach((item, index) => {
            if(chart.data.datasets[index]){
                chart.data.datasets[index].label = `Index: ${index}`;
                chart.data.datasets[index].data = item.values;
                chart.data.datasets[index].borderColor = getRandomHexColor();
                chart.data.datasets[index].backgroundColor = getRandomHexColor();
            }
            else{
                let tempDataSet = {
                    label: `Index: ${index}`,
                    data: item.values,
                    borderColor: getRandomHexColor(),
                    backgroundColor: getRandomHexColor(),
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                };

                chart.data.datasets.push(tempDataSet);
            }

            console.log(item);

            item.years.forEach(element => {
                years.push(element); 
            });
        });

        years = [...new Set(years)];
        years.sort((a, b) => a - b);

        chart.data.labels = years;
        chart.update();
    } else {
        // Создаем новый график
        createChart();
    }
}

function createChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Регистрируем шрифт перед созданием графика
    Chart.defaults.font.family = 'Arial, Helvetica, sans-serif';
    Chart.defaults.font.size = 12;

    let dataYears = [];
    let dataSetsArray = [];
    
    dataSet.forEach(item => {
        let tempDataSet = {
            label: `None`,
            data: item.values,
            borderColor: getRandomHexColor(),
            backgroundColor: getRandomHexColor(),
            borderWidth: 2,
            tension: 0.1,
            fill: true
        };

        dataSetsArray.push(tempDataSet);

        item.years.forEach(element => {
            dataYears.push(element);
        });
    });

    dataYears = [...new Set(dataYears)];
    dataYears.sort((a, b) => a - b);
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataYears,
            datasets: dataSetsArray
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Данные Всемирной организации здравоохранения',
                    font: {
                        family: 'Arial, Helvetica, sans-serif',
                        size: 16
                    }
                },
                legend: {
                    labels: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        }
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

const plotColor = document.getElementById('plotColor');
const plotColorPreview = document.getElementById('plotColorPreview');

const plotBackgroundColor = document.getElementById('plotBackgroundColor');
const plotBackgroundColorPreview = document.getElementById('plotBackgroundColorPreview');

plotColorPreview.style.backgroundColor = plotColor.value;
plotBackgroundColorPreview.style.backgroundColor = plotBackgroundColor.value;

// Обработчик изменения цвета
plotColor.addEventListener('input', (event) => {
    const selectedColor = event.target.value;
    plotColorPreview.style.backgroundColor = selectedColor;
    dataSet.color = selectedColor;
    if(chart){
        updateChart();
    }
});

plotBackgroundColor.addEventListener('input', (event) => {
    const selectedColor = event.target.value;
    plotBackgroundColorPreview.style.backgroundColor = selectedColor;
    dataSet.backgroundColor = selectedColor;
    if(chart){
        updateChart();
    }
});

function getRandomHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}