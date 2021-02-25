#include "proba.h"
#include <math.h>
#include "tools.h"

// ProbaPrecomputer::ProbaPrecomputer() {}

void ProbaPrecomputer::precomputeSystemProba(float index_load) {
  precomputed_proba_with_system[index_load] = std::vector<double>(MAX_PRECOMPUTED_PROBA);
  precomputed_proba_without_system[index_load] = std::vector<double>(MAX_PRECOMPUTED_PROBA);

  std::vector<double> &pproba_with = precomputed_proba_with_system[index_load];
  std::vector<double> &pproba_without = precomputed_proba_without_system[index_load];

  pproba_with[0] = 1;
  pproba_without[0] = 1;
  for (int i = 1; i < MAX_PRECOMPUTED_PROBA; i++) {
    pproba_with[i] = pproba_with[i - 1] * index_load;
    pproba_without[i] = pproba_without[i - 1] * (1 - index_load);
  }

  precomputed_proba[index_load] = std::vector<std::vector<double> >(MAX_PRECOMPUTED_PROBA);
}

void ProbaPrecomputer::precomputeProba(float index_load, int length) {
  if (length < MAX_PRECOMPUTED_PROBA) {
    // By definition of MAX_PRECOMPUTED_PROBA they exist
    double probability_having_system = precomputed_proba_with_system.at(index_load)[length];
    double probability_not_having_system = 1;
    precomputed_proba[index_load][length] = std::vector<double>(length+1);
    std::vector<double> &precomp_proba = precomputed_proba[index_load][length];
    
    double proba = 0;
    precomp_proba[0] = proba;
    double Cnk = 1; // nChoosek(length, length);
    for (int i=length; i>=1; i--) {
      proba += probabilityPreviousIteration(i, length, Cnk, probability_having_system,
                                        probability_not_having_system, index_load);
      precomp_proba[i] = proba;
    }
  }
}

double ProbaPrecomputer::probabilityPreviousIteration(int iteration, int length, double &Cnk, double &proba_with, double &proba_without, float index_load) {
  double proba = Cnk * proba_with * proba_without;
  proba_with = getProbaWith(index_load, iteration-1); // Otherwise when probability are too low they are stored as 0 and we are f*****
  proba_without *= (1 - index_load);
  Cnk *= iteration*1. / (length-iteration+1);
  return proba;
}

double ProbaPrecomputer::getProbaWith(double p, int nb) {
  if (nb < MAX_PRECOMPUTED_PROBA)
    return precomputed_proba_with_system.at(p)[nb];
  return pow(p, nb);
}

double ProbaPrecomputer::getProba(float index_load, int at_least, int length) {
  if (at_least == 0) return 1.0; // even if 'length' is very small
  
  if (! precomputed_proba_without_system.count(index_load)) {
    precomputeSystemProba(index_load);
  }
  if (length < MAX_PRECOMPUTED_PROBA) {
    if (! precomputed_proba[index_load][length].size())
      precomputeProba(index_load, length);

    if (precomputed_proba[index_load][length].size() > 0) {
      return precomputed_proba[index_load][length][at_least];
    }
  }
  
  double proba = 0;
  double probability_not_having_system;
  double probability_having_system;
  probability_having_system = pow(index_load, length);
  probability_not_having_system = 1;

  double Cnk = 1;
  for (int i=length; i >= at_least; i--) {
    proba += probabilityPreviousIteration(i, length, Cnk, probability_having_system,
                                          probability_not_having_system, index_load);
  }

#ifdef DEBUG_KMS_EVALUE
  cerr << "e-value:\tindex_load=" << index_load << ",\tat_least=" << at_least << ",\tlength=" << length <<",\tp-value=" << proba << endl;
#endif
  return proba;
  
}
