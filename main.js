const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow,                 // - главное окно
    selectedCountry = null,     // - выбранная страна
    selectedData = null;        // - выбранные данные

//============================================ Подгрузка зависимостей
const {
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
} = require('./data');

//================================================= Обработка событий
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//========================================= Обработчики IPC-сообщений
const { ipcMain } = require('electron');

ipcMain.on('get-countries', (event) => {
  event.reply('countries-list', countriesList);
});

ipcMain.on('get-data-sets', (event) => {
  event.reply('data-sets-list', dataSets);
});

ipcMain.on('select-countries', (event, countryCodes) => {
  setSelectedCountriesCodes(countryCodes);
  const currentSelectedCodes = getSelectedCountriesCodes();
  if (currentSelectedCodes.length > 0 && selectedData) {
    loadDataSet(selectedData[0], currentSelectedCodes, mainWindow);
  } else {
    // Получаем актуальный список стран перед отправкой
    const currentCountriesList = getCountriesList();
    mainWindow.webContents.send('parse-data', {
      parsedData: [],
      countriesList: currentCountriesList && currentCountriesList.length > 0 ? currentCountriesList : countriesList
    });
  }
});

ipcMain.on('select-data-set', (event, dataSetCode) => {
  const dataSet = dataSets.find(ds => ds[0] === dataSetCode);
  if (dataSet) {
    selectedData = dataSet;
    SendMainDataToRender();
    const currentSelectedCodes = getSelectedCountriesCodes();
    if (currentSelectedCodes.length > 0) {
      loadDataSet(dataSetCode, currentSelectedCodes, mainWindow);
    }
  }
});

ipcMain.on('load-correlation-data', async (event, { countryCode, factor1Code, factor2Code }) => {
  try {
    const correlationData = {
      countryCode: countryCode,
      factor1: null,
      factor2: null
    };

    // Загружаем данные для первого фактора
    if (factor1Code) {
      const http1 = `https://dw.euro.who.int/api/v3/measures/${factor1Code}?filter=COUNTRY:${countryCode}&lang=RU`;
      const response1 = await axios.get(http1, {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        }),
        timeout: 10000
      });
      correlationData.factor1 = parseData(response1.data);
      correlationData.factor1.dataSetInfo = {
        code: response1.data.code,
        name: response1.data.short_name,
        fullName: response1.data.full_name,
        unit: response1.data.metadata?.find(m => m.code === 'UNIT_TYPE')?.value?.label || 'N/A'
      };
    }

    // Загружаем данные для второго фактора
    if (factor2Code) {
      const http2 = `https://dw.euro.who.int/api/v3/measures/${factor2Code}?filter=COUNTRY:${countryCode}&lang=RU`;
      const response2 = await axios.get(http2, {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        }),
        timeout: 10000
      });
      correlationData.factor2 = parseData(response2.data);
      correlationData.factor2.dataSetInfo = {
        code: response2.data.code,
        name: response2.data.short_name,
        fullName: response2.data.full_name,
        unit: response2.data.metadata?.find(m => m.code === 'UNIT_TYPE')?.value?.label || 'N/A'
      };
    }

    event.reply('correlation-data-loaded', correlationData);
  } catch (error) {
    console.log(`[load-correlation-data ERROR]: ${error.message || error}`);
    event.reply('correlation-data-loaded', {
      error: error.message || 'Ошибка загрузки данных'
    });
  }
});

//================================================= Остальные функции
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    refreshCountriesList().then(() => {
        const countries = getCountriesList();
        if (countries && countries.length > 0) {
            selectedCountry = countries[0];
            // Устанавливаем начальную выбранную страну (например, первую)
            const currentSelectedCodes = getSelectedCountriesCodes();
            if (currentSelectedCodes.length === 0) {
                setSelectedCountriesCodes([countries[0].code]);
            }
        }
        if (dataSets && dataSets.length > 0) {
            selectedData = dataSets[0];
        }

        createSimpleMenu(mainWindow);

        // Отправляем данные после загрузки страницы
        mainWindow.webContents.once('did-finish-load', () => {
            // Отправляем список наборов данных
            mainWindow.webContents.send('data-sets-list', dataSets);
            // Отправляем начальный выбор данных
            if (selectedData) {
                mainWindow.webContents.send('main-data-update', {
                    countryName: selectedCountry ? selectedCountry.name : '',
                    dataName: selectedData[1]
                });
                // Загружаем данные для начально выбранной страны
                const currentSelectedCodes = getSelectedCountriesCodes();
                if (currentSelectedCodes.length > 0) {
                    loadDataSet(selectedData[0], currentSelectedCodes, mainWindow);
                }
            }
        });

        if(DEBUG_ENABLE) mainWindow.webContents.openDevTools();
    });
}

function createSimpleMenu(mainWindow) {
    // Меню удалено - все функции доступны через интерфейс
    // Для перезагрузки можно использовать Ctrl+R, для DevTools - F12
    Menu.setApplicationMenu(null);
}

function SendMainDataToRender(){
    if (mainWindow && selectedCountry && selectedData) {
        mainWindow.webContents.send('main-data-update', {
            countryName: selectedCountry.name,
            dataName: selectedData[1]
        });
    }
}
