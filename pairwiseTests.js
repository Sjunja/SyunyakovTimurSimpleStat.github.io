window.pairwiseTests = {
  // --- Параметрические попарные сравнения ---
  
  // Параметрические попарные сравнения для ANOVA (Tukey, Scheffe, LSD)
  computeParametric: function(variable, groups, groupArrays, groupNames) {
    const method = window.pairwiseComparisonMethod ? window.pairwiseComparisonMethod.parametric : 'tukey';
    const comparisons = [];
    
    const n = groupArrays.map(arr => arr.length);
    const means = groupArrays.map(arr => statUtils.mean(arr));
    const pooledVariance = this.calculatePooledVariance(groupArrays);
    const mse = pooledVariance; // Mean Square Error
    
    // Рассчитываем критическое значение в зависимости от метода
    const dfTotal = groupArrays.flat().length - 1;
    const dfError = dfTotal - (groupNames.length - 1);
    
    // Проходим через все возможные пары групп
    for (let i = 0; i < groupNames.length; i++) {
      for (let j = i + 1; j < groupNames.length; j++) {
        const meanDiff = Math.abs(means[i] - means[j]);
        const se = Math.sqrt(mse * (1/n[i] + 1/n[j])); // Стандартная ошибка разности
        
        let criticalValue, statistic, pValue;
        
        switch (method) {
          case 'tukey':
            // Метод Тьюки (Studentized Range)
            const q = meanDiff / se;
            statistic = q;
            // Аппроксимация p-значения для q-распределения
            pValue = 1 - statUtils.normcdf(q / Math.sqrt(2));
            break;
            
          case 'scheffe':
            // Метод Шеффе
            const f = Math.pow(meanDiff / se, 2) * (groupNames.length - 1);
            statistic = f;
            pValue = 1 - statUtils.chicdf(f, groupNames.length - 1);
            break;
            
          case 'lsd':
            // Метод Fisher's LSD (по сути t-тест без поправки на множественные сравнения)
            const t = meanDiff / se;
            statistic = t;
            pValue = 2 * (1 - statUtils.tcdf(Math.abs(t), dfError));
            break;
            
          default: // 'tukey' по умолчанию
            const qDefault = meanDiff / se;
            statistic = qDefault;
            pValue = 1 - statUtils.normcdf(qDefault / Math.sqrt(2));
        }
        
        comparisons.push({
          group1: groupNames[i],
          group2: groupNames[j],
          meanDiff: meanDiff,
          se: se,
          statistic: statistic,
          method: method,
          pValue: pValue
        });
      }
    }
    
    // Применение поправки на множественные сравнения
    if (method !== 'lsd') {
      // Для методов, которые уже учитывают множественные сравнения, 
      // дополнительная коррекция не нужна
      return this.formatResults(comparisons);
    }
    
    // Для LSD применим поправку Бонферрони
    const totalComparisons = comparisons.length;
    comparisons.forEach(comp => {
      comp.pValue = Math.min(1.0, comp.pValue * totalComparisons);
    });
    
    return this.formatResults(comparisons);
  },
  
  // --- Непараметрические попарные сравнения ---
  
  // Непараметрические попарные сравнения для Kruskal-Wallis (Dunn, Steel-Dwass)
  computeNonParametric: function(variable, groups, groupArrays, groupNames) {
    const method = window.pairwiseComparisonMethod ? window.pairwiseComparisonMethod.nonParametric : 'dunn';
    const comparisons = [];
    
    // Объединяем все значения для расчета рангов
    const allValues = groupArrays.flat();
    const ranks = statUtils.calculateRanks(allValues);
    
    // Расчет средних рангов для каждой группы
    let currentIndex = 0;
    const meanRanks = [];
    const groupSizes = [];
    
    groupArrays.forEach(group => {
      const groupRanks = ranks.slice(currentIndex, currentIndex + group.length);
      meanRanks.push(groupRanks.reduce((a, b) => a + b, 0) / group.length);
      groupSizes.push(group.length);
      currentIndex += group.length;
    });
    
    const n = allValues.length;
    
    // Попарные сравнения
    for (let i = 0; i < groupNames.length; i++) {
      for (let j = i + 1; j < groupNames.length; j++) {
        const meanRankDiff = Math.abs(meanRanks[i] - meanRanks[j]);
        let statistic, pValue, se;
        
        if (method === 'dunn') {
          // Метод Данна
          se = Math.sqrt((n * (n + 1) / 12) * (1/groupSizes[i] + 1/groupSizes[j]));
          statistic = meanRankDiff / se;
          pValue = 2 * (1 - statUtils.normcdf(Math.abs(statistic)));
        } else { // 'steel-dwass'
          // Метод Steel-Dwass-Critchlow-Flinger
          // Для этого метода используем модифицированную статистику
          se = Math.sqrt((n * (n + 1) / 12) * (1/groupSizes[i] + 1/groupSizes[j]));
          statistic = meanRankDiff / se;
          // Статистика будет иметь примерно t-распределение
          const df = n - groupNames.length;
          pValue = 2 * (1 - statUtils.tcdf(Math.abs(statistic), df));
        }
        
        comparisons.push({
          group1: groupNames[i],
          group2: groupNames[j],
          meanRankDiff: meanRankDiff,
          se: se,
          statistic: statistic,
          method: method,
          pValue: pValue
        });
      }
    }
    
    // Применение поправки Бонферрони для обоих методов
    const totalComparisons = comparisons.length;
    comparisons.forEach(comp => {
      comp.pValue = Math.min(1.0, comp.pValue * totalComparisons);
    });
    
    return this.formatResults(comparisons);
  },
  
  // --- Вспомогательные функции ---
  
  // Расчет объединенной дисперсии
  calculatePooledVariance: function(groupArrays) {
    let sumSquaredDeviations = 0;
    let dfTotal = 0;
    
    groupArrays.forEach(group => {
      if (group.length <= 1) return;
      
      const mean = statUtils.mean(group);
      group.forEach(value => {
        sumSquaredDeviations += Math.pow(value - mean, 2);
      });
      dfTotal += group.length - 1;
    });
    
    return sumSquaredDeviations / dfTotal;
  },
  
  // Форматирование результатов попарных сравнений
  formatResults: function(comparisons) {
    return comparisons.map(comp => {
      // Обеспечиваем, что p-значение находится в диапазоне [0, 1]
      const pValue = Math.min(1.0, Math.max(0.0, comp.pValue || 0));
      
      // Округляем числовые значения для лучшей читаемости
      return {
        ...comp,
        pValue: pValue,
        se: comp.se ? Number(comp.se.toFixed(4)) : undefined,
        statistic: comp.statistic ? Number(comp.statistic.toFixed(4)) : undefined,
        meanDiff: comp.meanDiff ? Number(comp.meanDiff.toFixed(4)) : undefined,
        meanRankDiff: comp.meanRankDiff ? Number(comp.meanRankDiff.toFixed(4)) : undefined
      };
    });
  }
}; 