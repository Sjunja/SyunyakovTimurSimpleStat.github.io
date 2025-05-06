window.effectSize = {
  // Cohen's d для t-теста
  cohensD: function(group1Values, group2Values) {
    const n1 = group1Values.length;
    const n2 = group2Values.length;
    const mean1 = statUtils.mean(group1Values);
    const mean2 = statUtils.mean(group2Values);
    const var1 = statUtils.variance(group1Values);
    const var2 = statUtils.variance(group2Values);
    const pooledSD = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
    return Math.abs(mean1 - mean2) / pooledSD;
  },
  // Интерпретация Cohen's d
  interpretCohensD: function(d) {
    if (d < 0.2) return window.t('effectSizeNegligible');
    if (d < 0.5) return window.t('effectSizeSmall');
    if (d < 0.8) return window.t('effectSizeMedium');
    return window.t('effectSizeLarge');
  },
  // Hedge's g - корректировка Cohen's d для малых выборок
  hedgesG: function(group1Values, group2Values) {
    const n1 = group1Values.length;
    const n2 = group2Values.length;
    const d = this.cohensD(group1Values, group2Values);
    // Корректирующий фактор для малых выборок
    const correctionFactor = 1 - (3 / (4 * (n1 + n2 - 2) - 1));
    return d * correctionFactor;
  },
  // r для U-теста Манна-Уитни
  rankBiserial: function(U, n1, n2) {
    return 1 - (2 * U) / (n1 * n2);
  },
  // Интерпретация rank-biserial r
  interpretRankBiserial: function(r) {
    const absR = Math.abs(r);
    if (absR < 0.2) return window.t('effectSizeNegligible');
    if (absR < 0.3) return window.t('effectSizeSmall');
    if (absR < 0.5) return window.t('effectSizeMedium');
    return window.t('effectSizeLarge');
  },
  // η² (eta squared) для ANOVA
  etaSquared: function(groupArrays, totalValues) {
    const grandMean = statUtils.mean(totalValues);
    let ssb = 0;
    let sst = 0;
    groupArrays.forEach(group => {
      if (group.length > 0) {
        const groupMean = statUtils.mean(group);
        ssb += group.length * Math.pow(groupMean - grandMean, 2);
      }
    });
    totalValues.forEach(value => {
      sst += Math.pow(value - grandMean, 2);
    });
    return ssb / sst;
  },
  // ω² (omega squared) - менее смещенная оценка для ANOVA
  omegaSquared: function(groupArrays, totalValues, F) {
    const k = groupArrays.length; // количество групп
    const n = totalValues.length; // общее количество наблюдений
    const etaSq = this.etaSquared(groupArrays, totalValues);
    
    // Вычисляем dfb (степени свободы между группами) и dfw (степени свободы внутри групп)
    const dfb = k - 1;
    const dfw = n - k;
    
    // Формула для ω²
    return (dfb * (F - 1)) / (dfb * (F - 1) + n);
  },
  // Интерпретация η² и ω²
  interpretEtaSquared: function(eta2) {
    if (eta2 < 0.01) return window.t('effectSizeNegligible');
    if (eta2 < 0.06) return window.t('effectSizeSmall');
    if (eta2 < 0.14) return window.t('effectSizeMedium');
    return window.t('effectSizeLarge');
  },
  // ε² (epsilon squared) для теста Краскела-Уоллиса
  epsilonSquared: function(H, n) {
    return H / (n * n / (n + 1));
  },
  // Интерпретация ε²
  interpretEpsilonSquared: function(epsilon2) {
    if (epsilon2 < 0.01) return window.t('effectSizeNegligible');
    if (epsilon2 < 0.04) return window.t('effectSizeSmall');
    if (epsilon2 < 0.16) return window.t('effectSizeMedium');
    return window.t('effectSizeLarge');
  },
  // Крамера V для хи-квадрат теста
  cramersV: function(chiSquare, n, minDimension) {
    return Math.sqrt(chiSquare / (n * (minDimension - 1)));
  },
  // Интерпретация Cramer's V
  interpretCramersV: function(v, df) {
    // df - минимальное количество категорий минус 1
    if (df === 1) {
      // для таблиц 2x2
      if (v < 0.1) return window.t('effectSizeNegligible');
      if (v < 0.3) return window.t('effectSizeSmall');
      if (v < 0.5) return window.t('effectSizeMedium');
      return window.t('effectSizeLarge');
    } else if (df === 2) {
      // для таблиц 3x2, 2x3
      if (v < 0.07) return window.t('effectSizeNegligible');
      if (v < 0.21) return window.t('effectSizeSmall');
      if (v < 0.35) return window.t('effectSizeMedium');
      return window.t('effectSizeLarge');
    } else {
      // для больших таблиц
      if (v < 0.06) return window.t('effectSizeNegligible');
      if (v < 0.17) return window.t('effectSizeSmall');
      if (v < 0.29) return window.t('effectSizeMedium');
      return window.t('effectSizeLarge');
    }
  },
  // Phi коэффициент для таблиц 2x2
  phi: function(chiSquare, n) {
    return Math.sqrt(chiSquare / n);
  },
  // Интерпретация Phi
  interpretPhi: function(phi) {
    if (phi < 0.1) return window.t('effectSizeNegligible');
    if (phi < 0.3) return window.t('effectSizeSmall');
    if (phi < 0.5) return window.t('effectSizeMedium');
    return window.t('effectSizeLarge');
  },
  // Коэффициент корреляции Пирсона
  pearsonR: function(xValues, yValues) {
    const n = xValues.length;
    if (n !== yValues.length || n === 0) return NaN;
    
    const xMean = statUtils.mean(xValues);
    const yMean = statUtils.mean(yValues);
    
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    return numerator / Math.sqrt(xDenominator * yDenominator);
  },
  // Интерпретация коэффициента корреляции
  interpretCorrelation: function(r) {
    const absR = Math.abs(r);
    if (absR < 0.1) return window.t('correlationNegligible');
    if (absR < 0.3) return window.t('correlationWeak');
    if (absR < 0.5) return window.t('correlationModerate');
    if (absR < 0.7) return window.t('correlationStrong');
    return window.t('correlationVeryStrong');
  },
  // Коэффициент корреляции Спирмена (ранговая корреляция)
  spearmanRho: function(xValues, yValues) {
    const n = xValues.length;
    if (n !== yValues.length || n === 0) return NaN;
    
    // Получаем ранги
    const xWithIndices = xValues.map((value, index) => ({ value, index }));
    const yWithIndices = yValues.map((value, index) => ({ value, index }));
    
    xWithIndices.sort((a, b) => a.value - b.value);
    yWithIndices.sort((a, b) => a.value - b.value);
    
    const xRanks = new Array(n);
    const yRanks = new Array(n);
    
    // Присваиваем ранги с учетом связей
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && xWithIndices[j].value === xWithIndices[i].value) j++;
      const rank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) {
        xRanks[xWithIndices[k].index] = rank;
      }
      i = j;
    }
    
    i = 0;
    while (i < n) {
      let j = i;
      while (j < n && yWithIndices[j].value === yWithIndices[i].value) j++;
      const rank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) {
        yRanks[yWithIndices[k].index] = rank;
      }
      i = j;
    }
    
    // Вычисляем сумму квадратов разностей рангов
    let d2 = 0;
    for (let i = 0; i < n; i++) {
      d2 += Math.pow(xRanks[i] - yRanks[i], 2);
    }
    
    // Формула для коэффициента корреляции Спирмена
    return 1 - (6 * d2) / (n * (n * n - 1));
  }
}; 