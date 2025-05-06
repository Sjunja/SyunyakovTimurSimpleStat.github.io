"use strict";

// GraphComponent implementation using Plotly.js
window.GraphComponent = function({ variable, data, groupVar }) {
  if (!data) return null;

  const chartRef = React.useRef(null);
  const [chartType, setChartType] = React.useState('auto'); // Default chart type is auto
  const [isAddingToReport, setIsAddingToReport] = React.useState(false); // Состояние для индикации процесса добавления

  // Chart display options with defaults
  const [chartOptions, setChartOptions] = React.useState({
    width: 1300, // Изменено
    height: 500,  // Изменено
    colorScheme: 'Plotly', // Название схемы, Plotly поймет
    fontSize: 20, // Изменен размер шрифта по умолчанию
    showGrid: true,
    showValues: false, // Эта опция будет применена позже, если релевантно
    boxWidth: 0.5,  // Эта опция будет применена позже к Plotly (box gap)
    showSignificance: true, // По умолчанию включено
    showOnlySignificant: true,
    showPValues: false,
    showIndividualPoints: false, // Для отображения отдельных точек
    showOutliers: false, // По умолчанию выключено - не показывать выбросы в боксплотах
    significanceDisplay: 'pvalue', // По умолчанию показываем p-значения вместо звездочек
    bracketOffsetY: 0.1, // Смещение скобок по Y (относительное)
    bracketHeight: 0.05, // Высота скобок (относительная)
    bracketSpacing: 0.05, // Интервал между скобками (относительный)
  });

  // Валидные цветовые схемы для Plotly
  const colorSchemes = [
    'Plotly', 'Plotly10', 'D3', 'G10', 'T10', 'Alphabet', 'Pastel', 'Bold', 'Safe', 'Vivid', 
    'Portland', 'Jet', 'Hot', 'Blackbody', 'Earth', 'Electric', 'YIOrRd', 'YIGnBu', 
    'Bluered', 'RdBu', 'Picnic', 'Rainbow', 'Viridis', 'Plasma', 'Cividis', 'Inferno'
  ];

  // --- Вспомогательные статистические функции (Оставляем) ---

  // Improved function to determine if data is parametric or non-parametric
  const determineIfParametric = (data) => {
    // Если данные - это числовой массив без группировки
    if (Array.isArray(data.values) && data.type === 'numeric' && !data.groupStats) {
        // Если есть среднее и стандартное отклонение, считаем параметрическим
        if (data.hasOwnProperty('mean') && data.hasOwnProperty('std')) {
            return true;
        }
        // Если есть медиана и квартили, но нет среднего/стд.откл., считаем непараметрическим
        if (data.hasOwnProperty('median') && data.hasOwnProperty('q1') && data.hasOwnProperty('q3') &&
            (!data.hasOwnProperty('mean') || !data.hasOwnProperty('std'))) {
            return false;
        }
        // По умолчанию для числовых данных без четких указаний - непараметрический
        return false;
    }

    // Если есть групповая статистика
    if (data.groupStats && typeof data.groupStats === 'object' && Object.keys(data.groupStats).length > 0) {
        const firstGroupName = Object.keys(data.groupStats)[0];
        const firstGroupData = data.groupStats[firstGroupName];

        if (firstGroupData && typeof firstGroupData === 'object') {
            // Если есть среднее и стандартное отклонение в первой группе
            if (firstGroupData.hasOwnProperty('mean') && firstGroupData.hasOwnProperty('std')) {
                return true;
            }
            // Если есть медиана и квартили, но нет среднего/стд.откл. в первой группе
            if (firstGroupData.hasOwnProperty('median') && firstGroupData.hasOwnProperty('q1') && firstGroupData.hasOwnProperty('q3') &&
                (!firstGroupData.hasOwnProperty('mean') || !firstGroupData.hasOwnProperty('std'))) {
                return false;
            }
        }
         // По умолчанию для сгруппированных данных без четких указаний - непараметрический
        return false;
    }

    // Если тип данных категориальный, он непараметрический по определению
    if (data.type === 'categorical') {
      return false;
    }

    // Общий fallback - непараметрический
    return false;
  };


  // Расчет попарных p-значений для групп
  // (Оставляем эту функцию, так как она вызывает внешний модуль pairwiseTests)
  const calculatePairwisePValues = (data, isParametric) => {
     // Используем данные из основного анализа, если доступны
    if (!data || !data.pairwiseComparisons) {
        console.warn("Нет данных попарных сравнений для скобок значимости.");

        // Если есть переменная и группирующая переменная, пробуем вычислить самостоятельно
        if (data && data.variable && data.groupVar && window.pairwiseTests) {
            try {
                // Получаем уникальные группы
                const groupNames = Object.keys(data.groupStats || {});
                if (groupNames.length < 2) return []; // Нужно минимум 2 группы

                // Формируем массивы данных для каждой группы
                const groupValues = groupNames.map(group => {
                    // Убедимся, что groupStats[group] существует и содержит values
                    return (data.groupStats[group] && data.groupStats[group].values) || [];
                });

                // Вызываем функцию из внешнего модуля в зависимости от типа данных
                const pairwiseResults = isParametric
                    ? window.pairwiseTests.computeParametric(data.variable, data.groupVar, groupValues, groupNames)
                    : window.pairwiseTests.computeNonParametric(data.variable, data.groupVar, groupValues, groupNames);

                return pairwiseResults;
            } catch (error) {
                console.error("Ошибка при расчете попарных сравнений:", error);
                return [];
            }
        }

        return [];
    }

    // Просто форматируем существующие p-значения (если они пришли извне)
    // Убедимся, что pValue существует и является числом
    return data.pairwiseComparisons
               .filter(comp => comp && typeof comp.pValue === 'number')
               .map(comp => ({
                    group1: comp.group1,
                    group2: comp.group2,
                    pValue: comp.pValue,
                    statistic: comp.statistic,
                    testType: comp.method // Используем метод как тип теста
                }));
  };


  // --- Функция отрисовки Plotly ---
  const drawChart = () => {
    if (!chartRef.current || !data) return; // Проверка наличия данных

    // Проверка загрузки Plotly
    if (typeof Plotly === 'undefined') {
        console.error("Plotly library is not loaded. Make sure you added the script tag to statix.html.");
        // Отображаем сообщение об ошибке в div графика
        chartRef.current.innerHTML = '<p style="color: red; padding: 10px;">Ошибка: Библиотека Plotly не загружена. Пожалуйста, добавьте её в statix.html.</p>';
        return;
    }

    // Очищаем предыдущий график
    try {
        Plotly.purge(chartRef.current);
    } catch (e) {
        console.warn("Could not purge Plotly div:", e);
        chartRef.current.innerHTML = ''; // Просто очищаем div, если purge не сработал
    }


    let dataTraces = [];
    let layout = {};
    // Настройки конфигурации Plotly (можно добавить больше опций при необходимости)
    const config = {
        responsive: true, // Автоматическое изменение размера
        displaylogo: false, // Не показывать лого Plotly
        modeBarButtonsToRemove: ['sendDataToCloud', 'select2d', 'lasso2d'] // Убрать ненужные кнопки
    };

    // Определяем тип графика (улучшенная логика для auto)
    let finalChartType = chartType;
    if (finalChartType === 'auto') {
      if (data.type === 'numeric') {
        // Проверяем, параметрический ли тип данных (используя свойство displayParametric)
        const isParametric = data.hasOwnProperty('displayParametric') ? data.displayParametric : determineIfParametric(data);
        
        if (isParametric) {
          // Для параметрических данных используем bar (столбцы со стандартными отклонениями)
          finalChartType = 'bar';
        } else {
          // Для непараметрических данных используем boxplot
          finalChartType = 'boxplot';
        }
        
        // Проверяем наличие данных для выбранного типа графика
        if (finalChartType === 'boxplot') {
          // Для боксплота нужны сырые данные (values)
          let hasRawData = false;
          
          if (data.groupStats) {
            // Если есть группировка, проверяем наличие values в первой группе
            const firstGroup = Object.values(data.groupStats)[0] || {};
            hasRawData = Array.isArray(firstGroup.values) && firstGroup.values.length > 0;
          } else {
            // Без группировки проверяем наличие общих values
            hasRawData = Array.isArray(data.values) && data.values.length > 0;
          }
          
          // Если нет сырых данных для боксплота, вернемся к bar
          if (!hasRawData) {
            finalChartType = 'bar';
            console.log("[Debug Plotly] Auto selected boxplot, but no raw data available. Falling back to bar chart.");
          }
        } else if (finalChartType === 'bar') {
          // Для bar нужны среднее и стандартное отклонение
          let hasMeanSd = false;
          
          if (data.groupStats) {
            // Если есть группировка, проверяем наличие mean/std в первой группе
            const firstGroup = Object.values(data.groupStats)[0] || {};
            hasMeanSd = typeof firstGroup.mean === 'number' && typeof firstGroup.std === 'number';
          } else {
            // Без группировки проверяем наличие общих mean/std
            hasMeanSd = typeof data.mean === 'number' && typeof data.std === 'number';
          }
          
          // Если нет mean/std для bar, попробуем использовать point
          if (!hasMeanSd) {
            finalChartType = 'point';
            console.log("[Debug Plotly] Auto selected bar, but no mean/std available. Falling back to point chart.");
          }
        }
      } else if (data.type === 'categorical') {
        finalChartType = 'bar'; // Для категориальных - столбцы
      } else {
          finalChartType = 'bar'; // Общий fallback
      }
      console.log(`[Debug Plotly] Auto chart type selected: ${finalChartType}`);
    }


    // --- Базовая настройка Layout ---
    layout = {
        title: { text: variable, font: { size: chartOptions.fontSize + 2 } },
        width: chartOptions.width,
        height: chartOptions.height,
        font: { size: chartOptions.fontSize },
        xaxis: {
            title: { text: groupVar || (data.type === 'numeric' ? variable : 'Категория'), font: { size: chartOptions.fontSize + 1 } },
            gridcolor: chartOptions.showGrid ? '#eee' : 'rgba(0,0,0,0)',
            zeroline: false,
            showline: true, // Показываем линию оси
            tickfont: { size: chartOptions.fontSize }
        },
        yaxis: {
            title: { text: data.type === 'numeric' ? variable : 'Количество', font: { size: chartOptions.fontSize + 1 } },
            gridcolor: chartOptions.showGrid ? '#eee' : 'rgba(0,0,0,0)',
            zeroline: false,
            showline: true, // Показываем линию оси
            tickfont: { size: chartOptions.fontSize }
        },
        legend: { font: { size: chartOptions.fontSize } },
        showlegend: !!groupVar && data.type !== 'categorical', // Легенда для группированных числовых
        margin: { l: 50, r: 20, t: 50, b: 50 }, // Поля графика
        // Настройки для группировки боксплотов/виолинов
        boxmode: 'group',
        violinmode: 'group',
        // Цветовая схема будет применена ниже
    };


    // --- Создание Traces ---
    try { // Оборачиваем создание следов в try-catch
        // --- ОТЛАДКА ДАННЫХ --- 
        console.log(`[Debug Plotly] Data for variable '${variable}':`, data);
        if(data.groupStats) {
            console.log(`[Debug Plotly] GroupStats for '${variable}':`, JSON.parse(JSON.stringify(data.groupStats))); // Клонируем для чистого вывода
        }
        // --- КОНЕЦ ОТЛАДКИ --- 
        
        if (data.type === 'numeric') {
            switch(finalChartType) {
                // --- Оставляем только параметрические типы --- 
                case 'bar': // Столбцы с погрешностями (параметрический)
                case 'errorbar': // Планки погрешностей (параметрический)
                case 'point': // Точки с погрешностями (параметрический)
                    if (data.groupStats) {
                        // Добавляем лог перед циклом
                        console.log(`[Debug Plotly] Before loop, dataTraces length: ${dataTraces.length}`);
                        Object.entries(data.groupStats).forEach(([group, groupData]) => {
                             // Восстанавливаем проверку на существование mean и std в groupData
                             
                             // Используем mean и std напрямую из groupData, если они есть и корректны
                             if (groupData && typeof groupData.mean === 'number' && isFinite(groupData.mean) && typeof groupData.std === 'number' && isFinite(groupData.std)) {
                                // Лог перед push
                                console.log(`[Debug Plotly] Pushing trace for group '${group}'`);
                                dataTraces.push({
                                    x: [group], // Ось X категориальная
                                    y: [groupData.mean], // Используем существующее среднее
                                    error_y: {
                                        type: 'data', // тип погрешности
                                        array: [groupData.std], // Используем существующее ст.откл.
                                        visible: true
                                    },
                                    // В зависимости от типа графика - разный mark
                                    type: finalChartType === 'bar' ? 'bar' : 'scatter',
                                    mode: finalChartType === 'bar' ? undefined : 'markers', // Точки для errorbar/point
                                    name: group
                                });
                                // Лог после push
                                console.log(`[Debug Plotly] After push, dataTraces length: ${dataTraces.length}`);
                             } else {
                                 console.warn(`[Debug Plotly] Skipping group '${group}' for '${variable}' due to missing or invalid mean/std.`);
                             }
                        });
                        // Добавляем лог после цикла
                        console.log(`[Debug Plotly] After loop, dataTraces length: ${dataTraces.length}`);
                     } else if (typeof data.mean === 'number' && isFinite(data.mean) && typeof data.std === 'number' && isFinite(data.std)) {
                         // Для одного массива данных без группировки - проверяем data.mean и data.std
                         // Удаляем попытку вычисления из values
                         /*
                         let currentMean = window.statUtils.mean(data.values);
                         let currentStd = window.statUtils.std(data.values);
                         */
                         dataTraces.push({
                            x: [variable],
                            y: [data.mean],
                            error_y: {
                                type: 'data',
                                array: [data.std],
                                visible: true
                            },
                            type: finalChartType === 'bar' ? 'bar' : 'scatter',
                            mode: finalChartType === 'bar' ? undefined : 'markers',
                            name: variable
                         });
                     } else {
                           // Если нет groupStats и нет глобальных mean/std
                           console.warn(`[Debug Plotly] Skipping single data array for '${variable}' due to missing or invalid mean/std.`);
                           console.log(`[Debug Plotly]   Data for '${variable}':`, data);
                     }
                     layout.xaxis.type = 'category'; // Убедимся, что ось X категориальная
                     break;

                // --- Временно комментируем непараметрические и другие типы --- 
                // /* Убираем комментирование
                case 'boxplot':
                case 'boxplot-labeled': // Пока выглядит так же, как обычный
                    if (data.groupStats) {
                        Object.entries(data.groupStats).forEach(([group, groupData]) => {
                            if (groupData && Array.isArray(groupData.values)) { // Проверка наличия данных values!
                                dataTraces.push({
                                    y: groupData.values,
                                    type: 'box',
                                    name: group,
                                    boxpoints: chartOptions.showOutliers ? (chartOptions.showIndividualPoints ? 'all' : 'outliers') : false, // Учитываем обе опции
                                    jitter: chartOptions.showIndividualPoints ? 0.3 : 0.0, // Добавляем разброс точек
                                    pointpos: -1.8, // Смещаем точки в сторону от центра бокса
                                    boxmean: false // Не показывать среднее на боксплоте по умолчанию
                                });
                            } else {
                                console.warn(`[Debug Plotly Boxplot] Skipping group '${group}' for '${variable}' because groupData.values is missing or not an array.`);
                            }
                        });
                    } else if (Array.isArray(data.values)) { // Случай без группировки
                        dataTraces.push({
                            y: data.values,
                            type: 'box',
                            name: variable,
                            boxpoints: chartOptions.showOutliers ? (chartOptions.showIndividualPoints ? 'all' : 'outliers') : false,
                            jitter: chartOptions.showIndividualPoints ? 0.3 : 0.0,
                            pointpos: -1.8,
                            boxmean: false
                        });
                    } else {
                        console.warn(`[Debug Plotly Boxplot] Cannot draw boxplot for '${variable}' - no groupStats or data.values found.`);
                    }
                    break;
                case 'violin':
                     if (data.groupStats) {
                        Object.entries(data.groupStats).forEach(([group, groupData]) => {
                             if (groupData && Array.isArray(groupData.values)) { // Проверка наличия данных values!
                                dataTraces.push({
                                    y: groupData.values,
                                    type: 'violin',
                                    name: group,
                                    points: chartOptions.showOutliers ? (chartOptions.showIndividualPoints ? 'all' : 'outliers') : false, // Используем настройки из chartOptions
                                    jitter: chartOptions.showIndividualPoints ? 0.3 : 0.0,
                                    pointpos: 0, // По центру для violin
                                    box: { visible: true, width: 0.1 }, // Показывать боксплот внутри
                                    meanline: { visible: true } // Показывать линию среднего
                                });
                             } else {
                                console.warn(`[Debug Plotly Violin] Skipping group '${group}' for '${variable}' because groupData.values is missing or not an array.`);
                             }
                        });
                    } else if (Array.isArray(data.values)) { // Случай без группировки
                        dataTraces.push({
                            y: data.values,
                            type: 'violin',
                            name: variable,
                            points: chartOptions.showOutliers ? (chartOptions.showIndividualPoints ? 'all' : 'outliers') : false,
                            jitter: chartOptions.showIndividualPoints ? 0.3 : 0.0,
                            pointpos: 0,
                            box: { visible: true, width: 0.1 },
                            meanline: { visible: true }
                        });
                    } else {
                         console.warn(`[Debug Plotly Violin] Cannot draw violin plot for '${variable}' - no groupStats or data.values found.`);
                    }
                    layout.violingap = 0; // Убираем промежутки
                    break;
                // */ // Убираем комментирование
                 // TODO: Добавить другие числовые типы (dotplot, scatter)
                default:
                    // Заменяем сообщение об ошибке на вывод в консоль
                    console.warn(`[Debug Plotly] Chart type '${finalChartType}' is temporarily disabled or not fully implemented.`);
                    // chartRef.current.innerHTML = `<p>Тип графика '${finalChartType}' пока не полностью реализован для числовых данных в Plotly.</p>`;
                    // return; // Не выходим, чтобы проверить dataTraces
                    break; // Добавляем break на всякий случай
            }
        } else if (data.type === 'categorical') {
            // --- Временно комментируем категориальные типы --- 
            /* 
            const labels = Object.keys(data.counts);
            const values = Object.values(data.counts);

            switch(finalChartType) {
                case 'bar':
                   // ... (старый код)
                    break;
                case 'pie':
                   // ... (старый код)
                    layout.showlegend = true; // Всегда показываем легенду для pie
                    break;
                 case 'donut':
                    // ... (старый код)
                    layout.showlegend = true; // Всегда показываем легенду для donut
                    break;
                 // TODO: Добавить heatmap для категориальных
                default:
                    console.warn(`[Debug Plotly] Categorical chart type '${finalChartType}' is temporarily disabled.`);
                    // chartRef.current.innerHTML = `<p>Тип графика '${finalChartType}' пока не реализован для категориальных данных в Plotly.</p>`;
                    // return;
                    break;
            }
            */
           console.warn("[Debug Plotly] Categorical charts temporarily disabled.");
           // layout.yaxis.gridcolor = 'rgba(0,0,0,0)';
        } else {
             console.error(`[Debug Plotly] Unknown data type: ${data.type}.`);
             // chartRef.current.innerHTML = `<p>Неизвестный тип данных: ${data.type}.</p>`;
             // return;
        }

    } catch (error) {
         console.error("Error preparing Plotly traces:", error);
         chartRef.current.innerHTML = `<p style="color: red;">Ошибка при подготовке данных для графика Plotly.</p>`;
         return;
    }

    // Если следов нет, не рисуем график
    if (dataTraces.length === 0) {
        console.warn("Нет данных для отрисовки графика Plotly.");
        chartRef.current.innerHTML = '<p>Нет данных для отображения.</p>';
        return;
    }


    // --- Применение опций цвета ---
    // Plotly v2+ автоматически использует layout.colorway для следов.
    // Проверяем, является ли выбранная схема стандартной для Plotly.
    // Список примерных стандартных категориальных схем Plotly (может быть неполным)
    const knownPlotlyColorways = ['plotly', 'plotly_dark', 'plotly_white', 'ggplot2', 'seaborn', 'simple_white', 'Category10', 'Accent', 'Dark2', 'Paired', 'Pastel', 'Pastel1', 'Pastel2', 'Set1', 'Set2', 'Set3', 'd3', 'viridis', 'plasma', 'inferno'];
    
    if (chartOptions.colorScheme && knownPlotlyColorways.some(s => s.toLowerCase() === chartOptions.colorScheme.toLowerCase())) {
        layout.colorway = chartOptions.colorScheme; // Применяем выбранную/известную схему
    } else {
        layout.colorway = undefined; // Используем стандартную палитру Plotly по умолчанию
        if (chartOptions.colorScheme) {
           console.warn(`Plotly colorway '${chartOptions.colorScheme}' might not be directly supported. Using default.`);
        }
    }
    // Удаляем код, который пытался получить шкалу и вручную назначить цвета
    /*
    const colors = Plotly.Colors.getScale(chartOptions.colorScheme ? chartOptions.colorScheme.toLowerCase() : 'category10'); // Попробуем получить схему
    if (colors && dataTraces.length > 0) { ... }
    if (!layout.colorway) { ... }
    */
    
    // --- Добавление скобок значимости ---
    if (chartOptions.showSignificance && groupVar && data.groupStats) {
        try {
            const isParametric = determineIfParametric(data);
            const significanceResults = calculatePairwisePValues(data, isParametric);

            if (significanceResults && significanceResults.length > 0) {
                const comparisonsToPlot = chartOptions.showOnlySignificant
                    ? significanceResults.filter(r => r && typeof r.pValue === 'number' && r.pValue < 0.05)
                    : significanceResults.filter(r => r && typeof r.pValue === 'number'); // Фильтруем некорректные

                if (comparisonsToPlot.length > 0) {
                    console.log("Significance results to plot:", comparisonsToPlot);
                    
                    // Получаем имена всех групп из data.groupStats
                    const groupNames = Object.keys(data.groupStats).sort();
                    
                    // Создаем объект с координатами центров групп
                    const groupPositions = {};
                    groupNames.forEach((group, index) => {
                        groupPositions[group] = index;
                    });
                    
                    // Определяем максимальное значение Y для графика (для позиционирования скобок)
                    let maxY = 0;
                    
                    // Для числовых данных находим максимальное значение в зависимости от типа графика
                    if (data.type === 'numeric') {
                        // Для боксплотов и violin используем максимальное значение из всех групп
                        if (finalChartType === 'boxplot' || finalChartType === 'violin' || finalChartType === 'auto') {
                            Object.values(data.groupStats).forEach(groupData => {
                                if (Array.isArray(groupData.values) && groupData.values.length > 0) {
                                    const groupMax = Math.max(...groupData.values.filter(v => !isNaN(v)));
                                    maxY = Math.max(maxY, groupMax);
                                } else if (typeof groupData.q3 === 'number') {
                                    // Если нет values, используем q3 + 1.5 * IQR как приблизительную верхнюю границу
                                    const iqr = groupData.q3 - groupData.q1;
                                    const upperWhisker = groupData.q3 + 1.5 * iqr;
                                    maxY = Math.max(maxY, upperWhisker);
                                }
                            });
                        } 
                        // Для bar/errorbar/point используем mean + std
                        else if (finalChartType === 'bar' || finalChartType === 'errorbar' || finalChartType === 'point') {
                            Object.values(data.groupStats).forEach(groupData => {
                                if (typeof groupData.mean === 'number' && typeof groupData.std === 'number') {
                                    const upperLimit = groupData.mean + 2 * groupData.std; // Используем 2*std для запаса
                                    maxY = Math.max(maxY, upperLimit);
                                }
                            });
                        }
                    }
                    
                    // Если maxY всё ещё 0, установим базовое значение
                    if (maxY <= 0) {
                        maxY = 1;
                    }
                    
                    // Добавляем запас сверху 20%
                    maxY *= 1.2;
                    
                    // Сортируем сравнения по группам, чтобы скобки не пересекались
                    comparisonsToPlot.sort((a, b) => {
                        const aDistance = Math.abs(groupPositions[a.group2] - groupPositions[a.group1]);
                        const bDistance = Math.abs(groupPositions[b.group2] - groupPositions[b.group1]);
                        return bDistance - aDistance; // Начинаем с самых дальних групп
                    });
                    
                    // Создаем массивы для shapes (скобки) и annotations (значимость)
                    const shapes = [];
                    const annotations = [];
                    
                    // Базовый отступ от верха графика (относительный)
                    const baseOffsetY = chartOptions.bracketOffsetY;
                    const bracketHeight = chartOptions.bracketHeight;
                    const bracketSpacing = chartOptions.bracketSpacing;
                    
                    // Отрисовка скобок и аннотаций
                    comparisonsToPlot.forEach((comparison, index) => {
                        const x1 = groupPositions[comparison.group1];
                        const x2 = groupPositions[comparison.group2];
                        
                        // Проверка данных сравнения
                        if (x1 === undefined || x2 === undefined) {
                            console.warn(`Unable to find position for groups: ${comparison.group1}, ${comparison.group2}`);
                            return;
                        }
                        
                        // Высота скобки (с учетом уже нарисованных)
                        const bracketLevel = index * bracketSpacing;
                        const y = maxY * (1 + baseOffsetY + bracketLevel);
                        const yMin = y - maxY * bracketHeight; // Нижняя точка вертикальных линий
                        
                        // Добавляем горизонтальную линию
                        shapes.push({
                            type: 'line',
                            x0: x1,
                            y0: y,
                            x1: x2,
                            y1: y,
                            line: {
                                color: 'black',
                                width: 1.5
                            }
                        });
                        
                        // Добавляем вертикальные линии
                        shapes.push({
                            type: 'line',
                            x0: x1,
                            y0: y,
                            x1: x1,
                            y1: yMin,
                            line: {
                                color: 'black',
                                width: 1.5
                            }
                        });
                        
                        shapes.push({
                            type: 'line',
                            x0: x2,
                            y0: y,
                            x1: x2,
                            y1: yMin,
                            line: {
                                color: 'black',
                                width: 1.5
                            }
                        });
                        
                        // Определение отображаемого текста для значимости
                        let significanceText = '';
                        const pValue = comparison.pValue;
                        
                        if (chartOptions.significanceDisplay === 'stars') {
                            // Отображение звездочками
                            if (pValue <= 0.001) significanceText = '***';
                            else if (pValue <= 0.01) significanceText = '**';
                            else if (pValue <= 0.05) significanceText = '*';
                            else significanceText = 'ns';
                        } else {
                            // Отображение p-value
                            significanceText = pValue < 0.001 ? 'p<0.001' : `p=${pValue.toFixed(3)}`;
                        }
                        
                        // Добавляем текст значимости
                        annotations.push({
                            x: (x1 + x2) / 2,  // центр горизонтальной линии
                            y: y + maxY * 0.01, // чуть выше линии
                            xref: 'x',
                            yref: 'y',
                            text: significanceText,
                            showarrow: false,
                            font: {
                                size: chartOptions.fontSize - 2,
                                color: 'black'
                            },
                            bgcolor: 'rgba(255, 255, 255, 0.7)',  // полупрозрачный белый фон
                            borderpad: 2
                        });
                    });
                    
                    // Добавляем скобки и аннотации в макет
                    if (!layout.shapes) layout.shapes = [];
                    if (!layout.annotations) layout.annotations = [];
                    
                    layout.shapes = [...layout.shapes, ...shapes];
                    layout.annotations = [...layout.annotations, ...annotations];
                    
                    // Увеличиваем размер по Y, чтобы уместить все скобки
                    const bracketTotalSpace = baseOffsetY + comparisonsToPlot.length * bracketSpacing + 0.1;
                    layout.yaxis.range = [0, maxY * (1 + bracketTotalSpace)];
                }
            }
        } catch (error) {
            console.error("Error calculating or preparing significance brackets:", error);
        }
    }


    // Отрисовка графика
    Plotly.newPlot(chartRef.current, dataTraces, layout, config)
      .then(gd => {
          // График успешно отрисован
          // console.log("Plotly graph rendered:", gd);
      })
      .catch(err => {
          console.error("Plotly Rendering Error: ", err);
          chartRef.current.innerHTML = `<p style="color: red;">Ошибка при отрисовке графика Plotly: ${err.message}</p>`;
      });
  };


  // Create chart type selector (значения value нужно будет синхронизировать с типами Plotly)
  const ChartTypeSelector = () => {
    const options = [];
    // Обновляем доступные типы для Plotly
    if (data.type === 'numeric') {
      // Проверяем, параметрический ли тип данных для выбора правильной метки
      const isParametric = data.hasOwnProperty('displayParametric') ? data.displayParametric : determineIfParametric(data);
      const autoLabel = isParametric ? t('chartTypeAutoParametric') : t('chartTypeAutoNonParametric');
      
      options.push({ value: 'auto', label: autoLabel });
      options.push({ value: 'boxplot', label: t('chartTypeBoxplot') });
      // options.push({ value: 'boxplot-labeled', label: 'Боксплот с значениями' }); // Пока не реализовано
      options.push({ value: 'violin', label: t('chartTypeViolin') });
      options.push({ value: 'bar', label: t('chartTypeBar') });
      options.push({ value: 'errorbar', label: t('chartTypeErrorBar') });
      options.push({ value: 'point', label: t('chartTypePoint') });
      // TODO: Добавить dotplot, scatter когда будут реализованы
      // options.push({ value: 'dotplot', label: 'Точечная диаграмма' });
      // options.push({ value: 'scatter', label: 'Диаграмма рассеяния' });
    } else if (data.type === 'categorical') {
      options.push({ value: 'auto', label: t('chartTypeAutoParametric') }); // Для категориальных авто всегда бар
      options.push({ value: 'bar', label: t('chartTypeBar') });
      options.push({ value: 'pie', label: t('chartTypePie') });
      options.push({ value: 'donut', label: t('chartTypeDonut') });
      // TODO: Добавить heatmap когда будет реализована
      // options.push({ value: 'heatmap', label: 'Тепловая карта' });
    }

    const handleChange = (e) => {
      setChartType(e.target.value);
    };

    // Рендеринг селектора (без изменений в структуре)
     return React.createElement('div', { className: 'text-sm mb-2' },
      React.createElement('label', { className: 'mr-2' }, t('chartType')),
      React.createElement('select',
        {
          value: chartType,
          onChange: handleChange,
          className: 'py-1 px-2 border rounded'
        },
        options.map(option =>
          React.createElement('option', { key: option.value, value: option.value }, option.label)
        )
      )
    );
  };

  // Chart options selector component (применение опций теперь внутри drawChart)
  const ChartOptionsSelector = () => {
    // Create handler for chart option changes
    const handleOptionChange = (option, value) => {
      // Добавляем проверку для ширины/высоты, чтобы не уходить в 0
       if ((option === 'width' || option === 'height') && value < 50) {
            value = 50;
       }
       // Проверка для размера шрифта
       if (option === 'fontSize' && value < 6) {
            value = 6;
       }
      setChartOptions(prev => ({ ...prev, [option]: value }));
    };

    // Width & height numeric inputs
    const dimensionInput = (label, option, min, max) => {
      return React.createElement('div', { className: 'flex items-center mr-4' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t(label) + ':'),
        React.createElement('input', {
          type: 'number',
          min: min,
          max: max,
          step: 10, // Шаг для удобства
          value: chartOptions[option],
          // Используем || min для fallback, если значение некорректно
          onChange: (e) => handleOptionChange(option, parseInt(e.target.value, 10) || min),
          className: 'w-20 py-1 px-2 border rounded text-sm' // Увеличена ширина
        })
      );
    };

    // Color scheme dropdown
    const colorSchemeSelector = () => {
      return React.createElement('div', { className: 'flex items-center mr-4' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t('chartColorScheme')),
        React.createElement('select', {
          value: chartOptions.colorScheme,
          onChange: (e) => handleOptionChange('colorScheme', e.target.value),
          className: 'py-1 px-2 border rounded text-sm'
        }, colorSchemes.map(scheme => // Используем наш список схем
          React.createElement('option', { key: scheme, value: scheme },
            // Просто показываем имя схемы
            scheme
          )
        ))
      );
    };

    // Grid lines checkbox
    const gridCheckbox = () => {
      return React.createElement('div', { className: 'flex items-center mr-4' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t('chartShowGrid')),
        React.createElement('input', {
          type: 'checkbox',
          checked: chartOptions.showGrid,
          onChange: (e) => handleOptionChange('showGrid', e.target.checked),
          className: 'form-checkbox h-4 w-4'
        })
      );
    };

    // Font size input
    const fontSizeInput = () => {
      return React.createElement('div', { className: 'flex items-center mr-4' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t('chartFontSize')),
        React.createElement('input', {
          type: 'number',
          min: 6, // Минимальный размер
          max: 30,
          step: 1,
          value: chartOptions.fontSize,
          onChange: (e) => handleOptionChange('fontSize', parseInt(e.target.value, 10) || 12), // Fallback 12
          className: 'w-16 py-1 px-2 border rounded text-sm'
        })
      );
    };

    // Box width slider (пока не подключен к Plotly)
    const boxWidthSlider = () => {
      // TODO: Подключить к layout.boxgap или аналогичной опции Plotly
      if (chartType !== 'boxplot' && chartType !== 'boxplot-labeled') return null; // Показываем только для боксплотов
      return React.createElement('div', { key: 'box-width', className: 'flex items-center' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t('chartBoxGap')),
        React.createElement('input', {
          type: 'range',
          min: 0, // Plotly boxgap 0-1
          max: 1,
          step: 0.1,
          value: chartOptions.boxWidth, // Пока используем старую опцию
          onChange: (e) => handleOptionChange('boxWidth', parseFloat(e.target.value)),
          className: 'w-20'
        }),
        React.createElement('span', { className: 'ml-2 text-sm' }, chartOptions.boxWidth.toFixed(1))
      );
    };

    // Опции для скобок значимости
    const significanceOptions = () => {
       // Проверяем, нужно ли показывать опции вообще (нужна группирующая переменная)
      if (!groupVar) return null;

      // Убрана проверка на тип графика - опции доступны для всех типов с группировкой

      // Возвращаем панель с чекбоксами для настройки отображения значимости
      return React.createElement('div', { key: 'significance', className: 'flex items-center mt-2 flex-wrap' },
        // Чекбокс для отображения скобок со значимостью
        React.createElement('div', { className: 'flex items-center mr-4 mb-1' },
          React.createElement('input', {
            type: 'checkbox',
            id: `show-significance-${variable}`,
            checked: chartOptions.showSignificance,
            onChange: (e) => handleOptionChange('showSignificance', e.target.checked),
            className: 'mr-1'
          }),
          React.createElement('label', { htmlFor: `show-significance-${variable}`, className: 'text-sm' }, t('chartShowSignificance'))
        ),
        // Добавляем чекбокс для фильтрации только значимых различий
        // Показываем только если включено отображение значимости
        chartOptions.showSignificance && React.createElement('div', { className: 'flex items-center mr-4 mb-1' },
          React.createElement('input', {
            type: 'checkbox',
            id: `show-only-significant-${variable}`,
            checked: chartOptions.showOnlySignificant,
            onChange: (e) => handleOptionChange('showOnlySignificant', e.target.checked),
            className: 'mr-1'
          }),
          React.createElement('label', { htmlFor: `show-only-significant-${variable}`, className: 'text-sm' }, t('chartShowOnlySignificant'))
        ),
        // Добавляем селектор для способа отображения значимости
        chartOptions.showSignificance && React.createElement('div', { className: 'flex items-center mr-4 mb-1' },
          React.createElement('label', { htmlFor: `significance-display-${variable}`, className: 'mr-2 text-sm' }, t('chartSignificanceFormat')),
          React.createElement('select', {
            id: `significance-display-${variable}`,
            value: chartOptions.significanceDisplay,
            onChange: (e) => handleOptionChange('significanceDisplay', e.target.value),
            className: 'py-1 px-2 border rounded text-sm'
          }, [
            React.createElement('option', { key: 'stars', value: 'stars' }, t('chartSignificanceStars')),
            React.createElement('option', { key: 'pvalue', value: 'pvalue' }, t('chartSignificancePValue'))
          ])
        )
      );
    };

    // Добавим функцию для создания чекбокса отображения индивидуальных точек
    const showPointsCheckbox = () => {
      // Показываем только для боксплотов и скрипичных диаграмм
      if (chartType !== 'boxplot' && chartType !== 'violin' && chartType !== 'auto') return null;
      
      return React.createElement('div', { className: 'flex items-center mr-4' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t('chartShowAllPoints')),
        React.createElement('input', {
          type: 'checkbox',
          checked: chartOptions.showIndividualPoints,
          onChange: (e) => handleOptionChange('showIndividualPoints', e.target.checked),
          className: 'form-checkbox h-4 w-4'
        })
      );
    };

    // Добавляем новую функцию для чекбокса отображения выбросов
    const showOutliersCheckbox = () => {
      // Показываем только для боксплотов и скрипичных диаграмм
      if (chartType !== 'boxplot' && chartType !== 'violin' && chartType !== 'auto') return null;
      
      return React.createElement('div', { className: 'flex items-center mr-4' },
        React.createElement('label', { className: 'mr-2 text-sm' }, t('chartShowOutliers')),
        React.createElement('input', {
          type: 'checkbox',
          checked: chartOptions.showOutliers,
          onChange: (e) => handleOptionChange('showOutliers', e.target.checked),
          className: 'form-checkbox h-4 w-4'
        })
      );
    };

    // Обновляем секцию с опциями
    return React.createElement('div', { className: 'my-4 border-t border-gray-300 pt-3 text-sm' },
      React.createElement('div', { className: 'flex flex-wrap items-center mb-2' },
        dimensionInput('chartWidth', 'width', 200, 2000),
        dimensionInput('chartHeight', 'height', 100, 1000),
        fontSizeInput(),
        gridCheckbox(),
        colorSchemeSelector(),
        showPointsCheckbox(), // Показать все точки
        showOutliersCheckbox(), // Показать выбросы
        boxWidthSlider()
      ),
      significanceOptions()
    );
  };

  // --- Обработчик добавления в отчет ---
  const handleAddGraphToReport = async () => {
    if (!window.ReportGenerator) {
      console.error("ReportGenerator module is not loaded.");
      alert(t('reportGeneratorNotLoadedError')); // "Ошибка: Модуль генерации отчета не загружен."
      return;
    }
    if (!chartRef.current) {
        console.error("Chart element reference is not available.");
        alert(t('reportChartNotReadyError')); // "Ошибка: График еще не готов для добавления в отчет."
        return;
    }

    setIsAddingToReport(true);

    try {
        // --- Извлекаем метаданные ---
        const analysisMetadata = {
            variableType: data.type,
            displayParametric: data.displayParametric, // Как были представлены данные (mean/sd или median/q)
            normalityTestUsed: data.normality?.test, // Какой тест нормальности использовался
            normalityPassed: data.normality?.isNormal, // Прошла ли общая выборка тест
            groupNormalityPassed: data.groupNormalityStatus?.isNormal, // Прошли ли все группы (если были)
            testType: data.testResult?.type, // Тип основного стат. теста
            effectSizeType: data.testResult?.effectSize?.type, // Тип основного размера эффекта
            alternativeEffectSizeType: data.testResult?.alternativeEffectSize?.type, // Тип альтернативного размера эффекта
            pairwiseMethod: data.pairwiseComparisons?.[0]?.method, // Метод попарных сравнений (если были)
            groupsCompared: !!(data.groupStats || data.groupedStats) // Было ли сравнение групп
        };
        // Очищаем от undefined значений, чтобы не засорять хранилище
        Object.keys(analysisMetadata).forEach(key => analysisMetadata[key] === undefined && delete analysisMetadata[key]);
        // --- Конец извлечения метаданных ---


        // 1. Генерируем текстовое описание
        const findingsText = ReportGenerator.generateFindingsText(data);

        // 2. Генерируем PNG графика
        const pngWidth = chartOptions.width || 800;
        const pngHeight = chartOptions.height || 500;
        const pngDataUrl = await ReportGenerator.generateFigurePng(chartRef.current, pngWidth, pngHeight);

        if (!pngDataUrl) {
             throw new Error(t('reportPngGenerationError'));
        }

        // 3. Добавляем текст в отчет (с метаданными)
        ReportGenerator.addToReport({
            type: 'text',
            content: findingsText || t('reportFindingsGenerationError'),
            metadata: analysisMetadata // <-- Передаем метаданные
        });

        // 4. Добавляем график в отчет (тоже с метаданными, они могут быть полезны)
        ReportGenerator.addToReport({
            type: 'figure',
            figureDataUrl: pngDataUrl,
            // caption будет сформирован в addToReport
            // baseCaption: variable || t('reportFigureUntitled'), // Передаем базовое название
             metadata: analysisMetadata // <-- Передаем метаданные и сюда
        });

        alert(t('reportAddedSuccess'));

    } catch (error) {
        console.error("Error adding graph to report:", error);
        alert(`${t('reportAddError')}: ${error.message}`);
    } finally {
        setIsAddingToReport(false);
    }
  };

  // Effect for initial render and updates
  React.useEffect(() => {
    const timer = setTimeout(() => {
        drawChart();
    }, 50);
    return () => clearTimeout(timer);
  }, [data, variable, groupVar, chartType, chartOptions]);

  // Return component
  return React.createElement("div", { className: "w-full border border-gray-200 rounded p-4 mb-4 shadow" }, // Добавим обертку и стили
    React.createElement(ChartTypeSelector),
    React.createElement(ChartOptionsSelector),
    React.createElement("div", {
      ref: chartRef,
      className: "w-full plotly-chart-container mt-2" // Добавим отступ сверху
    }),
    // --- Кнопка добавления в отчет ---
    React.createElement("div", { className: "mt-4 pt-3 border-t border-gray-300 flex justify-end" }, // Контейнер для кнопки
        React.createElement("button", {
            onClick: handleAddGraphToReport,
            disabled: isAddingToReport, // Блокируем кнопку во время добавления
            className: `px-4 py-2 rounded ${isAddingToReport ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm transition duration-150 ease-in-out`
          },
          isAddingToReport ? t('reportAddingButton') : t('reportAddButton') // "Добавление..." : "Добавить в отчет"
        )
    )
  );
};