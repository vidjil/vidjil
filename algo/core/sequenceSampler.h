#ifndef SEQUENCE_SAMPLER_H
#define SEQUENCE_SAMPLER_H

#include <list>
#include "fasta.h"

using namespace std;

/**
 * This class is used to just take a sample of sequences among a list of sequences.
 */
class SequenceSampler {
 private:
  list<Sequence> &sequences;
  size_t *length_distribution;

 public:
  /**
   * Build a SequenceSampler on the specified list of sequences.
   * @param seqs: the list of sequences
   */
  SequenceSampler(list<Sequence> &seqs);

  ~SequenceSampler();

  /**
   * Compute the length distribution for the input sequences.  A bucket-like
   * sort is performed, and the parameter gives the maximal number of buckets
   * to be used. If some sequences are longer than nb_buckets, then they will
   * be put in the last bucket.
   */
  void computeLengthDistribution(size_t nb_buckets);

  /**
   * @return the length distribution of the input sequences or NULL if the
   * length distribution has not been computed yet
   */
  size_t *getLengthDistribution();

  /**
   * @return at least nb_min sequences taken from the list of sequences given at 
   *         construction time. Those sequences are among the longest but are not sorted.
   * @param nb_min: minimal number of sequences to return
   * @param nb_buckets: the sequences are not actually sorted. See computeLengthDistribution()
   * @complexity the time complexity is proportional in the size of the input list
   */
  list<Sequence> getLongest(size_t nb_min, size_t nb_buckets);

  /**
   * @return at least nb_min sequences drawn randomly from the input set.
   * @complexity The time complexity is proportional in the size of the input list
   */
  list<Sequence> getRandom(size_t nb_min);
};

#endif
