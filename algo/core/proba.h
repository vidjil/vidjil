#ifndef PROBA_H
#define PROBA_H

#include <map>
#include <vector>

#define MAX_PRECOMPUTED_PROBA 500 /* Precompute 500 probabilities for each index load */

/**
 * Store probabilities for sequences whose length is < MAX_PRECOMPUTED_PROBA
 */
class ProbaPrecomputer {
private:
  // Store for each index load, the probability that have been computed for
  // each possiible at_least and length values. To be used as
  // precomputed_proba[index_load][length][at_least]
  std::map<float, std::vector<std::vector<double> > > precomputed_proba;
  std::map<float, std::vector<double> > precomputed_proba_with_system, precomputed_proba_without_system;

  /**
   * Precompute index_load^n and (1-index_load)^n (for n=0...MAX_PRECOMPUTED_PROBA)
   */
  void precomputeSystemProba(float index_load);
  /**
   * Precompute the results of getProba (if length < MAX_PRECOMPUTED_PROBA)
   * for every possible values of at_least between 1 and length
   */
  void precomputeProba(float index_load, int length);
  /**
   * Commpute the previous iteration for the probability (and updates the values Cnk, proba_with,
   * proba_without.
   */
  inline double probabilityPreviousIteration(int iteration, int length, double &Cnk, double &proba_with, double &proba_without, float index_load);
public:
  
  
  /**
   * @return probability that the number of kmers (with index load 'index_load')
   *  is 'at_least' or more in a sequence of length 'length'
   */
  double getProba(float index_load, int at_least, int length);

  /**
   * @return p^nb (potentially pre-computed)
   */
  double getProbaWith(double p, int nb);

  friend void testProba1();
};

#endif
