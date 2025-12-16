const axios = require('axios');
const { dialog } = require('electron');

//===================================================================
const DEBUG_ENABLE = 0; // - Включение дебага

const dataSets = [ // - Доступные наборы данных (код, название)
    ["H2020_1", "Преждевременная смертность"],
    ["H2020_2", "Табакокурение"],
    ["H2020_9", "Ожирение"],
    ["ENHIS_16", "Распространенность ожирения и избыточной массы тела у детей в возрасте 11 лет"],
    ["ENHIS_17", "Распространенность ожирения и избыточной массы тела у детей в возрасте 13 лет"],
    ["ENHIS_18", "Распространенность ожирения и избыточной массы тела у детей в возрасте 15 лет"]
];

let countriesList = [];
let selectedCountriesCodes = ['AUT'];

//===================================================================
function setSelectedCountriesCodes(codes) {
    selectedCountriesCodes = codes || [];
}

function getSelectedCountriesCodes() {
    return selectedCountriesCodes;
}

module.exports = {
    DEBUG_ENABLE,
    dataSets,
    countriesList,
    selectedCountriesCodes,
    getCountriesList,
    refreshCountriesList,
    loadDataSet,
    parseData,
    setSelectedCountriesCodes,
    getSelectedCountriesCodes
};

//===================================================================
async function loadCountriesList() {
    try{
        if(DEBUG_ENABLE){
            console.log('Load countries list, please wait...');
        }
            
        const response = await axios.get('https://dw.euro.who.int/api/v3/countries?lang=RU', {
            httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
            }),
            timeout: 10000
        });

        const countries = response.data;

        countriesList = countries.map(country => ({
            name: country.full_name || country.short_name,
            code: country.code
        })).filter(country => country.name);

        countriesList.sort((a, b) => a.name.localeCompare(b.name));

        if(DEBUG_ENABLE){
            console.log(`[loadCountriesList] ${countriesList.length} countries loaded!`);
        }
        return countriesList;

    } catch(error){
        console.log(`[loadCountriesList ERROR]: ${error}`);

        countriesList = [
            { name: "Albania", code: "ALB" },
            { name: "Andorra", code: "AND" },
            { name: "Armenia", code: "ARM" },
            { name: "Austria", code: "AUT" },
            { name: "Azerbaijan", code: "AZE" }
        ];
            
        console.log('[loadCountriesList] Local countries list was used.');
        return countriesList;
    }
}

async function loadDataSet(data_set_code, contry_codes, mainWindow = null) {
    try{
        const loadData = [];
        const countriesWithoutData = [];
        
        for(const item of contry_codes){
            try {
                const http = `https://dw.euro.who.int/api/v3/measures/${data_set_code}?filter=COUNTRY:${item}&lang=RU`;

                if(DEBUG_ENABLE){
                    console.log(http);
                }

                const response = await axios.get(http, {
                    httpsAgent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    }),
                    timeout: 10000
                });

                const parsedData = parseData(response.data);
                parsedData.countryCode = item; // Сохраняем код страны
                
                // Добавляем только страны с данными
                if(parsedData.values.length && parsedData.years.length){
                    loadData.push(parsedData);
                } else {
                    // Сохраняем информацию о странах без данных
                    const country = countriesList.find(c => c.code === item);
                    countriesWithoutData.push(country ? country.name : item);
                }

                if(DEBUG_ENABLE){
                    console.log(parsedData);
                }
            } catch(error) {
                // Обрабатываем ошибку для отдельной страны, но продолжаем загрузку остальных
                console.log(`[loadDataSet ERROR for ${item}]: ${error.message || error}`);
                const country = countriesList.find(c => c.code === item);
                countriesWithoutData.push(country ? country.name : item);
            }
        }

        if(mainWindow != null){
            mainWindow.webContents.send('parse-data', {
                parsedData: loadData,
                countriesList: countriesList, // Передаем список стран для получения названий
                countriesWithoutData: countriesWithoutData // Страны без данных
            });
        }

    } catch(error){
        console.log(`[loadDataSet ERROR]: ${error.message || error}`);
        // Отправляем пустой массив в случае критической ошибки
        if(mainWindow != null){
            mainWindow.webContents.send('parse-data', {
                parsedData: [],
                countriesList: countriesList,
                countriesWithoutData: []
            });
        }
    }
}

function parseData(loadedData) {
    const result = {
        dataSetInfo: {
            code: loadedData.code,
            name: loadedData.short_name,
            fullName: loadedData.full_name,
            unit: loadedData.metadata?.find(m => m.code === 'UNIT_TYPE')?.value?.label || 'N/A'
        },
        years: [],
        values: [],
        dataPoints: [] // комбинированный массив
    };

    // Парсим данные из массива data
    if (loadedData.data && Array.isArray(loadedData.data)) {
        loadedData.data.forEach(item => {
            const year = item.dimensions?.YEAR;
            const value = item.value?.numeric;
            
            if (year && value !== undefined) {
                result.years.push(year);
                result.values.push(value);
                result.dataPoints.push({
                    year: year,
                    value: value,
                    display: item.value?.display,
                    factId: item.fact_id
                });
            }
        });
    }

    // Сортируем по годам (на всякий случай)
    result.dataPoints.sort((a, b) => a.year - b.year);
    result.years.sort((a, b) => a - b);
    
    return result;
}

function getMinimumIndex(values_array) {
    let min_index = 0;
    for (let i = 0; i < values_array.length; i++) {
        if (values_array[i] < values_array[min_index]) {
            min_index = i;
        }
    }
    return min_index;
}

function getMaximumIndex(values_array) {
    let max_index = 0;
    for (let i = 0; i < values_array.length; i++) {
        if (values_array[i] > values_array[max_index]) {
            max_index = i;
        }
    }
    return max_index;
}

function getCountriesList(){ return countriesList; }
async function refreshCountriesList() { return await loadCountriesList(); }