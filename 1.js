const a0 = 16387;
const betta = 16387;
const K = 48;
const M = 2 ** 31;
const epsilon = 0.05;

// If user.name === Katya - ignore
// Quite bad solution, but lgtm
const generatorPrototype = Object.getPrototypeOf(function*(){}()).__proto__;

// If user.name === Katya - ignore
generatorPrototype.getMultipleValues = function(n) {
    return new Array(n).fill().map(() => this.next().value);
}

/**
 * If user.name === Katya look into linearCongruentialGeneratorWithoutGenerator
 */
function* linearCongruentialGenerator(a, betta, c, M) {
    while (true) {
        a = (a * betta + c) % M;
        yield a;
    }
}

function linearCongruentialGeneratorWithoutGenerator(a, betta, c, M, n) {
    const res = new Array(n);
    for(let i = 0; i < n; i++) {
        res[i] = a = (a * betta + c) % M;
    }
    return res;
}

/**
 * If user.name === Katya look into multiplexialCongruentialGeneratorWithoutGenerator
 */
function* multiplexialCongruentialGenerator(a, betta, M) {
    yield* linearCongruentialGenerator(a, betta, 0, M);
}

function multiplexialCongruentialGeneratorWithoutGenerator(a, betta, M, n) {
    return linearCongruentialGeneratorWithoutGenerator(a, betta, 0, M, n);
}

/**
 * If user.name === Katya look into macLarenMarsagliaGeneratorWithoutGenerator
 */
function* macLarenMarsagliaGenerator(XGenerator, YGenerator, MY, k) {
    const V = XGenerator.getMultipleValues(k);

    while (true) {
        const [X, Y] = [XGenerator.next().value, YGenerator.next().value];
        const j = Math.floor(k * Y / MY);
        yield V[j];
        V[j] = X;
    }
}

/**
 * 
 * @param {number[]} XGenerated should have length k+n
 * @param {number[]} YGenerated should have length n
 * @param {number} k 
 * @param {number} n 
 */
function macLarenMarsagliaGeneratorWithoutGenerator(XGenerated, YGenerated, MY, k, n) {
    const V = new Array(k);
    const res = new Array(n);
    for(let i = 0; i < k; i++) {
        XGenerated[i];
    }
    for(let i = 0; i < n; i++){
        const j = Math.floor(k * YGenerated[i] / MY);
        res[i] = V[j];
        V[j] = XGenerated[i + k];
    }
    return res;
}

/**
 * Magic function from https://ru.wikipedia.org/wiki/%D0%9A%D0%B2%D0%B0%D0%BD%D1%82%D0%B8%D0%BB%D0%B8_%D1%80%D0%B0%D1%81%D0%BF%D1%80%D0%B5%D0%B4%D0%B5%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F_%D1%85%D0%B8-%D0%BA%D0%B2%D0%B0%D0%B4%D1%80%D0%B0%D1%82
 * Better don't use it, but just take const from the table
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

function hiSquaredTest(values, M, epsilon, k = 20) {
    const nu = new Array(k).fill(0);
    values.forEach(el => nu[Math.floor(el * k / M)]++);
    const p_k = values.length / k;
    const hiSquared = nu.reduce((sum, nu_k) => sum + ((nu_k - p_k) ** 2) / p_k, 0);
    const delta = approximateHiSquared(1 - epsilon, k - 1);
    if (hiSquared < delta) {
        console.log('Passed hi-squared test');
        console.log(`${hiSquared} < ${delta}`);
    } else {
        console.log('Hi-squared test failed');
        console.log(`${hiSquared} > ${delta}`);
    }
}

function approximateKolmogorov(epsilon) {
    let res = 0;
    for(let i = -1000; i <= 1000; i++){
        res += (-1)**i * Math.exp(-2 * k ** 2 * epsilon ** 2)
    }
    return res;
}

function kolmogorovTest(values, M, epsilon) {
    // To avoid sorting of original array
    let copiedValues = [...values];
    copiedValues.sort((a, b) => a - b);
    const Dn = copiedValues.reduce((ac, val, i) => Math.max(ac, Math.abs(val / M - i / copiedValues.length)), 0) * 
        Math.sqrt(copiedValues.length);
    console.log(Dn);
}

const multiplexialCongruentialResult = multiplexialCongruentialGenerator(a0, betta, M).getMultipleValues(1000);

const XGenerator = linearCongruentialGenerator(a0, betta, 0, M);
const YGenerator = linearCongruentialGenerator(a0 + 42, betta - 42, 42, M);
const macLarenMarsagliaResult = macLarenMarsagliaGenerator(XGenerator, YGenerator, M, K).getMultipleValues(1000);


hiSquaredTest(macLarenMarsagliaResult, M, epsilon, 10);
hiSquaredTest(multiplexialCongruentialResult, M, epsilon, 10);
kolmogorovTest(multiplexialCongruentialResult, M);
kolmogorovTest(macLarenMarsagliaResult, M);
/**
 * DEPRECATED
 */
// function approximateHiSquared(alpha, n) {
//     const d = alpha < 0.5 ?
//         -2.0637 * (Math.log(1 / alpha) - 0.16) ** 0.4274 + 1.5774 :
//         2.0637 * (Math.log(1 / (1 - alpha)) - 0.16) ** 0.4274 - 1.5774;
//     const E = d * (9 * d ** 4 + 256 * d ** 2 - 433) / (4860 * Math.SQRT2);
//     const D = - (6 * d ** 4 + 14 * d ** 2 - 32) / 405;
//     const C = d * (d ** 2 - 7) / (9 * Math.SQRT2);
//     const B = 2 / 3 * (d ** 2 - 1);
//     const A = d * Math.SQRT2;
//     const sqrtN = Math.sqrt(n);
//     return n + A * sqrtN + B + C / sqrtN + D / n + E / (n * sqrtN);
// }