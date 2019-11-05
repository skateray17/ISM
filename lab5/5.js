const MAX_ITERATIONS = 4e4;

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

const getRandomGenerator = (function () {
  const generatorCreater = (function* () {
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
  return () => generatorCreater.next().value;
})();

/**
 * solves Ax = b
 * @param {Matrix} A 
 * @param {Array} b 
 * @param {Number} N length of Markov's chain 
 */
const solve = (A, b, N = 10) => {
  const isNormalized = (A) => A.reduce((ac, str, i) =>
    ac + str.reduce((acc, v, ind) => acc + (v - (i === ind)) ** 2, 0), 0) < 1 ||
    Math.max.apply(Math, A.map((str, i) => str.reduce((ac, el, ind) => ac + Math.abs(el - (i === ind)), 0))) < 1;
  if (!isNormalized(A)) {
    throw new Error('TODO normalize???');
  }

  // Ax = f -> x = Ax + f
  A = A.map((row, i) => row.map((el, ind) => -el + (ind === i)));

  const pi = new Array(A.length).fill(1 / A.length);
  const P = new Array(A.length).fill().map(_ => new Array(A.length).fill(1 / A.length));
  const random = getRandomGenerator();

  const x = new Array(A.length).fill(0);
  for (let j = 0; j < MAX_ITERATIONS; j++) {
    // generate Markov's chain
    const i = [];
    for (let k = 0; k < N; k++) {
      let rand = random.next().value;
      for (let z = 0; z < pi.length; z++) {
        if (rand < pi[z]) {
          i[k] = z;
          break;
        }
        rand -= pi[z];
      }
    }

    const Q = new Array(A.length).fill(0);
    const ind = i[0];
    Q[0] = pi[i[0]] > 0 ? 1 / pi[i[0]] : 0;
    for (let m = 1; m < N; m++) {
      Q[m] = Q[m - 1] * (P[i[m - 1]][i[m]] > 0 ? A[i[m - 1]][i[m]] / P[i[m - 1]][i[m]] : 0);
    }

    let ksiN = 0;
    for (let m = 0; m < N; m++) {
      ksiN += b[i[m]] * Q[m];
    }
    x[ind] += ksiN;
  }
  return x.map(el => el / MAX_ITERATIONS);
}

function getDiscrepancy(A, x, b) {
  return A.reduce((ac, el, i) => { ac.push(el.reduce((acc, ell, ii) => acc + ell * x[ii], 0) - b[i]); return ac; }, []);
}

const A = [
  [0.8, 0.2, 0.3],
  [-0.2, 0.5, -0.3],
  [0.4, 0.2, 1.3],
];
const b = [3, -1, -1];



