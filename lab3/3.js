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

const DISTRIBUTION_TYPES = {
  NORMAL: 1,
  HI_SQUARED: 2,
  LAPLAS: 3,
  LOG_NORMAL: 4,
  EXPONENTIAL: 5,
}

function* normalGenerator(m = 0, sSquared = 1, n = 64) {
  const generatorsArray = new Array(n).fill().map(() => getRandomGenerator.next().value);
  while(true) {
    yield m + Math.sqrt(sSquared) * Math.sqrt(12 / n) * (generatorsArray
      .reduce((ac, el) => ac + el.next().value, 0) - n / 2);
  }
}

function* hiSquaredGenerator(n) {
  const normalGenerators = new Array(n).fill().map(() => normalGenerator());
  while(true) {
    yield normalGenerators.reduce((ac, el) => ac + el.next().value**2, 0);
  }
}

function* laplasGenerator(lambda) {
  const generator = getRandomGenerator.next().value;
  let r_i = generator.next().value;
  while(true) {
    yield 1 / lambda * Math.log(r_i / (r_i = generator.next().value));
  }
}

function* logNormalGenerator(m, aSquared) {
  const normalGen = normalGenerator(m, aSquared);
  while(true) {
    yield Math.exp(normalGen.next().value);
  }
}

function* exponentialGenerator(lambda) {
  const generator = getRandomGenerator.next().value;
  while(true) {
    yield - 1 / lambda * Math.log(generator.next().value);
  }
}

const GENERATORS = {
  [DISTRIBUTION_TYPES.NORMAL]: normalGenerator,
  [DISTRIBUTION_TYPES.HI_SQUARED]: hiSquaredGenerator,
  [DISTRIBUTION_TYPES.LAPLAS]: laplasGenerator,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: logNormalGenerator,
  [DISTRIBUTION_TYPES.EXPONENTIAL]: exponentialGenerator,
}

const EXPECTED_VALUES = {
  [DISTRIBUTION_TYPES.NORMAL]: (m) => m,
  [DISTRIBUTION_TYPES.HI_SQUARED]: (n) => n,
  [DISTRIBUTION_TYPES.LAPLAS]: () => 0,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: (m, aSquared) => Math.exp(m + aSquared / 2),
  [DISTRIBUTION_TYPES.EXPONENTIAL]: (lambda) => 1 / lambda,
}

const DISPERSIONS = {
  [DISTRIBUTION_TYPES.NORMAL]: (_, sSquared) => sSquared,
  [DISTRIBUTION_TYPES.HI_SQUARED]: (n) => 2 * n,
  [DISTRIBUTION_TYPES.LAPLAS]: (lambda) => 2 / lambda ** 2,
  [DISTRIBUTION_TYPES.LOG_NORMAL]: (m, aSquared) => Math.exp(aSquared + 2 * m) * (Math.exp(aSquared) - 1),
  [DISTRIBUTION_TYPES.EXPONENTIAL]: (lambda) => 1 / lambda ** 2,
}

const NAMES = {
  [DISTRIBUTION_TYPES.NORMAL]: 'Normal distribution',
  [DISTRIBUTION_TYPES.HI_SQUARED]: 'HiSquared distribution',
  [DISTRIBUTION_TYPES.LAPLAS]: 'Laplas distribution',
  [DISTRIBUTION_TYPES.LOG_NORMAL]: 'LogNormal distribution',
  [DISTRIBUTION_TYPES.EXPONENTIAL]: 'Exponential distribution',
}


function getExpectedValue(X){
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
      // distributionFunction: DISTRIBUTION_FUNCTIONS[generatorType](...args),
      result,
      // isFinite: isFiniteDistribution(generatorType),
      expectedValue: EXPECTED_VALUES[generatorType](...args),
      dispersion: DISPERSIONS[generatorType](...args),
      // skewness: SKEWNESSES[generatorType](...args),
      // excess: EXCESSES[generatorType](...args),
      realExpectedValue: getExpectedValue(result),
      realDispersion: getDispersion(result),
      // realSkewness: getSkewness(result),
      // realExcess: getExcess(result),
  }
}

const N = 1000;
const normalResult1 = createGenerator(DISTRIBUTION_TYPES.NORMAL, N, 0, 64);
const normalResult2 = createGenerator(DISTRIBUTION_TYPES.NORMAL, N, 1, 9);
const hiSquaredResult = createGenerator(DISTRIBUTION_TYPES.HI_SQUARED, N, 4);
const laplasResult = createGenerator(DISTRIBUTION_TYPES.LAPLAS, N, 2);
const logNormalResult = createGenerator(DISTRIBUTION_TYPES.LOG_NORMAL, N, 0, 1);
const exponentialResult = createGenerator(DISTRIBUTION_TYPES.EXPONENTIAL, N, 2);