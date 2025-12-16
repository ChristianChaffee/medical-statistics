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
        }
        if (dataSets && dataSets.length > 0) {
            selectedData = dataSets[0];
        }

        createSimpleMenu(mainWindow);

        if(DEBUG_ENABLE) mainWindow.webContents.openDevTools();
    });
}

function createSimpleMenu(mainWindow) {

    const currentCountriesList = getCountriesList();
    const countriesSubmenu = currentCountriesList.map((country, index) => {
        const isChecked = selectedCountriesCodes.includes(country.code);
        return {
            label: country.name,
            type: 'checkbox',
            checked: isChecked,
            click: (menuItem) => {
                selectedCountry = country;
                SendMainDataToRender();

                const findIndex = selectedCountriesCodes.findIndex(item => item === selectedCountry.code);
                if(findIndex == -1){
                    // Добавляем страну
                    selectedCountriesCodes.push(selectedCountry.code);
                    menuItem.checked = true;
                }
                else {
                    // Удаляем страну
                    selectedCountriesCodes.splice(findIndex, 1);
                    menuItem.checked = false;
                }

                // Перезагружаем данные только для выбранных стран
                if (selectedCountriesCodes.length > 0) {
                    loadDataSet(selectedData[0], selectedCountriesCodes, mainWindow);
                } else {
                    // Если все страны сняты, отправляем пустой массив для удаления всех графиков
                    mainWindow.webContents.send('parse-data', {
                        parsedData: [],
                        countriesList: countriesList
                    });
                }

                if(DEBUG_ENABLE) console.log(`[countriesSubmenu Clicked]: ${country.name} (${country.code}), checked: ${menuItem.checked}`);
            }
        };
    })

    const template = [
        {
            label: 'Государство',
            submenu: countriesSubmenu
        },
        {
            label: 'Данные',
            submenu: dataSets.map(item => ({
                label: item[1],
                id: item[0],
                type: 'radio',
                click: () => {
                    selectedData = item;
                    SendMainDataToRender();

                    // Загружаем данные для всех выбранных стран
                    if (selectedCountriesCodes.length > 0) {
                        loadDataSet(item[0], selectedCountriesCodes, mainWindow);
                    }
                }
            }))
        },
        {
            label: 'Вид',
            submenu: [
                {
                    label: 'Перезагрузить',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Инструменты разработчика',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function SendMainDataToRender(){
    if (mainWindow && selectedCountry && selectedData) {
        mainWindow.webContents.send('main-data-update', {
            countryName: selectedCountry.name,
            dataName: selectedData[1]
        });
    }
}
