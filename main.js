const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
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

ipcMain.on('get-countries', async (event) => {
  // Если список стран еще не загружен, загружаем его
  const currentList = getCountriesList();
  if (!currentList || currentList.length === 0) {
    try {
      await refreshCountriesList();
      const loadedList = getCountriesList();
      event.reply('countries-list', loadedList || []);
    } catch (error) {
      console.error('Ошибка загрузки списка стран:', error);
      event.reply('countries-list', []);
    }
  } else {
    event.reply('countries-list', currentList);
  }
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

ipcMain.on('update-title-bar-theme', (event, isDark) => {
  // Больше не используется, так как используем frameless окно
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
  } catch (error) {
    console.error('Ошибка открытия файла:', error);
    event.reply('open-file-error', error.message);
  }
});

ipcMain.on('export-statistics-to-pdf', async (event, htmlContent) => {
  try {
    const pdfPath = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить статистику в PDF',
      defaultPath: 'статистика_графиков.pdf',
      filters: [
        { name: 'PDF', extensions: ['pdf'] }
      ]
    });

    if (!pdfPath.canceled && pdfPath.filePath) {
      // Создаем временное окно для печати
      const printWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false
        }
      });

      // Создаем HTML с содержимым
      const stylePath = path.join(__dirname, 'style.css');
      let cssContent = '';
      try {
        cssContent = fs.readFileSync(stylePath, 'utf8');
      } catch (err) {
        console.error('Ошибка чтения CSS:', err);
      }
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
              background: white;
              color: black;
            }
            ${cssContent}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      const tempHtmlPath = path.join(app.getPath('temp'), 'statistics_export.html');
      fs.writeFileSync(tempHtmlPath, html);

      await printWindow.loadFile(tempHtmlPath);
      
      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5
        }
      });

      fs.writeFileSync(pdfPath.filePath, pdfData);
      printWindow.close();
      fs.unlinkSync(tempHtmlPath);

      console.log('PDF успешно сохранен:', pdfPath.filePath);
      event.reply('pdf-export-success', pdfPath.filePath);
    } else {
      console.log('Экспорт отменен пользователем');
    }
  } catch (error) {
    console.error('Ошибка экспорта статистики в PDF:', error);
    event.reply('pdf-export-error', error.message);
  }
});

ipcMain.on('export-correlation-to-pdf', async (event, htmlContent) => {
  try {
    const pdfPath = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить корреляционный анализ в PDF',
      defaultPath: 'корреляционный_анализ.pdf',
      filters: [
        { name: 'PDF', extensions: ['pdf'] }
      ]
    });

    if (!pdfPath.canceled && pdfPath.filePath) {
      // Создаем временное окно для печати
      const printWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false
        }
      });

      // Создаем HTML с содержимым
      const stylePath = path.join(__dirname, 'style.css');
      let cssContent = '';
      try {
        cssContent = fs.readFileSync(stylePath, 'utf8');
      } catch (err) {
        console.error('Ошибка чтения CSS:', err);
      }
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
              background: white;
              color: black;
            }
            ${cssContent}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      const tempHtmlPath = path.join(app.getPath('temp'), 'correlation_export.html');
      fs.writeFileSync(tempHtmlPath, html);

      await printWindow.loadFile(tempHtmlPath);
      
      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5
        }
      });

      fs.writeFileSync(pdfPath.filePath, pdfData);
      printWindow.close();
      fs.unlinkSync(tempHtmlPath);

      event.reply('pdf-export-success', pdfPath.filePath);
    }
  } catch (error) {
    console.error('Ошибка экспорта корреляции в PDF:', error);
    event.reply('pdf-export-error', error.message);
  }
});

ipcMain.on('export-chart-to-pdf', async (event, exportData) => {
  try {
    const pdfPath = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить график в PDF',
      defaultPath: 'график.pdf',
      filters: [
        { name: 'PDF', extensions: ['pdf'] }
      ]
    });

    if (!pdfPath.canceled && pdfPath.filePath) {
      // Поддерживаем старый формат (только изображение) и новый (изображение + статистика)
      const chartImageData = exportData.chartImage || exportData;
      const statisticsHtml = exportData.statistics || '';
      
      // Загружаем CSS для стилизации статистики
      const stylePath = path.join(__dirname, 'style.css');
      let cssContent = '';
      try {
        cssContent = fs.readFileSync(stylePath, 'utf8');
      } catch (err) {
        console.error('Ошибка чтения CSS:', err);
      }
      
      // Создаем временный HTML с изображением графика и статистикой
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.5;
            }
            .chart-container {
              margin-bottom: 30px;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .statistics-container {
              margin-top: 20px;
            }
            h2 {
              font-size: 18px;
              margin-bottom: 15px;
              margin-top: 20px;
              color: #333;
            }
            h3 {
              color: #007bff;
              margin-top: 20px;
              margin-bottom: 12px;
              font-size: 16px;
            }
            h4 {
              font-size: 14px;
              margin-top: 0;
              margin-bottom: 10px;
            }
            /* Стили для статистики */
            .statistics-section {
              margin-bottom: 25px;
            }
            .statistics-item {
              margin-bottom: 8px;
              display: flex;
            }
            .statistics-label {
              font-weight: bold;
              margin-right: 10px;
              min-width: 200px;
            }
            .statistics-value {
              flex: 1;
            }
            .statistics-summary {
              background-color: #e7f3ff;
              padding: 12px;
              border-radius: 5px;
              margin-bottom: 15px;
              border-left: 4px solid #007bff;
            }
            .statistics-summary p {
              margin: 0;
              line-height: 1.5;
              color: #333;
            }
            .statistics-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              margin-bottom: 15px;
              font-size: 11px;
            }
            .statistics-table th,
            .statistics-table td {
              padding: 8px 10px;
              border: 1px solid #ddd;
              text-align: left;
              vertical-align: top;
            }
            .statistics-table th {
              background-color: #f2f2f2;
              font-weight: bold;
              color: #333;
            }
            .statistics-table td {
              background-color: white;
              color: #333;
            }
            .statistics-table tr:nth-child(even) td {
              background-color: #f9f9f9;
            }
            p {
              margin: 10px 0;
              color: #333;
            }
            /* Убираем CSS переменные для PDF */
            :root {
              --info-bg: #e7f3ff;
              --info-text: #333;
              --warning-bg: #fff3cd;
              --warning-text: #856404;
              --text-color: #333;
              --primary-color: #007bff;
              --notification-border: #ffc107;
            }
            body.dark-theme {
              --info-bg: #e7f3ff;
              --info-text: #333;
              --warning-bg: #fff3cd;
              --warning-text: #856404;
              --text-color: #333;
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <h2 style="text-align: center; margin-bottom: 20px;">График</h2>
            <img src="${chartImageData}" alt="График">
          </div>
          ${statisticsHtml ? `
          <div class="statistics-container">
            <h2 style="text-align: center; margin-bottom: 20px;">Статистика по графикам</h2>
            ${statisticsHtml}
          </div>
          ` : ''}
        </body>
        </html>
      `;

      // Создаем временный файл
      const tempHtmlPath = path.join(app.getPath('temp'), 'chart_export.html');
      fs.writeFileSync(tempHtmlPath, htmlContent);

      // Создаем временное окно для печати
      const printWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1600,
        webPreferences: {
          nodeIntegration: false
        }
      });

      await printWindow.loadFile(tempHtmlPath);
      
      // Ждем полной загрузки контента, включая изображения
      await printWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const images = document.querySelectorAll('img');
          let loaded = 0;
          const total = images.length;
          
          if (total === 0) {
            resolve();
            return;
          }
          
          images.forEach(img => {
            if (img.complete) {
              loaded++;
              if (loaded === total) resolve();
            } else {
              img.onload = () => {
                loaded++;
                if (loaded === total) resolve();
              };
              img.onerror = () => {
                loaded++;
                if (loaded === total) resolve();
              };
            }
          });
          
          // Таймаут на случай, если изображения не загрузятся
          setTimeout(resolve, 3000);
        });
      `);
      
      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0.3,
          bottom: 0.3,
          left: 0.5,
          right: 0.5
        },
        pageSize: 'A4',
        landscape: false,
        preferCSSPageSize: false
      });

      fs.writeFileSync(pdfPath.filePath, pdfData);
      
      // Закрываем временное окно и удаляем временный файл
      printWindow.close();
      fs.unlinkSync(tempHtmlPath);

      console.log('PDF графика успешно сохранен:', pdfPath.filePath);
      event.reply('pdf-export-success', pdfPath.filePath);
    } else {
      console.log('Экспорт графика отменен пользователем');
    }
  } catch (error) {
    console.error('Ошибка экспорта графика в PDF:', error);
    event.reply('pdf-export-error', error.message);
  }
});

//================================================= Остальные функции
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Графики ВОЗ',
        frame: false, // Полностью убираем стандартную рамку
        resizable: false, // Отключаем изменение размера окна
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
            // Отправляем список стран после загрузки
            const loadedCountries = getCountriesList();
            if (loadedCountries && loadedCountries.length > 0) {
                mainWindow.webContents.send('countries-list', loadedCountries);
            }
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
