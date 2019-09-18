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

const generatorPrototype = Object.getPrototypeOf(function* () { }()).__proto__;
generatorPrototype.getMultipleValues = function (n) {
    return new Array(n).fill().map(() => this.next().value);
}

function* linearCongruentialGenerator(a, betta, c, M) {
    while (true) {
        a = (a * betta + c) % M;
        yield a / M;
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
    BINOMIAL: 1,
    REVERSED_BINOMIAL: 2,
    PUASSON: 3,
}

function* binomialGenerator(n, p) {
    const generatorsArray = new Array(n).fill().map(() => getRandomGenerator.next().value);
    while (true) {
        yield generatorsArray.reduce((ac, generator) => ac + (generator.next().value < p), 0);
    }
}

function* reversedBinomialGenerator(n, p) {
    const generatorsArray = new Array(n).fill().map(() => getRandomGenerator.next().value);
    const c = 1 / Math.log(1 - p);
    while (true) {
        yield generatorsArray.reduce((ac, generator) => ac + Math.floor(c * Math.log(generator.next().value)), 0);
    }
}

function* puassonGenerator(lambda) {
    const randomGenerator = getRandomGenerator.next().value;
    while (true) {
        let p = Math.exp(-lambda);
        let x = 0;
        let r = randomGenerator.next().value - p;
        while (r > 0) {
            x++;
            p = p * lambda / x;
            r -= p;
        }
        yield x;
    }
}

const factorial = (() => {
    const _m = [1];
    return function f(x) {
        return _m[x] ? _m[x] : _m[x] = f(x - 1) * x;
    }
})()

function C(n, k) {
    return factorial(n) / (factorial(k) * factorial(n - k));
}

function binomialDistributionFunction(n, p) {
    return (x) => {
        if (x < 0) return 0;
        if (x >= n) return 1;
        let res = 0;
        for (let i = 0; i <= x; i++) {
            res += C(n, i) * Math.pow(1 - p, n - i) * Math.pow(p, i);
        }
        return res;
    }
}

function reversedBinomialDistributionFunction(n, p) {
    return (x) => {
        if (x < 0) return 0;
        if (x === Infinity) return 1;
        let res = 0;
        for (let i = 0; i <= x; i++) {
            res += C(n + i - 1, i) * Math.pow(1 - p, i);
        }
        return res * Math.pow(p, n);
    }
}

function puassonDistributionFunction(lambda) {
    return (x) => {
        if (x < 0) return 0;
        if (x === Infinity) return 1;
        let res = 0;
        for (let i = 0; i <= x; i++) {
            res += Math.pow(lambda, i) / factorial(i);
        }
        return res * Math.exp(-lambda);
    }
}

const GENERATORS = {
    [DISTRIBUTION_TYPES.BINOMIAL]: binomialGenerator,
    [DISTRIBUTION_TYPES.REVERSED_BINOMIAL]: reversedBinomialGenerator,
    [DISTRIBUTION_TYPES.PUASSON]: puassonGenerator,
}

const DISTRIBUTION_FUNCTIONS = {
    [DISTRIBUTION_TYPES.BINOMIAL]: binomialDistributionFunction,
    [DISTRIBUTION_TYPES.REVERSED_BINOMIAL]: reversedBinomialDistributionFunction,
    [DISTRIBUTION_TYPES.PUASSON]: puassonDistributionFunction,

}

const EXPECTED_VALUES = {
    [DISTRIBUTION_TYPES.BINOMIAL]: (n, p) => n * p,
    [DISTRIBUTION_TYPES.REVERSED_BINOMIAL]: (n, p) => n * (1 - p) / p,
    [DISTRIBUTION_TYPES.PUASSON]: (lambda) => lambda,
}

function isFiniteDistribution(type) {
    switch (type) {
        case DISTRIBUTION_TYPES.BINOMIAL:
            return true;
        case DISTRIBUTION_TYPES.REVERSED_BINOMIAL:
        case DISTRIBUTION_TYPES.PUASSON:
            return false;
    }
}

const SKEWNESSES = {
    [DISTRIBUTION_TYPES.BINOMIAL]: (n, p) => (1 - 2 * p) / Math.sqrt(n * p * (1 - p)),
    [DISTRIBUTION_TYPES.REVERSED_BINOMIAL]: (n, p) => (2 - p) / Math.sqrt(n * (1 - p)),
    [DISTRIBUTION_TYPES.PUASSON]: (lambda) => 1 / Math.sqrt(lambda),
}

const EXCESSES = {
    [DISTRIBUTION_TYPES.BINOMIAL]: (n, p) => (1 - 6 * p * (1 - p)) / (n * p * (1 - p)),
    [DISTRIBUTION_TYPES.REVERSED_BINOMIAL]: (n, p) => p * p / (n * (1 - p)) + 6 / n,
    [DISTRIBUTION_TYPES.PUASSON]: (lambda) => 1 / lambda,
}

function createGenerator(generatorType, n, ...args) {
    const generator = GENERATORS[generatorType](...args);
    return {
        generator,
        distributionFunction: DISTRIBUTION_FUNCTIONS[generatorType](...args),
        expectedValue: EXPECTED_VALUES[generatorType](...args),
        result: generator.getMultipleValues(n),
        isFinite: isFiniteDistribution(generatorType),
        skewness: SKEWNESSES[generatorType](...args),
        excess: EXCESSES[generatorType](...args),
    }
}

function M(k, X) {
    const xAv = X.reduce((a, b) => a + b) / X.length;
    return X.reduce((a, b) => a + Math.pow(b - xAv, k)) / X.length;
}

// http://www.machinelearning.ru/wiki/index.php?title=%D0%9A%D0%BE%D1%8D%D1%84%D1%84%D0%B8%D1%86%D0%B8%D0%B5%D0%BD%D1%82_%D0%B0%D1%81%D0%B8%D0%BC%D0%BC%D0%B5%D1%82%D1%80%D0%B8%D0%B8
function getSkewness(X) {
    const m = X.length;
    return Math.sqrt(m * (m - 1)) / (m - 2) * M(3, X) / Math.pow(M(2, X), 3 / 2);
}

// http://www.machinelearning.ru/wiki/index.php?title=Коэффициент_эксцесса
function getExcess(X) {
    const m = X.length;
    return (m * m - 1) / ((m - 2) * (m - 3)) * 
        (M(4, X) / Math.pow(M(2, X), 2) - 3 + 6 / (m + 1));
}

function hiSquaredTest(generator) {
    let nu;
    if (generator.isFinite) {
        nu = [];
        generator.result.forEach(el => nu[el] = nu[el] + 1 || 1);
    } else {
        nu = new Array(10).fill(0);
        generator.result.forEach(el => nu[Math.min(9, el)]++);
    }
    // const p_k = values.length / k;
    const hiSquared = nu.reduce((sum, nu_k, i) => {
        const p_k = (generator.distributionFunction(generator.isFinite || i !== nu.length - 1 ? i : Infinity) - generator.distributionFunction(i - 1)) * generator.result.length;
        console.log(nu_k, p_k);
        return sum + ((nu_k - p_k) ** 2) / p_k;
    }, 0);
    const delta = approximateHiSquared(0.95, nu.length - 1);
    if (hiSquared < delta) {
        return { nu, str: `Passed hi-squared test: ${hiSquared.toFixed(5)} < ${delta.toFixed(5)}` };
    } else {
        return { nu, str: `Hi-squared test failed: ${hiSquared.toFixed(5)} > ${delta.toFixed(5)}` };
    }
}

let binomialResult1 = createGenerator(DISTRIBUTION_TYPES.BINOMIAL, 1000, 6, 1 / 3);
let binomialResult2 = createGenerator(DISTRIBUTION_TYPES.BINOMIAL, 1000, 5, 0.6);
let reversedBinomialResult = createGenerator(DISTRIBUTION_TYPES.REVERSED_BINOMIAL, 1000, 4, 0.2);
let puassonResult = createGenerator(DISTRIBUTION_TYPES.PUASSON, 1000, 2);
