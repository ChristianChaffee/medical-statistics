const axios = require('axios');

//===================================================================
const DEBUG_ENABLE = 1; // - Включение дебага

const dataSets = [ // - Доступные наборы данных (код, название)
    ["H2020_1", "Преждевременная смертность"],
    ["H2020_2", "Табакокурение"],
    ["H2020_9", "Ожирение"],
    ["ENHIS_16", "Распространенность ожирения и избыточной массы тела у детей в возрасте 11 лет"],
    ["ENHIS_17", "Распространенность ожирения и избыточной массы тела у детей в возрасте 13 лет"],
    ["ENHIS_18", "Распространенность ожирения и избыточной массы тела у детей в возрасте 15 лет"]
];

let countriesList = [];

//===================================================================
module.exports = {
    DEBUG_ENABLE,
    dataSets,
    countriesList,
    getCountriesList,
    refreshCountriesList,
    loadDataSet
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

async function loadDataSet(data_set_code, contry_code, mainWindow = null) {
    try{
        const http = `https://dw.euro.who.int/api/v3/measures/${data_set_code}?filter=COUNTRY:${contry_code}&lang=RU`;

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
        if(mainWindow != null){
            mainWindow.webContents.send('parse-data', {
                parsedData: parsedData,
                minIndex: getMinimumIndex(parsedData.values),
                maxIndex: getMaximumIndex(parsedData.values)
            });
        }

        if(DEBUG_ENABLE){
            console.log(parsedData);
        }

    } catch(error){
        console.log(`[loadDataSet ERROR]: ${error}`);
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