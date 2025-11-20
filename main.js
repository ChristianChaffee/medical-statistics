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
        selectedCountry = countries[0];
        selectedData = dataSets[0];

        createSimpleMenu(mainWindow);

        if(DEBUG_ENABLE) mainWindow.webContents.openDevTools();
    });
}

function createSimpleMenu(mainWindow) {

    const currentCountriesList = getCountriesList();
    const countriesSubmenu = currentCountriesList.map((country, index) => ({
        label: country.name,
        type: 'radio',
        checked: index === 0,
        click: () => {
            selectedCountry = country;
            SendMainDataToRender();
            loadDataSet(selectedData[0], selectedCountry.code, mainWindow);

            if(DEBUG_ENABLE) console.log(`[countriesSubmenu Clicked]: ${country.name} (${country.code})`);
        }
    }))

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

                    loadDataSet(item[0], selectedCountry.code, mainWindow);
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
    mainWindow.webContents.send('main-data-update', {
        countryName: selectedCountry.name,
        dataName: selectedData[1]
    });
}