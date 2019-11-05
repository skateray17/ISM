import java.util.Arrays;

public class M {
  static double[] MCG(long a, long b, long M, int n) {
     double[] res = new double[n];
     for(int i = 0; i < n; i++) {
        a = a * b % M;
        res[i] = a * 1. / M;
     }
     return res;
  }
  
  static double[] MLMG(double[] X, double[] Y, int k, int n) {
      double[] V = new double[k];
      for(int i = 0; i < k; i++) {
          V[i] = X[i];
      }
      double[] res = new double[n];
      for(int i = 0; i < n; i++) {
          int j = (int)Math.floor(Y[i] * k);
          res[i] = V[j];
          V[j] = X[i+k];
      }
      return res;
  }
  
  static boolean hiSquared(double[] X) {
      int[] nu = new int[10];
      for(int i = 0; i < X.length; i++) {
          nu[(int)Math.floor(10 * X[i])]++;
      }
      double p_k = X.length / 10.;
      double hiSquared = 0;
      for(int i = 0; i < 10; i++) {
           hiSquared += Math.pow(nu[i] - p_k, 2) / p_k;
      }
      System.out.println(hiSquared);
      return hiSquared < 16.919;
  }
  
  static boolean KT(double[] X) {
      Arrays.sort(X);
      double Dn = 0;
      for (int i = 0; i < X.length; i++) {
          Dn = Math.max(Dn, Math.abs(X[i] - (i + 1) * 1. / X.length));
      }
      Dn *= Math.sqrt(X.length);
      System.out.println(Dn);
      return Dn < 1.36;
  }
  
  public static void main(String[] args) {
    double[] mcl = MCG(68921, 68921, 2147483648L, 1000);
    double[] mlmg = MLMG(MCG(68921, 68921, 2147483648L, 1048), MCG(68921, 68921, 2147483648L, 1000), 48, 1000);
    System.out.println(hiSquared(mcl));
    System.out.println(hiSquared(mlmg));
    System.out.println(KT(mcl));
    System.out.println(KT(mlmg));
  }
};