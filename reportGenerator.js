"use strict";

// Модуль для генерации отчетов
// Проверка, что мы работаем в браузерной среде
if (typeof window === 'undefined') {
  throw new Error('ReportGenerator должен работать в браузерной среде');
}

window.ReportGenerator = (function() {

    // Отладочное сообщение для проверки инициализации
    console.log('ReportGenerator модуль инициализирован');

    const REPORT_STORAGE_KEY = 'statixReportData';
    let reportItems = []; // Массив элементов отчета
    let figureCounter = 0; // Счетчик для нумерации рисунков

    // --- Управление состоянием отчета ---

    /**
     * Получает текущий отчет из localStorage.
     * @returns {Array<object>} Массив элементов отчета.
     */
    function getReport() {
        try {
            const storedReport = localStorage.getItem(REPORT_STORAGE_KEY);
            return storedReport ? JSON.parse(storedReport) : [];
        } catch (e) {
            console.error("Error reading report from localStorage:", e);
            return [];
        }
    }

    /**
     * Сохраняет отчет в localStorage.
     * @param {Array<object>} reportData - Массив элементов отчета.
     */
    function saveReport(reportData) {
        try {
            localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reportData));
        } catch (e) {
            console.error("Error saving report to localStorage:", e);
            // Возможно, стоит уведомить пользователя о проблеме
        }
    }

     /**
     * Сбрасывает счетчик рисунков при необходимости (например, при очистке отчета).
     * Или инициализирует его на основе существующего отчета.
     */
    function initializeFigureCounter() {
        const report = getReport();
        const figures = report.filter(item => item.type === 'figure');
        figureCounter = figures.length; // Начинаем с номера следующего рисунка
        console.log("Figure counter initialized to:", figureCounter);
    }

    // Инициализируем счетчик при загрузке модуля
    initializeFigureCounter();


    /**
     * Добавляет элемент в отчет.
     * @param {object} item - Объект элемента отчета.
     *        Пример: { type: 'text', content: '...', metadata: { testType: 'ANOVA', ... } }
     *        Пример: { type: 'table', title: '...', headers: [...], rows: [...], notes: '...', metadata: { ... } }
     *        Пример: { type: 'figure', figureDataUrl: '...', baseCaption: '...', metadata: { ... } }
     */
    function addToReport(item) {
        if (!item || !item.type) {
            console.error("Invalid item provided to addToReport:", item);
            return;
        }
        const currentReport = getReport();

        // Нумерация рисунков
        if (item.type === 'figure') {
           figureCounter++;
           const baseCaption = item.baseCaption || t('figureDefaultCaption');
           item.caption = `${t('figureLabel')} ${figureCounter}. ${baseCaption}`; // Формируем подпись
           delete item.baseCaption; // Удаляем baseCaption, caption остается
        }

        // Метаданные должны просто сохраняться как часть объекта item
        // Никакой специальной обработки здесь не требуется,
        // главное, чтобы они передавались из вызывающего кода.

        currentReport.push(item);
        saveReport(currentReport);
        console.log("Item added to report:", item);
        // Сохраняем метаданные, если они есть
        if(item.metadata) {
            console.log("Associated metadata:", item.metadata);
        }
    }

    /**
     * Очищает весь отчет.
     */
    function clearReport() {
        saveReport([]);
        figureCounter = 0; // Сбрасываем счетчик
        console.log("Report cleared.");
        // Опционально: можно добавить уведомление для пользователя
    }

    // --- Генерация контента ---

    /**
     * Генерирует текстовое описание основных находок.
     * @param {object} analysisData - Объект с результатами анализа (например, data из GraphComponent или TableComponent).
     * @returns {string} Текстовое описание.
     */
    function generateFindingsText(analysisData) {
        console.log("Generating findings for:", analysisData);
        if (!analysisData || analysisData.error) {
            return t('findingsNotAvailable') + (analysisData.error ? ` (${analysisData.error})` : '');
        }

        let findings = "";
        const variable = analysisData.variable || t('unknownVariable'); // "Неизвестная переменная"
        const isGroupAnalysis = analysisData.groupStats || analysisData.groupedStats;
        const testResult = analysisData.testResult;
        const displayParametric = analysisData.displayParametric; // Для числовых

        findings += `${t('findingsHeaderForVar')} "${variable}".\n`; // "Основные находки для переменной ..."

        // 1. Описательные статистики
        if (analysisData.type === 'numeric') {
            findings += t('findingsOverallDesc') + ": "; // "Общая описательная статистика: " 
            if (displayParametric) {
                findings += `${t('mean')} = ${formatValue(analysisData.mean)}, ${t('stdDev')} = ${formatValue(analysisData.std)}. `;
            } else {
                findings += `${t('median')} = ${formatValue(analysisData.median)} [${t('q1')}=${formatValue(analysisData.q1)}; ${t('q3')}=${formatValue(analysisData.q3)}]. `;
            }
            findings += `(n=${analysisData.n})\n`;
        } else if (analysisData.type === 'categorical') {
            const totalN = analysisData.n;
            const topCategory = Object.entries(analysisData.frequencies)
                                   .sort(([,a],[,b]) => b-a)[0]; // Находим самую частую категорию
            if (topCategory) {
                 findings += `${t('findingsMostCommonCat')}: ${topCategory[0]} (${topCategory[1]} / ${totalN}, ${analysisData.percentages[topCategory[0]].toFixed(1)}%).\n`; // "Наиболее частая категория: ..."
            }
        }

        // 2. Тест нормальности (для числовых)
        if (analysisData.type === 'numeric' && analysisData.normality) {
            const normConclusion = t(analysisData.normality.conclusion || 'unknownNormality'); // "unknownNormality" - добавить перевод
            const normP = analysisData.normality.pValue;
            const normPFormatted = normP < 0.001 ? '< 0.001' : `= ${normP.toFixed(3)}`;
            findings += `${t('findingsNormalityTestResult')}: ${normConclusion} (${analysisData.normality.test}, p ${normPFormatted}).\n`; // "Результат теста нормальности: ..."
            if (analysisData.groupNormalityStatus && analysisData.groupNormalityStatus.minPvalue !== undefined) {
                 const groupNormConclusion = t(analysisData.groupNormalityStatus.conclusion || 'unknownNormality');
                 const groupNormP = analysisData.groupNormalityStatus.minPvalue;
                 const groupNormPFormatted = groupNormP < 0.001 ? '< 0.001' : `= ${groupNormP.toFixed(3)}`;
                 findings += `${t('findingsGroupNormality')}: ${groupNormConclusion} (${t('minPValue')} p ${groupNormPFormatted}).\n`; // "Нормальность по группам: ... (мин. p ...)"
            }
        }

        // 3. Результат основного статистического теста (если был)
        if (isGroupAnalysis && testResult) {
             const testType = testResult.type || t('unknownTest'); // "Неизвестный тест"
             const pValue = testResult.pValue;
             const pFormatted = pValue < 0.001 ? '< 0.001' : `= ${pValue.toFixed(3)}`;
             const isSignificant = pValue < 0.05;

             findings += `\n${t('findingsGroupComparison')}:\n`; // "Сравнение групп:"
             findings += `- ${t('testUsed')}: ${testType}.\n`; // "- Использованный тест: ..."
             // Форматируем результат теста кратко
             let testStatFormatted = '';
             if (testResult.type === 'ANOVA') testStatFormatted = `F(${testResult.dfb}, ${testResult.dfw}) = ${formatValue(testResult.statistic)}`;
             else if (testResult.type === 'Kruskal-Wallis test') testStatFormatted = `H(${testResult.df}) = ${formatValue(testResult.statistic)}`;
             else if (testResult.type === 't-test') testStatFormatted = `t(${formatValue(testResult.df)}) = ${formatValue(testResult.statistic)}`;
             else if (testResult.type === 'Mann-Whitney U test') testStatFormatted = `U = ${formatValue(testResult.statistic)}, Z = ${formatValue(testResult.Z)}`;
             else if (testResult.type.startsWith('Chi-square')) testStatFormatted = `χ²(${testResult.df}) = ${formatValue(testResult.statistic)}`;
             else if (testResult.statistic) testStatFormatted = `${t('statistic')} = ${formatValue(testResult.statistic)}`;

             findings += `- ${t('result')}: ${testStatFormatted}, p ${pFormatted}.\n`; // "- Результат: ..."

             if (isSignificant) {
                 findings += `- ${t('conclusionSignificant')}.\n`; // "- Вывод: Обнаружены статистически значимые различия между группами."
             } else {
                 findings += `- ${t('conclusionNotSignificant')}.\n`; // "- Вывод: Статистически значимых различий между группами не обнаружено."
             }

             // Размер эффекта
             if (testResult.effectSize) {
                  const esType = testResult.effectSize.type;
                  const esValue = formatValue(testResult.effectSize.value);
                  const esInterp = t(testResult.effectSize.interpretation || 'unknownEffectSizeInterp'); // Добавить перевод
                  findings += `- ${t('effectSize')}: ${esType} = ${esValue} (${esInterp}).\n`; // "- Размер эффекта: ..."
                  if (testResult.alternativeEffectSize) { // Добавляем альтернативный размер эффекта (например, omega-squared)
                       const altEsType = testResult.alternativeEffectSize.type;
                       const altEsValue = formatValue(testResult.alternativeEffectSize.value);
                       const altEsInterp = t(testResult.alternativeEffectSize.interpretation || 'unknownEffectSizeInterp');
                       findings += `- (${t('alternativeEffectSizeLabel')} ${altEsType} = ${altEsValue}, ${altEsInterp}).\n`; // Добавить перевод для "Альтернативный:"
                  }
             }
        }

        // 4. Попарные сравнения (если были и значимы)
        if (analysisData.pairwiseComparisons && analysisData.pairwiseComparisons.length > 0) {
             const significantPairs = analysisData.pairwiseComparisons.filter(p => p.pValue < 0.05);
             if (significantPairs.length > 0) {
                 findings += `\n${t('findingsPairwiseSignificant')}:\n`; // "Значимые попарные различия:"
                 significantPairs.forEach(p => {
                    const pairP = p.pValue < 0.001 ? '< 0.001' : `= ${p.pValue.toFixed(3)}`;
                    // Краткое отображение разницы (средние или ранги)
                    let diffInfo = '';
                    if (p.meanDiff !== undefined) diffInfo = ` (${t('meanDiffAbbr')} = ${formatValue(p.meanDiff)})`; // "(Δ = ...)"
                    else if (p.meanRankDiff !== undefined) diffInfo = ` (${t('rankDiffAbbr')} = ${formatValue(p.meanRankDiff)})`; // "(ΔR = ...)"

                    findings += `- ${p.group1} vs ${p.group2}: p ${pairP}${diffInfo}.\n`;
                 });
             } else if (testResult && testResult.pValue < 0.05) { // Если общий тест значим, а пары нет
                  findings += `\n${t('findingsPairwiseNoneSignificant')}.\n`; // "Попарные сравнения не выявили статистически значимых различий между отдельными группами (при α=0.05)."
             }
        }


        return findings || t('findingsNotAvailable');
    }

    // Вспомогательная функция для форматирования (дублирует из TableComponent, хорошо бы вынести)
    const formatValue = (value) => {
        if (value === undefined || value === null) return '?';
        if (typeof value === 'number') {
           if (Math.abs(value) < 0.001 && value !== 0 || Math.abs(value) > 9999) {
             return value.toExponential(2);
           } else {
             // Округляем до 3 знаков после запятой для p-value и 2 для остального
              const isPValueLike = String(value).length > 4 && String(value).includes('.');
              return value.toFixed(isPValueLike ? 3 : 2);
           }
        }
        return value.toString();
     };

    /**
     * Асинхронно генерирует PNG изображение графика Plotly.
     * @param {HTMLElement} graphElement - DOM-элемент с графиком Plotly.
     * @param {number} width - Желаемая ширина PNG.
     * @param {number} height - Желаемая высота PNG.
     * @returns {Promise<string|null>} Promise, который разрешается с data URL (base64 PNG) или null в случае ошибки.
     */
    async function generateFigurePng(graphElement, width = 800, height = 500) {
       if (!graphElement || typeof Plotly === 'undefined' || !Plotly.toImage) {
            console.error("Plotly or graph element not available for PNG generation.");
            return null;
        }
        try {
            const dataUrl = await Plotly.toImage(graphElement, {
                format: 'png',
                width: width,
                height: height,
                // scale: 2 // Можно увеличить масштаб для лучшего разрешения
            });
            return dataUrl;
        } catch (err) {
            console.error('Error generating Plotly PNG:', err);
            return null;
        }
    }

    /**
     * Генерирует текст для раздела "Методы" на основе метаданных в отчете.
     * @returns {string} Текст раздела "Методы".
     */
    function generateMethodsSectionText() {
        const report = getReport();
        const allMetadata = report.map(item => item.metadata).filter(Boolean); // Собираем все метаданные

        if (allMetadata.length === 0) {
            return t('methodsSectionNotAvailable'); // "Нет данных для генерации раздела 'Методы'."
        }

        // Собираем уникальные использованные методы
        const methodsUsed = {
            descriptive: new Set(), // 'mean_sd', 'median_q', 'n_percent'
            normality: new Set(),   // 'Shapiro-Wilk', 'Kolmogorov-Smirnov'
            inferential: new Set(), // 't-test', 'Mann-Whitney U test', 'ANOVA', 'Kruskal-Wallis test', 'Chi-square test'
            pairwise: new Set(),    // 'tukey', 'scheffe', 'lsd', 'dunnett', 'dunn', 'steel-dwass'
            effectSize: new Set()   // "Cohen's d", "rank-biserial r", "η²", "ω²", "ε²", "Cramer's V"
        };

        let categoricalPresent = false;
        let numericCompared = false;
        let categoricalCompared = false;

        allMetadata.forEach(meta => {
            // Описательная статистика
            if (meta.variableType === 'numeric') {
                 if (meta.displayParametric) methodsUsed.descriptive.add('mean_sd');
                 else methodsUsed.descriptive.add('median_q');
                 if (meta.groupsCompared) numericCompared = true;
            } else if (meta.variableType === 'categorical') {
                 methodsUsed.descriptive.add('n_percent');
                 categoricalPresent = true;
                 if (meta.groupsCompared) categoricalCompared = true;
            }
            // Обработка случая, когда variableTypes - это массив (из TableComponent)
            else if (Array.isArray(meta.variableTypes)) {
                 if (meta.variableTypes.includes('numeric')) {
                     if (meta.displayParametricUsed) methodsUsed.descriptive.add('mean_sd');
                     if (meta.displayNonParametricUsed) methodsUsed.descriptive.add('median_q');
                 }
                 if (meta.variableTypes.includes('categorical')) {
                     methodsUsed.descriptive.add('n_percent');
                     categoricalPresent = true;
                 }
                 if (meta.groupsCompared) {
                      if (meta.variableTypes.includes('numeric')) numericCompared = true;
                      if (meta.variableTypes.includes('categorical')) categoricalCompared = true;
                 }
            }

            // Нормальность
            if (meta.normalityTestUsed) methodsUsed.normality.add(meta.normalityTestUsed);
            else if (Array.isArray(meta.normalityTestsUsed)) meta.normalityTestsUsed.forEach(n => methodsUsed.normality.add(n));

            // Основные тесты
            if (meta.testType) {
                const testTypeClean = meta.testType.replace('*','').trim();
                methodsUsed.inferential.add(testTypeClean);
            }
            else if (Array.isArray(meta.testTypes)) meta.testTypes.forEach(t => methodsUsed.inferential.add(t.replace('*','').trim()));

            // Попарные сравнения
            if (meta.pairwiseMethod) methodsUsed.pairwise.add(meta.pairwiseMethod);
            else if (Array.isArray(meta.pairwiseMethods)) meta.pairwiseMethods.forEach(p => methodsUsed.pairwise.add(p));
            // Дефолтные, если не указаны явно в метаданных таблицы
            if (Array.isArray(meta.testTypes)) {
                if (meta.testTypes.includes('ANOVA') && !meta.pairwiseMethods?.includes('tukey')) methodsUsed.pairwise.add('tukey');
                if (meta.testTypes.includes('Kruskal-Wallis test') && !meta.pairwiseMethods?.includes('dunn')) methodsUsed.pairwise.add('dunn');
            }
            else if (meta.testType === 'ANOVA' && !meta.pairwiseMethod) methodsUsed.pairwise.add('tukey');
            else if (meta.testType === 'Kruskal-Wallis test' && !meta.pairwiseMethod) methodsUsed.pairwise.add('dunn');

            // Размеры эффекта
            if (meta.effectSizeType) methodsUsed.effectSize.add(meta.effectSizeType);
            if (meta.alternativeEffectSizeType) methodsUsed.effectSize.add(meta.alternativeEffectSizeType);
            if (Array.isArray(meta.effectSizeTypes)) meta.effectSizeTypes.forEach(e => methodsUsed.effectSize.add(e));
            if (Array.isArray(meta.alternativeEffectSizeTypes)) meta.alternativeEffectSizeTypes.forEach(e => methodsUsed.effectSize.add(e));
        });

        // Генерируем текст
        let text = "";

        // 1. Вступление (опционально)
        text += t('methodsIntro') + "\n\n"; // "Статистический анализ данных проводился с использованием..."

        // 2. Описательная статистика
        let descParts = [];
        if (methodsUsed.descriptive.has('mean_sd')) descParts.push(t('methodsDescMeanSD'));
        if (methodsUsed.descriptive.has('median_q')) descParts.push(t('methodsDescMedianQ'));
        if (methodsUsed.descriptive.has('n_percent')) descParts.push(t('methodsDescNPercent'));
        if (descParts.length > 0) {
            text += t('methodsDescPrefix') + " " + descParts.join(', ') + ".\n"; // "Описательная статистика представлена как ..."
        }

        // 3. Нормальность (если анализировались числовые)
        if (methodsUsed.descriptive.has('mean_sd') || methodsUsed.descriptive.has('median_q')) {
            let normalityDesc = "";
            if (methodsUsed.normality.has('Shapiro-Wilk') && methodsUsed.normality.has('Kolmogorov-Smirnov')) {
                 normalityDesc = t('methodsNormalityBoth'); // "Тест Шапиро-Уилка (при n≤50) и тест Колмогорова-Смирнова (при n>50)"
            } else if (methodsUsed.normality.has('Shapiro-Wilk')) {
                 normalityDesc = t('methodsNormalityShapiro'); // "Тест Шапиро-Уилка"
            } else if (methodsUsed.normality.has('Kolmogorov-Smirnov')) {
                 normalityDesc = t('methodsNormalityKS'); // "Тест Колмогорова-Смирнова"
            }
            if (normalityDesc) {
                text += t('methodsNormalityPrefix') + " " + normalityDesc + t('methodsNormalitySuffix') + "\n"; // "Нормальность распределения количественных данных оценивалась с помощью ... . Уровень значимости для теста нормальности был принят равным 0.05."
            }
        }

        // 4. Сравнение групп (основные тесты)
        if (numericCompared || categoricalCompared) {
             text += "\n" + t('methodsComparisonPrefix') + "\n"; // "Для сравнения групп использовались следующие статистические тесты:"

             if (methodsUsed.inferential.has('t-test')) text += `- ${t('methodsTestT')}\n`; // "- t-критерий Стьюдента (для сравнения двух независимых групп с нормальным распределением);"
             if (methodsUsed.inferential.has('Mann-Whitney U test')) text += `- ${t('methodsTestMWU')}\n`; // "- U-критерий Манна-Уитни (для сравнения двух независимых групп с распределением, отличным от нормального);"
             if (methodsUsed.inferential.has('ANOVA')) text += `- ${t('methodsTestANOVA')}\n`; // "- Однофакторный дисперсионный анализ (ANOVA) (для сравнения трех и более независимых групп с нормальным распределением);"
             if (methodsUsed.inferential.has('Kruskal-Wallis test')) text += `- ${t('methodsTestKW')}\n`; // "- H-критерий Краскела-Уоллиса (для сравнения трех и более независимых групп с распределением, отличным от нормального);"
             if (methodsUsed.inferential.has('Chi-square test')) text += `- ${t('methodsTestChi2')}\n`; // "- Критерий хи-квадрат Пирсона (для анализа таблиц сопряженности категориальных переменных);"
             // TODO: Добавить другие тесты по мере их имплементации
        }

        // 5. Попарные сравнения (если были ANOVA/KW или соответствующие методы в pairwise set)
        if (methodsUsed.pairwise.size > 0 && (methodsUsed.inferential.has('ANOVA') || methodsUsed.inferential.has('Kruskal-Wallis test') || [...methodsUsed.pairwise].some(p => ['tukey', 'scheffe', 'lsd', 'dunnett', 'dunn', 'steel-dwass'].includes(p)))) {
             let pairwiseParts = [];
             // Parametric
             if (methodsUsed.pairwise.has('tukey')) pairwiseParts.push(t('methodsPairwiseTukey')); // "критерий Тьюки"
             if (methodsUsed.pairwise.has('scheffe')) pairwiseParts.push(t('methodsPairwiseScheffe')); // "критерий Шеффе"
             if (methodsUsed.pairwise.has('lsd')) pairwiseParts.push(t('methodsPairwiseLSD')); // "критерий Фишера (LSD)"
             if (methodsUsed.pairwise.has('dunnett')) pairwiseParts.push(t('methodsPairwiseDunnett')); // "критерий Даннета"
             // Non-parametric
             if (methodsUsed.pairwise.has('dunn')) pairwiseParts.push(t('methodsPairwiseDunn')); // "критерий Данна"
             if (methodsUsed.pairwise.has('steel-dwass')) pairwiseParts.push(t('methodsPairwiseSteelDwass')); // "критерий Стила-Двасса"

             if (pairwiseParts.length > 0) {
                text += t('methodsPairwisePrefix') + " " + pairwiseParts.join(', ') + ".\n"; // "При обнаружении статистически значимых различий по результатам ANOVA или теста Краскела-Уоллиса проводились апостериорные попарные сравнения с использованием ..."
             }
        }

        // 6. Размеры эффекта
        if (methodsUsed.effectSize.size > 0) {
            let esParts = [];
             if (methodsUsed.effectSize.has("Cohen's d")) esParts.push(t('methodsESCohensD')); // "d Коэна (для t-теста)"
             if (methodsUsed.effectSize.has("rank-biserial r")) esParts.push(t('methodsESRankBiserial')); // "рангово-бисериальная корреляция (для U-теста Манна-Уитни)"
             if (methodsUsed.effectSize.has("η²")) esParts.push(t('methodsESEtaSq')); // "эта-квадрат (η², для ANOVA)"
             if (methodsUsed.effectSize.has("ω²")) esParts.push(t('methodsESOmegaSq')); // "омега-квадрат (ω², для ANOVA)"
             if (methodsUsed.effectSize.has("ε²")) esParts.push(t('methodsESEpsilonSq')); // "эпсилон-квадрат (ε², для теста Краскела-Уоллиса)"
             if (methodsUsed.effectSize.has("Cramer's V")) esParts.push(t('methodsESCramersV')); // "V Крамера (для хи-квадрат)"

            if (esParts.length > 0) {
                 text += t('methodsESPrefix') + " " + esParts.join(', ') + ".\n"; // "Для оценки величины эффекта рассчитывались следующие показатели: ..."
            }
        }

        // 7. Уровень значимости
        text += "\n" + t('methodsSignificanceLevel'); // "Статистически значимыми считались различия при p < 0.05."

        return text;
    }

    /**
     * Генерирует и скачивает отчет в формате HTML.
     */
    function exportToHtml() {
        const reportData = getReport();
        if (reportData.length === 0) {
            alert(t('reportIsEmpty'));
            return;
        }

        // --- Генерируем текст раздела Методы ---
        const methodsSectionText = generateMethodsSectionText();
        // --- Конец генерации ---

        let htmlContent = `
<!DOCTYPE html>
<html lang="${window.currentLanguage || 'ru'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('reportTitle')}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; max-width: 1000px; margin: auto; }
        h1, h2, h3 { color: #333; margin-top: 1.5em; }
        h1 { font-size: 1.8em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; } /* Для заголовков таблиц/рисунков */
        h3 { font-size: 1.2em; } /* Для подзаголовков типа "Находка X" */
        .report-item { margin-bottom: 2em; page-break-inside: avoid; }
        .text-finding { white-space: pre-wrap; background-color: #f9f9f9; border: 1px solid #eee; padding: 10px; border-radius: 4px; }
        .figure-container { text-align: center; margin-top: 1em; }
        .figure-container img { max-width: 100%; height: auto; border: 1px solid #ccc; margin-bottom: 0.5em; }
        .figure-caption { font-size: 0.9em; font-style: italic; margin-top: 0; color: #555; }
        .table-container { margin-top: 1em; overflow-x: auto; } /* Добавляем прокрутку для широких таблиц */
        table { width: 100%; border-collapse: collapse; margin-bottom: 0.5em; font-size: 0.9em; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tbody tr:nth-child(even) { background-color: #f9f9f9; }
        .table-caption { font-size: 1.1em; font-weight: bold; margin-bottom: 0.5em; } /* Заголовок таблицы */
        .table-notes { font-size: 0.8em; margin-top: 0.5em; color: #666; white-space: pre-wrap; } /* Примечания к таблице */
        .methods-section { background-color: #f0f0f0; border: 1px solid #ccc; padding: 15px; margin-bottom: 2em; border-radius: 5px; font-size: 0.9em; white-space: pre-wrap; }
        .methods-section h2 { margin-top: 0; font-size: 1.3em; } /* Стиль для заголовка внутри блока */
    </style>
</head>
<body>
    <h1>${t('reportMainHeader')}</h1>

    {/* --- Вставляем раздел Методы --- */}
    <div class="methods-section">
      <h2>${t('reportMethodsTitle')}</h2> {/* "Методы статистического анализа" */}
      ${escapeHtml(methodsSectionText)}
    </div>
    {/* --- Конец раздела Методы --- */}

`; // Остальной HTML код начинается здесь

        let tableCounter = 0;
        reportData.forEach((item, index) => {
            htmlContent += `<div class="report-item">`;
            switch(item.type) {
                case 'text':
                    // Можно оставить H3 или убрать, если текст идет как пояснение к таблице/рисунку
                    htmlContent += `<h3>${t('reportFindingsHeader')} ${index + 1}</h3>`;
                    htmlContent += `<div class="text-finding">${escapeHtml(item.content)}</div>`;
                    break;
                case 'figure':
                    // Используем H2 для заголовка рисунка
                    htmlContent += `<h2>${escapeHtml(item.caption)}</h2>`;
                    htmlContent += `<div class="figure-container">`;
                    htmlContent += `<img src="${item.figureDataUrl}" alt="${escapeHtml(item.caption)}">`;
                    // Подпись теперь в H2, можно убрать <p>
                    // htmlContent += `<p class="figure-caption">${escapeHtml(item.caption)}</p>`;
                    htmlContent += `</div>`;
                    break;
                case 'table':
                    tableCounter++;
                    // Используем H2 для заголовка таблицы
                    const tableCaption = item.title || `${t('reportDefaultTableTitle') || 'Таблица'} ${tableCounter}`; // Используем переданный или дефолтный заголовок
                    htmlContent += `<h2 class="table-caption">${escapeHtml(tableCaption)}</h2>`;
                    htmlContent += `<div class="table-container">`;
                    htmlContent += `<table>`;
                    // Заголовки таблицы
                    if (item.headers && item.headers.length > 0) {
                        htmlContent += `<thead><tr>`;
                        item.headers.forEach(header => {
                            htmlContent += `<th>${escapeHtml(header)}</th>`;
                        });
                        htmlContent += `</tr></thead>`;
                    }
                    // Строки таблицы
                    if (item.rows && item.rows.length > 0) {
                        // Применяем rowspan к первому столбцу (индекс 0) данных таблицы
                        const processedRows = applyRowspan(item.rows, 0); 
                        
                        htmlContent += `<tbody>`;
                        // Используем processedRows для генерации HTML
                        processedRows.forEach(row => {
                            htmlContent += `<tr>`;
                            row.forEach(cell => {
                                // Проверяем, является ли ячейка объектом, созданным applyRowspan
                                if (typeof cell === 'object' && cell !== null) {
                                    if (cell.hidden) {
                                        // Пропускаем рендеринг скрытых ячеек
                                        return; 
                                    }
                                    // Добавляем атрибут rowspan, если он есть
                                    const rowspanAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '';
                                    // Обрабатываем возможное вложение (например, из TableComponent)
                                     const cellContent = (typeof cell.content === 'object' && cell.content !== null && cell.content.content !== undefined) 
                                                       ? escapeHtml(cell.content.content) 
                                                       : escapeHtml(cell.content);
                                     const cellClass = (typeof cell.content === 'object' && cell.content !== null && cell.content.className)
                                                       ? ` class="${cell.content.className}"`
                                                       : '';
                                     htmlContent += `<td${rowspanAttr}${cellClass}>${cellContent}</td>`;
                                } else {
                                     // Обычная ячейка
                                     htmlContent += `<td>${escapeHtml(cell)}</td>`;
                                }
                            });
                            htmlContent += `</tr>`;
                        });
                        htmlContent += `</tbody>`;
                    }
                    htmlContent += `</table>`;
                    // Примечания к таблице
                    if (item.notes) {
                       htmlContent += `<div class="table-notes"><strong>${t('reportNotesLabel') || 'Примечания:'}</strong>\n${escapeHtml(item.notes)}</div>`;
                    }
                    htmlContent += `</div>`;
                    break;
                default:
                    htmlContent += `<p><i>[${t('reportUnknownItem')}: ${escapeHtml(item.type)}]</i></p>`;
            }
            htmlContent += `</div>`;
        });

        htmlContent += `
</body>
</html>`;

        try {
            // Предпросмотр отчета в новой вкладке
            const previewWindow = window.open();
            if (previewWindow) {
                previewWindow.document.write(htmlContent);
                previewWindow.document.close();
            } else {
                console.warn('Не удалось открыть новое окно для предпросмотра отчета');
                // Показываем пользователю уведомление о блокировке всплывающих окон
                const notification = document.createElement('div');
                notification.style.position = 'fixed';
                notification.style.top = '20px';
                notification.style.left = '50%';
                notification.style.transform = 'translateX(-50%)';
                notification.style.backgroundColor = '#f8d7da';
                notification.style.color = '#721c24';
                notification.style.padding = '15px';
                notification.style.borderRadius = '5px';
                notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
                notification.style.zIndex = '9999';
                notification.innerHTML = `
                    <p><strong>Предпросмотр отчета заблокирован!</strong></p>
                    <p>Ваш браузер заблокировал всплывающее окно с предпросмотром отчета.</p>
                    <p>Отчет был скачан автоматически. Откройте его для просмотра.</p>
                    <p>Или разрешите всплывающие окна для этого сайта и нажмите кнопку ниже:</p>
                    <button id="retry-preview" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 10px;">Попробовать снова</button>
                `;
                document.body.appendChild(notification);
                
                // Добавляем кнопку для повторной попытки
                document.getElementById('retry-preview').addEventListener('click', function() {
                    document.body.removeChild(notification);
                    exportToHtml(); // Вызываем функцию снова
                });
                
                // Автоматически скрываем уведомление через 10 секунд
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 10000);
            }
        } catch (error) {
            console.error('Ошибка при открытии окна предпросмотра:', error);
        }

        // Создаем Blob и ссылку для скачивания
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'statix_report.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Освобождаем память
    }

     /**
     * Вспомогательная функция для экранирования HTML.
     * @param {string} unsafe - Строка с потенциально небезопасными символами.
     * @returns {string} Экранированная строка.
     */
     function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }


    // --- TODO: Функции экспорта в другие форматы ---
    function exportToPdf() {
        alert("Экспорт в PDF пока не реализован.");
        // Потребуется библиотека типа jsPDF или pdfmake
    }

    function exportToDocx() {
        alert("Экспорт в Word (.docx) пока не реализован.");
        // Потребуется библиотека типа docx, PptxGenJS (для docx может быть сложнее чисто на клиенте) или html-to-docx-buffer
    }

    function exportToPptx() {
        alert("Экспорт в PowerPoint (.pptx) пока не реализован.");
        // Потребуется библиотека типа PptxGenJS
    }

    // ---- Вспомогательная функция для применения rowspan ----
    /**
     * Обрабатывает строки таблицы для применения rowspan к указанному столбцу.
     * @param {Array<Array<any>>} tableRows - Массив строк таблицы.
     * @param {number} columnIndex - Индекс столбца для объединения (по умолчанию 0).
     * @returns {Array<Array<any|object>>} Обработанный массив строк, где объединенные ячейки представлены объектами.
     */
    function applyRowspan(tableRows, columnIndex = 0) {
        if (!tableRows || tableRows.length === 0) return [];
        
        const processedRows = tableRows.map(row => [...row]); // Создаем копию
        let lastValue = null;
        let rowspanStartIndex = -1;
        let currentRunLength = 0;

        for (let i = 0; i < processedRows.length; i++) {
            const row = processedRows[i];
            // Проверяем, что в строке есть столбец с нужным индексом
            if (row.length <= columnIndex) continue; 
            
            const cellValue = (typeof row[columnIndex] === 'object' && row[columnIndex] !== null) 
                              ? row[columnIndex].content // Если уже объект, берем content
                              : row[columnIndex];

            if (i === 0 || cellValue !== lastValue) {
                // Закончился предыдущий блок или начало таблицы
                if (currentRunLength > 1 && rowspanStartIndex !== -1) {
                    // Применяем rowspan к первой ячейке предыдущего блока
                    processedRows[rowspanStartIndex][columnIndex] = {
                        content: lastValue,
                        rowspan: currentRunLength
                    };
                    // Помечаем остальные ячейки блока как скрытые
                    for (let j = rowspanStartIndex + 1; j < i; j++) {
                         processedRows[j][columnIndex] = { content: '', hidden: true };
                    }
                }
                // Начинаем новый блок
                lastValue = cellValue;
                rowspanStartIndex = i;
                currentRunLength = 1;
            } else {
                // Продолжаем текущий блок
                currentRunLength++;
            }
        }

        // Обрабатываем последний блок, если он был
        if (currentRunLength > 1 && rowspanStartIndex !== -1) {
             processedRows[rowspanStartIndex][columnIndex] = {
                content: lastValue,
                rowspan: currentRunLength
            };
             for (let j = rowspanStartIndex + 1; j < processedRows.length; j++) {
                 processedRows[j][columnIndex] = { content: '', hidden: true };
            }
        }

        return processedRows;
    }
    // ---- Конец вспомогательной функции ----

    // Открытый интерфейс модуля
    return {
        addToReport,
        clearReport,
        getReport,
        generateFindingsText,
        generateFigurePng,
        generateMethodsSectionText,
        exportToHtml,
        exportToPdf,
        exportToDocx,
        exportToPptx
    };

})();

// Не забудьте подключить этот файл в statix.html
// <script src="reportGenerator.js"></script>
// И убедитесь, что он загружается ПОСЛЕ i18n.js, если используете t() внутри него. 