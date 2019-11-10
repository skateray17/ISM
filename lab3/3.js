/**
 * Magic function from https://ru.wikipedia.org/wiki/%D0%9A%D0%B2%D0%B0%D0%BD%D1%82%D0%B8%D0%BB%D0%B8_%D1%80%D0%B0%D1%81%D0%BF%D1%80%D0%B5%D0%B4%D0%B5%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F_%D1%85%D0%B8-%D0%BA%D0%B2%D0%B0%D0%B4%D1%80%D0%B0%D1%82
 */
function approximateHiSquared(alpha, n) {
  const d = alpha < 0.5 ?
    -2.0637 * (Math.log(1 / alpha) - 0.16) ** 0.4274 + 1.5774 :
    2.0637 * (Math.log(1 / (1 - alpha)) - 0.16) ** 0.4274 - 1.5774;
  const a = [
    1.0000886,
    0.4713941,
    0.000134802,
    -0.008553069,
    0.00312558,
    -0.0008426812,
    0.00009780499
  ];
  const b = [
    -0.2237368,
    0.02607083,
    0.01128186,
    -0.01153761,
    0.005169654,
    0.00253001,
    -0.001450117,
  ];
  const c = [
    -0.01513904,
    -0.008986007,
    0.02277679,
    -0.01323293,
    -0.006950356,
    0.001060438,
    0.001565326,
  ];
  return n * (a.reduce((ac, el, i) => ac + n ** (-i / 2) * d ** i * (
    el + b[i] / n + c[i] / n ** 2
  ), 0)) ** 3;
}

// https://hewgill.com/picomath/javascript/erf.js.html
function erf(x) {
  // constants
  var a1 = 0.254829592;
  var a2 = -0.284496736;
  var a3 = 1.421413741;
  var a4 = -1.453152027;
  var a5 = 1.061405429;
  var p = 0.3275911;

  // Save the sign of x
  var sign = 1;
  if (x < 0) {
    sign = -1;
  }
  x = Math.abs(x);

  // A&S formula 7.1.26
  var t = 1.0 / (1.0 + p * x);
  var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// todo mem
const gamma = (() => {
  const mem = {
    0: 1,
    1: 1,
    0.5: Math.sqrt(Math.PI),
  };
  return (x) => {
    if (x < 0) {
      throw new Error();
    }
    if (mem[x]) {
      return mem[x];
    }
    if (x > 1) {
      return mem[x] = (x - 1) * gamma(x - 1);
    }
    return NaN;
  };
})()

function normalizedLowerGamma(p, x) {
  const EPS = 1e-8;
  let ac = 0;
  let prvRes;
  let k = 0;
  do {
    prvRes = ac;
    ac += x ** k / gamma(k + p + 1);
    k++;
  } while (Math.abs(prvRes - ac) > EPS);
  return ac * Math.exp(-x) * x ** p;
}

const generatorPrototype = Object.getPrototypeOf(function* () { }()).__proto__;
generatorPrototype.getMultipleValues = function (n) {
  return new Array(n).fill().map(() => this.next().value);
}

function* linearCongruentialGenerator(a, betta, c, M) {
  while (true) {
    a = (BigInt(a) * BigInt(betta) + BigInt(c)) % BigInt(M);
    yield Number(a) / M;
  }
}

const getRandomGenerator = (function* () {
  const generatorForCreatingGenerators = linearCongruentialGenerator(16387, 16387, 0, 2 ** 31);
  const M = 2 ** 31;
  while (true) {
    yield linearCongruentialGenerator(
      M * generatorForCreatingGenerators.next().value,
      M * generatorForCreatingGenerators.next().value,
      M * generatorForCreatingGenerators.next().value,
      M
    );
  }
})();

const DISTRIBUTION_TYPES = Object.freeze({
  NORMAL: 1,
  HI_SQUARED: 2,
  LAPLAS: 3,
  LOG_NORMAL: 4,
  EXPONENTIAL: 5,
  NORMAL_BOX_MULLER: 6,
  MIXTURE: 7,
  KOSHI: 8,
});

function* normalGenerator(m = 0, sSquared = 1, n = 64) {
  const generatorsArray = getRandomGenerator.getMultipleValues(n);
  while (true) {
    yield m + Math.sqrt(sSquared) * Math.sqrt(12 / n) * (generatorsArray
      .reduce((ac, el) => ac + el.next().value, 0) - n / 2);
  }
}

function normalDistributionFunction(m = 0, sSquared = 1) {
  return x => {
    if (x === -Infinity) return 0;
    if (x === Infinity) return 1;
    return (1 + erf((x - m) / Math.sqrt(2 * sSquared))) / 2;
  }
}

function* normalBoxMullerGenerator(m = 0, sSquared = 1) {
  const [X, Y] = getRandomGenerator.getMultipleValues(2);
  while (true) {
    let x, y, s;
    do {
      // transform [0, 1] -> [-1, 1]
      x = (X.next().value - 0.5) * 2;
      y = (Y.next().value - 0.5) * 2;
      s = x ** 2 + y ** 2;
    } while (s >= 1);
    yield m + sSquared * x * Math.sqrt(-2 * Math.log(s) / s);
    yield m + sSquared * y * Math.sqrt(-2 * Math.log(s) / s);
  }
}

function* hiSquaredGenerator(n) {
  const normalGenerators = new Array(n).fill().map(() => normalGenerator());
  while (true) {
    yield normalGenerators.reduce((ac, el) => ac + el.next().value ** 2, 0);
  }
}

function hiSquaredDistributionFunction(n) {
  return (x) => {
    if (x < 0) {
      return 0;
    }
    if (x === Infinity) {
      return 1;
    }
    return normalizedLowerGamma(n / 2, x / 2);
  }
}

function* laplasGenerator(lambda) {
  const generator = getRandomGenerator.next().value;
  let r_i = generator.next().value;
  while (true) {
    yield 1 / lambda * Math.log(r_i / (r_i = generator.next().value));
  }
}

function laplasDistributionFunction(lambda) {
  return (x) => {
    if (x === -Infinity) return 0;
    if (x === Infinity) return 1;
    return x < 0 ? 0.5 * Math.exp(lambda * x) : 1 - 0.5 * Math.exp(-lambda * x);
  }
}

function* logNormalGenerator(m, aSquared) {
  const normalGen = normalGenerator(m, aSquared);
  while (true) {
    yield Math.exp(normalGen.next().value);
  }
}

function logNormalDistributionFunction(m, aSquared) {
  return (x) => {
    if (x === -Infinity) return 0;
    if (x === Infinity) return 1;
    return 0.5 + erf((Math.log(x) - m) / (Math.sqrt(aSquared) * Math.SQRT2)) / 2;
  }
}

function* exponentialGenerator(lambda) {
  const generator = getRandomGenerator.next().value;
  while (true) {
    yield - 1 / lambda * Math.log(generator.next().value);
  }
}

function exponentialDistributionFunction(lambda) {
  return x => {
    if (x === -Infinity) return 0;
    if (x === Infinity) return 1;
    return 1 - Math.exp(-lambda * x);
  }
}

function* mixtureGenerator(pi, [gen1Name, ...gen1Args], [gen2Name, ...gen2Args]) {
  const firstGenerator = GENERATORS[gen1Name](...gen1Args);
  const secondGenerator = GENERATORS[gen2Name](...gen2Args);
  const randomizer = getRandomGenerator.next().value;
  while (true) {
    yield (randomizer.next().value < pi ? firstGenerator : secondGenerator).next().value;
  }
}

function mixtureDistributionFunction(pi, [gen1Name, ...gen1Args], [gen2Name, ...gen2Args]) {
  const gen1DistrFunc = DISTRIBUTION_FUNCTIONS[gen1Name](...gen1Args);
  const gen2DistrFunc = DISTRIBUTION_FUNCTIONS[gen2Name](...gen2Args);
  return x => pi * gen1DistrFunc(x) + (1 - pi) * gen2DistrFunc(x);
}

function mixtureExpectedValue(pi, [gen1Name, ...gen1Args], [gen2Name, ...gen2Args]) {
  return pi * EXPECTED_VALUES[gen1Name](...gen1Args) + (1 - pi) * EXPECTED_VALUES[gen2Name](...gen2Args);
}

function mixtureSecondStartMoment(pi, [gen1Name, ...gen1Args], [gen2Name, ...gen2Args]) {
  return pi * SECOND_START_MOMENTS[gen1Name](...gen1Args) + (1 - pi) * SECOND_START_MOMENTS[gen2Name](...gen2Args);
}

function mixtureDispersion() {
  return mixtureSecondStartMoment(...arguments) - mixtureExpectedValue(...arguments) ** 2;
}

function* koshiGenerator(mu, lambda) {
  const generator = getRandomGenerator.next().value;
  while (true) {
    yield mu + lambda * Math.tan(2 * Math.PI * generator.next().value);
  }
}

function koshiDistributionFunction(mu, lambda) {
  return x => {
    if (x === -Infinity) return 0;
    if (x === Infinity) return 1;
    return 1 / 2 + 1 / Math.PI * Math.atan((x - mu) / lambda);
  }
}

const GENERATORS = {
  [DISTRIBUTION_TYPES.NORMAL]: normalGenerator,
  [DISTRIBUTION_TYPES.HI_SQUARED]: hiSquaredGenerator,
  [DISTRIBUTION_TYPES.LAPLAS]: laplasGenerator,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: logNormalGenerator,
  [DISTRIBUTION_TYPES.EXPONENTIAL]: exponentialGenerator,
  [DISTRIBUTION_TYPES.NORMAL_BOX_MULLER]: normalBoxMullerGenerator,
  [DISTRIBUTION_TYPES.MIXTURE]: mixtureGenerator,
  [DISTRIBUTION_TYPES.KOSHI]: koshiGenerator,
}

const DISTRIBUTION_FUNCTIONS = {
  [DISTRIBUTION_TYPES.NORMAL]: normalDistributionFunction,
  [DISTRIBUTION_TYPES.HI_SQUARED]: hiSquaredDistributionFunction,
  [DISTRIBUTION_TYPES.LAPLAS]: laplasDistributionFunction,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: logNormalDistributionFunction,
  [DISTRIBUTION_TYPES.EXPONENTIAL]: exponentialDistributionFunction,
  [DISTRIBUTION_TYPES.NORMAL_BOX_MULLER]: normalDistributionFunction,
  [DISTRIBUTION_TYPES.MIXTURE]: mixtureDistributionFunction,
  [DISTRIBUTION_TYPES.KOSHI]: koshiGenerator,
}

const SECOND_START_MOMENTS = {
  [DISTRIBUTION_TYPES.NORMAL]: (m, sSquared) => m ** 2 + sSquared,
  [DISTRIBUTION_TYPES.HI_SQUARED]: (n) => n * (n + 2),
  [DISTRIBUTION_TYPES.LAPLAS]: (lambda) => 2 / lambda ** 2,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: (m, aSquared) => m ** 2 * Math.exp(2 * aSquared), // ?????
  [DISTRIBUTION_TYPES.EXPONENTIAL]: (lambda) => 2 / lambda ** 2,
  [DISTRIBUTION_TYPES.NORMAL_BOX_MULLER]: (m, sSquared) => m ** 2 + sSquared,
  [DISTRIBUTION_TYPES.MIXTURE]: mixtureSecondStartMoment,
  [DISTRIBUTION_TYPES.KOSHI]: () => NaN,
}

const EXPECTED_VALUES = {
  [DISTRIBUTION_TYPES.NORMAL]: (m) => m,
  [DISTRIBUTION_TYPES.HI_SQUARED]: (n) => n,
  [DISTRIBUTION_TYPES.LAPLAS]: () => 0,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: (m, aSquared) => Math.exp(m + aSquared / 2),
  [DISTRIBUTION_TYPES.EXPONENTIAL]: (lambda) => 1 / lambda,
  [DISTRIBUTION_TYPES.NORMAL_BOX_MULLER]: (m) => m,
  [DISTRIBUTION_TYPES.MIXTURE]: mixtureExpectedValue,
  [DISTRIBUTION_TYPES.KOSHI]: () => NaN,
}

const DISPERSIONS = {
  [DISTRIBUTION_TYPES.NORMAL]: (_, sSquared) => sSquared,
  [DISTRIBUTION_TYPES.HI_SQUARED]: (n) => 2 * n,
  [DISTRIBUTION_TYPES.LAPLAS]: (lambda) => 2 / lambda ** 2,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: (m, aSquared) => Math.exp(aSquared + 2 * m) * (Math.exp(aSquared) - 1),
  [DISTRIBUTION_TYPES.EXPONENTIAL]: (lambda) => 1 / lambda ** 2,
  [DISTRIBUTION_TYPES.NORMAL_BOX_MULLER]: (_, sSquared) => sSquared,
  [DISTRIBUTION_TYPES.MIXTURE]: mixtureDispersion,
  [DISTRIBUTION_TYPES.KOSHI]: () => Infinity,
}

const NAMES = {
  [DISTRIBUTION_TYPES.NORMAL]: 'Normal distribution',
  [DISTRIBUTION_TYPES.HI_SQUARED]: 'HiSquared distribution',
  [DISTRIBUTION_TYPES.LAPLAS]: 'Laplas distribution',
  [DISTRIBUTION_TYPES.LOG_NORMAL]: 'LogNormal distribution',
  [DISTRIBUTION_TYPES.EXPONENTIAL]: 'Exponential distribution',
  [DISTRIBUTION_TYPES.NORMAL_BOX_MULLER]: 'Normal Box-Muller distribution',
  [DISTRIBUTION_TYPES.MIXTURE]: 'Mixture of distributions',
  [DISTRIBUTION_TYPES.KOSHI]: 'Koshi distibution',
}


function getExpectedValue(X) {
  return X.reduce((a, b) => a + b) / X.length;
}

function getDispersion(X) {
  const xAv = getExpectedValue(X);
  return X.reduce((sum, x) => (x - xAv) ** 2 + sum, 0) / (X.length - 1);
}

function createGenerator(generatorType, n, ...args) {
  const generator = GENERATORS[generatorType](...args);
  const result = generator.getMultipleValues(n);
  return {
    name: NAMES[generatorType],
    generator,
    distributionFunction: DISTRIBUTION_FUNCTIONS[generatorType](...args),
    result,
    expectedValue: EXPECTED_VALUES[generatorType](...args),
    dispersion: DISPERSIONS[generatorType](...args),
    realExpectedValue: getExpectedValue(result),
    realDispersion: getDispersion(result),
  }
}

function getCorrelatio(generatorResult) {
  const nums = generatorResult.result;
  const n = Math.floor(nums.length / 2);
  let sum1 = 0, sum2 = 0, sum3 = 0;
  const xAv = getExpectedValue(nums.filter((_, i) => !(i % 2)));
  const yAv = getExpectedValue(nums.filter((_, i) => i % 2));
  for (let i = 0; i < n; i++) {
    sum1 += (nums[2 * i] - xAv) * (nums[2 * i + 1] - yAv);
    sum2 += (nums[2 * i] - xAv) ** 2;
    sum3 += (nums[2 * i + 1] - yAv) ** 2;
  }
  generatorResult.correlatio = sum1 / Math.sqrt(sum1 * sum2);
  return generatorResult;
}

function hiSquaredTest(generator) {
  const arr = [...generator.result];
  arr.sort((a, b) => a - b);
  const nu = new Array(10).fill(arr.length / 10);
  const p_k = new Array(nu.length).fill().map((_, i) => (
    generator.distributionFunction(arr[arr.length * (i + 1) / nu.length] || Infinity) - generator.distributionFunction(i ? arr[arr.length * i / nu.length] : -Infinity)) * generator.result.length)
  const hiSquared = p_k.reduce((sum, p, i) => {
    return sum + (((nu[i] || 0) - p) ** 2) / p;
  }, 0);
  const delta = approximateHiSquared(0.95, nu.length - 1);
  if (hiSquared < delta) {
    return { nu, str: `Passed hi-squared test: ${hiSquared.toFixed(5)} < ${delta.toFixed(5)}` };
  } else {
    return { nu, str: `Hi-squared test failed: ${hiSquared.toFixed(5)} > ${delta.toFixed(5)}` };
  }
}

function kolmogorovTest(generator) {
  // To avoid sorting of original array
  let copiedValues = [...generator.result];
  copiedValues.sort((a, b) => a - b);
  const Dn = copiedValues.reduce((ac, val, i) => Math.max(ac, Math.abs(i / copiedValues.length - generator.distributionFunction(val))), 0) *
      Math.sqrt(copiedValues.length);
  // sadly, but I took it from table :c
  const Kolmagorov_Quantile = 1.36;
  if (Dn < Kolmagorov_Quantile) {
      return `Passed Kolmogorov Test: ${Dn.toFixed(2)} < ${Kolmagorov_Quantile.toFixed(2)}`;
  } else {
      return `Kolmagorov test failed: ${Dn.toFixed(5)} > ${Kolmagorov_Quantile.toFixed(5)}`;
  }
}

const N = 1000;
const normalResult1 = createGenerator(DISTRIBUTION_TYPES.NORMAL, N, 0, 64);
const normalResult2 = createGenerator(DISTRIBUTION_TYPES.NORMAL, N, 1, 9);
const hiSquaredResult = createGenerator(DISTRIBUTION_TYPES.HI_SQUARED, N, 4);
const laplasResult = createGenerator(DISTRIBUTION_TYPES.LAPLAS, N, 2);
const logNormalResult = createGenerator(DISTRIBUTION_TYPES.LOG_NORMAL, N, 0, 1);
const exponentialResult = createGenerator(DISTRIBUTION_TYPES.EXPONENTIAL, N, 2);
const normalBoxMullerResult = getCorrelatio(createGenerator(DISTRIBUTION_TYPES.NORMAL_BOX_MULLER, N, 0, 1));
const mixtureResult1 = createGenerator(DISTRIBUTION_TYPES.MIXTURE, N, 0.5, [DISTRIBUTION_TYPES.HI_SQUARED, 4], [DISTRIBUTION_TYPES.LAPLAS, 2]);
const mixtureResult2 = createGenerator(DISTRIBUTION_TYPES.MIXTURE, N, 0.4, [DISTRIBUTION_TYPES.LOG_NORMAL, 0, 1], [DISTRIBUTION_TYPES.EXPONENTIAL, 2]);
