import math

def linearCongruentialGenerator(a, betta, c, M):
  while (True):
      a = (a * betta + c) % M
      yield a / M

def multiplexialCongruentialGenerator(a, betta, M):
  generator = linearCongruentialGenerator(a, betta, 0, M)
  while (True):
    yield next(generator)

def macLarenMarsagliaGenerator(XGenerator, YGenerator, MY, k):
  V = [next(XGenerator) for _ in range(k)]
  while(True):
    X = next(XGenerator)
    Y = next(YGenerator)
    j = math.floor(k * Y)
    yield V[j]
    V[j] = X


def hiSquaredTest(values, k):
  nu = [0] * k
  for value in values:
    nu[math.floor(value * k)] += 1
  p_k = len(values) / k
  hiSquared = 0
  for value in nu:
    hiSquared += ((value - p_k) ** 2) / p_k
  return hiSquared < 16.919

def kolmogorovTest(values): 
  values.sort()
  Dn = 0
  i = 0
  for value in values:
    i += 1
    Dn = max(Dn, value - i / len(values))
  Dn *= math.sqrt(len(values))
  return Dn < 1.36


g = multiplexialCongruentialGenerator(16387, 16387, 2**31)
g1 = [next(g) for _ in range(1000)]
print(hiSquaredTest(g1, 10))
print(kolmogorovTest(g1))
g = macLarenMarsagliaGenerator(
    linearCongruentialGenerator(16387, 16387, 0, 2**31),
    linearCongruentialGenerator(16387 + 42, 16387 - 42, 42, 2**31),
    2**31, 48)
g2 = [next(g) for _ in range(1000)]
print(hiSquaredTest(g2, 10))
print(kolmogorovTest(g2))
