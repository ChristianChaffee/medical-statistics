const { ipcRenderer } = require('electron');

let dataName, dataCountry;
let countriesList = []; // Список стран для получения названий
let dataSetsList = []; // Список наборов данных
let selectedCountriesCodes = []; // Выбранные коды стран
let selectedDataSetCode = null; // Выбранный набор данных

// ==================== ТЕМНАЯ ТЕМА ====================

// Инициализация темы
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Устанавливаем тему: сохраненная > системная > светлая
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (isDark) {
        body.classList.add('dark-theme');
        if (themeToggle) {
            themeToggle.querySelector('.theme-icon').textContent = '☀️';
        }
    } else {
        body.classList.remove('dark-theme');
        if (themeToggle) {
            themeToggle.querySelector('.theme-icon').textContent = '🌙';
        }
    }
    
    // Обработчик переключения темы
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle?.querySelector('.theme-icon');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        if (icon) icon.textContent = '🌙';
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        if (icon) icon.textContent = '☀️';
    }
    
    // Обновляем графики Chart.js для темной темы
    updateChartsTheme();
    
    // Обновляем модальные окна, если они открыты
    // Пересоздаем содержимое модальных окон с правильными цветами
    const statisticsModal = document.getElementById('statisticsModal');
    if (statisticsModal && statisticsModal.classList.contains('show')) {
        // Если модальное окно статистики открыто, пересоздаем его содержимое
        if (typeof window.openStatisticsModal === 'function') {
            window.openStatisticsModal();
        }
    }
    
    const correlationModal = document.getElementById('correlationModal');
    if (correlationModal && correlationModal.classList.contains('show') && correlationData) {
        // Если модальное окно корреляции открыто, пересоздаем его содержимое
        calculateAndDisplayCorrelation(correlationData);
    }
}

// Обновление темы графиков Chart.js
function updateChartsTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#e0e0e0' : '#212529';
    const gridColor = isDark ? '#404040' : '#e0e0e0';
    
    // Обновляем основной график
    if (chart) {
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.options.plugins.title.color = textColor;
        chart.options.plugins.legend.labels.color = textColor;
        chart.update('none');
    }
    
    // Обновляем график корреляции
    if (correlationChart) {
        correlationChart.options.scales.x.ticks.color = textColor;
        correlationChart.options.scales.y.ticks.color = textColor;
        correlationChart.options.scales.x.grid.color = gridColor;
        correlationChart.options.scales.y.grid.color = gridColor;
        correlationChart.options.plugins.title.color = textColor;
        correlationChart.update('none');
    }
}

// Инициализация темы при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initWindowControls();
        // Обновляем графики после небольшой задержки, чтобы они успели создаться
        setTimeout(updateChartsTheme, 500);
    });
} else {
    initTheme();
    initWindowControls();
    // Обновляем графики после небольшой задержки, чтобы они успели создаться
    setTimeout(updateChartsTheme, 500);
}

// Инициализация кнопок управления окном
function initWindowControls() {
    if (!window.require) return;
    
    const { ipcRenderer } = window.require('electron');
    
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-minimize');
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-maximize');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-close');
        });
    }
}

// ==================== СИСТЕМА ВКЛАДОК ====================

// Инициализация системы вкладок
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Убираем активный класс со всех кнопок и контента
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Добавляем активный класс к выбранной кнопке и соответствующему контенту
            button.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Если переключились на вкладку корреляции, убеждаемся что список стран загружен
            if (targetTab === 'correlation') {
                // Проверяем, есть ли уже список стран
                const countrySelect = document.getElementById('correlationCountry');
                if (countrySelect) {
                    // Если список стран уже загружен, но селектор пуст, обновляем его
                    if (countriesList && countriesList.length > 0 && countrySelect.options.length <= 1) {
                        updateCorrelationCountrySelector();
                    }
                    // Если списка стран нет, запрашиваем его
                    else if (!countriesList || countriesList.length === 0) {
                        ipcRenderer.send('get-countries');
                    }
                }
                // Инициализируем элементы корреляции, если еще не инициализированы
                setTimeout(() => {
                    initCorrelationElements();
                }, 100);
            }
        });
    });
}

// Инициализация вкладок при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        // Запрашиваем список стран при загрузке страницы
        ipcRenderer.send('get-countries');
    });
} else {
    initTabs();
    // Запрашиваем список стран при загрузке страницы
    ipcRenderer.send('get-countries');
}

let dataSet = [

];

ipcRenderer.on('parse-data', (event, data) => {
    dataSet = [];
    
    // Если передан пустой массив, очищаем все графики
    if (data.parsedData && data.parsedData.length > 0) {
        data.parsedData.forEach(item => {
            dataSet.push(item);
        });
    }
    
    // Сохраняем список стран, если он передан
    // Важно: не перезаписываем список, если новый список пустой, а текущий уже загружен
    if (data.countriesList) {
        // Обновляем список стран только если:
        // 1. Новый список не пустой, ИЛИ
        // 2. Текущий список пустой (еще не загружен)
        if (data.countriesList.length > 0 || countriesList.length === 0) {
            countriesList = data.countriesList;
        }
        // Всегда обновляем UI, даже если список не изменился
        updateCorrelationCountrySelector();
        updateComparisonCountriesList();
    }
    
    // Показываем уведомление о странах без данных
    if (data.countriesWithoutData && data.countriesWithoutData.length > 0) {
        showNotification(data.countriesWithoutData);
    } else {
        window.hideNotification();
    }
    
    console.log(dataSet);

    updateChart();
});

ipcRenderer.on('main-data-update', (event, data) => {
    dataName = data.dataName;
    dataCountry = data.countryName;
    dataSet.label = dataName;
    updateChart();
    
    // Обновляем выбор набора данных в UI, если он изменился
    if (dataSetsList && dataSetsList.length > 0) {
        const matchingDataSet = dataSetsList.find(ds => ds[1] === dataName);
        if (matchingDataSet) {
            selectedDataSetCode = matchingDataSet[0];
            updateComparisonDataSetsList(dataSetsList);
        }
    }
});

// Получаем список стран при загрузке
ipcRenderer.on('countries-list', (event, countries) => {
    countriesList = countries;
    // Обновляем список стран в селекторе корреляции
    updateCorrelationCountrySelector();
    // Обновляем список стран в панели сравнения
    updateComparisonCountriesList();
});

// Получаем список наборов данных
ipcRenderer.on('data-sets-list', (event, dataSets) => {
    dataSetsList = dataSets;
    // Если еще не выбран набор данных, выбираем первый
    if (!selectedDataSetCode && dataSets.length > 0) {
        selectedDataSetCode = dataSets[0][0];
    }
    updateComparisonDataSetsList(dataSets);
});


// Функция обновления списка стран в панели сравнения
function updateComparisonCountriesList() {
    const container = document.getElementById('countriesListContainer');
    if (!container) {
        return;
    }
    
    // Проверяем, загружен ли список стран
    if (!countriesList || countriesList.length === 0) {
        container.innerHTML = '<p>Список стран не загружен</p>';
        return;
    }

    // Отображаем список стран независимо от того, выбраны ли они
    let html = '';
    countriesList.forEach(country => {
        const isChecked = selectedCountriesCodes.includes(country.code);
        html += `<div class="country-checkbox-item">`;
        html += `<label>`;
        html += `<input type="checkbox" value="${country.code}" ${isChecked ? 'checked' : ''} onchange="handleCountrySelectionChange(this)">`;
        html += `<span>${country.name}</span>`;
        html += `</label>`;
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Функция обновления списка наборов данных в панели сравнения
function updateComparisonDataSetsList(dataSets) {
    const container = document.getElementById('dataSetsListContainer');
    if (!container || !dataSets || dataSets.length === 0) {
        if (container) {
            container.innerHTML = '<p>Список данных не загружен</p>';
        }
        return;
    }

    let html = '';
    dataSets.forEach(dataSet => {
        const isChecked = selectedDataSetCode === dataSet[0];
        html += `<div class="data-radio-item">`;
        html += `<label>`;
        html += `<input type="radio" name="dataSet" value="${dataSet[0]}" ${isChecked ? 'checked' : ''} onchange="handleDataSetSelectionChange(this)">`;
        html += `<span>${dataSet[1]}</span>`;
        html += `</label>`;
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Обработчик изменения выбора страны
window.handleCountrySelectionChange = function(checkbox) {
    const countryCode = checkbox.value;
    
    if (checkbox.checked) {
        if (!selectedCountriesCodes.includes(countryCode)) {
            selectedCountriesCodes.push(countryCode);
        }
    } else {
        const index = selectedCountriesCodes.indexOf(countryCode);
        if (index > -1) {
            selectedCountriesCodes.splice(index, 1);
        }
    }

    // Отправляем выбранные страны в main процесс
    ipcRenderer.send('select-countries', selectedCountriesCodes);
};

// Обработчик изменения выбора набора данных
window.handleDataSetSelectionChange = function(radio) {
    selectedDataSetCode = radio.value;
    
    // Отправляем выбранный набор данных в main процесс
    ipcRenderer.send('select-data-set', selectedDataSetCode);
};

// Запрашиваем список наборов данных при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ipcRenderer.send('get-data-sets');
    });
} else {
    ipcRenderer.send('get-data-sets');
}

// Функция для обновления только селектора стран в корреляции
function updateCorrelationCountrySelector() {
    const countrySelect = document.getElementById('correlationCountry');
    if (countrySelect && countriesList && countriesList.length > 0) {
        const currentValue = countrySelect.value; // Сохраняем текущее значение
        countrySelect.innerHTML = '<option value="">Выберите страну</option>';
        countriesList.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            countrySelect.appendChild(option);
        });
        // Восстанавливаем выбранное значение, если оно было
        if (currentValue) {
            countrySelect.value = currentValue;
        }
    }
}

let chart = null;

function updateChart() {

    if (chart) {
        let years = [];
        
        // Сохраняем цвета существующих графиков перед обновлением (если они были изменены пользователем)
        const existingColors = {};
        chart.data.datasets.forEach((dataset, index) => {
            if (dataSet[index]) {
                const countryCode = dataSet[index].countryCode;
                const defaultColors = getCountryColors(countryCode);
                // Нормализуем цвета для сравнения (конвертируем rgba в hex если нужно)
                const currentBorder = rgbaToHex(dataset.borderColor);
                const currentBackground = rgbaToHex(dataset.backgroundColor);
                const defaultBorder = rgbaToHex(defaultColors.border);
                const defaultBackground = rgbaToHex(defaultColors.background);
                
                // Сохраняем только если цвет был изменен пользователем (отличается от национального)
                if (currentBorder !== defaultBorder || currentBackground !== defaultBackground) {
                    existingColors[countryCode] = {
                        borderColor: dataset.borderColor,
                        backgroundColor: dataset.backgroundColor
                    };
                }
            }
        });
        
        // Удаляем все существующие графики
        chart.data.datasets = [];
        
        // Создаем новые графики только для стран, которые есть в dataSet
        dataSet.forEach((item, index) => {
            const countryName = getCountryNameByCode(item.countryCode);
            const countryColors = getCountryColors(item.countryCode);
            let tempDataSet = {
                label: countryName,
                data: item.values,
                borderColor: existingColors[item.countryCode]?.borderColor || countryColors.border,
                backgroundColor: existingColors[item.countryCode]?.backgroundColor || countryColors.background,
                borderWidth: 2,
                tension: 0.1,
                fill: true
            };

            chart.data.datasets.push(tempDataSet);

            console.log(item);

            item.years.forEach(element => {
                years.push(element); 
            });
        });

        years = [...new Set(years)];
        years.sort((a, b) => a - b);

        chart.data.labels = years;
        
        // Обновляем заголовок графика
        if (chart.options.plugins.title) {
            chart.options.plugins.title.text = dataName || 'Данные Всемирной организации здравоохранения';
        }
        
        // Обновляем цвета для текущей темы
        updateChartsTheme();
        
        chart.update();
        updateGraphSelector();
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
    
    // Получаем цвета для текущей темы
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#e0e0e0' : '#212529';
    const gridColor = isDark ? '#404040' : '#e0e0e0';

    let dataYears = [];
    let dataSetsArray = [];
    
    dataSet.forEach(item => {
        const countryName = getCountryNameByCode(item.countryCode);
        const countryColors = getCountryColors(item.countryCode);
        let tempDataSet = {
            label: countryName,
            data: item.values,
            borderColor: countryColors.border,
            backgroundColor: countryColors.background,
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
                    text: dataName || 'Данные Всемирной организации здравоохранения',
                    font: {
                        family: 'Arial, Helvetica, sans-serif',
                        size: 16
                    },
                    color: textColor
                },
                legend: {
                    labels: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        },
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        },
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    ticks: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        },
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    },
                    beginAtZero: false
                }
            }
        }
    });
    
    updateGraphSelector();
}

// Инициализация элементов после загрузки DOM
let plotColor, plotColorPreview, plotBackgroundColor, plotBackgroundColorPreview, graphSelector;

// Функция для обработки выбора графика
function handleGraphSelectorChange(event) {
    const selectedIndex = parseInt(event.target.value);
    const plotColorContainer = document.getElementById('plotColorContainer');
    const plotBackgroundColorContainer = document.getElementById('plotBackgroundColorContainer');
    
    if (selectedIndex >= 0 && chart && selectedIndex < chart.data.datasets.length) {
        // Показываем кнопки цвета
        if (plotColorContainer) plotColorContainer.style.display = 'inline-block';
        if (plotBackgroundColorContainer) plotBackgroundColorContainer.style.display = 'inline-block';
        updateColorInputs(selectedIndex);
    } else {
        // Скрываем кнопки цвета, если график не выбран
        if (plotColorContainer) plotColorContainer.style.display = 'none';
        if (plotBackgroundColorContainer) plotBackgroundColorContainer.style.display = 'none';
    }
}

// Функция для инициализации элементов
function initElements() {
    plotColor = document.getElementById('plotColor');
    plotColorPreview = document.getElementById('plotColorPreview');
    plotBackgroundColor = document.getElementById('plotBackgroundColor');
    plotBackgroundColorPreview = document.getElementById('plotBackgroundColorPreview');
    graphSelector = document.getElementById('graphSelector');
    
    if (plotColor && plotColorPreview) {
        plotColorPreview.style.backgroundColor = plotColor.value;
    }
    if (plotBackgroundColor && plotBackgroundColorPreview) {
        plotBackgroundColorPreview.style.backgroundColor = plotBackgroundColor.value;
    }
    
    // Добавляем обработчик события для выбора графика (используем делегирование)
    const panelContainer = document.querySelector('.panel-container');
    if (panelContainer) {
        panelContainer.addEventListener('change', (event) => {
            if (event.target && event.target.id === 'graphSelector') {
                handleGraphSelectorChange(event);
            }
        });
    }
    
    // Также добавляем напрямую, если элемент существует
    if (graphSelector) {
        graphSelector.addEventListener('change', handleGraphSelectorChange);
    }
    
    // Добавляем обработчик для кнопки статистики через делегирование
    // (обработчик будет добавлен после определения функции openStatisticsModal)
    
    // Добавляем обработчики для изменения цвета
    if (plotColor) {
        plotColor.addEventListener('input', (event) => {
            const selectedColor = event.target.value;
            if (plotColorPreview) {
                plotColorPreview.style.backgroundColor = selectedColor;
            }
            
            const selector = document.getElementById('graphSelector');
            if (selector) {
                const selectedIndex = parseInt(selector.value);
                if (selectedIndex >= 0 && chart && selectedIndex < chart.data.datasets.length) {
                    chart.data.datasets[selectedIndex].borderColor = selectedColor;
                    chart.update();
                }
            }
        });
    }
    
    if (plotBackgroundColor) {
        plotBackgroundColor.addEventListener('input', (event) => {
            const selectedColor = event.target.value;
            if (plotBackgroundColorPreview) {
                plotBackgroundColorPreview.style.backgroundColor = selectedColor;
            }
            
            const selector = document.getElementById('graphSelector');
            if (selector) {
                const selectedIndex = parseInt(selector.value);
                if (selectedIndex >= 0 && chart && selectedIndex < chart.data.datasets.length) {
                    chart.data.datasets[selectedIndex].backgroundColor = selectedColor;
                    chart.update();
                }
            }
        });
    }
}

// Инициализируем при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initElements);
} else {
    initElements();
}

// Функция для получения названия страны по коду
function getCountryNameByCode(countryCode) {
    if (!countryCode || !countriesList || countriesList.length === 0) {
        return countryCode || 'Неизвестная страна';
    }
    
    const country = countriesList.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
}

// Функция для обновления списка графиков
function updateGraphSelector() {
    if (!chart) return;
    
    const selector = document.getElementById('graphSelector');
    if (!selector) return;
    
    const currentValue = selector.value;
    
    // Очищаем список, оставляя первую опцию
    selector.innerHTML = '<option value="-1">Выберите график</option>';
    
    // Если нет графиков, сбрасываем значения цветов и скрываем кнопки
    if (chart.data.datasets.length === 0) {
        if (plotColor) plotColor.value = '#ff0000';
        if (plotBackgroundColor) plotBackgroundColor.value = '#ffffff';
        if (plotColorPreview && plotColor) plotColorPreview.style.backgroundColor = plotColor.value;
        if (plotBackgroundColorPreview && plotBackgroundColor) plotBackgroundColorPreview.style.backgroundColor = plotBackgroundColor.value;
        const plotColorContainer = document.getElementById('plotColorContainer');
        const plotBackgroundColorContainer = document.getElementById('plotBackgroundColorContainer');
        if (plotColorContainer) plotColorContainer.style.display = 'none';
        if (plotBackgroundColorContainer) plotBackgroundColorContainer.style.display = 'none';
        return;
    }
    
    // Добавляем опции для каждого графика
    chart.data.datasets.forEach((dataset, index) => {
        const option = document.createElement('option');
        option.value = index;
        
        // Получаем название страны из dataSet
        const countryCode = dataSet[index]?.countryCode;
        const countryName = getCountryNameByCode(countryCode);
        
        option.textContent = countryName;
        selector.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение, если оно было
    const plotColorContainer = document.getElementById('plotColorContainer');
    const plotBackgroundColorContainer = document.getElementById('plotBackgroundColorContainer');
    
    if (currentValue !== '-1' && parseInt(currentValue) < chart.data.datasets.length) {
        selector.value = currentValue;
        // Показываем кнопки цвета
        if (plotColorContainer) plotColorContainer.style.display = 'inline-block';
        if (plotBackgroundColorContainer) plotBackgroundColorContainer.style.display = 'inline-block';
        updateColorInputs(parseInt(currentValue));
    } else {
        // Если выбранный график был удален, сбрасываем выбор и скрываем кнопки
        selector.value = '-1';
        if (plotColorContainer) plotColorContainer.style.display = 'none';
        if (plotBackgroundColorContainer) plotBackgroundColorContainer.style.display = 'none';
    }
    
    // Переподключаем обработчик после обновления innerHTML (так как он теряется)
    if (graphSelector) {
        graphSelector.removeEventListener('change', handleGraphSelectorChange);
        graphSelector.addEventListener('change', handleGraphSelectorChange);
    }
}

// Функция для конвертации rgba в hex
function rgbaToHex(rgba) {
    if (!rgba || rgba.startsWith('#')) {
        return rgba || '#ff0000';
    }
    
    // Пытаемся извлечь RGB из rgba
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    
    return rgba;
}

// Функция для обновления значений в кнопках цвета при выборе графика
function updateColorInputs(graphIndex) {
    if (!chart || !plotColor || !plotBackgroundColor || graphIndex < 0 || graphIndex >= chart.data.datasets.length) {
        return;
    }
    
    const dataset = chart.data.datasets[graphIndex];
    plotColor.value = rgbaToHex(dataset.borderColor) || '#ff0000';
    plotBackgroundColor.value = rgbaToHex(dataset.backgroundColor) || '#ffffff';
    if (plotColorPreview) {
        plotColorPreview.style.backgroundColor = plotColor.value;
    }
    if (plotBackgroundColorPreview) {
        plotBackgroundColorPreview.style.backgroundColor = plotBackgroundColor.value;
    }
}

// Обработчики событий теперь добавляются в функции initElements()

// Функция для получения национальных цветов страны
function getCountryColors(countryCode) {
    // Национальные цвета стран (основной цвет флага и светлый оттенок)
    const countryColors = {
        'AUT': { border: '#ED2939', background: 'rgba(237, 41, 57, 0.2)' }, // Австрия - красный
        'DEU': { border: '#000000', background: 'rgba(0, 0, 0, 0.2)' }, // Германия - черный
        'FRA': { border: '#002654', background: 'rgba(0, 38, 84, 0.2)' }, // Франция - синий
        'GBR': { border: '#012169', background: 'rgba(1, 33, 105, 0.2)' }, // Великобритания - синий
        'ITA': { border: '#009246', background: 'rgba(0, 146, 70, 0.2)' }, // Италия - зеленый
        'ESP': { border: '#AA151B', background: 'rgba(170, 21, 27, 0.2)' }, // Испания - красный
        'RUS': { border: '#0039A6', background: 'rgba(0, 57, 166, 0.2)' }, // Россия - синий
        'POL': { border: '#DC143C', background: 'rgba(220, 20, 60, 0.2)' }, // Польша - красный
        'NLD': { border: '#AE1C28', background: 'rgba(174, 28, 40, 0.2)' }, // Нидерланды - красный
        'BEL': { border: '#000000', background: 'rgba(0, 0, 0, 0.2)' }, // Бельгия - черный
        'CHE': { border: '#FF0000', background: 'rgba(255, 0, 0, 0.2)' }, // Швейцария - красный
        'SWE': { border: '#006AA7', background: 'rgba(0, 106, 167, 0.2)' }, // Швеция - синий
        'NOR': { border: '#BA0C2F', background: 'rgba(186, 12, 47, 0.2)' }, // Норвегия - красный
        'DNK': { border: '#C8102E', background: 'rgba(200, 16, 46, 0.2)' }, // Дания - красный
        'FIN': { border: '#003580', background: 'rgba(0, 53, 128, 0.2)' }, // Финляндия - синий
        'GRC': { border: '#0D5EAF', background: 'rgba(13, 94, 175, 0.2)' }, // Греция - синий
        'PRT': { border: '#006600', background: 'rgba(0, 102, 0, 0.2)' }, // Португалия - зеленый
        'IRL': { border: '#169B62', background: 'rgba(22, 155, 98, 0.2)' }, // Ирландия - зеленый
        'CZE': { border: '#11457E', background: 'rgba(17, 69, 126, 0.2)' }, // Чехия - синий
        'HUN': { border: '#436F4D', background: 'rgba(67, 111, 77, 0.2)' }, // Венгрия - зеленый
        'ROU': { border: '#002B7F', background: 'rgba(0, 43, 127, 0.2)' }, // Румыния - синий
        'BGR': { border: '#00966E', background: 'rgba(0, 150, 110, 0.2)' }, // Болгария - зеленый
        'HRV': { border: '#171796', background: 'rgba(23, 23, 150, 0.2)' }, // Хорватия - синий
        'SRB': { border: '#C6363C', background: 'rgba(198, 54, 60, 0.2)' }, // Сербия - красный
        'SVK': { border: '#0B4EA2', background: 'rgba(11, 78, 162, 0.2)' }, // Словакия - синий
        'SVN': { border: '#0053A5', background: 'rgba(0, 83, 165, 0.2)' }, // Словения - синий
        'EST': { border: '#0072CE', background: 'rgba(0, 114, 206, 0.2)' }, // Эстония - синий
        'LVA': { border: '#9E3039', background: 'rgba(158, 48, 57, 0.2)' }, // Латвия - красный
        'LTU': { border: '#006A44', background: 'rgba(0, 106, 68, 0.2)' }, // Литва - зеленый
        'UKR': { border: '#0057B7', background: 'rgba(0, 87, 183, 0.2)' }, // Украина - синий
        'BLR': { border: '#006B3C', background: 'rgba(0, 107, 60, 0.2)' }, // Беларусь - зеленый
        'MDA': { border: '#0033A0', background: 'rgba(0, 51, 160, 0.2)' }, // Молдова - синий
        'ALB': { border: '#E41E2A', background: 'rgba(228, 30, 42, 0.2)' }, // Албания - красный
        'MKD': { border: '#D20000', background: 'rgba(210, 0, 0, 0.2)' }, // Македония - красный
        'BIH': { border: '#002395', background: 'rgba(0, 35, 149, 0.2)' }, // Босния - синий
        'MNE': { border: '#C8102E', background: 'rgba(200, 16, 46, 0.2)' }, // Черногория - красный
        'ISL': { border: '#02529C', background: 'rgba(2, 82, 156, 0.2)' }, // Исландия - синий
        'LUX': { border: '#00A1DE', background: 'rgba(0, 161, 222, 0.2)' }, // Люксембург - синий
        'MLT': { border: '#CE1126', background: 'rgba(206, 17, 38, 0.2)' }, // Мальта - красный
        'CYP': { border: '#003478', background: 'rgba(0, 52, 120, 0.2)' }, // Кипр - синий
        'TUR': { border: '#E30A17', background: 'rgba(227, 10, 23, 0.2)' }, // Турция - красный
        'ARM': { border: '#0033A0', background: 'rgba(0, 51, 160, 0.2)' }, // Армения - синий
        'AZE': { border: '#00AFCA', background: 'rgba(0, 175, 202, 0.2)' }, // Азербайджан - голубой
        'GEO': { border: '#FF0000', background: 'rgba(255, 0, 0, 0.2)' }, // Грузия - красный
        'AND': { border: '#0018A8', background: 'rgba(0, 24, 168, 0.2)' }, // Андорра - синий
        'LIE': { border: '#002B7F', background: 'rgba(0, 43, 127, 0.2)' }, // Лихтенштейн - синий
        'MCO': { border: '#CE1126', background: 'rgba(206, 17, 38, 0.2)' }, // Монако - красный
        'SMR': { border: '#4FB3D9', background: 'rgba(79, 179, 217, 0.2)' }, // Сан-Марино - голубой
        'VAT': { border: '#FFE000', background: 'rgba(255, 224, 0, 0.2)' }, // Ватикан - желтый
    };
    
    if (countryColors[countryCode]) {
        return countryColors[countryCode];
    }
    
    // Если страна не найдена, используем случайный цвет
    return {
        border: getRandomHexColor(),
        background: getRandomHexColor()
    };
}

function getRandomHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

// Переменная для хранения таймера уведомления
let notificationTimer = null;

// Функция для показа уведомления о странах без данных
function showNotification(countriesWithoutData) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    if (!notification || !notificationText) return;
    
    // Очищаем предыдущий таймер, если он существует
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }
    
    let message = '';
    if (countriesWithoutData.length === 1) {
        message = `Данные для "${countriesWithoutData[0]}" отсутствуют`;
    } else {
        message = `Данные отсутствуют для: ${countriesWithoutData.join(', ')}`;
    }
    
    // Добавляем иконку предупреждения в начало сообщения
    notificationText.innerHTML = '<span style="font-weight: bold; margin-right: 5px;">!</span>' + message;
    
    // Убираем класс hidden и показываем уведомление
    notification.style.display = 'flex';
    // Небольшая задержка для запуска анимации появления
    setTimeout(() => {
        notification.classList.remove('hidden');
    }, 10);
    
    // Автоматически скрываем через 5 секунд
    notificationTimer = setTimeout(() => {
        window.hideNotification();
        notificationTimer = null;
    }, 5000);
}

// Функция для скрытия уведомления (доступна глобально для onclick)
window.hideNotification = function() {
    const notification = document.getElementById('notification');
    if (notification) {
        // Очищаем таймер, если он существует
        if (notificationTimer) {
            clearTimeout(notificationTimer);
            notificationTimer = null;
        }
        
        notification.classList.add('hidden');
        // Полностью скрываем после завершения анимации
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }
}

// ==================== ФУНКЦИИ ДЛЯ СТАТИСТИКИ ====================

// Функция для вычисления среднего значения
function calculateMean(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
}

// Функция для вычисления медианы
function calculateMedian(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

// Функция для вычисления стандартного отклонения
function calculateStandardDeviation(values) {
    if (!values || values.length === 0) return 0;
    const mean = calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
}

// Функция для вычисления дисперсии
function calculateVariance(values) {
    if (!values || values.length === 0) return 0;
    const mean = calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return calculateMean(squaredDiffs);
}

// Функция для вычисления коэффициента вариации
function calculateCoefficientOfVariation(values) {
    if (!values || values.length === 0) return 0;
    const mean = calculateMean(values);
    if (mean === 0) return 0;
    const stdDev = calculateStandardDeviation(values);
    return (stdDev / mean) * 100;
}

// Функция для вычисления тренда (линейная регрессия)
function calculateTrend(years, values) {
    if (!years || !values || years.length !== values.length || years.length < 2) {
        return { slope: 0, direction: 'недостаточно данных' };
    }
    
    const n = years.length;
    const sumX = years.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = years.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = years.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const direction = slope > 0 ? 'растущий' : slope < 0 ? 'падающий' : 'стабильный';
    
    return { slope, direction };
}

// Функция для вычисления статистики по одному графику
function calculateGraphStatistics(dataItem, index) {
    if (!dataItem || !dataItem.values || dataItem.values.length === 0) {
        return null;
    }
    
    const values = dataItem.values;
    const years = dataItem.years;
    const countryName = getCountryNameByCode(dataItem.countryCode);
    
    const mean = calculateMean(values);
    const median = calculateMedian(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const stdDev = calculateStandardDeviation(values);
    const variance = calculateVariance(values);
    const cv = calculateCoefficientOfVariation(values);
    const trend = calculateTrend(years, values);
    
    const minIndex = values.indexOf(min);
    const maxIndex = values.indexOf(max);
    const minYear = minIndex >= 0 && minIndex < years.length ? years[minIndex] : null;
    const maxYear = maxIndex >= 0 && maxIndex < years.length ? years[maxIndex] : null;
    
    // Используем dataPoints для получения первого и последнего значения
    // dataPoints уже отсортирован по годам
    const dataPoints = dataItem.dataPoints || [];
    let firstYear = null;
    let lastYear = null;
    let firstValue = null;
    let lastValue = null;
    
    if (dataPoints.length > 0) {
        // Первый элемент - самый ранний год
        const firstPoint = dataPoints[0];
        firstYear = firstPoint.year;
        firstValue = firstPoint.value;
        
        // Последний элемент - самый поздний год
        const lastPoint = dataPoints[dataPoints.length - 1];
        lastYear = lastPoint.year;
        lastValue = lastPoint.value;
    } else if (years.length > 0 && values.length > 0) {
        // Fallback: если dataPoints нет, используем массивы years и values
        firstYear = Math.min(...years);
        lastYear = Math.max(...years);
        
        // Находим значения для первого и последнего года
        const firstYearIndex = years.indexOf(firstYear);
        const lastYearIndex = years.indexOf(lastYear);
        
        if (firstYearIndex >= 0 && firstYearIndex < values.length) {
            firstValue = values[firstYearIndex];
        }
        if (lastYearIndex >= 0 && lastYearIndex < values.length) {
            lastValue = values[lastYearIndex];
        }
    }
    
    const period = (firstYear !== null && lastYear !== null) ? lastYear - firstYear : 0;
    
    const totalChange = (firstValue !== null && lastValue !== null) ? lastValue - firstValue : 0;
    const percentChange = (firstValue !== null && firstValue !== 0) ? ((totalChange / firstValue) * 100) : 0;
    
    // Вспомогательная функция для безопасного toFixed
    const safeToFixed = (value, decimals = 2) => {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }
        return Number(value).toFixed(decimals);
    };
    
    return {
        countryName,
        index,
        count: values.length,
        mean: safeToFixed(mean),
        median: safeToFixed(median),
        min: safeToFixed(min),
        max: safeToFixed(max),
        stdDev: safeToFixed(stdDev),
        variance: safeToFixed(variance),
        cv: safeToFixed(cv),
        trend: trend ? trend.direction : 'недостаточно данных',
        trendSlope: trend ? safeToFixed(trend.slope, 4) : 'N/A',
        firstYear: firstYear !== null ? firstYear : 'N/A',
        lastYear: lastYear !== null ? lastYear : 'N/A',
        period: period || 0,
        firstValue: safeToFixed(firstValue),
        lastValue: safeToFixed(lastValue),
        totalChange: safeToFixed(totalChange),
        percentChange: safeToFixed(percentChange),
        minYear: minYear !== null ? minYear : 'N/A',
        maxYear: maxYear !== null ? maxYear : 'N/A'
    };
}

// Флаг для предотвращения множественных вызовов
let statisticsModalOpening = false;

// Функция для открытия модального окна статистики (доступна глобально)
window.openStatisticsModal = function() {
    // Предотвращаем множественные вызовы
    if (statisticsModalOpening) {
        return;
    }
    
    console.log('openStatisticsModal called');
    
    if (!chart || !dataSet || dataSet.length === 0) {
        // Используем уведомление вместо alert для предотвращения спама
        const countriesWithoutData = ['Нет данных для отображения статистики'];
        showNotification(countriesWithoutData);
        return;
    }
    
    statisticsModalOpening = true;
    
    const modal = document.getElementById('statisticsModal');
    const content = document.getElementById('statisticsContent');
    
    if (!modal || !content) return;
    
    // Вычисляем статистику для всех графиков
    const statistics = [];
    dataSet.forEach((item, index) => {
        const stats = calculateGraphStatistics(item, index);
        if (stats) {
            statistics.push(stats);
        }
    });
    
    if (statistics.length === 0) {
        content.innerHTML = '<p>Нет данных для отображения статистики</p>';
        modal.classList.add('show');
        setTimeout(() => {
            statisticsModalOpening = false;
        }, 500);
        return;
    }
    
    // Формируем HTML для отображения статистики
    let html = '';
    
    // Общая статистика
    html += '<div class="statistics-section">';
    html += '<h3>Общая информация</h3>';
    html += '<div class="statistics-item">';
    html += '<span class="statistics-label">Тип данных:</span>';
    html += `<span class="statistics-value">${dataName || 'Не указано'}</span>`;
    html += '</div>';
    html += '<div class="statistics-item">';
    html += '<span class="statistics-label">Количество графиков:</span>';
    html += `<span class="statistics-value">${statistics.length}</span>`;
    html += '</div>';
    html += '</div>';
    
    // Статистика по каждому графику
    // Функция для генерации текстового вывода по стране
    function generateCountrySummary(stat) {
        const meanNum = parseFloat(stat.mean);
        const percentChangeNum = parseFloat(stat.percentChange);
        const cvNum = parseFloat(stat.cv);
        
        let summary = `<strong>${stat.countryName}</strong>: `;
        
        // Основная информация
        if (!isNaN(meanNum)) {
            summary += `Среднее значение составляет ${stat.mean}. `;
        }
        
        // Тренд
        if (stat.trend && stat.trend !== 'недостаточно данных') {
            summary += `Наблюдается ${stat.trend} тренд. `;
        }
        
        // Изменение за период
        if (!isNaN(percentChangeNum)) {
            const changeDirection = percentChangeNum > 0 ? 'увеличилось' : percentChangeNum < 0 ? 'уменьшилось' : 'осталось стабильным';
            summary += `За период с ${stat.firstYear} по ${stat.lastYear} год значение ${changeDirection} на ${Math.abs(percentChangeNum)}% `;
            if (!isNaN(meanNum) && stat.firstValue !== 'N/A' && stat.lastValue !== 'N/A') {
                summary += `(с ${stat.firstValue} до ${stat.lastValue}). `;
            } else {
                summary += `. `;
            }
        }
        
        // Вариативность
        if (!isNaN(cvNum)) {
            if (cvNum < 10) {
                summary += `Данные показывают низкую вариативность (коэффициент вариации ${stat.cv}%). `;
            } else if (cvNum < 30) {
                summary += `Данные показывают умеренную вариативность (коэффициент вариации ${stat.cv}%). `;
            } else {
                summary += `Данные показывают высокую вариативность (коэффициент вариации ${stat.cv}%). `;
            }
        }
        
        // Экстремальные значения
        if (stat.min !== 'N/A' && stat.max !== 'N/A' && stat.minYear !== 'N/A' && stat.maxYear !== 'N/A') {
            summary += `Минимальное значение ${stat.min} зафиксировано в ${stat.minYear} году, максимальное ${stat.max} - в ${stat.maxYear} году.`;
        }
        
        return summary;
    }
    
    statistics.forEach(stat => {
        html += '<div class="statistics-section">';
        html += `<h3>${stat.countryName}</h3>`;
        
        // Добавляем текстовый вывод
        html += '<div class="statistics-summary" style="background-color: var(--info-bg); padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid var(--primary-color);">';
        html += `<p style="margin: 0; line-height: 1.6; color: var(--info-text);">${generateCountrySummary(stat)}</p>`;
        html += '</div>';
        
        html += '<table class="statistics-table">';
        html += '<tr><th>Параметр</th><th>Значение</th></tr>';
        html += `<tr><td>Количество точек данных</td><td>${stat.count}</td></tr>`;
        html += `<tr><td>Период данных</td><td>${stat.firstYear} - ${stat.lastYear} (${stat.period} ${stat.period === 1 ? 'год' : 'лет'})</td></tr>`;
        html += `<tr><td>Среднее значение</td><td>${stat.mean}</td></tr>`;
        html += `<tr><td>Медиана</td><td>${stat.median}</td></tr>`;
        html += `<tr><td>Минимальное значение</td><td>${stat.min} (${stat.minYear})</td></tr>`;
        html += `<tr><td>Максимальное значение</td><td>${stat.max} (${stat.maxYear})</td></tr>`;
        html += `<tr><td>Стандартное отклонение</td><td>${stat.stdDev}</td></tr>`;
        html += `<tr><td>Дисперсия</td><td>${stat.variance}</td></tr>`;
        html += `<tr><td>Коэффициент вариации</td><td>${stat.cv}%</td></tr>`;
        html += `<tr><td>Тренд</td><td>${stat.trend} (наклон: ${stat.trendSlope})</td></tr>`;
        html += `<tr><td>Первое значение</td><td>${stat.firstValue} (${stat.firstYear})</td></tr>`;
        html += `<tr><td>Последнее значение</td><td>${stat.lastValue} (${stat.lastYear})</td></tr>`;
        const percentChangeNum = parseFloat(stat.percentChange);
        const percentSign = isNaN(percentChangeNum) ? '' : (percentChangeNum > 0 ? '+' : '');
        html += `<tr><td>Изменение за период</td><td>${stat.totalChange} (${percentSign}${stat.percentChange}%)</td></tr>`;
        html += '</table>';
        html += '</div>';
    });
    
    // Сравнительная статистика
    if (statistics.length > 1) {
        html += '<div class="statistics-section">';
        html += '<h3>Сравнительная статистика по всем графикам</h3>';
        html += '<p style="margin-bottom: 15px; color: var(--text-color); opacity: 0.7; font-size: 13px;">Сравнение статистических показателей между всеми выбранными странами. Для каждого показателя (например, "Максимальное значение") берется значение по каждому графику, затем находятся минимум, максимум и среднее среди всех графиков.</p>';
        html += '<table class="statistics-table">';
        html += '<tr><th>Параметр</th><th>Минимум<br/><span style="font-size: 11px; font-weight: normal;">(самый низкий среди всех графиков)</span></th><th>Максимум<br/><span style="font-size: 11px; font-weight: normal;">(самый высокий среди всех графиков)</span></th><th>Среднее<br/><span style="font-size: 11px; font-weight: normal;">(среднее по всем графикам)</span></th></tr>';
        
        const allMeans = statistics.map(s => parseFloat(s.mean)).filter(v => !isNaN(v));
        const allMins = statistics.map(s => parseFloat(s.min)).filter(v => !isNaN(v));
        const allMaxs = statistics.map(s => parseFloat(s.max)).filter(v => !isNaN(v));
        const allStdDevs = statistics.map(s => parseFloat(s.stdDev)).filter(v => !isNaN(v));
        
        if (allMeans.length > 0) {
            html += `<tr><td><strong>Среднее значение</strong><br/><span style="font-size: 11px; color: var(--text-color); opacity: 0.7;">(среднее по каждому графику)</span></td><td>${Math.min(...allMeans).toFixed(2)}</td><td>${Math.max(...allMeans).toFixed(2)}</td><td>${calculateMean(allMeans).toFixed(2)}</td></tr>`;
        }
        if (allMins.length > 0) {
            html += `<tr><td><strong>Минимальное значение</strong><br/><span style="font-size: 11px; color: var(--text-color); opacity: 0.7;">(минимум по каждому графику)</span></td><td>${Math.min(...allMins).toFixed(2)}</td><td>${Math.max(...allMins).toFixed(2)}</td><td>${calculateMean(allMins).toFixed(2)}</td></tr>`;
        }
        if (allMaxs.length > 0) {
            html += `<tr><td><strong>Максимальное значение</strong><br/><span style="font-size: 11px; color: var(--text-color); opacity: 0.7;">Для каждого графика найдено максимальное значение. Здесь показаны: минимальный максимум, максимальный максимум и среднее всех максимумов.</span></td><td>${Math.min(...allMaxs).toFixed(2)}</td><td>${Math.max(...allMaxs).toFixed(2)}</td><td>${calculateMean(allMaxs).toFixed(2)}</td></tr>`;
        }
        if (allStdDevs.length > 0) {
            html += `<tr><td><strong>Стандартное отклонение</strong><br/><span style="font-size: 11px; color: var(--text-color); opacity: 0.7;">(отклонение по каждому графику)</span></td><td>${Math.min(...allStdDevs).toFixed(2)}</td><td>${Math.max(...allStdDevs).toFixed(2)}</td><td>${calculateMean(allStdDevs).toFixed(2)}</td></tr>`;
        }
        
        html += '</table>';
        
        // Добавляем общий вывод
        html += '<div class="statistics-summary" style="background-color: var(--warning-bg); padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid var(--notification-border);">';
        html += '<h4 style="margin-top: 0; color: var(--warning-text);">Общий вывод</h4>';
        html += '<p style="margin: 0; line-height: 1.6; color: var(--text-color);">';
        
        // Находим страны с экстремальными значениями
        const meanValues = statistics.map(s => ({ name: s.countryName, value: parseFloat(s.mean) })).filter(v => !isNaN(v.value));
        const minValues = statistics.map(s => ({ name: s.countryName, value: parseFloat(s.min) })).filter(v => !isNaN(v.value));
        const maxValues = statistics.map(s => ({ name: s.countryName, value: parseFloat(s.max) })).filter(v => !isNaN(v.value));
        
        if (meanValues.length > 0) {
            const highestMean = meanValues.reduce((a, b) => a.value > b.value ? a : b);
            const lowestMean = meanValues.reduce((a, b) => a.value < b.value ? a : b);
            html += `Среди всех стран среднее значение составляет ${calculateMean(meanValues.map(v => v.value)).toFixed(2)}. `;
            html += `Самое высокое среднее значение у ${highestMean.name} (${highestMean.value.toFixed(2)}), самое низкое - у ${lowestMean.name} (${lowestMean.value.toFixed(2)}). `;
        }
        
        if (maxValues.length > 0) {
            const highestMax = maxValues.reduce((a, b) => a.value > b.value ? a : b);
            html += `Максимальное значение среди всех стран зафиксировано в ${highestMax.name} (${highestMax.value.toFixed(2)}). `;
        }
        
        if (minValues.length > 0) {
            const lowestMin = minValues.reduce((a, b) => a.value < b.value ? a : b);
            html += `Минимальное значение среди всех стран зафиксировано в ${lowestMin.name} (${lowestMin.value.toFixed(2)}). `;
        }
        
        // Анализ трендов
        const growingTrends = statistics.filter(s => s.trend === 'растущий').length;
        const fallingTrends = statistics.filter(s => s.trend === 'падающий').length;
        const stableTrends = statistics.filter(s => s.trend === 'стабильный').length;
        
        if (growingTrends > 0 || fallingTrends > 0) {
            html += `По трендам: ${growingTrends > 0 ? growingTrends + ' стран показывают растущий тренд' : ''}${growingTrends > 0 && fallingTrends > 0 ? ', ' : ''}${fallingTrends > 0 ? fallingTrends + ' стран показывают падающий тренд' : ''}${stableTrends > 0 ? ', ' + stableTrends + ' стран показывают стабильный тренд' : ''}.`;
        }
        
        html += '</p>';
        html += '</div>';
        html += '</div>';
    }
    
    content.innerHTML = html;
    modal.classList.add('show');
    
    // Сбрасываем флаг после небольшой задержки
    setTimeout(() => {
        statisticsModalOpening = false;
    }, 500);
}

// Функция для закрытия модального окна статистики
window.closeStatisticsModal = function() {
    const modal = document.getElementById('statisticsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', function(event) {
    const modal = document.getElementById('statisticsModal');
    if (modal && event.target === modal) {
        window.closeStatisticsModal();
    }
});

// Добавляем обработчик для кнопки статистики после определения всех функций
// Используем делегирование событий для надежности
(function initStatisticsButton() {
    function attachHandler() {
        const panelContainer = document.querySelector('.panel-container');
        if (panelContainer) {
            panelContainer.addEventListener('click', (event) => {
                if (event.target && event.target.id === 'statisticsButton') {
                    console.log('Statistics button clicked via delegation');
                    if (typeof window.openStatisticsModal === 'function') {
                        window.openStatisticsModal();
                    } else {
                        console.error('openStatisticsModal is not defined');
                    }
                }
            });
        }
        
        // Также добавляем напрямую, если элемент существует
        const statisticsButton = document.getElementById('statisticsButton');
        if (statisticsButton) {
            console.log('Statistics button found, attaching handler');
            statisticsButton.addEventListener('click', function(event) {
                console.log('Statistics button clicked directly');
                event.preventDefault();
                if (typeof window.openStatisticsModal === 'function') {
                    window.openStatisticsModal();
                } else {
                    console.error('openStatisticsModal is not defined');
                }
            });
        } else {
            console.log('Statistics button not found');
        }
    }
    
    // Пытаемся добавить обработчик сразу
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachHandler);
    } else {
        attachHandler();
    }
    
    // Также пробуем через небольшую задержку на случай, если элементы еще не загружены
    setTimeout(attachHandler, 100);
})();

// ==================== ФУНКЦИИ ДЛЯ КОРРЕЛЯЦИИ ====================

let correlationChart = null;
let correlationData = null;

// Инициализация элементов корреляции
function initCorrelationElements() {
    const countrySelect = document.getElementById('correlationCountry');
    const factor1Select = document.getElementById('correlationFactor1');
    const factor2Select = document.getElementById('correlationFactor2');
    const calculateButton = document.getElementById('calculateCorrelationButton');

    // Заполняем список стран (используем отдельную функцию)
    updateCorrelationCountrySelector();

    // Заполняем списки факторов (используем dataSets из main процесса)
    // Нужно получить dataSets через IPC или использовать глобальную переменную
    const dataSets = [
        ["H2020_1", "Преждевременная смертность"],
        ["H2020_2", "Табакокурение"],
        ["H2020_9", "Ожирение"],
        ["ENHIS_16", "Распространенность ожирения и избыточной массы тела у детей в возрасте 11 лет"],
        ["ENHIS_17", "Распространенность ожирения и избыточной массы тела у детей в возрасте 13 лет"],
        ["ENHIS_18", "Распространенность ожирения и избыточной массы тела у детей в возрасте 15 лет"]
    ];

    if (factor1Select) {
        factor1Select.innerHTML = '<option value="">Выберите фактор</option>';
        dataSets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset[0];
            option.textContent = dataset[1];
            factor1Select.appendChild(option);
        });
    }

    if (factor2Select) {
        factor2Select.innerHTML = '<option value="">Выберите фактор</option>';
        dataSets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset[0];
            option.textContent = dataset[1];
            factor2Select.appendChild(option);
        });
    }

    // Обработчик кнопки расчета корреляции (добавляем только один раз)
    if (calculateButton && !calculateButton.hasAttribute('data-listener-attached')) {
        calculateButton.addEventListener('click', handleCalculateCorrelation);
        calculateButton.setAttribute('data-listener-attached', 'true');
    }
}

// Обработчик расчета корреляции
function handleCalculateCorrelation() {
    const countrySelect = document.getElementById('correlationCountry');
    const factor1Select = document.getElementById('correlationFactor1');
    const factor2Select = document.getElementById('correlationFactor2');
    const calculateButton = document.getElementById('calculateCorrelationButton');

    const countryCode = countrySelect?.value;
    const factor1Code = factor1Select?.value;
    const factor2Code = factor2Select?.value;

    if (!countryCode || !factor1Code || !factor2Code) {
        showNotification(['Пожалуйста, выберите страну и оба фактора']);
        return;
    }

    if (factor1Code === factor2Code) {
        showNotification(['Пожалуйста, выберите два разных фактора']);
        return;
    }

    // Отключаем кнопку на время загрузки
    if (calculateButton) {
        calculateButton.disabled = true;
        calculateButton.textContent = 'Загрузка...';
    }

    // Отправляем запрос на загрузку данных
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('load-correlation-data', {
        countryCode: countryCode,
        factor1Code: factor1Code,
        factor2Code: factor2Code
    });
}

// Обработчик получения данных корреляции
ipcRenderer.on('correlation-data-loaded', (event, data) => {
    const calculateButton = document.getElementById('calculateCorrelationButton');
    
    if (calculateButton) {
        calculateButton.disabled = false;
        calculateButton.textContent = 'Рассчитать корреляцию';
    }

    if (data.error) {
        showNotification([data.error]);
        return;
    }

    if (!data.factor1 || !data.factor2) {
        showNotification(['Не удалось загрузить данные для одного или обоих факторов']);
        return;
    }

    correlationData = data;
    calculateAndDisplayCorrelation(data);
});

// Функция расчета корреляции Пирсона
function calculatePearsonCorrelation(x, y) {
    if (!x || !y || x.length !== y.length || x.length < 2) {
        return null;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
        return null;
    }

    return numerator / denominator;
}

// Функция для синхронизации данных по годам
function synchronizeDataByYears(factor1, factor2) {
    const commonYears = [];
    const factor1Values = [];
    const factor2Values = [];

    // Создаем карты для быстрого поиска значений по годам
    const factor1Map = new Map();
    factor1.dataPoints.forEach(point => {
        factor1Map.set(point.year, point.value);
    });

    const factor2Map = new Map();
    factor2.dataPoints.forEach(point => {
        factor2Map.set(point.year, point.value);
    });

    // Находим общие годы
    const allYears = new Set([...factor1Map.keys(), ...factor2Map.keys()]);
    allYears.forEach(year => {
        if (factor1Map.has(year) && factor2Map.has(year)) {
            commonYears.push(year);
            factor1Values.push(factor1Map.get(year));
            factor2Values.push(factor2Map.get(year));
        }
    });

    // Сортируем по годам
    const indices = commonYears.map((_, i) => i).sort((a, b) => commonYears[a] - commonYears[b]);
    const sortedYears = indices.map(i => commonYears[i]);
    const sortedFactor1Values = indices.map(i => factor1Values[i]);
    const sortedFactor2Values = indices.map(i => factor2Values[i]);

    return {
        years: sortedYears,
        factor1Values: sortedFactor1Values,
        factor2Values: sortedFactor2Values
    };
}

// Функция расчета и отображения корреляции
function calculateAndDisplayCorrelation(data) {
    const synchronized = synchronizeDataByYears(data.factor1, data.factor2);

    if (synchronized.years.length < 2) {
        showNotification(['Недостаточно общих данных для расчета корреляции']);
        return;
    }

    // Вычисляем корреляцию
    const correlation = calculatePearsonCorrelation(
        synchronized.factor1Values,
        synchronized.factor2Values
    );

    if (correlation === null) {
        showNotification(['Не удалось вычислить корреляцию']);
        return;
    }

    // Отображаем график
    displayCorrelationChart(data, synchronized, correlation);

    // Отображаем краткую информацию под графиком
    displayCorrelationInfo(data, synchronized, correlation);

    // Отображаем статистику в модальном окне
    displayCorrelationStatistics(data, synchronized, correlation);
}

// Функция отображения графика корреляции
function displayCorrelationChart(data, synchronized, correlation) {
    const container = document.getElementById('correlationChartContainer');
    const canvas = document.getElementById('correlationChart');
    
    if (!container || !canvas) return;

    container.style.display = 'block';

    const ctx = canvas.getContext('2d');

    // Уничтожаем предыдущий график, если он существует
    if (correlationChart) {
        correlationChart.destroy();
    }

    // Получаем цвета для текущей темы
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#e0e0e0' : '#212529';
    const gridColor = isDark ? '#404040' : '#e0e0e0';

    // Создаем scatter plot для корреляции
    const scatterData = synchronized.years.map((year, index) => ({
        x: synchronized.factor1Values[index],
        y: synchronized.factor2Values[index],
        year: year
    }));

    correlationChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Корреляция',
                    data: scatterData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Корреляция: ${data.factor1.dataSetInfo.name} vs ${data.factor2.dataSetInfo.name}`,
                    font: {
                        family: 'Arial, Helvetica, sans-serif',
                        size: 16
                    },
                    color: textColor
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `Год: ${point.year}`,
                                `${data.factor1.dataSetInfo.name}: ${point.x.toFixed(2)}`,
                                `${data.factor2.dataSetInfo.name}: ${point.y.toFixed(2)}`
                            ];
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: `${data.factor1.dataSetInfo.name} (${data.factor1.dataSetInfo.unit})`,
                        font: {
                            family: 'Arial, Helvetica, sans-serif',
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: `${data.factor2.dataSetInfo.name} (${data.factor2.dataSetInfo.unit})`,
                        font: {
                            family: 'Arial, Helvetica, sans-serif',
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Arial, Helvetica, sans-serif'
                        }
                    }
                }
            }
        }
    });
}

// Функция для определения зависимости факторов
function getDependencyConclusion(correlation, factor1Name, factor2Name) {
    const absCorr = Math.abs(correlation);
    let conclusion = '';
    let color = '#666';
    
    if (absCorr >= 0.7) {
        // Сильная корреляция - возможна зависимость
        if (correlation > 0) {
            conclusion = `Обнаружена сильная положительная связь между факторами. При увеличении "${factor1Name}" наблюдается увеличение "${factor2Name}". Это может указывать на наличие зависимости между факторами, однако корреляция не доказывает причинно-следственную связь.`;
        } else {
            conclusion = `Обнаружена сильная отрицательная связь между факторами (коэффициент корреляции: ${correlation.toFixed(3)}). При увеличении "${factor1Name}" наблюдается уменьшение "${factor2Name}". `;
            conclusion += `⚠️ Внимание: Отрицательная корреляция между этими факторами может быть неожиданной и требует дополнительного анализа. `;
            conclusion += `Возможные причины: влияние третьих факторов, особенности данных (разные единицы измерения, временные периоды), или ложная корреляция. `;
            conclusion += `Корреляция не доказывает причинно-следственную связь и может не отражать реальную зависимость между факторами.`;
        }
        color = '#28a745'; // Зеленый для сильной связи
    } else if (absCorr >= 0.5) {
        // Умеренная корреляция
        if (correlation > 0) {
            conclusion = `Обнаружена умеренная положительная связь между факторами. При увеличении "${factor1Name}" наблюдается тенденция к увеличению "${factor2Name}". Связь присутствует, но зависимость не является сильной.`;
        } else {
            conclusion = `Обнаружена умеренная отрицательная связь между факторами (коэффициент корреляции: ${correlation.toFixed(3)}). При увеличении "${factor1Name}" наблюдается тенденция к уменьшению "${factor2Name}". `;
            conclusion += `Связь присутствует, но зависимость не является сильной. Отрицательная корреляция может быть неожиданной и требует дополнительного анализа.`;
        }
        color = '#ffc107'; // Желтый для умеренной связи
    } else if (absCorr >= 0.3) {
        // Слабая корреляция
        conclusion = `Обнаружена слабая связь между факторами "${factor1Name}" и "${factor2Name}". Зависимость между факторами минимальна или отсутствует.`;
        color = '#ff9800'; // Оранжевый для слабой связи
    } else {
        // Очень слабая или отсутствующая корреляция
        conclusion = `Связь между факторами "${factor1Name}" и "${factor2Name}" очень слабая или отсутствует. Факторы, вероятно, не зависят друг от друга.`;
        color = '#dc3545'; // Красный для отсутствия связи
    }
    
    return { conclusion, color };
}

// Функция отображения краткой информации о корреляции
function displayCorrelationInfo(data, synchronized, correlation) {
    const infoDiv = document.getElementById('correlationInfo');
    if (!infoDiv) return;

    const countryName = getCountryNameByCode(data.countryCode);
    
    // Интерпретация корреляции
    let interpretation = '';
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.9) {
        interpretation = 'Очень сильная';
    } else if (absCorr >= 0.7) {
        interpretation = 'Сильная';
    } else if (absCorr >= 0.5) {
        interpretation = 'Умеренная';
    } else if (absCorr >= 0.3) {
        interpretation = 'Слабая';
    } else {
        interpretation = 'Очень слабая или отсутствует';
    }

    const direction = correlation > 0 ? 'положительная' : 'отрицательная';

    // Получаем вывод о зависимости
    const dependency = getDependencyConclusion(
        correlation,
        data.factor1.dataSetInfo.name,
        data.factor2.dataSetInfo.name
    );

    // Определяем цвета для текущей темы
    const isDark = document.body.classList.contains('dark-theme');
    let alertBg, alertText, alertBorder;
    if (dependency.color === '#28a745') {
        alertBg = isDark ? 'var(--success-bg)' : '#d4edda';
        alertText = isDark ? 'var(--success-text)' : '#155724';
        alertBorder = '#28a745';
    } else if (dependency.color === '#ffc107') {
        alertBg = isDark ? 'var(--warning-bg)' : '#fff3cd';
        alertText = isDark ? 'var(--warning-text)' : '#856404';
        alertBorder = '#ffc107';
    } else if (dependency.color === '#ff9800') {
        alertBg = isDark ? '#4a2a00' : '#ffe0b2';
        alertText = isDark ? '#ffb366' : '#e65100';
        alertBorder = '#ff9800';
    } else {
        alertBg = isDark ? '#4a1a1a' : '#f8d7da';
        alertText = isDark ? '#ff9999' : '#721c24';
        alertBorder = '#dc3545';
    }
    
    let html = `<h3 style="margin-top: 0; margin-bottom: 6px; color: var(--primary-color); font-size: 14px;">Результаты корреляционного анализа для ${countryName}</h3>`;
    html += `<p style="margin: 4px 0; color: var(--text-color); font-size: 12px;"><strong>Коэффициент корреляции Пирсона:</strong> ${correlation.toFixed(4)}</p>`;
    html += `<p style="margin: 4px 0; color: var(--text-color); font-size: 12px;"><strong>Интерпретация:</strong> ${interpretation} ${direction} корреляция</p>`;
    html += `<p style="margin: 4px 0; color: var(--text-color); font-size: 12px;"><strong>Количество точек данных:</strong> ${synchronized.years.length}</p>`;
    html += `<p style="margin: 4px 0; color: var(--text-color); font-size: 12px;"><strong>Период:</strong> ${synchronized.years[0]} - ${synchronized.years[synchronized.years.length - 1]}</p>`;
    
    // Добавляем вывод о зависимости
    html += `<div style="margin-top: 6px; padding: 6px; background-color: ${alertBg}; border-left: 4px solid ${alertBorder}; border-radius: 4px;">`;
    html += `<p style="margin: 0; color: ${alertText}; font-weight: bold; margin-bottom: 4px; font-size: 12px;">Вывод о зависимости факторов:</p>`;
    html += `<p style="margin: 0; color: var(--text-color); line-height: 1.4; font-size: 11px;">${dependency.conclusion}</p>`;
    html += `</div>`;
    
    html += `<p style="margin: 4px 0; color: var(--text-color); opacity: 0.7; font-size: 11px;">Подробная статистика доступна в модальном окне</p>`;

    infoDiv.innerHTML = html;
    infoDiv.style.display = 'block';
}

// Функция отображения статистики корреляции
function displayCorrelationStatistics(data, synchronized, correlation) {
    const countryName = getCountryNameByCode(data.countryCode);
    
    // Вычисляем дополнительные статистики
    const factor1Mean = calculateMean(synchronized.factor1Values);
    const factor2Mean = calculateMean(synchronized.factor2Values);
    const factor1Std = calculateStandardDeviation(synchronized.factor1Values);
    const factor2Std = calculateStandardDeviation(synchronized.factor2Values);

    // Интерпретация корреляции
    let interpretation = '';
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.9) {
        interpretation = 'Очень сильная';
    } else if (absCorr >= 0.7) {
        interpretation = 'Сильная';
    } else if (absCorr >= 0.5) {
        interpretation = 'Умеренная';
    } else if (absCorr >= 0.3) {
        interpretation = 'Слабая';
    } else {
        interpretation = 'Очень слабая или отсутствует';
    }

    const direction = correlation > 0 ? 'положительная' : 'отрицательная';

    // Создаем HTML для модального окна
    let html = '<div class="correlation-info">';
    html += `<h3>Корреляционный анализ для ${countryName}</h3>`;
    html += '<div class="correlation-info-item">';
    html += `<span class="correlation-info-label">Коэффициент корреляции Пирсона:</span>`;
    html += `<span class="correlation-info-value">${correlation.toFixed(4)}</span>`;
    html += '</div>';
    html += '<div class="correlation-info-item">';
    html += `<span class="correlation-info-label">Интерпретация:</span>`;
    html += `<span class="correlation-info-value">${interpretation} ${direction} корреляция</span>`;
    html += '</div>';
    html += '<div class="correlation-info-item">';
    html += `<span class="correlation-info-label">Количество точек данных:</span>`;
    html += `<span class="correlation-info-value">${synchronized.years.length}</span>`;
    html += '</div>';
    html += '<div class="correlation-info-item">';
    html += `<span class="correlation-info-label">Период:</span>`;
    html += `<span class="correlation-info-value">${synchronized.years[0]} - ${synchronized.years[synchronized.years.length - 1]}</span>`;
    html += '</div>';
    html += '</div>';

    // Добавляем вывод о зависимости факторов
    const dependency = getDependencyConclusion(
        correlation,
        data.factor1.dataSetInfo.name,
        data.factor2.dataSetInfo.name
    );
    
    html += '<div class="correlation-info">';
    html += '<h3>Вывод о зависимости факторов</h3>';
    // Используем CSS переменные для цветов в зависимости от типа корреляции
    const isDark = document.body.classList.contains('dark-theme');
    let alertBg, alertText, alertBorder;
    if (dependency.color === '#28a745') {
        alertBg = isDark ? 'var(--success-bg)' : '#d4edda';
        alertText = isDark ? 'var(--success-text)' : '#155724';
        alertBorder = '#28a745';
    } else if (dependency.color === '#ffc107') {
        alertBg = isDark ? 'var(--warning-bg)' : '#fff3cd';
        alertText = isDark ? 'var(--warning-text)' : '#856404';
        alertBorder = '#ffc107';
    } else if (dependency.color === '#ff9800') {
        alertBg = isDark ? '#4a2a00' : '#ffe0b2';
        alertText = isDark ? '#ffb366' : '#e65100';
        alertBorder = '#ff9800';
    } else {
        alertBg = isDark ? '#4a1a1a' : '#f8d7da';
        alertText = isDark ? '#ff9999' : '#721c24';
        alertBorder = '#dc3545';
    }
    html += `<div style="padding: 6px; background-color: ${alertBg}; border-left: 4px solid ${alertBorder}; border-radius: 4px; margin-top: 6px;">`;
    html += `<p style="margin: 0; color: ${alertText}; line-height: 1.4; font-size: 11px;">${dependency.conclusion}</p>`;
    html += '</div>';
    html += '</div>';

    html += '<div class="correlation-info">';
    html += '<h3>Статистика по факторам</h3>';
    html += '<table class="statistics-table">';
    html += '<tr><th>Параметр</th><th>Фактор 1</th><th>Фактор 2</th></tr>';
    html += `<tr><td>Название</td><td>${data.factor1.dataSetInfo.name}</td><td>${data.factor2.dataSetInfo.name}</td></tr>`;
    html += `<tr><td>Единица измерения</td><td>${data.factor1.dataSetInfo.unit}</td><td>${data.factor2.dataSetInfo.unit}</td></tr>`;
    html += `<tr><td>Среднее значение</td><td>${factor1Mean.toFixed(2)}</td><td>${factor2Mean.toFixed(2)}</td></tr>`;
    html += `<tr><td>Стандартное отклонение</td><td>${factor1Std.toFixed(2)}</td><td>${factor2Std.toFixed(2)}</td></tr>`;
    html += `<tr><td>Минимальное значение</td><td>${Math.min(...synchronized.factor1Values).toFixed(2)}</td><td>${Math.min(...synchronized.factor2Values).toFixed(2)}</td></tr>`;
    html += `<tr><td>Максимальное значение</td><td>${Math.max(...synchronized.factor1Values).toFixed(2)}</td><td>${Math.max(...synchronized.factor2Values).toFixed(2)}</td></tr>`;
    html += '</table>';
    html += '</div>';

    // Отображаем в модальном окне
    const modal = document.getElementById('correlationModal');
    const content = document.getElementById('correlationContent');
    
    if (modal && content) {
        content.innerHTML = html;
        modal.classList.add('show');
    }
}

// Функция закрытия модального окна корреляции
window.closeCorrelationModal = function() {
    const modal = document.getElementById('correlationModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Закрытие модального окна корреляции при клике вне его
document.addEventListener('click', function(event) {
    const modal = document.getElementById('correlationModal');
    if (modal && event.target === modal) {
        window.closeCorrelationModal();
    }
});

// Инициализация элементов корреляции при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initCorrelationElements, 100);
        // Список стран уже запрашивается в initTabs(), но запросим еще раз на всякий случай
        if (!countriesList || countriesList.length === 0) {
            ipcRenderer.send('get-countries');
        }
    });
} else {
    setTimeout(initCorrelationElements, 100);
    // Список стран уже запрашивается в initTabs(), но запросим еще раз на всякий случай
    if (!countriesList || countriesList.length === 0) {
        ipcRenderer.send('get-countries');
    }
}