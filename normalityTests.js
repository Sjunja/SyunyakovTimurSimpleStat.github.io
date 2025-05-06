window.normalityTests = {
  // Кумулятивная функция стандартного нормального распределения
  normcdf: function(x) {
    return 0.5 * (1 + math.erf(x / Math.sqrt(2)));
  },
  // Кумулятивная функция t-распределения
  tcdf: function(t, df) {
    const x = df / (df + t * t);
    return 1 - 0.5 * window.normalityTests.ibeta(df/2, 0.5, x);
  },
  // Неполная бета-функция (для t-распределения)
  ibeta: function(a, b, x) {
    if (x < 0 || x > 1) return NaN;
    if (x === 0) return 0;
    if (x === 1) return 1;
    const bt = Math.exp(window.normalityTests.gammaln(a + b) - window.normalityTests.gammaln(a) - window.normalityTests.gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1)/(a + b + 2)) {
      return bt * window.normalityTests.betacf(a, b, x) / a;
    } else {
      return 1 - bt * window.normalityTests.betacf(b, a, 1 - x) / b;
    }
  },
  // Продолжающаяся дробь для неполной бета-функции
  betacf: function(a, b, x) {
    const MAXIT = 100;
    const EPS = 3e-7;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < EPS) d = EPS;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < EPS) d = EPS;
      c = 1 + aa / c;
      if (Math.abs(c) < EPS) c = EPS;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < EPS) d = EPS;
      c = 1 + aa / c;
      if (Math.abs(c) < EPS) c = EPS;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  },
  // Логарифм гамма-функции
  gammaln: function(z) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let sum = 1.000000000190015;
    for (let i = 0; i < 6; i++) {
      sum += c[i] / (z + i + 1);
    }
    const ser = sum;
    return (Math.log(2.5066282746310005 * ser) - z) + (z - 0.5) * Math.log(z + 4.5) - (z + 4.5);
  },
  // Кумулятивная функция хи-квадрат распределения
  chicdf: function(x, df) {
    return window.normalityTests.gammainc(x/2, df/2);
  },
  // Неполная гамма-функция (нормализованная)
  gammainc: function(x, a) {
    if (x <= 0 || a <= 0) return 0;
    if (x > 200) return 1;
    const gammaln_a = window.normalityTests.gammaln(a);
    if (x < a + 1) {
      let sum = 1;
      let term = 1;
      for (let n = 1; n < 100; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - gammaln_a);
    } else {
      let b = x + 1 - a;
      let c = 1/1e-30;
      let d = 1/b;
      let h = d;
      for (let i = 1; i <= 100; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        c = b + an/c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1/d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < 1e-15) break;
      }
      return 1 - Math.exp(-x + a * Math.log(x) - gammaln_a) * h;
    }
  },
  
  // Функция для определения знака числа
  sign: function(x) {
    if (x === 0) return 0;
    return x > 0 ? 1 : -1;
  },
  
  // Функция нормального квантиля (обратная функция CDF нормального распределения)
  normalQuantile: function(p, mu, sigma) {
    if (typeof mu === 'undefined') mu = 0;
    if (typeof sigma === 'undefined') sigma = 1;
    
    var q, r, val;
    if (sigma < 0) return -1;
    if (sigma === 0) return mu;

    q = p - 0.5;

    if (0.075 <= p && p <= 0.925) {
      r = 0.180625 - q * q;
      val = q * (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r
          + 45921.953931549871457) * r + 13731.693765509461125) * r
          + 1971.5909503065514427) * r
          + 133.14166789178437745) * r
          + 3.387132872796366608) / (((((((r * 5226.495278852854561 + 28729.085735721942674) * r + 39307.89580009271061) * r
          + 21213.794301586595867) * r + 5394.1960214247511077) * r
          + 687.1870074920579083) * r
          + 42.313330701600911252) * r + 1);
    }
    else { /* closer than 0.075 from {0,1} boundary */
      /* r = min(p, 1-p) < 0.075 */
      if (q > 0)
        r = 1 - p;
      else
        r = p;/* = R_DT_Iv(p) ^=  p */

      r = Math.sqrt(-Math.log(r)); /* r = sqrt(-log(r))  <==>  min(p, 1-p) = exp( - r^2 ) */

      if (r <= 5.) { /* <==> min(p,1-p) >= exp(-25) ~= 1.3888e-11 */
        r += -1.6;
        val = (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + .24178072517745061177) * r
            + 1.27045825245236838258) * r
            + 3.64784832476320460504) * r
            + 5.7694972214606914055) * r
            + 4.6303378461565452959) * r
            + 1.42343711074968357734) / (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r
            + .0151986665636164571966) * r + 0.14810397642748007459) * r
            + 0.68976733498510000455) * r
            + 1.6763848301838038494) * r
            + 2.05319162663775882187) * r + 1);
      }
      else { /* very close to  0 or 1 */
        r += -5.;
        val = (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r
            + 0.026532189526576123093) * r + .29656057182850489123) * r + 1.7848265399172913358) * r
            + 5.4637849111641143699) * r
            + 6.6579046435011037772) / (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7)* r
            + 1.8463183175100546818e-5) * r + 7.868691311456132591e-4) * r
            + .0148753612908506148525) * r
            + .13692988092273580531) * r
            + .59983220655588793769) * r + 1.);
      }

      if (q < 0.0)
        val = -val;
      /* return (q >= 0.)? r : -r ;*/
    }
    return mu + sigma * val;
  },
  
  // Вычисление многочлена с коэффициентами cc порядка nord-1
  poly: function(cc, nord, x) {
    let ret_val = cc[0];
    if (nord > 1) {
      let p = x * cc[nord-1];
      for (let j = nord - 2; j > 0; j--)
        p = (p + cc[j]) * x;
      ret_val += p;
    }
    return ret_val;
  },
  
  // Тест Шапиро-Уилка (реализация из R)
  shapiroWilk: function(values) {
    try {
      const x = [...values].sort((a, b) => a - b);
      const n = x.length;
      
      if (n < 3) {
        return {
          statistic: NaN,
          pValue: NaN,
          error: "Необходимо минимум 3 наблюдения для теста Шапиро-Уилка"
        };
      }
      
      const nn2 = Math.floor(n / 2);
      const a = new Array(nn2 + 1); // 1-индексированный массив
      
      const small = 1e-19;
      
      // Полиномиальные коэффициенты
      const g = [-2.273, 0.459];
      const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
      const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
      const c3 = [0.544, -0.39978, 0.025054, -6.714e-4];
      const c4 = [1.3822, -0.77857, 0.062767, -0.0020322];
      const c5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
      const c6 = [-0.4803, -0.082676, 0.0030302];
      
      let an = n;
      
      // Вычисление коэффициентов a[]
      if (n === 3) {
        a[1] = 0.70710678; // = sqrt(1/2)
      } else {
        const an25 = an + 0.25;
        let summ2 = 0.0;
        
        for (let i = 1; i <= nn2; i++) {
          a[i] = window.normalityTests.normalQuantile((i - 0.375) / an25, 0, 1);
          summ2 += a[i] * a[i];
        }
        
        summ2 *= 2;
        const ssumm2 = Math.sqrt(summ2);
        const rsn = 1 / Math.sqrt(an);
        const a1 = window.normalityTests.poly(c1, 6, rsn) - a[1] / ssumm2;
        
        // Нормализация a[]
        let i1, a2, fac;
        if (n > 5) {
          i1 = 3;
          a2 = -a[2] / ssumm2 + window.normalityTests.poly(c2, 6, rsn);
          fac = Math.sqrt((summ2 - 2 * (a[1] * a[1]) - 2 * (a[2] * a[2])) / 
                          (1 - 2 * (a1 * a1) - 2 * (a2 * a2)));
          a[2] = a2;
        } else {
          i1 = 2;
          fac = Math.sqrt((summ2 - 2 * (a[1] * a[1])) / (1 - 2 * (a1 * a1)));
        }
        
        a[1] = a1;
        for (let i = i1; i <= nn2; i++) {
          a[i] /= -fac;
        }
      }
      
      // Проверка диапазона
      const range = x[n - 1] - x[0];
      if (range < small) {
        return {
          statistic: NaN,
          pValue: NaN,
          error: "Диапазон данных слишком мал"
        };
      }
      
      // Проверка корректности порядка сортировки
      let xx = x[0] / range;
      let sx = xx;
      let sa = -a[1];
      
      for (let i = 1, j = n - 1; i < n; j--) {
        const xi = x[i] / range;
        if (xx - xi > small) {
          return {
            statistic: NaN,
            pValue: NaN,
            error: "Ошибка в порядке сортировки данных"
          };
        }
        
        sx += xi;
        i++;
        if (i !== j) {
          sa += window.normalityTests.sign(i - j) * a[Math.min(i, j)];
        }
        xx = xi;
      }
      
      if (n > 5000) {
        return {
          statistic: NaN,
          pValue: NaN,
          error: "Выборка слишком большая для теста Шапиро-Уилка (максимум 5000)"
        };
      }
      
      // Расчет W-статистики как квадрата корреляции между данными и коэффициентами
      sa /= n;
      sx /= n;
      let ssa = 0, ssx = 0, sax = 0;
      
      for (let i = 0, j = n - 1; i < n; i++, j--) {
        let asa;
        if (i !== j) {
          asa = window.normalityTests.sign(i - j) * a[1 + Math.min(i, j)] - sa;
        } else {
          asa = -sa;
        }
        
        const xsx = x[i] / range - sx;
        ssa += asa * asa;
        ssx += xsx * xsx;
        sax += asa * xsx;
      }
      
      // W1 равен (1-W), вычисленному во избежание чрезмерной ошибки округления
      // для W, очень близкого к 1 (потенциальная проблема в очень больших выборках)
      const ssassx = Math.sqrt(ssa * ssx);
      const w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx);
      const w = 1 - w1;
      
      // Расчет уровня значимости для W
      let pw;
      
      if (n === 3) {
        // точное P-значение:
        const pi6 = 1.90985931710274; // = 6/pi
        const stqr = 1.04719755119660; // = asin(sqrt(3/4))
        pw = pi6 * (Math.asin(Math.sqrt(w)) - stqr);
        if (pw < 0) pw = 0;
      } else {
        const y = Math.log(w1);
        const xx = Math.log(an);
        let m, s;
        
        if (n <= 11) {
          const gamma = window.normalityTests.poly(g, 2, an);
          if (y >= gamma) {
            pw = 1e-99; // очевидное значение, было 'small', которое равно 1e-19f
          } else {
            const y1 = -Math.log(gamma - y);
            m = window.normalityTests.poly(c3, 4, an);
            s = Math.exp(window.normalityTests.poly(c4, 4, an));
            // приближенное pValue
            pw = 1 - window.normalityTests.normcdf((y1 - m) / s);
          }
        } else { // n >= 12
          m = window.normalityTests.poly(c5, 4, xx);
          s = Math.exp(window.normalityTests.poly(c6, 3, xx));
          // приближенное pValue
          pw = 1 - statUtils.normcdf((y - m) / s);
        }
      }
      
      return {
        statistic: w,
        pValue: pw
      };
    } catch (e) {
      console.error('Shapiro-Wilk error:', e.message);
      return {
        statistic: NaN,
        pValue: NaN,
        error: e.message
      };
    }
  },
  
  // Тест Лиллиефорса
  lilliefors: function(values) {
    const n = values.length;
    if (n < 4) return null;
    const mean = statUtils.mean(values);
    const std = statUtils.std(values);
    if (std === 0) {
      return { statistic: 0, pValue: 1, note: "Стандартное отклонение равно нулю." };
    }
    const standardized = values.map(x => (x - mean) / std);
    const sorted = [...standardized].sort((a, b) => a - b);
    let dPlus = 0;
    let dMinus = 0;
    for (let i = 0; i < n; i++) {
      const z = sorted[i];
      const i1 = i + 1;
      dPlus = Math.max(dPlus, i1/n - statUtils.normcdf(z));
      dMinus = Math.max(dMinus, statUtils.normcdf(z) - (i/n));
    }
    const d = Math.max(dPlus, dMinus);
    console.log('Lilliefors D:', d); // Логирование D статистики
    const criticalValues = {
      4: [0.417, 0.381, 0.352, 0.319, 0.300],
      5: [0.405, 0.337, 0.315, 0.299, 0.285],
      6: [0.364, 0.319, 0.294, 0.277, 0.265],
      7: [0.348, 0.300, 0.276, 0.258, 0.247],
      8: [0.331, 0.285, 0.261, 0.244, 0.233],
      9: [0.311, 0.271, 0.249, 0.233, 0.223],
      10: [0.294, 0.258, 0.239, 0.224, 0.215],
      11: [0.284, 0.249, 0.230, 0.217, 0.206],
      12: [0.275, 0.242, 0.223, 0.212, 0.199],
      13: [0.268, 0.234, 0.214, 0.202, 0.190],
      14: [0.261, 0.227, 0.207, 0.194, 0.183],
      15: [0.257, 0.220, 0.201, 0.187, 0.177],
      20: [0.231, 0.192, 0.177, 0.165, 0.156],
      25: [0.200, 0.180, 0.165, 0.155, 0.147],
      30: [0.187, 0.161, 0.144, 0.136, 0.131],
      40: [0.165, 0.141, 0.128, 0.122, 0.117],
      100: [0.111, 0.091, 0.084, 0.079, 0.076],
      400: [0.059, 0.048, 0.044, 0.041, 0.040],
      900: [0.040, 0.032, 0.029, 0.027, 0.026]
    };
    const interpolateCriticalValue = (n, alphaIndex) => {
      const sizes = Object.keys(criticalValues).map(Number).sort((a, b) => a - b);
      let lower = sizes[0];
      let upper = sizes[sizes.length - 1];
      for (let i = 0; i < sizes.length - 1; i++) {
        if (n >= sizes[i] && n <= sizes[i + 1]) {
          lower = sizes[i];
          upper = sizes[i + 1];
          break;
        }
      }
      if (n <= lower) return criticalValues[lower][alphaIndex];
      if (n >= upper) return criticalValues[upper][alphaIndex];
      const lowerValue = criticalValues[lower][alphaIndex];
      const upperValue = criticalValues[upper][alphaIndex];
      const t = (Math.log(n) - Math.log(lower)) / (Math.log(upper) - Math.log(lower));
      return lowerValue + t * (upperValue - lowerValue);
    };
    let pValue;
    const alphas = [0.01, 0.05, 0.10, 0.15, 0.20];
    let foundAlpha = false;
    for (let i = 0; i < alphas.length; i++) {
      const criticalValue = interpolateCriticalValue(n, i);
      if (d > criticalValue) {
        pValue = alphas[i];
        foundAlpha = true;
        break;
      }
    }
    if (!foundAlpha) {
      const c = Math.sqrt(n);
      pValue = Math.exp(-7.01256 * c * d * d + 2.78019);
      pValue = Math.max(0.001, Math.min(0.999, pValue));
    }
    console.log('Lilliefors p-value:', pValue); // Логирование p-value
    return { statistic: d, pValue };
  },
  // Главная функция выбора теста нормальности
  normalityTest: function(values) {
    const n = values.length;
    if (n < 3) {
      return {
        test: 'Недостаточно данных',
        statistic: NaN,
        pValue: NaN,
        isNormal: false,
        conclusion: 'insufficientData'
      };
    }
    if (n <= 50) {
      const result = window.normalityTests.shapiroWilk(values);
      if (result.error) {
        return {
          test: 'Shapiro-Wilk',
          statistic: NaN,
          pValue: NaN,
          isNormal: false,
          conclusion: 'testError',
          error: result.error
        };
      }
      
      const normalityStatus = window.normalityTests.getNormalityConclusion(result.pValue, 'Shapiro-Wilk');
      
      return {
        test: 'Shapiro-Wilk',
        statistic: result.statistic,
        pValue: result.pValue,
        isNormal: normalityStatus.isNormal,
        conclusion: normalityStatus.conclusion
      };
    } else {
      const result = window.normalityTests.lilliefors(values);
      const normalityStatus = window.normalityTests.getNormalityConclusion(result.pValue, 'Kolmogorov-Smirnov (Lilliefors)');
      
      return {
        test: 'Kolmogorov-Smirnov (Lilliefors)',
        statistic: result.statistic,
        pValue: result.pValue,
        isNormal: normalityStatus.isNormal,
        conclusion: normalityStatus.conclusion
      };
    }
  },
  // Вспомогательная функция для обратного нормального распределения (инверсия CDF)
  norminv: function(p) {
    // Алгоритм approximation by Peter John Acklam
    if (p <= 0 || p >= 1) throw new Error('The probality p must be bigger than 0 and less than 1');
    const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    const b4 = 66.8013118877197, b5 = -13.2806815528857;
    const c1 = -0.00778489400243029, c2 = -0.322396458041136, c3 = -2.40075827716184;
    const c4 = -2.54973253934373, c5 = 4.37466414146497, c6 = 2.93816398269878;
    const d1 = 0.00778469570904146, d2 = 0.32246712907004, d3 = 2.445134137143;
    const d4 = 3.75440866190742;
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    if (phigh < p) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  },
  // Функция для определения нормальности по всем группам
  // Возвращает минимальное значение p-value и соответствующее заключение о нормальности
  getGroupNormalityStatus: function(groupNormalityResults) {
    if (!groupNormalityResults || Object.keys(groupNormalityResults).length === 0) {
      return {
        minPvalue: null,
        isNormal: true, // По умолчанию считаем нормальным, если групп нет
        conclusion: 'normalDistribution'
      };
    }
    
    let minPvalue = 1.0;
    let isNormal = true;
    
    // Находим минимальное p-значение среди всех групп
    Object.values(groupNormalityResults).forEach(result => {
      if (result && typeof result.pValue === 'number') {
        minPvalue = Math.min(minPvalue, result.pValue);
        if (result.pValue <= 0.05) {
          isNormal = false;
        }
      }
    });
    
    return {
      minPvalue: minPvalue,
      isNormal: isNormal,
      conclusion: isNormal ? 'normalDistribution' : 'nonNormalDistribution'
    };
  },
  
  // Получить текстовое заключение о нормальности распределения
  getNormalityConclusion: function(pValue, testName) {
    const isNormal = pValue > 0.05;
    const testType = testName || 'Normality test';
    
    return {
      isNormal: isNormal,
      conclusion: isNormal ? 'normalDistribution' : 'nonNormalDistribution',
      pValue: pValue
    };
  },
  // Кумулятивная функция распределения Фишера (F-распределение)
  fcdf: function(x, df1, df2) {
    // Проверка входных параметров
    if (x < 0 || df1 <= 0 || df2 <= 0) return 0;
    
    // Используем регуляризованную неполную бета-функцию
    const ibeta = (a, b, x) => {
      // Защита от некорректных входных данных
      if (x < 0 || x > 1) return NaN;
      if (x === 0) return 0;
      if (x === 1) return 1;
      
      // Трансформация для F-распределения
      const transformedX = df1 * x / (df1 * x + df2);
      
      // Вычисление через бета-функцию
      const betaFunc = (a, b) => {
        return Math.exp(this.gammaln(a) + this.gammaln(b) - this.gammaln(a + b));
      };
      
      // Приближенное вычисление неполной бета-функции
      const regularizedIBeta = (a, b, x) => {
        if (x < (a + 1) / (a + b + 2)) {
          let sum = 0;
          let term = 1;
          for (let i = 0; i < 100; i++) {
            term *= (a + i) * x / (a + b + i);
            sum += term;
            if (term < 1e-10 * sum) break;
          }
          return sum * Math.pow(x, a) * Math.pow(1 - x, b) / (a * betaFunc(a, b));
        } else {
          return 1 - regularizedIBeta(b, a, 1 - x);
        }
      };
      
      return regularizedIBeta(df1 / 2, df2 / 2, transformedX);
    };
    
    return 1 - ibeta(df1 / 2, df2 / 2, df1 * x / (df1 * x + df2));
  },
}; 