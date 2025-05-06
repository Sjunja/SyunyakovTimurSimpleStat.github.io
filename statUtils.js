window.statUtils = {
  // --- Базовые статистики ---
  mean: function(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return NaN; // Проверка на массив
    let sum = 0;
    let count = 0;
    for (const val of arr) {
        if (typeof val === 'number' && isFinite(val)) {
            sum += val;
            count++;
        }
    }
    return count > 0 ? sum / count : NaN;
  },
  variance: function(arr) {
    if (!Array.isArray(arr) || arr.length <= 1) return NaN;
    const mean = this.mean(arr);
    if (isNaN(mean)) return NaN;
    let sumSq = 0;
    let count = 0;
    for (const val of arr) {
         if (typeof val === 'number' && isFinite(val)) {
            sumSq += Math.pow(val - mean, 2);
            count++;
        }
    }
    return count > 1 ? sumSq / (count - 1) : NaN;
  },
  std: function(arr) {
    const variance = this.variance(arr);
    return isNaN(variance) ? NaN : Math.sqrt(variance);
  },
  skewness: function(arr) {
    if (!Array.isArray(arr) || arr.length < 3) return NaN; // Нужно хотя бы 3 точки
    const mean = this.mean(arr);
    const std = this.std(arr);
    if (isNaN(mean) || isNaN(std) || std === 0) return NaN;
    const n = arr.length;
    let sum = 0;
    let count = 0;
     for (const val of arr) {
         if (typeof val === 'number' && isFinite(val)) {
            sum += Math.pow((val - mean) / std, 3);
            count++;
        }
    }
    if (count < 3) return NaN;
    // Используем формулу для несмещенной оценки
    return (n / ((n - 1) * (n - 2))) * sum;
  },
  kurtosis: function(arr) {
    if (!Array.isArray(arr) || arr.length < 4) return NaN; // Нужно хотя бы 4 точки
    const mean = this.mean(arr);
    const std = this.std(arr);
     if (isNaN(mean) || isNaN(std) || std === 0) return NaN;
    const n = arr.length;
    let sum = 0;
    let count = 0;
    for (const val of arr) {
         if (typeof val === 'number' && isFinite(val)) {
            sum += Math.pow((val - mean) / std, 4);
            count++;
        }
    }
     if (count < 4) return NaN;
    // Формула для эксцесса (избыточного куртозиса), несмещенная оценка
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum;
    const term2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 - term2;
  },
  median: function(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return NaN;
    const sorted = arr.filter(val => typeof val === 'number' && isFinite(val)).sort((a, b) => a - b);
    if (sorted.length === 0) return NaN;
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  },
  quantile: function(arr, q) {
    if (!Array.isArray(arr) || arr.length === 0 || typeof q !== 'number' || q < 0 || q > 1) return NaN;
    const sorted = arr.filter(val => typeof val === 'number' && isFinite(val)).sort((a, b) => a - b);
     if (sorted.length === 0) return NaN;
    // Используем метод интерполяции R-7 (по умолчанию в R и Python/numpy)
    const index = q * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
        return sorted[lower];
    }
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  },
  erf: function(x) {
    // Функция ошибок (аппроксимация Abramowitz and Stegun 7.1.26)
    if (typeof x !== 'number' || !isFinite(x)) return NaN;
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  },
  gamma: function(z) {
     // Аппроксимация Ланцоша для гамма-функции
     if (typeof z !== 'number' || !isFinite(z)) return NaN;
     // Коэффициенты для g=5, n=7
     const p = [
         0.99999999999980993,
         676.5203681218851,
         -1259.1392167224028,
         771.32342877765313,
         -176.61502916214059,
         12.507343278686905,
         -0.13857109526572012,
         9.9843695780195716e-6,
         1.5056327351493116e-7
     ];
     const g = 7;
     const EPSILON = 1e-7;

     if (z < 0.5) {
         // Используем формулу отражения
         return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
     }

     z -= 1.0;
     let x = p[0];
     for (let i = 1; i < p.length; ++i) {
         x += p[i] / (z + i);
     }
     let t = z + g + 0.5;
     return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  },
  calculateRanks: function(values) {
    if (!Array.isArray(values)) return [];
    const validValues = values
        .map((value, index) => ({ value, originalIndex: index }))
        .filter(item => typeof item.value === 'number' && isFinite(item.value));

    if (validValues.length === 0) return new Array(values.length).fill(NaN);

    validValues.sort((a, b) => a.value - b.value);

    const ranks = new Array(values.length).fill(NaN);
    let i = 0;
    while (i < validValues.length) {
      let j = i;
      // Находим группу связанных рангов
      while (j < validValues.length - 1 && validValues[j].value === validValues[j + 1].value) {
        j++;
      }
      // Вычисляем средний ранг (ранги начинаются с 1)
      const avgRank = (i + 1 + j + 1) / 2;
      // Присваиваем ранг всем элементам в группе
      for (let k = i; k <= j; k++) {
        ranks[validValues[k].originalIndex] = avgRank;
      }
      i = j + 1;
    }
    return ranks;
  },

  // --- Функции, перенесенные из normalityTests.js ---

  // Логарифм гамма-функции (аппроксимация Ланцоша)
  gammaln: function(z) {
    if (typeof z !== 'number' || !isFinite(z)) return NaN;
    if (z <= 0) return NaN; // gammaln не определен для z <= 0

    const p = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    const g = 7;
    let x = p[0];
    let tmp = z;

    if (z < 0.5) {
         // Используем формулу отражения: Gamma(z) = PI / (sin(PI*z) * Gamma(1-z))
         // Log(Gamma(z)) = Log(PI) - Log(sin(PI*z)) - Log(Gamma(1-z))
         const logSin = Math.log(Math.abs(Math.sin(Math.PI * z))); // Берем abs, т.к. sin может быть < 0
         // Рекурсивный вызов для 1-z
         const logGamma1mz = this.gammaln(1 - z);
         if (isNaN(logGamma1mz)) return NaN;
         return Math.log(Math.PI) - logSin - logGamma1mz;
    }

    tmp -= 1.0;
    for (let i = 1; i < p.length; i++) {
        x += p[i] / (tmp + i);
    }
    let t = tmp + g + 0.5;
    // Log(Gamma(z)) = (z-0.5)*Log(t) - t + Log(sqrt(2*PI)*x)
    return (z - 0.5) * Math.log(t) - t + Math.log(Math.sqrt(2 * Math.PI) * x);
  },

  // Продолжающаяся дробь для неполной бета-функции (метод Ленца)
  betacf: function(x, a, b) {
    const MAXIT = 100; // Макс. итераций
    const EPS = 3e-7;   // Точность
    const FPMIN = 1e-30; // Малое число для избежания деления на ноль

    let qab = a + b;
    let qap = a + 1.0;
    let qam = a - 1.0;
    let c = 1.0;
    let d = 1.0 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1.0 / d;
    let h = d;

    for (let m = 1; m <= MAXIT; m++) {
        let m2 = m * 2;
        // Четная итерация
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1.0 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1.0 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1.0 / d;
        h *= d * c;

        // Нечетная итерация
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (a + m2 + 1.0));
        d = 1.0 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1.0 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1.0 / d;
        let del = d * c;
        h *= del;

        // Проверка сходимости
        if (Math.abs(del - 1.0) < EPS) break;
         if (m === MAXIT) console.warn("betacf не сошелся за MAXIT итераций");
    }
    return h;
  },

  // Регуляризованная неполная бета-функция I_x(a, b)
  ibeta: function(x, a, b) {
    if (x < 0.0 || x > 1.0 || a <= 0.0 || b <= 0.0) {
        console.warn("Некорректные входные данные для ibeta", {x, a, b});
        return NaN;
    }
    if (x === 0.0) return 0.0;
    if (x === 1.0) return 1.0;

    // Вычисление Log(Beta(a,b))
    const logBeta = this.gammaln(a) + this.gammaln(b) - this.gammaln(a + b);
    if (isNaN(logBeta)) return NaN;

    // Используем симметрию для повышения точности
    if (x < (a + 1.0) / (a + b + 2.0)) {
        // Вычисляем I_x(a,b) через betacf
        const front = Math.exp(a * Math.log(x) + b * Math.log(1.0 - x) - logBeta) / a;
        return front * this.betacf(x, a, b);
    } else {
        // Вычисляем I_x(a,b) как 1 - I_{1-x}(b, a)
        const front = Math.exp(b * Math.log(1.0 - x) + a * Math.log(x) - logBeta) / b; // front для I_{1-x}(b,a)
        return 1.0 - front * this.betacf(1.0 - x, b, a);
    }
  },

  // Кумулятивная функция стандартного нормального распределения (использует erf)
  normcdf: function(x) {
    if (typeof x !== 'number' || !isFinite(x)) return NaN;
    // CDF Phi(x) = 0.5 * (1 + erf(x / sqrt(2)))
    return 0.5 * (1 + this.erf(x / Math.SQRT2));
  },

  // Кумулятивная функция t-распределения Стьюдента
  tcdf: function(t, df) {
    if (isNaN(t) || isNaN(df) || df <= 0) return NaN;
    // CDF F(x, d1, d2) = I_y(d1/2, d2/2) где y = (d1*x) / (d1*x + d2)
    const x = df / (df + t * t);
    // Передаем параметры ibeta как ibeta(x, a, b)
    const p = this.ibeta(x, df / 2.0, 0.5); 
    if (isNaN(p)) return NaN;
    return t > 0 ? 1.0 - 0.5 * p : 0.5 * p;
  },

  // Нижняя неполная гамма-функция P(a, x) = gammainc(x, a) * Gamma(a)
  // Регуляризованная нижняя неполная гамма-функция: gammainc(a, x) = P(a,x) / Gamma(a)
  // Реализация через ряды и непрерывные дроби (из Numerical Recipes)
  gammainc: function(x, a) {
    if (x < 0 || a <= 0) {
      console.warn("Некорректные входные данные для gammainc", {x, a});
      return NaN;
    }
    const logGammaA = this.gammaln(a);
    if (isNaN(logGammaA)) return NaN;

    if (x === 0) return 0.0;

    let result;
    if (x < a + 1.0) {
        // Используем разложение в ряд Серра
        let ap = a;
        let sum = 1.0 / a;
        let del = sum;
        for (let n = 1; n <= 100; n++) {
            ap += 1.0;
            del *= x / ap;
            sum += del;
            if (Math.abs(del) < Math.abs(sum) * 3e-7) {
                result = sum * Math.exp(-x + a * Math.log(x) - logGammaA);
                return Math.min(1.0, Math.max(0.0, result)); // Ограничиваем 0..1
            }
        }
        console.warn("Ряд для gammainc не сошелся");
        return NaN; // Ряд не сошелся
    } else {
        // Используем разложение в непрерывную дробь Лежандра
        const FPMIN = 1e-30;
        let b = x + 1.0 - a;
        let c = 1.0 / FPMIN;
        let d = 1.0 / b;
        let h = d;
        let an;
        for (let i = 1; i <= 100; i++) {
            an = -i * (i - a);
            b += 2.0;
            d = an * d + b;
            if (Math.abs(d) < FPMIN) d = FPMIN;
            c = b + an / c;
            if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1.0 / d;
            let del = d * c;
            h *= del;
            if (Math.abs(del - 1.0) < 3e-7) {
                 result = 1.0 - Math.exp(-x + a * Math.log(x) - logGammaA) * h;
                 return Math.min(1.0, Math.max(0.0, result)); // Ограничиваем 0..1
            }
        }
        console.warn("Непрерывная дробь для gammainc не сошлась");
        return NaN; // Дробь не сошлась
    }
  },

  // Кумулятивная функция хи-квадрат распределения
  chicdf: function(x, df) {
    if (isNaN(x) || isNaN(df) || x < 0 || df <= 0) return NaN;
    // CDF Chi^2(x, df) = P(df/2, x/2) = I_{x/(x+df)}(df/2, df/2)
    // Связь через неполную бета функцию (более стабильная, чем через gammainc)
    // Используем ibeta(y, a, b) где y = x / (x + df), a = df/2, b=0.5? Нет, b=df/2? Не сходится.
    // Ошибка в формуле в комментарии нового кода. Chi^2 CDF НЕ выражается напрямую через ibeta таким простым образом.
    // Оставим оригинальную реализацию через gammainc, так как она верна.
    return this.gammainc(x / 2.0, df / 2.0);
  },

  // Кумулятивная функция распределения Фишера (F-распределение)
  fcdf: function(x, df1, df2) {
    if (isNaN(x) || isNaN(df1) || isNaN(df2) || df1 <= 0 || df2 <= 0) return NaN;
    if (x < 0) return 0.0;
    // CDF F(x, d1, d2) = I_y(d1/2, d2/2) где y = (d1*x) / (d1*x + d2)
    let y = (df1 * x) / (df1 * x + df2);
    y = Math.min(1.0, Math.max(0.0, y)); 
    // Передаем параметры ibeta как ibeta(x, a, b)
    return this.ibeta(y, df1 / 2.0, df2 / 2.0);
  },

  // --- Старая gammaCDF (аппроксимация через ряд, менее точная) ---
  /* gammaCDF_old: function(x, a) {
    if (x <= 0) return 0;
    const epsilon = 1e-10;
    let sum = 1 / a; // Начинаем суммирование с первого члена ряда
    let term = 1 / a;
    for (let k = 1; k < 1000; k++) { // Начинаем цикл с k=1
      term *= x / (a + k);
      sum += term;
      if (Math.abs(term) < epsilon) break; // Проверяем абсолютное значение члена ряда
    }
    const gammaA = this.gamma(a);
    if (gammaA === 0) return NaN; // Избегаем деления на ноль
    // Формула в коде: (1 - e^-x * x^a * sum / Gamma(a)) - это 1 - Q(a,x) = P(a,x)
    const p_value = 1.0 - Math.exp(-x) * Math.pow(x, a) * sum / gammaA; 
    return Math.min(1.0, Math.max(0.0, p_value)); // Ограничиваем 0..1
  }, */

  // --- Функции метода Монте-Карло для непараметрических тестов ---
  
  // Генерация случайной перестановки массива
  shuffleArray: function(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Обмен элементов
    }
    return newArray;
  },
  
  // Основная функция Монте-Карло для непараметрических тестов
  computeMonteCarloTest: function(data, testStatisticFn, iterations = 10000) {
    // Вычисляем фактическую тестовую статистику
    const observedStatistic = testStatisticFn(data);
    
    // Счетчик для случаев, когда случайная статистика >= наблюдаемой
    let countExtreme = 0;
    
    // Выполняем указанное количество итераций
    for (let i = 0; i < iterations; i++) {
      // Генерируем перестановку данных
      const shuffledData = this.shuffleArray(data);
      
      // Вычисляем тестовую статистику для перемешанных данных
      const randomStatistic = testStatisticFn(shuffledData);
      
      // Увеличиваем счетчик, если случайная статистика больше или равна наблюдаемой
      // (или меньше или равна для некоторых тестов, в зависимости от определения testStatisticFn)
      if (randomStatistic >= observedStatistic) {
        countExtreme++;
      }
    }
    
    // Вычисляем p-значение как долю экстремальных случаев
    const pValue = countExtreme / iterations;
    
    return {
      observedStatistic,
      pValue,
      iterations
    };
  },
  
  // Реализация теста Манна-Уитни с использованием метода Монте-Карло
  mannWhitneyMonteCarlo: function(group1, group2, iterations = 10000) {
    if (!Array.isArray(group1) || !Array.isArray(group2) || group1.length === 0 || group2.length === 0) {
      return { error: "Некорректные входные данные для теста Манна-Уитни" };
    }
    
    // Фильтруем и проверяем данные
    const validGroup1 = group1.filter(val => typeof val === 'number' && isFinite(val));
    const validGroup2 = group2.filter(val => typeof val === 'number' && isFinite(val));
    
    if (validGroup1.length === 0 || validGroup2.length === 0) {
      return { error: "Недостаточно валидных данных для теста Манна-Уитни" };
    }
    
    // Объединяем данные для расчетов
    const allValues = [...validGroup1, ...validGroup2];
    const n1 = validGroup1.length;
    const n2 = validGroup2.length;
    
    // Создаем массив меток группы (1 для первой группы, 0 для второй)
    const groupLabels = [...Array(n1).fill(1), ...Array(n2).fill(0)];
    
    // Функция для расчета U-статистики
    const computeUStatistic = function(labels) {
      // Получаем данные группы 1 и группы 2 на основе меток
      const g1 = [];
      const g2 = [];
      
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] === 1) {
          g1.push(allValues[i]);
        } else {
          g2.push(allValues[i]);
        }
      }
      
      // Вычисляем ранги для всех значений
      const ranks = window.statUtils.calculateRanks(allValues);
      
      // Считаем сумму рангов для первой группы
      let rankSum1 = 0;
      let idx = 0;
      
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] === 1) {
          rankSum1 += ranks[i];
        }
      }
      
      // Вычисляем U-статистику
      const U1 = rankSum1 - (n1 * (n1 + 1)) / 2;
      const U2 = n1 * n2 - U1;
      const U = Math.min(U1, U2);
      
      return U;
    };
    
    // Выполняем тест Монте-Карло
    const result = this.computeMonteCarloTest(groupLabels, computeUStatistic, iterations);
    
    // Вычисляем Z-статистику для сравнения с асимптотическим приближением
    // Среднее и стандартное отклонение U при нулевой гипотезе
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const Z = (result.observedStatistic - meanU) / stdU;
    
    // Вычисляем p-значение по асимптотическому приближению
    let asymptotic_pValue;
    try {
      asymptotic_pValue = 2 * (1 - this.normcdf(Math.abs(Z)));
    } catch (e) {
      asymptotic_pValue = 2 * (1 - this.erf(Math.abs(Z) / Math.sqrt(2)));
    }
    
    return {
      method: "Mann-Whitney U test (Monte Carlo)",
      U: result.observedStatistic,
      Z: Z,
      pValue: result.pValue,
      asymptotic_pValue: asymptotic_pValue,
      iterations: result.iterations,
      n1: n1,
      n2: n2
    };
  },
  
  // Реализация теста Краскела-Уоллиса с использованием метода Монте-Карло
  kruskalWallisMonteCarlo: function(groups, iterations = 10000) {
    if (!Array.isArray(groups) || groups.length < 2) {
      return { error: "Необходимо как минимум 2 группы для теста Краскела-Уоллиса" };
    }
    
    // Фильтруем и проверяем данные групп
    const validGroups = groups.map(group => {
      if (!Array.isArray(group)) return [];
      return group.filter(val => typeof val === 'number' && isFinite(val));
    });
    
    // Проверяем, что в каждой группе есть данные
    const hasEmptyGroups = validGroups.some(group => group.length === 0);
    if (hasEmptyGroups) {
      return { error: "В одной или нескольких группах нет валидных данных" };
    }
    
    // Объединяем все значения для расчета рангов
    const allValues = [].concat(...validGroups);
    const groupSizes = validGroups.map(group => group.length);
    const totalSize = allValues.length;
    
    // Создаем массив с метками групп
    let groupLabels = [];
    for (let i = 0; i < validGroups.length; i++) {
      for (let j = 0; j < validGroups[i].length; j++) {
        groupLabels.push(i);
      }
    }
    
    // Функция для расчета H-статистики Краскела-Уоллиса
    const computeHStatistic = function(labels) {
      // Вычисляем ранги для всех значений
      const ranks = window.statUtils.calculateRanks(allValues);
      
      // Создаем новые группы на основе перестановки меток
      const newGroups = Array(groupSizes.length).fill().map(() => []);
      for (let i = 0; i < labels.length; i++) {
        const groupIdx = labels[i];
        newGroups[groupIdx].push(ranks[i]);
      }
      
      // Вычисляем сумму рангов для каждой группы
      const rankSums = newGroups.map(group => 
        group.reduce((sum, rank) => sum + rank, 0)
      );
      
      // Вычисляем H-статистику
      let hStat = 0;
      for (let i = 0; i < rankSums.length; i++) {
        hStat += Math.pow(rankSums[i], 2) / groupSizes[i];
      }
      
      hStat = (12 / (totalSize * (totalSize + 1))) * hStat - 3 * (totalSize + 1);
      return hStat;
    };
    
    // Выполняем тест Монте-Карло
    const result = this.computeMonteCarloTest(groupLabels, computeHStatistic, iterations);
    
    // Вычисляем p-значение по асимптотическому приближению
    const df = validGroups.length - 1;
    let asymptotic_pValue;
    try {
      asymptotic_pValue = 1 - this.chicdf(result.observedStatistic, df);
    } catch (e) {
      asymptotic_pValue = 1 - (1 / (1 + Math.exp(-(result.observedStatistic - df) / Math.sqrt(2 * df))));
    }
    
    return {
      method: "Kruskal-Wallis test (Monte Carlo)",
      H: result.observedStatistic,
      df: df,
      pValue: result.pValue,
      asymptotic_pValue: asymptotic_pValue,
      iterations: result.iterations,
      groupSizes: groupSizes
    };
  },
  
  // Реализация метода Монте-Карло для точного теста Фишера (для таблиц сопряженности)
  fisherExactMonteCarlo: function(table, iterations = 10000) {
    if (!Array.isArray(table) || !table.every(row => Array.isArray(row))) {
      return { error: "Неверный формат таблицы сопряженности" };
    }
    
    // Проверяем, что все значения в таблице - неотрицательные целые числа
    for (const row of table) {
      for (const cell of row) {
        if (!Number.isInteger(cell) || cell < 0) {
          return { error: "Таблица должна содержать только неотрицательные целые числа" };
        }
      }
    }
    
    // Вычисляем суммы по строкам и столбцам
    const rowSums = table.map(row => row.reduce((a, b) => a + b, 0));
    const colSums = Array(table[0].length).fill(0);
    for (let i = 0; i < table.length; i++) {
      for (let j = 0; j < table[i].length; j++) {
        colSums[j] += table[i][j];
      }
    }
    
    // Общая сумма
    const totalSum = rowSums.reduce((a, b) => a + b, 0);
    
    // Функция для расчета вероятности наблюдать данную таблицу
    // при фиксированных маргинальных суммах
    const computeTableProbability = function(t) {
      let numerator = 1;
      let denominator = 1;
      
      // Произведение факториалов сумм по строкам
      for (const rowSum of rowSums) {
        let factorial = 1;
        for (let i = 2; i <= rowSum; i++) {
          factorial *= i;
        }
        numerator *= factorial;
      }
      
      // Произведение факториалов сумм по столбцам
      for (const colSum of colSums) {
        let factorial = 1;
        for (let i = 2; i <= colSum; i++) {
          factorial *= i;
        }
        numerator *= factorial;
      }
      
      // Факториал общей суммы
      for (let i = 2; i <= totalSum; i++) {
        denominator *= i;
      }
      
      // Произведение факториалов значений в ячейках
      for (const row of t) {
        for (const cell of row) {
          let factorial = 1;
          for (let i = 2; i <= cell; i++) {
            factorial *= i;
          }
          denominator *= factorial;
        }
      }
      
      return numerator / denominator;
    };
    
    // Исходная вероятность наблюдаемой таблицы
    const observedProbability = computeTableProbability(table);
    
    // Генерация случайной таблицы с теми же маргинальными суммами
    const generateRandomTable = function() {
      const newTable = Array(table.length).fill().map(() => Array(table[0].length).fill(0));
      
      // Создаем копии сумм строк и столбцов
      const remainingRowSums = [...rowSums];
      const remainingColSums = [...colSums];
      
      // Заполняем таблицу, начиная с верхнего левого угла
      for (let i = 0; i < newTable.length - 1; i++) {
        for (let j = 0; j < newTable[0].length - 1; j++) {
          // Максимальное возможное значение для ячейки
          const maxPossible = Math.min(remainingRowSums[i], remainingColSums[j]);
          
          // Случайно выбираем значение для ячейки
          const value = Math.floor(Math.random() * (maxPossible + 1));
          
          newTable[i][j] = value;
          remainingRowSums[i] -= value;
          remainingColSums[j] -= value;
        }
        
        // Заполняем последний столбец для текущей строки
        newTable[i][newTable[0].length - 1] = remainingRowSums[i];
        remainingColSums[newTable[0].length - 1] -= remainingRowSums[i];
      }
      
      // Заполняем последнюю строку
      for (let j = 0; j < newTable[0].length; j++) {
        newTable[newTable.length - 1][j] = remainingColSums[j];
      }
      
      return newTable;
    };
    
    // Функция для проверки, является ли таблица более экстремальной
    const isMoreExtreme = function(t) {
      const prob = computeTableProbability(t);
      return prob <= observedProbability;
    };
    
    // Счетчик для более экстремальных таблиц
    let extremeCount = 1; // Включаем наблюдаемую таблицу
    
    // Выполняем Монте-Карло итерации
    for (let i = 0; i < iterations; i++) {
      const randomTable = generateRandomTable();
      if (isMoreExtreme(randomTable)) {
        extremeCount++;
      }
    }
    
    // Вычисляем p-значение
    const pValue = extremeCount / (iterations + 1);
    
    return {
      method: "Fisher's Exact Test (Monte Carlo)",
      pValue: pValue,
      iterations: iterations,
      observedTable: table,
      rowSums: rowSums,
      colSums: colSums
    };
  },

  // Mann-Whitney U test
  mannWhitneyTest: function(group1, group2) {
    // Проверяем, нужно ли использовать метод Монте-Карло
    if (this.useMonteCarloMethod) {
      return this.mannWhitneyMonteCarlo(group1, group2, this.monteCarloIterations);
    }
    
    // Существующий код для обычного теста Mann-Whitney
    if (!Array.isArray(group1) || !Array.isArray(group2) || group1.length === 0 || group2.length === 0) {
      return { error: "Некорректные входные данные для теста Манна-Уитни" };
    }
    
    // Фильтруем и проверяем данные
    const validGroup1 = group1.filter(val => typeof val === 'number' && isFinite(val));
    const validGroup2 = group2.filter(val => typeof val === 'number' && isFinite(val));
    
    if (validGroup1.length === 0 || validGroup2.length === 0) {
      return { error: "Недостаточно валидных данных для теста Манна-Уитни" };
    }
    
    // Объединяем данные для расчета рангов
    const allData = [...validGroup1, ...validGroup2];
    
    // Вычисляем ранги для всех значений
    const ranks = this.calculateRanks(allData);
    
    // Вычисляем сумму рангов для группы 1
    let rankSum1 = 0;
    for (let i = 0; i < validGroup1.length; i++) {
      rankSum1 += ranks[i];
    }
    
    // Размеры групп
    const n1 = validGroup1.length;
    const n2 = validGroup2.length;
    
    // Вычисляем U-статистику для обеих групп
    const U1 = rankSum1 - (n1 * (n1 + 1)) / 2;
    const U2 = n1 * n2 - U1;
    
    // Берем меньшее значение U как тестовую статистику
    const U = Math.min(U1, U2);
    
    // Для больших выборок используем нормальное приближение
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    
    // Вычисляем Z-статистику для больших выборок
    const Z = (U - meanU) / stdU;
    
    // Вычисляем p-значение с использованием нормального приближения для больших выборок
    let pValue;
    try {
      pValue = 2 * (1 - this.normcdf(Math.abs(Z)));
    } catch (e) {
      // Если функция нормального распределения недоступна, используем аппроксимацию
      pValue = 2 * (1 - this.erf(Math.abs(Z) / Math.sqrt(2)));
    }
    
    return {
      method: "Mann-Whitney U test",
      U: U,
      Z: Z,
      pValue: pValue,
      n1: n1,
      n2: n2
    };
  },
  
  // Kruskal-Wallis тест
  kruskalWallisTest: function(groups) {
    // Проверяем, нужно ли использовать метод Монте-Карло
    if (this.useMonteCarloMethod) {
      return this.kruskalWallisMonteCarlo(groups, this.monteCarloIterations);
    }
    
    // Существующий код для обычного теста Kruskal-Wallis
    if (!Array.isArray(groups) || groups.length < 2) {
      return { error: "Необходимо как минимум 2 группы для теста Краскела-Уоллиса" };
    }
    
    // Фильтруем и проверяем данные групп
    const validGroups = groups.map(group => {
      if (!Array.isArray(group)) return [];
      return group.filter(val => typeof val === 'number' && isFinite(val));
    });
    
    // Проверяем, что в каждой группе есть данные
    const hasEmptyGroups = validGroups.some(group => group.length === 0);
    if (hasEmptyGroups) {
      return { error: "В одной или нескольких группах нет валидных данных" };
    }
    
    // Объединяем все значения для расчета рангов
    const allValues = [].concat(...validGroups);
    const groupSizes = validGroups.map(group => group.length);
    const totalSize = allValues.length;
    
    // Вычисляем ранги для всех значений
    const ranks = this.calculateRanks(allValues);
    
    // Вычисляем сумму рангов для каждой группы
    let rankIndex = 0;
    const rankSums = validGroups.map(group => {
      let sum = 0;
      for (let i = 0; i < group.length; i++) {
        sum += ranks[rankIndex++];
      }
      return sum;
    });
    
    // Вычисляем H-статистику
    let hStat = 0;
    for (let i = 0; i < rankSums.length; i++) {
      hStat += Math.pow(rankSums[i], 2) / groupSizes[i];
    }
    
    hStat = (12 / (totalSize * (totalSize + 1))) * hStat - 3 * (totalSize + 1);
    
    // Вычисляем количество степеней свободы
    const df = validGroups.length - 1;
    
    // Вычисляем p-значение из распределения хи-квадрат
    let pValue;
    try {
      pValue = 1 - this.chicdf(hStat, df);
    } catch (e) {
      // Если функция распределения хи-квадрат недоступна, используем аппроксимацию
      pValue = 1 - (1 / (1 + Math.exp(-(hStat - df) / Math.sqrt(2 * df))));
    }
    
    return {
      method: "Kruskal-Wallis test",
      H: hStat,
      df: df,
      pValue: pValue,
      groupSizes: groupSizes
    };
  }
}; 