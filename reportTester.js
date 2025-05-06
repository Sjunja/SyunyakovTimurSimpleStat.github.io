// Утилита для тестирования функциональности отчётов
(function() {
    // Проверяем доступность ReportGenerator после загрузки страницы
    window.addEventListener('load', function() {
        console.log('reportTester.js: Проверка доступности ReportGenerator...');
        setTimeout(testReportGeneratorAvailability, 1000);
        
        // Создаем тестовую кнопку
        addTestButton();
    });
    
    // Функция для проверки доступности ReportGenerator
    function testReportGeneratorAvailability() {
        console.log('ReportGenerator доступен:', !!window.ReportGenerator);
        if (window.ReportGenerator) {
            console.log('- Методы ReportGenerator:', {
                addToReport: typeof window.ReportGenerator.addToReport === 'function',
                clearReport: typeof window.ReportGenerator.clearReport === 'function',
                exportToHtml: typeof window.ReportGenerator.exportToHtml === 'function',
                getReport: typeof window.ReportGenerator.getReport === 'function'
            });
            
            // Проверяем наличие элементов управления отчётом
            checkReportControls();
        } else {
            console.error('ReportGenerator недоступен!');
        }
    }
    
    // Функция для проверки элементов управления отчётом
    function checkReportControls() {
        const elements = {
            addAllFindingsBtn: document.getElementById('add-all-findings-btn'),
            clearReportBtn: document.getElementById('clear-report-btn'),
            generateHtmlBtn: document.getElementById('generate-html-btn'),
            viewReportBtn: document.getElementById('view-report-btn')
        };
        
        console.log('Элементы управления отчётом:', {
            addAllFindingsBtn: !!elements.addAllFindingsBtn,
            clearReportBtn: !!elements.clearReportBtn,
            generateHtmlBtn: !!elements.generateHtmlBtn,
            viewReportBtn: !!elements.viewReportBtn
        });
        
        // Добавляем прямые обработчики на кнопки
        if (elements.addAllFindingsBtn) {
            console.log('Добавляем прямой обработчик для кнопки "Добавить все находки"');
            elements.addAllFindingsBtn.onclick = handleAddAllFindings;
        }
        
        if (elements.clearReportBtn) {
            console.log('Добавляем прямой обработчик для кнопки "Очистить отчет"');
            elements.clearReportBtn.onclick = handleClearReport;
        }
        
        if (elements.generateHtmlBtn) {
            console.log('Добавляем прямой обработчик для кнопки "Сгенерировать отчет (HTML)"');
            elements.generateHtmlBtn.onclick = handleGenerateHtml;
        }
        
        if (elements.viewReportBtn) {
            console.log('Добавляем прямой обработчик для кнопки "Просмотреть отчет"');
            elements.viewReportBtn.onclick = handleViewReport;
        }
    }
    
    // Функция добавления тестовой кнопки
    function addTestButton() {
        try {
            const button = document.createElement('button');
            button.textContent = 'Проверить отчет';
            button.style.position = 'fixed';
            button.style.bottom = '10px';
            button.style.right = '10px';
            button.style.backgroundColor = '#ff5722';
            button.style.color = '#fff';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.padding = '8px 16px';
            button.style.zIndex = '9999';
            button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            button.onclick = testReportFunctionality;
            
            document.body.appendChild(button);
            console.log('Тестовая кнопка добавлена');
        } catch (error) {
            console.error('Ошибка при добавлении тестовой кнопки:', error);
        }
    }
    
    // Обработчики для кнопок отчета
    function handleAddAllFindings() {
        console.log('Запуск handleAddAllFindings...');
        if (!window.ReportGenerator) {
             console.error('ReportGenerator недоступен для добавления всех находок');
             alert('Функция отчета недоступна');
             return;
        }
        // Очищаем отчет перед добавлением
        if (confirm(t('reportClearConfirm'))) {
            window.ReportGenerator.clearReport();
            console.log('Отчет очищен перед добавлением всех находок.');
        }

        // 1. Методологическая справка
        addMethodologicalNotes();
        
        // 2. Основная таблица (без первого столбца)
        const mainTableAdded = addMainAnalysisTableToReport();
        
        // 3. Графики
        const figuresCount = addAllFiguresToReport();
        
        // 4. Текстовые трактовки
        let interpretationsAddedCount = 0;
        if (window.results && Array.isArray(window.results)) {
             let findingNumber = 1;
             window.results.forEach(result => {
                if (result.error) return;
                 const findingsText = generateDetailedFindings(result);
                 if (findingsText && findingsText !== t('findingsNotAvailable')) {
                     const findingTitle = t('findingTitleFormat') || `Находка %num%. Трактовка для переменной "%var%"`;
                     const title = findingTitle
                         .replace('%num%', findingNumber)
                         .replace('%var%', result.variable);
                     
                     window.ReportGenerator.addToReport({
                         type: 'text',
                         title: title,
                         content: findingsText,
                         metadata: { 
                             variable: result.variable, 
                             section: 'interpretation',
                             findingNumber: findingNumber
                         }
                     });
                     interpretationsAddedCount++;
                     findingNumber++;
                 }
            });
            console.log(`Добавлено ${interpretationsAddedCount} текстовых трактовок.`);
        } else {
            console.warn('window.results не найдены для добавления трактовок.');
        }

        alert('Формирование отчета завершено.\n' + 
              'Методы: добавлены\n' + 
              `Основная таблица: ${mainTableAdded ? 'добавлена' : 'не добавлена/ошибка'}\n` + 
              `Графики: найдено ${figuresCount}, обработка в фоновом режиме\n` + 
              `Трактовки: ${interpretationsAddedCount}`);
    }
    
    function handleClearReport() {
        console.log('Нажата кнопка "Очистить отчет"');
        if (window.ReportGenerator) {
            if (confirm('Действительно очистить отчет? Это действие нельзя отменить.')) {
                window.ReportGenerator.clearReport();
                alert('Отчет успешно очищен');
            }
        } else {
            console.error('ReportGenerator недоступен');
            alert('Функция очистки отчета недоступна');
        }
    }
    
    function handleGenerateHtml() {
        console.log('Нажата кнопка "Сгенерировать отчет (HTML)"');
        if (!window.ReportGenerator) {
            console.error('ReportGenerator недоступен');
            alert('Функция генерации отчета недоступна');
            return;
        }
        
        // Проверяем, пуст ли отчет и нужно ли добавлять данные
        const reportItems = window.ReportGenerator.getReport();
        
        // Если отчет пуст, предлагаем пользователю автоматически добавить данные
        if (reportItems.length === 0) {
            if (confirm(t('autoAddReportData') || 'Отчет пуст. Автоматически добавить данные в отчет перед экспортом?')) {
                // Запускаем функцию добавления всех находок
                handleAddAllFindings();
                // После handleAddAllFindings вызываем exportToHtml снова
                setTimeout(() => {
                    if (window.ReportGenerator.getReport().length > 0) {
                        window.ReportGenerator.exportToHtml();
                    }
                }, 1000);
                return;
            } else {
                alert(t('reportEmpty') || 'Отчет пуст! Пожалуйста, добавьте данные в отчет перед экспортом.');
                return;
            }
        }
        
        // Проверяем, содержит ли отчет методологическую справку
        const hasMethods = reportItems.some(item => item.type === 'text' && item.metadata && item.metadata.section === 'methodology');
        
        // Если методологической справки нет, спрашиваем, добавить ли ее
        if (!hasMethods) {
            if (confirm(t('addMethodologyQuestion') || 'Добавить методологическую справку в отчет перед экспортом?')) {
                addMethodologicalNotes();
            }
        }
        
        // Проверяем наличие трактовок
        const hasInterpretations = reportItems.some(item => item.type === 'text' && item.metadata && item.metadata.section === 'interpretation');
        
        // Если трактовок нет, и есть результаты анализа, предлагаем добавить их
        if (!hasInterpretations && window.results && Array.isArray(window.results)) {
            if (confirm(t('addInterpretationsQuestion') || 'Добавить трактовки результатов в отчет перед экспортом?')) {
                let findingNumber = 1;
                let addedCount = 0;
                
                window.results.forEach(result => {
                    if (result.error) return;
                    const findingsText = generateDetailedFindings(result);
                    if (findingsText && findingsText !== t('findingsNotAvailable')) {
                        const findingTitle = t('findingTitleFormat') || `Находка %num%. Трактовка для переменной "%var%"`;
                        const title = findingTitle
                            .replace('%num%', findingNumber)
                            .replace('%var%', result.variable);
                        
                        window.ReportGenerator.addToReport({
                            type: 'text',
                            title: title,
                            content: findingsText,
                            metadata: { 
                                variable: result.variable, 
                                section: 'interpretation',
                                findingNumber: findingNumber
                            }
                        });
                        addedCount++;
                        findingNumber++;
                    }
                });
                
                if (addedCount > 0) {
                    console.log(`Добавлено ${addedCount} текстовых трактовок перед экспортом.`);
                }
            }
        }
        
        // Экспортируем отчет
        window.ReportGenerator.exportToHtml();
        console.log('Отчет экспортирован в HTML формат');
    }
    
    function handleViewReport() {
        console.log('Нажата кнопка "Просмотреть отчет"');
        if (!window.ReportGenerator) {
            console.error('ReportGenerator недоступен');
            alert('Функция просмотра отчета недоступна');
            return;
        }
        
        const reportItems = window.ReportGenerator.getReport(); // Получаем все элементы отчета
        
        if (reportItems.length === 0) {
            alert('Отчет пуст! Пожалуйста, добавьте данные в отчет перед просмотром.');
            return;
        }

        // Создаем или получаем боковую панель для отчета
        let sidePanel = document.getElementById('report-side-panel');
        if (!sidePanel) {
            // Создаем новую боковую панель, если она еще не существует
            sidePanel = document.createElement('div');
            sidePanel.id = 'report-side-panel';
            sidePanel.style.position = 'fixed';
            sidePanel.style.top = '0';
            sidePanel.style.right = '0';
            sidePanel.style.width = '40%';
            sidePanel.style.height = '100%';
            sidePanel.style.backgroundColor = '#fff';
            sidePanel.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.2)';
            sidePanel.style.zIndex = '1000';
            sidePanel.style.overflowY = 'auto';
            sidePanel.style.padding = '20px';
            sidePanel.style.boxSizing = 'border-box';
            sidePanel.style.display = 'flex';
            sidePanel.style.flexDirection = 'column';
            
            // Добавляем заголовок и кнопку закрытия
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '15px';
            header.style.borderBottom = '1px solid #ddd';
            header.style.paddingBottom = '10px';
            
            const title = document.createElement('h2');
            title.textContent = t('reportViewerTitle') || 'Предпросмотр отчета';
            title.style.margin = '0';
            
            const closeButton = document.createElement('button');
            closeButton.textContent = '✕';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.padding = '5px 10px';
            closeButton.onclick = function() {
                document.body.removeChild(sidePanel);
            };
            
            header.appendChild(title);
            header.appendChild(closeButton);
            sidePanel.appendChild(header);
            
            // Добавляем кнопки управления отчетом
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '10px';
            buttonsContainer.style.marginBottom = '15px';
            
            // Кнопка экспорта в HTML
            const exportButton = document.createElement('button');
            exportButton.textContent = t('exportToHtml') || 'Экспорт в HTML';
            exportButton.style.padding = '8px 15px';
            exportButton.style.backgroundColor = '#4CAF50';
            exportButton.style.color = 'white';
            exportButton.style.border = 'none';
            exportButton.style.borderRadius = '4px';
            exportButton.style.cursor = 'pointer';
            exportButton.onclick = function() {
                window.ReportGenerator.exportToHtml();
            };
            
            // Кнопка очистки отчета
            const clearButton = document.createElement('button');
            clearButton.textContent = t('clearReport') || 'Очистить отчет';
            clearButton.style.padding = '8px 15px';
            clearButton.style.backgroundColor = '#f44336';
            clearButton.style.color = 'white';
            clearButton.style.border = 'none';
            clearButton.style.borderRadius = '4px';
            clearButton.style.cursor = 'pointer';
            clearButton.onclick = function() {
                if (confirm(t('reportClearConfirm') || 'Действительно очистить отчет? Это действие нельзя отменить.')) {
                    window.ReportGenerator.clearReport();
                    document.body.removeChild(sidePanel);
                    alert(t('reportCleared') || 'Отчет успешно очищен');
                }
            };
            
            buttonsContainer.appendChild(exportButton);
            buttonsContainer.appendChild(clearButton);
            sidePanel.appendChild(buttonsContainer);
            
            // Контейнер для содержимого отчета
            const contentContainer = document.createElement('div');
            contentContainer.id = 'report-content-container';
            contentContainer.style.flex = '1';
            contentContainer.style.overflowY = 'auto';
            contentContainer.style.border = '1px solid #ddd';
            contentContainer.style.borderRadius = '4px';
            contentContainer.style.padding = '15px';
            contentContainer.style.backgroundColor = '#f9f9f9';
            sidePanel.appendChild(contentContainer);
            
            document.body.appendChild(sidePanel);
        } else {
            // Если панель уже существует, просто обновляем содержимое
            sidePanel.style.display = 'flex';
            const contentContainer = document.getElementById('report-content-container');
            if (contentContainer) {
                contentContainer.innerHTML = '';
            }
        }
        
        // Получаем контейнер для содержимого
        const contentContainer = document.getElementById('report-content-container');
        
        // Генерируем и отображаем HTML-содержимое отчета
        try {
            // --- Генерируем HTML для всего отчета --- 
            const methodsSectionText = window.ReportGenerator.generateMethodsSectionText();
            
            // Добавляем заголовок отчета
            const reportTitle = document.createElement('h1');
            reportTitle.textContent = t('reportMainHeader') || "Отчет статистического анализа";
            reportTitle.style.fontSize = '1.5em';
            reportTitle.style.borderBottom = '2px solid #eee';
            reportTitle.style.paddingBottom = '0.3em';
            contentContainer.appendChild(reportTitle);
            
            // Добавляем методологическую секцию
            const methodsSection = document.createElement('div');
            methodsSection.className = 'methods-section';
            methodsSection.style.backgroundColor = '#f0f0f0';
            methodsSection.style.border = '1px solid #ccc';
            methodsSection.style.padding = '15px';
            methodsSection.style.marginBottom = '2em';
            methodsSection.style.borderRadius = '5px';
            methodsSection.style.fontSize = '0.9em';
            
            const methodsTitle = document.createElement('h2');
            methodsTitle.textContent = t('reportMethodsTitle') || "Методы статистического анализа";
            methodsTitle.style.fontSize = '1.3em';
            methodsTitle.style.marginTop = '0';
            
            const methodsContent = document.createElement('div');
            methodsContent.style.whiteSpace = 'pre-wrap';
            methodsContent.textContent = methodsSectionText;
            
            methodsSection.appendChild(methodsTitle);
            methodsSection.appendChild(methodsContent);
            contentContainer.appendChild(methodsSection);
            
            // Добавляем все элементы отчета
            reportItems.forEach(item => {
                const reportItem = document.createElement('div');
                reportItem.className = 'report-item';
                reportItem.style.marginBottom = '2em';
                
                if (item.type === 'table') {
                    // Создаем заголовок для таблицы
                    const tableTitle = document.createElement('h2');
                    tableTitle.textContent = item.title || 'Таблица';
                    tableTitle.style.fontSize = '1.3em';
                    reportItem.appendChild(tableTitle);
                    
                    // Создаем таблицу
                    const table = document.createElement('table');
                    table.style.width = '100%';
                    table.style.borderCollapse = 'collapse';
                    table.style.marginBottom = '0.5em';
                    table.style.fontSize = '0.9em';
                    
                    // Создаем заголовок таблицы
                    if (item.headers && item.headers.length) {
                        const thead = document.createElement('thead');
                        const headerRow = document.createElement('tr');
                        
                        item.headers.forEach(header => {
                            const th = document.createElement('th');
                            th.style.border = '1px solid #ddd';
                            th.style.padding = '6px';
                            th.style.textAlign = 'left';
                            th.style.backgroundColor = '#f2f2f2';
                            th.style.fontWeight = 'bold';
                            th.textContent = header;
                            headerRow.appendChild(th);
                        });
                        
                        thead.appendChild(headerRow);
                        table.appendChild(thead);
                    }
                    
                    // Создаем тело таблицы
                    if (item.rows && item.rows.length) {
                        const tbody = document.createElement('tbody');
                        
                        item.rows.forEach((row, rowIndex) => {
                            const tr = document.createElement('tr');
                            if (rowIndex % 2 === 1) {
                                tr.style.backgroundColor = '#f9f9f9';
                            }
                            
                            row.forEach(cell => {
                                const td = document.createElement('td');
                                td.style.border = '1px solid #ddd';
                                td.style.padding = '6px';
                                td.style.textAlign = 'left';
                                
                                // Проверяем, является ли ячейка объектом
                                if (typeof cell === 'object' && cell !== null && cell.content !== undefined) {
                                    td.textContent = cell.content;
                                    
                                    // Если указан rowspan, применяем его
                                    if (cell.rowspan > 1) {
                                        td.rowSpan = cell.rowspan;
                                    }
                                    
                                    // Если указан className, применяем его
                                    if (cell.className) {
                                        td.className = cell.className;
                                    }
                                } else {
                                    td.textContent = cell;
                                }
                                
                                tr.appendChild(td);
                            });
                            
                            tbody.appendChild(tr);
                        });
                        
                        table.appendChild(tbody);
                    }
                    
                    reportItem.appendChild(table);
                    
                    // Добавляем примечания, если они есть
                    if (item.notes) {
                        const notesContainer = document.createElement('div');
                        notesContainer.style.fontSize = '0.9em';
                        notesContainer.style.color = '#666';
                        notesContainer.style.marginTop = '10px';
                        
                        const notesLabel = document.createElement('strong');
                        notesLabel.textContent = t('reportNotesLabel') || 'Примечания:';
                        
                        const notesText = document.createElement('div');
                        notesText.style.whiteSpace = 'pre-wrap';
                        notesText.textContent = item.notes;
                        
                        notesContainer.appendChild(notesLabel);
                        notesContainer.appendChild(notesText);
                        reportItem.appendChild(notesContainer);
                    }
                } 
                else if (item.type === 'figure') {
                    // Создаем заголовок для рисунка
                    const figureTitle = document.createElement('h2');
                    figureTitle.textContent = item.caption || 'График';
                    figureTitle.style.fontSize = '1.3em';
                    reportItem.appendChild(figureTitle);
                    
                    // Создаем изображение
                    const img = document.createElement('img');
                    img.src = item.figureDataUrl;
                    img.alt = item.caption || 'График';
                    img.style.maxWidth = '100%';
                    img.style.border = '1px solid #ccc';
                    reportItem.appendChild(img);
                } 
                else if (item.type === 'text') {
                    // Создаем заголовок для текста
                    const textTitle = document.createElement('h3');
                    textTitle.textContent = item.title || t('reportFindingsHeader') || "Находка";
                    textTitle.style.fontSize = '1.2em';
                    reportItem.appendChild(textTitle);
                    
                    // Создаем блок с текстом
                    const textBlock = document.createElement('div');
                    textBlock.style.whiteSpace = 'pre-wrap';
                    textBlock.style.backgroundColor = '#f9f9f9';
                    textBlock.style.border = '1px solid #eee';
                    textBlock.style.padding = '10px';
                    textBlock.style.borderRadius = '4px';
                    textBlock.textContent = item.content;
                    reportItem.appendChild(textBlock);
                }
                
                contentContainer.appendChild(reportItem);
            });
            
            console.log('Отчет отображен в боковой панели');
        } catch (error) {
            console.error('Ошибка при отображении отчета:', error);
            alert('Произошла ошибка при отображении отчета: ' + error.message);
        }
    }
    
    // Функция тестирования отчета
    function testReportFunctionality() {
        console.log('Запущена функция тестирования отчета');
        if (!window.ReportGenerator) {
            alert('ReportGenerator недоступен!');
            return;
        }
        
        // Добавляем тестовую находку
        window.ReportGenerator.addToReport({
            type: 'text',
            content: 'Тестовая находка - ' + new Date().toLocaleString()
        });
        
        // Получаем содержимое отчета
        const report = window.ReportGenerator.getReport();
        console.log('Содержимое отчета:', report);
        
        // Показываем информацию о содержимом отчета
        alert('В отчете сейчас ' + report.length + ' элементов');
        
        // Предлагаем просмотреть отчет
        if (report.length > 0 && confirm('Показать отчет во встроенном просмотрщике?')) {
            handleViewReport();
        }
    }
    
    // Утилита для экранирования HTML
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ---- Новая функция для добавления таблицы по DOM-элементу ----
    function addTableToReportFromDOMElement(tableElement, titleKey, notes) {
        try {
            if (!tableElement) {
                console.warn(`Таблица для "${titleKey}" не передана.`);
                return false;
            }
            // Возвращаем логику извлечения headers и rows внутрь функции
            const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.innerText.trim());
            const rows = Array.from(tableElement.querySelectorAll('tbody tr')).map(tr => {
                return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
            });

            if (headers.length === 0 || rows.length === 0) {
                 console.warn(`Переданная таблица "${titleKey}" пуста или не содержит данных.`);
                 return false;
            }

            const tableObject = {
                type: 'table',
                title: t(titleKey) || titleKey,
                headers: headers, // Используем извлеченные headers
                rows: rows,       // Используем извлеченные rows
                notes: notes || ''
            };

            if (window.ReportGenerator) {
                window.ReportGenerator.addToReport(tableObject);
                console.log(`Таблица "${titleKey}" добавлена в отчет из DOM-элемента`);
                return true;
            } else {
                 console.error('ReportGenerator недоступен при добавлении таблицы из DOM-элемента');
                 return false;
            }
        } catch (e) {
            console.error(`Ошибка при добавлении таблицы "${titleKey}" из DOM-элемента:`, e);
            return false;
        }
    }

    function addMainAnalysisTableToReport() {
        const tableElement = document.getElementById('main-analysis-table');
        if (!tableElement) {
            console.warn('Основная таблица анализа не найдена по ID: main-analysis-table');
            return false;
        }

        try {
            const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.innerText.trim());
            const rows = Array.from(tableElement.querySelectorAll('tbody tr')).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
            );

            // Оставляем первый столбец (по просьбе пользователя)
            if (headers.length === 0 || rows.length === 0) {
                console.warn('Основная таблица анализа пуста или не содержит данных.');
                return false;
            }

            const reportTable = {
                type: 'table',
                title: t('mainResultsTable') || 'Таблица 1. Результаты статистического анализа',
                headers: headers,
                rows: rows,
                notes: t('notes') || '', // Добавляем общие примечания
                metadata: { source: 'main-analysis', tableNumber: 1 }
            };

            if (window.ReportGenerator) {
                 window.ReportGenerator.addToReport(reportTable);
                 console.log('Основная таблица добавлена в отчет (с сохранением всех столбцов)');
                 return true;
            } else {
                 console.error('ReportGenerator недоступен при добавлении основной таблицы');
                 return false;
            }
        } catch (e) {
             console.error('Ошибка при обработке основной таблицы:', e);
             return false;
        }
    }

    function addNormalityTableToReport() {
        // Ищем таблицу после заголовка 'Тест нормальности по группам'
         const normalityHeader = Array.from(document.querySelectorAll('h3')).find(h3 => h3.textContent === t('groupNormalityTable'));
        if (!normalityHeader || !normalityHeader.nextElementSibling) {
            console.warn('Заголовок или таблица нормальности не найдены');
            return false; // Возвращаем false при неудаче
        }
        const tableContainer = normalityHeader.nextElementSibling;
        const tableElement = tableContainer.querySelector('table');
         if (!tableElement) {
             console.warn('Таблица нормальности не найдена внутри контейнера');
             return false; // Возвращаем false при неудаче
        }
        // Вызываем новую функцию с DOM-элементом
        return addTableToReportFromDOMElement(tableElement, 'groupNormalityTable', t('notesNormality') || 'Примечания к тесту нормальности');
    }

    // ---- Конец новых функций ----

    // ---- Функция для добавления методологической справки ----
    function addMethodologicalNotes() {
        if (!window.ReportGenerator || !window.t) {
            console.error('ReportGenerator или t() недоступны для добавления справки');
            return;
        }
        
        // Собираем информацию о методах из данных
        let methodsInfo = {
            descriptive: new Set(['mean_sd', 'median_q', 'n_percent']), // Всегда включаем все методы описательной статистики
            normality: new Set(['Shapiro-Wilk', 'Kolmogorov-Smirnov']), // Включаем оба теста нормальности
            inferential: new Set(), // Заполним из данных
            pairwise: new Set(),    // Заполним из данных
            effectSize: new Set(['Cohen\'s d', 'rank-biserial r', 'η²', 'ω²', 'ε²', 'Cramer\'s V']) // Включаем все размеры эффекта
        };
        
        // Если есть результаты, извлекаем из них информацию о тестах
        if (window.results && Array.isArray(window.results)) {
            window.results.forEach(result => {
                if (result.error) return;
                
                // Определяем тип теста для сравнения групп
                if (result.testResult && result.testResult.type) {
                    methodsInfo.inferential.add(result.testResult.type);
                    
                    // Добавляем соответствующие попарные сравнения
                    if (result.testResult.type === 'ANOVA') {
                        methodsInfo.pairwise.add('tukey');
                    } else if (result.testResult.type === 'Kruskal-Wallis test') {
                        methodsInfo.pairwise.add('dunn');
                    }
                    
                    // Добавляем размеры эффекта
                    if (result.testResult.effectSize && result.testResult.effectSize.type) {
                        methodsInfo.effectSize.add(result.testResult.effectSize.type);
                    }
                    if (result.testResult.alternativeEffectSize && result.testResult.alternativeEffectSize.type) {
                        methodsInfo.effectSize.add(result.testResult.alternativeEffectSize.type);
                    }
                }
                
                // Добавляем информацию о тестах нормальности
                if (result.normality && result.normality.test) {
                    methodsInfo.normality.add(result.normality.test);
                }
            });
        }
        
        // Используем generateMethodsSectionText с собранной информацией, если доступна такая функция
        let methodsText;
        if (typeof window.ReportGenerator.generateMethodsSectionText === 'function') {
            // Передаем собранную информацию в функцию, если она принимает параметры
            if (window.ReportGenerator.generateMethodsSectionText.length > 0) {
                methodsText = window.ReportGenerator.generateMethodsSectionText(methodsInfo);
            } else {
                methodsText = window.ReportGenerator.generateMethodsSectionText();
            }
        } else {
            // Формируем базовый текст о методах
            methodsText = t('methodsIntro') || "Статистический анализ данных проводился с использованием следующих методов:";
            methodsText += '\n\n';
            
            // Описательная статистика
            methodsText += "1. " + (t('descriptiveStats') || "Описательная статистика") + ":\n";
            methodsText += "   - " + (t('meanSD') || "Среднее значение и стандартное отклонение") + " для данных с нормальным распределением\n";
            methodsText += "   - " + (t('medianIQR') || "Медиана и межквартильный размах") + " для данных с ненормальным распределением\n";
            methodsText += "   - " + (t('freqPercent') || "Частоты и проценты") + " для категориальных данных\n\n";
            
            // Тесты нормальности
            methodsText += "2. " + (t('normalityTests') || "Тесты нормальности распределения") + ":\n";
            if (methodsInfo.normality.has('Shapiro-Wilk')) {
                methodsText += "   - " + (t('shapiroWilk') || "Тест Шапиро-Уилка") + " для выборок размером ≤50\n";
            }
            if (methodsInfo.normality.has('Kolmogorov-Smirnov')) {
                methodsText += "   - " + (t('kolmogorovSmirnov') || "Тест Колмогорова-Смирнова") + " для выборок размером >50\n";
            }
            methodsText += "\n";
            
            // Тесты для сравнения групп
            methodsText += "3. " + (t('groupComparisonTests') || "Тесты для сравнения групп") + ":\n";
            if (methodsInfo.inferential.has('t-test')) {
                methodsText += "   - " + (t('tTest') || "t-критерий Стьюдента") + " для сравнения двух групп с нормальным распределением\n";
            }
            if (methodsInfo.inferential.has('Mann-Whitney U test')) {
                methodsText += "   - " + (t('mannWhitney') || "U-критерий Манна-Уитни") + " для сравнения двух групп с ненормальным распределением\n";
            }
            if (methodsInfo.inferential.has('ANOVA')) {
                methodsText += "   - " + (t('anova') || "Однофакторный дисперсионный анализ (ANOVA)") + " для сравнения трех и более групп с нормальным распределением\n";
            }
            if (methodsInfo.inferential.has('Kruskal-Wallis test')) {
                methodsText += "   - " + (t('kruskalWallis') || "Критерий Краскела-Уоллиса") + " для сравнения трех и более групп с ненормальным распределением\n";
            }
            if (methodsInfo.inferential.has('Chi-square test') || methodsInfo.inferential.has('Chi-square test of independence')) {
                methodsText += "   - " + (t('chiSquare') || "Критерий хи-квадрат") + " для сравнения категориальных переменных\n";
            }
            methodsText += "\n";
            
            // Попарные сравнения
            if (methodsInfo.pairwise.size > 0) {
                methodsText += "4. " + (t('pairwiseComparisons') || "Попарные сравнения") + ":\n";
                if (methodsInfo.pairwise.has('tukey')) {
                    methodsText += "   - " + (t('tukey') || "Метод Тьюки") + " для попарных сравнений после ANOVA\n";
                }
                if (methodsInfo.pairwise.has('dunn')) {
                    methodsText += "   - " + (t('dunn') || "Метод Данна") + " для попарных сравнений после теста Краскела-Уоллиса\n";
                }
                if (methodsInfo.pairwise.has('bonferroni')) {
                    methodsText += "   - " + (t('bonferroni') || "Поправка Бонферрони") + " для множественных сравнений\n";
                }
                methodsText += "\n";
            }
            
            // Размеры эффекта
            methodsText += "5. " + (t('effectSizes') || "Размеры эффекта") + ":\n";
            if (methodsInfo.effectSize.has('Cohen\'s d')) {
                methodsText += "   - " + (t('cohensD') || "d Коэна") + " для t-теста\n";
            }
            if (methodsInfo.effectSize.has('rank-biserial r')) {
                methodsText += "   - " + (t('rankBiserial') || "Рангово-бисериальная корреляция r") + " для U-теста Манна-Уитни\n";
            }
            if (methodsInfo.effectSize.has('η²') || methodsInfo.effectSize.has('eta-squared')) {
                methodsText += "   - " + (t('etaSquared') || "Эта-квадрат (η²)") + " для ANOVA\n";
            }
            if (methodsInfo.effectSize.has('ω²') || methodsInfo.effectSize.has('omega-squared')) {
                methodsText += "   - " + (t('omegaSquared') || "Омега-квадрат (ω²)") + " для ANOVA\n";
            }
            if (methodsInfo.effectSize.has('ε²') || methodsInfo.effectSize.has('epsilon-squared')) {
                methodsText += "   - " + (t('epsilonSquared') || "Эпсилон-квадрат (ε²)") + " для критерия Краскела-Уоллиса\n";
            }
            if (methodsInfo.effectSize.has('Cramer\'s V')) {
                methodsText += "   - " + (t('cramersV') || "V Крамера") + " для критерия хи-квадрат\n";
            }
            
            // Уровень значимости
            methodsText += "\n" + (t('significanceLevel') || "Уровень статистической значимости: α = 0.05");
        }

        const textBlock = {
            type: 'text', 
            title: t('methodsSectionTitle') || "Методология статистического анализа",
            content: methodsText,
            metadata: { section: 'methodology' }
        };
        window.ReportGenerator.addToReport(textBlock);
        console.log('Расширенная методологическая справка добавлена в отчет');
    }

    // Реализация функции добавления графиков с улучшенной нумерацией
    function addAllFiguresToReport() {
        console.log('Запуск addAllFiguresToReport...');
        let figuresAddedCount = 0;
        
        // Пробуем искать графики с разными селекторами
        const selectors = [
            '.graph-container', 
            '.plotly-graph-container', 
            '.js-plotly-plot',
            '.graph-wrapper'
        ];
        
        // Объединяем все селекторы через запятую для поиска
        const combinedSelector = selectors.join(', ');
        const graphElements = document.querySelectorAll(combinedSelector);
        console.log(`Найдено ${graphElements.length} графических элементов.`);
        
        // Номер следующего графика (начинаем с 1)
        let figureNumber = 1;
        
        // Для асинхронной обработки используем Promise.all
        const promises = Array.from(graphElements).map(async (el, index) => {
            try {
                // Пытаемся получить название переменной из data-атрибута или соседних элементов
                let variableName = el.dataset.variable || el.dataset.name;
                
                // Если нет data-атрибута, ищем ближайший заголовок или подпись
                if (!variableName) {
                    // Попытка найти заголовок выше графика
                    const prevHeader = el.closest('.graph-section')?.querySelector('h3, h4, .graph-title');
                    if (prevHeader) {
                        variableName = prevHeader.textContent.trim();
                    }
                }
                
                // Если не нашли ни data-атрибут, ни заголовок, используем порядковый номер
                if (!variableName) {
                    variableName = `Переменная ${index + 1}`;
                }
                
                // Текущий номер графика
                const currentFigNumber = figureNumber++;
                
                console.log(`Обработка графика ${currentFigNumber} для "${variableName}"...`);
                
                // Генерируем PNG для графика
                const pngDataUrl = await window.ReportGenerator.generateFigurePng(el);
                
                if (pngDataUrl) {
                    // Формируем подпись с номером
                    const baseCaption = `Рисунок ${currentFigNumber}. График для переменной ${variableName}`;
                    
                    // Добавляем график в отчет
                    window.ReportGenerator.addToReport({
                        type: 'figure',
                        figureDataUrl: pngDataUrl,
                        baseCaption: baseCaption,
                        metadata: { 
                            variable: variableName, 
                            section: 'figure',
                            figureNumber: currentFigNumber 
                        }
                    });
                    console.log(`График ${currentFigNumber} для "${variableName}" успешно добавлен в отчет.`);
                    return true; // Успешное добавление
                } else {
                    console.warn(`Не удалось сгенерировать PNG для графика "${variableName}".`);
                    return false;
                }
            } catch (error) {
                console.error(`Ошибка при обработке графика ${index}:`, error);
                return false;
            }
        });
        
        // Дожидаемся обработки всех графиков
        Promise.all(promises)
            .then(results => {
                figuresAddedCount = results.filter(Boolean).length;
                console.log(`Всего добавлено ${figuresAddedCount} графиков в отчет.`);
            })
            .catch(error => {
                console.error('Ошибка при обработке графиков:', error);
            });
        
        return graphElements.length; // Возвращаем количество найденных элементов
    }

    // Функция для генерации расширенной трактовки результатов со всеми статистиками
    function generateDetailedFindings(result) {
        if (!result || result.error) {
            return t('findingsNotAvailable') || 'Данные недоступны для анализа';
        }
        
        let findings = "";
        const variable = result.variable || t('unknownVariable');
        
        // 1. Заголовок переменной
        findings += `${t('detailedFindingsHeader') || "ПОДРОБНЫЙ АНАЛИЗ ДАННЫХ"} "${variable}".\n\n`;
        
        // 2. Описательная статистика
        findings += `${t('descriptiveStatsHeader') || "ОПИСАТЕЛЬНАЯ СТАТИСТИКА:"}`;
        
        if (result.type === 'numeric') {
            findings += `\n${t('overallStatsLabel') || "Общая статистика (все наблюдения)"}: `;
            findings += `n = ${result.n}, `;
            
            if (result.displayParametric) {
                findings += `${t('mean')} = ${formatValue(result.mean)}, `;
                findings += `${t('stdDev')} = ${formatValue(result.std)}, `;
                findings += `${t('min')} = ${formatValue(result.min)}, `;
                findings += `${t('max')} = ${formatValue(result.max)}`;
            } else {
                findings += `${t('median')} = ${formatValue(result.median)}, `;
                findings += `${t('q1')} = ${formatValue(result.q1)}, `;
                findings += `${t('q3')} = ${formatValue(result.q3)}, `;
                findings += `${t('min')} = ${formatValue(result.min)}, `;
                findings += `${t('max')} = ${formatValue(result.max)}`;
            }
            
            // Если есть группированные данные, добавляем статистику по группам
            if (result.groupStats && Object.keys(result.groupStats).length > 0) {
                findings += `\n\n${t('groupStatsLabel') || "Статистика по группам:"}`;
                
                Object.entries(result.groupStats).forEach(([group, stats]) => {
                    findings += `\n- ${group}: n = ${stats.n}, `;
                    if (result.displayParametric) {
                        findings += `${t('mean')} = ${formatValue(stats.mean)}, `;
                        findings += `${t('stdDev')} = ${formatValue(stats.std)}, `;
                        findings += `${t('min')} = ${formatValue(stats.min)}, `;
                        findings += `${t('max')} = ${formatValue(stats.max)}`;
                    } else {
                        findings += `${t('median')} = ${formatValue(stats.median)}, `;
                        findings += `${t('q1')} = ${formatValue(stats.q1)}, `;
                        findings += `${t('q3')} = ${formatValue(stats.q3)}, `;
                        findings += `${t('min')} = ${formatValue(stats.min)}, `;
                        findings += `${t('max')} = ${formatValue(stats.max)}`;
                    }
                });
            }
        } 
        else if (result.type === 'categorical') {
            findings += "\n";
            const totalN = result.n;
            
            // Частоты и проценты для категорий
            if (result.frequencies && Object.keys(result.frequencies).length > 0) {
                findings += `${t('frequenciesLabel') || "Частоты и проценты:"}`;
                
                Object.entries(result.frequencies)
                    .sort(([,a], [,b]) => b - a) // Сортировка по частоте (по убыванию)
                    .forEach(([category, freq]) => {
                        const percent = result.percentages && result.percentages[category] 
                            ? result.percentages[category].toFixed(1) 
                            : ((freq / totalN) * 100).toFixed(1);
                        findings += `\n- ${category}: ${freq} (${percent}%)`;
                    });
            }
            
            // Статистика по группам для категориальных данных
            if (result.groupedCounts && Object.keys(result.groupedCounts).length > 0) {
                findings += `\n\n${t('categoricalGroupStatsLabel') || "Распределение по группам:"}`;
                
                // Получим уникальные категории
                const allCategories = new Set();
                Object.values(result.groupedCounts).forEach(groupData => {
                    Object.keys(groupData).forEach(cat => allCategories.add(cat));
                });
                
                // Для каждой группы выводим распределение
                Object.entries(result.groupedCounts).forEach(([group, categoryCounts]) => {
                    const groupTotal = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
                    findings += `\n- ${group} (n = ${groupTotal}):`;
                    
                    // Вывод частот и процентов по категориям для данной группы
                    Object.entries(categoryCounts)
                        .sort(([,a], [,b]) => b - a)
                        .forEach(([category, count]) => {
                            const percent = ((count / groupTotal) * 100).toFixed(1);
                            findings += `\n  ${category}: ${count} (${percent}%)`;
                        });
                });
            }
        }
        
        // 3. Тест на нормальность распределения
        if (result.type === 'numeric' && result.normality) {
            findings += `\n\n${t('normalityTestHeader') || "ТЕСТ НОРМАЛЬНОСТИ РАСПРЕДЕЛЕНИЯ:"}`;
            
            // Общий тест нормальности
            const normality = result.normality;
            findings += `\n${t('overallNormality') || "Для всех данных:"} ${normality.test || "Неизвестный тест"}, `;
            findings += `${t('statistic')} = ${formatValue(normality.statistic)}, `;
            findings += `p ${formatPValue(normality.pValue)}, `;
            findings += `${t('conclusion')}: ${t(normality.conclusion) || normality.conclusion}`;
            
            // Тесты нормальности по группам
            if (result.groupNormality && Object.keys(result.groupNormality).length > 0) {
                findings += `\n${t('groupNormalityLabel') || "По группам:"}`;
                
                Object.entries(result.groupNormality).forEach(([group, normData]) => {
                    findings += `\n- ${group}: ${normData.test || "Неизвестный тест"}, `;
                    findings += `${t('statistic')} = ${formatValue(normData.statistic)}, `;
                    findings += `p ${formatPValue(normData.pValue)}, `;
                    findings += `${t('conclusion')}: ${t(normData.conclusion) || normData.conclusion}`;
                });
                
                // Общий вывод о нормальности по группам
                if (result.groupNormalityStatus) {
                    const groupStatus = result.groupNormalityStatus;
                    findings += `\n${t('groupNormalitySummary') || "Общий вывод о нормальности по группам:"} ${t(groupStatus.conclusion) || groupStatus.conclusion}`;
                    if (groupStatus.minPvalue !== undefined) {
                        findings += ` (${t('minPValue')} p ${formatPValue(groupStatus.minPvalue)})`;
                    }
                }
            }
        }
        
        // 4. Результаты статистического теста
        if (result.testResult) {
            const test = result.testResult;
            
            findings += `\n\n${t('statisticalTestHeader') || "РЕЗУЛЬТАТЫ СТАТИСТИЧЕСКОГО ТЕСТА:"}`;
            findings += `\n${t('testUsed')}: ${test.type || t('unknownTest')}`;
            
            // Статистика теста
            if (test.statistic !== undefined) {
                let statDetails = `\n${t('statisticDetails') || "Статистика теста:"} `;
                
                // Форматируем в зависимости от типа теста
                if (test.type === 'ANOVA') {
                    statDetails += `F(${test.dfb}, ${test.dfw}) = ${formatValue(test.statistic)}`;
                } else if (test.type === 'Kruskal-Wallis test') {
                    statDetails += `H(${test.df}) = ${formatValue(test.statistic)}`;
                } else if (test.type === 't-test') {
                    statDetails += `t(${formatValue(test.df)}) = ${formatValue(test.statistic)}`;
                } else if (test.type === 'Mann-Whitney U test') {
                    statDetails += `U = ${formatValue(test.statistic)}`;
                    if (test.Z !== undefined) statDetails += `, Z = ${formatValue(test.Z)}`;
                } else if (test.type.includes('Chi-square')) {
                    statDetails += `χ²(${test.df}) = ${formatValue(test.statistic)}`;
                } else {
                    statDetails += `${t('value')} = ${formatValue(test.statistic)}`;
                }
                
                findings += statDetails;
            }
            
            // p-значение
            const pValue = test.pValue;
            const isSignificant = pValue < 0.05;
            findings += `\n${t('pValue')}: ${formatPValue(pValue)}`;
            
            // Вывод о значимости
            if (isSignificant) {
                findings += `\n${t('resultSignificant') || "Результат статистически значим"} (p < 0.05).`;
                findings += `\n${t('rejectH0') || "Мы отвергаем нулевую гипотезу"}.`;
                findings += `\n${t('conclusionSignificant')}`;
            } else {
                findings += `\n${t('resultNotSignificant') || "Результат статистически не значим"} (p ≥ 0.05).`;
                findings += `\n${t('acceptH0') || "Мы не отвергаем нулевую гипотезу"}.`;
                findings += `\n${t('conclusionNotSignificant')}`;
            }
            
            // Размер эффекта
            if (test.effectSize) {
                const effectSize = test.effectSize;
                findings += `\n\n${t('effectSizeHeader') || "РАЗМЕР ЭФФЕКТА:"}`;
                findings += `\n${effectSize.type || t('effectSize')}: ${formatValue(effectSize.value)}`;
                if (effectSize.interpretation) {
                    findings += ` (${t(effectSize.interpretation) || effectSize.interpretation})`;
                }
                
                // Альтернативный размер эффекта
                if (test.alternativeEffectSize) {
                    const altES = test.alternativeEffectSize;
                    findings += `\n${t('alternativeEffectSize') || "Альтернативный размер эффекта"}: `;
                    findings += `${altES.type} = ${formatValue(altES.value)}`;
                    if (altES.interpretation) {
                        findings += ` (${t(altES.interpretation) || altES.interpretation})`;
                    }
                }
            }
        }
        
        // 5. Попарные сравнения
        if (result.pairwiseComparisons && result.pairwiseComparisons.length > 0) {
            findings += `\n\n${t('pairwiseComparisonsHeader') || "ПОПАРНЫЕ СРАВНЕНИЯ:"}`;
            
            // Метод и поправка
            if (result.pairwiseMethod) {
                findings += `\n${t('pairwiseMethod') || "Метод:"} ${result.pairwiseMethod}`;
            }
            if (result.pairwiseAdjustment) {
                findings += `\n${t('multipleComparisonAdjustment') || "Поправка на множественные сравнения:"} ${result.pairwiseAdjustment}`;
            }
            
            // Результаты всех попарных сравнений (включая незначимые)
            findings += `\n${t('pairwiseResults') || "Результаты сравнений:"}`;
            
            // Разделяем на значимые и незначимые
            const significantPairs = result.pairwiseComparisons.filter(p => p.pValue < 0.05);
            const nonSignificantPairs = result.pairwiseComparisons.filter(p => p.pValue >= 0.05);
            
            if (significantPairs.length > 0) {
                findings += `\n${t('significantPairsLabel') || "Статистически значимые различия (p < 0.05):"}`;
                significantPairs.forEach(pair => {
                    findings += `\n- ${pair.group1} vs ${pair.group2}: p ${formatPValue(pair.pValue)}`;
                    
                    // Добавляем информацию о разнице в зависимости от типа теста
                    if (pair.meanDiff !== undefined) {
                        findings += `, ${t('meanDifference') || "разница средних"} = ${formatValue(pair.meanDiff)}`;
                    } else if (pair.meanRankDiff !== undefined) {
                        findings += `, ${t('meanRankDifference') || "разница средних рангов"} = ${formatValue(pair.meanRankDiff)}`;
                    }
                    
                    // Размер эффекта для пары, если доступен
                    if (pair.effectSize) {
                        findings += `, ${pair.effectSize.type || t('effectSize')} = ${formatValue(pair.effectSize.value)}`;
                        if (pair.effectSize.interpretation) {
                            findings += ` (${t(pair.effectSize.interpretation) || pair.effectSize.interpretation})`;
                        }
                    }
                });
            }
            
            if (nonSignificantPairs.length > 0) {
                findings += `\n${t('nonSignificantPairsLabel') || "Статистически незначимые различия (p ≥ 0.05):"}`;
                nonSignificantPairs.forEach(pair => {
                    findings += `\n- ${pair.group1} vs ${pair.group2}: p ${formatPValue(pair.pValue)}`;
                });
            }
        }
        
        // 6. Заключение
        findings += `\n\n${t('conclusionHeader') || "ЗАКЛЮЧЕНИЕ:"}`;
        if (result.testResult) {
            const test = result.testResult;
            const isSignificant = test.pValue < 0.05;
            
            if (isSignificant) {
                // Если есть попарные сравнения и они значимы
                if (result.pairwiseComparisons && result.pairwiseComparisons.some(p => p.pValue < 0.05)) {
                    const significantPairs = result.pairwiseComparisons.filter(p => p.pValue < 0.05);
                    findings += `\n${t('significantDifferenceWithPairs') || "Обнаружены статистически значимые различия между группами"}. `;
                    findings += `${t('specificGroups') || "Различия выявлены между следующими группами:"} `;
                    significantPairs.forEach((pair, idx) => {
                        if (idx > 0) findings += "; ";
                        findings += `${pair.group1} и ${pair.group2}`;
                    });
                    findings += ".";
                } else {
                    findings += `\n${t('significantDifference') || "Обнаружены статистически значимые различия между группами"}.`;
                }
                
                // Размер эффекта в заключении
                if (test.effectSize) {
                    const effectSize = test.effectSize;
                    findings += ` ${t('effectSizeConclusion') || "Размер эффекта:"} ${effectSize.type} = ${formatValue(effectSize.value)}`;
                    if (effectSize.interpretation) {
                        findings += ` (${t(effectSize.interpretation) || effectSize.interpretation})`;
                    }
                    findings += ".";
                }
            } else {
                findings += `\n${t('noSignificantDifference') || "Статистически значимых различий между группами не обнаружено"}. `;
                if (test.effectSize) {
                    findings += `${t('lowEffectSize') || "Размер эффекта низкий:"} ${test.effectSize.type} = ${formatValue(test.effectSize.value)}.`;
                }
            }
        } else {
            findings += `\n${t('noTestPerformed') || "Статистический тест не был выполнен или его результаты недоступны."} `;
        }
        
        return findings;
    }
    
    // Вспомогательная функция для форматирования p-значений
    function formatPValue(pValue) {
        if (pValue === undefined || pValue === null) return '?';
        if (pValue < 0.001) return '< 0.001';
        return `= ${pValue.toFixed(3)}`;
    }
    
    // Вспомогательная функция для форматирования числовых значений
    function formatValue(value) {
        if (value === undefined || value === null) return '?';
        if (typeof value === 'number') {
            if (Math.abs(value) < 0.001 && value !== 0 || Math.abs(value) > 9999) {
                return value.toExponential(2);
            } else {
                // Округляем до 3 знаков после запятой для p-value и 2 для остального
                return value.toFixed(2);
            }
        }
        return value.toString();
    }

})(); 