#include "math.hpp"
#include <map>
#include <cmath>
#include <cassert>
#include <string>
#include "tools.h"

using namespace std;

const static map<int, float> Z_SCORES = {{90, 1.2816}, {95, 1.6449}, {99, 2.3263}, {999, 3.0902}};

int compute_nb_kmers_limit(int kmer_size, int nb_occ, int sequence_length, int p_value) {
  if (Z_SCORES.count(p_value) == 0) {
    throw invalid_argument("You can't use a p_value of "+to_string(p_value));
  }
  float empirical_proba = nb_occ * 1. / (sequence_length - kmer_size + 1);
  if (empirical_proba > 1)
    return nb_occ;

  float min_proba = empirical_proba - Z_SCORES.at(p_value) * sqrt(empirical_proba * (1 - empirical_proba) / (sequence_length - kmer_size + 1));
  if (min_proba <= 0)
    return 0;

  // “Converts” the probability to a number of k-mers
  return min_proba * (sequence_length - kmer_size + 1);
}
