const axios = require('axios');
const { dialog } = require('electron');

//===================================================================
const DEBUG_ENABLE = 0; // - Включение дебага

const dataSets = [ // - Доступные наборы данных (код, название)
    // Health 2020 (H2020) - Основные показатели
    ["H2020_1", "Преждевременная смертность"],
    ["H2020_2", "Табакокурение"],
    ["H2020_3", "Табакокурение, мужчины"],
    ["H2020_4", "Табакокурение, женщины"],
    ["H2020_5", "Потребление алкоголя"],
    ["H2020_6", "Избыточная масса тела"],
    ["H2020_7", "Избыточная масса тела, мужчины"],
    ["H2020_8", "Избыточная масса тела, женщины"],
    ["H2020_9", "Ожирение"],
    ["H2020_10", "Ожирение, мужчины"],
    ["H2020_11", "Ожирение, женщины"],
    ["H2020_12", "Вакцинация против кори"],
    ["H2020_13", "Вакцинация против полиомиелита"],
    ["H2020_14", "Смертность от внешних причин"],
    ["H2020_15", "Смертность от внешних причин, мужчины"],
    ["H2020_16", "Смертность от внешних причин, женщины"],
    ["H2020_17", "Ожидаемая продолжительность жизни"],
    ["H2020_18", "Ожидаемая продолжительность жизни, мужчины"],
    ["H2020_19", "Ожидаемая продолжительность жизни, женщины"],
    ["H2020_20", "Младенческая смертность"],
    ["H2020_21", "Зачисление в начальную школу"],
    ["H2020_22", "Безработица"],
    ["H2020_23", "Национальные стратегии по сокращению несправедливостей в отношении здоровья"],
    ["H2020_24", "Удовлетворенность жизнью"],
    ["H2020_25", "Социальная поддержка"],
    ["H2020_26", "Санитария"],
    ["H2020_27", "Санитария, сельское население"],
    ["H2020_28", "Санитария, городское население"],
    ["H2020_29", "Прямая оплата услуг"],
    ["H2020_30", "Расходы на здравоохранение"],
    ["H2020_31", "Установление национальных целевых ориентиров"],
    ["H2020_32", "Национальные стратегии, согласованные с положениями политики Здоровье-2020"],
    ["H2020_33", "Национальные планы реализации"],
    ["H2020_34", "Национальные механизмы подотчетности"],
    ["H2020_35", "Преждевременная смертность, мужчины"],
    ["H2020_36", "Преждевременная смертность, женщины"],
    ["H2020_37", "Младенческая смертность мужского пола"],
    ["H2020_38", "Младенческая смертность женского пола"],
    ["H2020_39", "Зачисление в начальную школу, мальчики"],
    ["H2020_40", "Зачисление в начальную школу, девочки"],
    // Environment and Health Information System (ENHIS) - Основные показатели
    ["ENHIS_1", "Число вспышек заболеваний, связанных с питьевой водой"],
    ["ENHIS_2", "Число случаев заболеваний, связанных со вспышками заболеваний, передаваемых через питьевую воду"],
    ["ENHIS_3", "Доля населения с доступом к водопроводной воде дома"],
    ["ENHIS_4", "Доля населения с доступом к системе канализации и очистки сточных вод"],
    ["ENHIS_5", "Доля населения с доступом к улучшенной канализации дома"],
    ["ENHIS_6", "Качество воды в морских зонах для купания в странах ЕС, уровень соответствия нормативам"],
    ["ENHIS_7", "Качество воды в пресноводных зонах для купания в странах ЕС"],
    ["ENHIS_8", "Стандартизованный показатель смертности (усредненный показатель за 3 года) в результате дорожно-транспортного травматизма в возрастной группе 0-24 года"],
    ["ENHIS_9", "Стандартизованный показатель транспортного травматизма в возрастной группе 0-24 года"],
    ["ENHIS_10", "Число пострадавших в ДТП в возрасте 0–24 года на 100 000 моторных транспортных средств"],
    ["ENHIS_11", "Доля смертей от различных причин непреднамеренных травм в возрастной группе 0–19 лет"],
    ["ENHIS_12", "Стандартизованный показатель смертности от непреднамеренных травм в возрастной группе 1-19 лет - утопление и погружение в воду"],
    ["ENHIS_13", "Стандартизованный показатель смертности от непреднамеренных травм в возрастной группе 1-19 лет - отравления"],
    ["ENHIS_14", "Стандартизованный показатель смертности от непреднамеренных травм в возрастной группе 1-19 лет - случайные падения"],
    ["ENHIS_15", "Стандартизованный показатель смертности от непреднамеренных травм в возрастной группе 1-19 лет - экспозиция к дыму, огню и пламени"],
    ["ENHIS_16", "Распространенность ожирения и избыточной массы тела у детей в возрасте 11 лет"],
    ["ENHIS_17", "Распространенность ожирения и избыточной массы тела у детей в возрасте 13 лет"],
    ["ENHIS_18", "Распространенность ожирения и избыточной массы тела у детей в возрасте 15 лет"],
    ["ENHIS_19", "Процент физически активных детей в возрасте 13 лет"],
    ["ENHIS_20", "Процент физически активных детей в возрасте 13 лет"],
    ["ENHIS_21", "Процент физически активных детей в возрасте 15 лет"],
    ["ENHIS_22", "Уровень младенческой смертности от респираторных заболеваний в постнеонатальном периоде"],
    ["ENHIS_23", "Процент населения проживающего в городах с различными уровнями ВЧ10, выраженными в мкг/м3"],
    ["ENHIS_24", "Среднегодовая взвешенная по населению концентрация ВЧ10 в городах"],
    ["ENHIS_25", "Процент населения проживающего в городах с различными уровнями ВЧ2.5, выраженными в мкг/м3"],
    ["ENHIS_26", "Среднегодовая взвешенная по населению концентрация ВЧ2.5 в городах"],
    ["ENHIS_27", "Доля детей в возрасте 13–15 лет, подвергающихся воздействию окружающего табачного дыма в своих домах и за их пределами"],
    ["ENHIS_28", "Доля ежедневно курящих детей в возрасте 15 лет"],
    ["ENHIS_29", "Доля ежедневно курящих детей в возрасте 13 лет"],
    ["ENHIS_30", "Доля ежедневно курящих детей в возрасте 11 лет"],
    ["ENHIS_31", "Доля населения, проживающего в домах, где наблюдались проблемы сырости"],
    ["ENHIS_32", "Доля населения, живущего в относительной бедности, которая проживала в домах с проблемами сырости"],
    ["ENHIS_33", "Доля детей в возрасте 0-14 лет, проживающих в домах, где используется твердое топливо для приготовления пищи"],
    ["ENHIS_34", "Доля стран, в которых внедряются политические меры для снижения экспозиции детей к табачному дыму"],
    ["ENHIS_35", "Степень внедрения политических мер по снижению экспозиции детей к табачному дыму"],
    ["ENHIS_36", "Доля людей, живущих в городах с разными уровнями SOMO35"],
    ["ENHIS_37", "Средневзвешенный на численность населения показатель SOMO35 в городах"],
    ["ENHIS_38", "Стандартизованная по возрасту встречаемость лейкемии у детей младше 15 лет"],
    ["ENHIS_39", "Стандартизованная по возрасту встречаемость меланомы у людей в возрасте до 55 лет"],
    ["ENHIS_40", "Временные тренды встречаемости меланомы в Норвегии, Швеции и Исландии"],
    ["ENHIS_41", "Уровни диоксинов в грудном молоке в избранных странах"],
    ["ENHIS_42", "Уровни СОЗ в грудном молоке, Швеция"],
    ["ENHIS_43", "Потребление тяжелых металлов с пищей взрослым населением"],
    ["ENHIS_44", "Средний уровень избранных опасных металлов в рационе общей популяции в Чехии"],
    ["ENHIS_45", "Cредние уровни свинца в крови детей в районах, где отсутствуют значительные местные источники экспозиции к свинцу"],
    ["ENHIS_47", "Среднее значение уровней радона внутри помещений"],
    ["ENHIS_48", "Доля жилых зданий с уровнем радона ≥200 Бк/м3"],
    ["ENHIS_49", "Доля жилых зданий с уровнем радона ≥400 Бк/м3"],
    ["ENHIS_50", "Стандартизованная встречаемость травм на работе среди работников младше 18 лет"],
    ["ENHIS_51", "Стандартизованная встречаемость травм на работе среди работников в возрастной группе 18-24 года"],
    ["ENHIS_52", "Доля городского населения, подвергавшегося воздействию шума на уровне Lden > 55 дБ"],
    ["ENHIS_53", "Доля городского населения, подвергавшегося воздействию шума на уровне Lnight > 50 дБ"],
    ["ENHIS_54", "Доля населения, жаловавшегося на воздействие шума в местах своего проживания"],
    ["ENHIS_55", "Уровень концентраций СОЗа DDT в грудном молоке"],
    ["ENHIS_56", "Уровень концентраций СОЗа PCB в грудном молоке"],
    ["ENHIS_57", "Уровень концентраций СОЗа HCB в грудном молоке"],
    ["ENHIS_58", "Уровень концентраций СОЗа PCN в грудном молоке"],
    ["ENHIS_59", "Уровень концентраций СОЗа PBDE в грудном молоке"],
    ["ENHIS_60", "Уровень концентраций всех СОЗов в грудном молоке"]
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
    
    // Пересоздаем массивы years и values из отсортированных dataPoints для синхронизации
    result.years = result.dataPoints.map(dp => dp.year);
    result.values = result.dataPoints.map(dp => dp.value);
    
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