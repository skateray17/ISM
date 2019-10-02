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
  CONTINUOUS: 3,
}

function* normalGenerator(m = 0, sSquared = 1, n = 64) {
  const generatorsArray = getRandomGenerator.getMultipleValues(n);
  while (true) {
    yield m + Math.sqrt(sSquared) * Math.sqrt(12 / n) * (generatorsArray
      .reduce((ac, el) => ac + el.next().value, 0) - n / 2);
  }
}

function* hiSquaredGenerator(n) {
  const normalGenerators = new Array(n).fill().map(() => normalGenerator());
  while (true) {
    yield normalGenerators.reduce((ac, el) => ac + el.next().value ** 2, 0);
  }
}

function* continuousGenerator(a, b) {
  const generator = getRandomGenerator.next().value;
  while(true) {
    yield a + generator.next().value * (b - a);
  }
}

const GENERATORS = {
  [DISTRIBUTION_TYPES.NORMAL]: normalGenerator,
  [DISTRIBUTION_TYPES.HI_SQUARED]: hiSquaredGenerator,
  [DISTRIBUTION_TYPES.CONTINUOUS]: continuousGenerator,
}

const DENSITIES = {
  [DISTRIBUTION_TYPES.NORMAL]: (m, sSquared) => x => 1 / (Math.sqrt(sSquared * 2 * Math.PI)) * Math.exp(-((x - m) ** 2 / (2 * sSquared))),
  [DISTRIBUTION_TYPES.HI_SQUARED]: (k) => x => 0.5 ** (k / 2) / gamma(k / 2) * x ** (k / 2 - 1) * Math.exp(-x / 2),
  [DISTRIBUTION_TYPES.CONTINUOUS]: (a, b) => x => x >= a && x <= b ? 1 / (b - a) : 0,
}

function getExpectedValue(X) {
  return X.reduce((a, b) => a + b) / X.length;
}

function getMonteCarloGenerator({ from, to }, args) {
  if(typeof from === 'function') {
    from = from(...args);
  }
  if(typeof to === 'function') {
    to = to(...args);
  }
  if(from === -Infinity && to === Infinity) {
    const value = GENERATORS[DISTRIBUTION_TYPES.NORMAL](0, 1).next().value;
    return {
      value,
      density: DENSITIES[DISTRIBUTION_TYPES.NORMAL](0, 1)(value),
    }
  }
  if(to === Infinity && Number.isFinite(from)) {
    const value = GENERATORS[DISTRIBUTION_TYPES.HI_SQUARED](10).next().value;
    return {
      //[0, +Inf] -> [from, +Inf]
      value: value + from,
      density: DENSITIES[DISTRIBUTION_TYPES.HI_SQUARED](10)(value),
    }
  }
  if(from === Infinity && Number.isFinite(to)) {
    const value = GENERATORS[DISTRIBUTION_TYPES.HI_SQUARED](10).next().value;
    return {
      //[0, +Inf] -> [-Inf, to]
      value: -value + to,
      density: DENSITIES[DISTRIBUTION_TYPES.HI_SQUARED](10)(value),
    }
  }
  if(Number.isFinite(from) && Number.isFinite(to)) {
    const value = GENERATORS[DISTRIBUTION_TYPES.CONTINUOUS](from, to).next().value;
    return {
      value,
      density: DENSITIES[DISTRIBUTION_TYPES.CONTINUOUS](from, to)(value),
    }
  }
}

function integrateMonteCarlo(f, { N }, ...args) {
  const ksi = [];
  for(let i = 0; i < N; i++) {
    const fArgs = args.reduce((ac, arg) => [...ac, getMonteCarloGenerator(arg, ac.map(e => e.value))], []);
    ksi.push(f(...fArgs.map(e => e.value)) / fArgs.reduce((ac, e) => ac * e.density, 1));
  }
  return getExpectedValue(ksi);
}

const wolframResult1 = Math.PI * Math.sqrt((2 * Math.sqrt(17) - 3) / 1003);
const wolframResult2 = 8 * (5 + 3 * Math.sin(3) + 4 * Math.cos(3));
