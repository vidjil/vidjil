#ifndef REPRESENTATIVE_H
#define REPRESENTATIVE_H
#include <string>
#include <cassert>
#include <list>
#include "bioreader.hpp"
#include "kmerstore.h"
#include "read_score.h"

using namespace std;

#define DEFAULT_STABILITY_LIMIT 30

#define THRESHOLD_BAD_COVERAGE .5 /* Threshold below which the representatie
                                     coverage is considered bad */

static RandomScore DEFAULT_READ_SCORE;

/**
 * Compute a representative sequence from a list of sequences.
 * The sequences are supposed to share a common juction.
 */
class RepresentativeComputer {
protected:
  list<Sequence> &sequences;
  bool is_computed;
  Sequence representative;
  size_t min_cover;
  float percent_cover;
  bool revcomp;
  string required;
  float coverage_reference_length;
  float coverage;
  string quality;
  string coverage_info;
public:
  RepresentativeComputer(list<Sequence> &r);

  /**
   * @pre hasRepresentative()
   * @return the representative sequence of the set of sequences.
   *         The representative meets the criteria given to compute().
   *         The label of the sequence is composed of the read labels used for that
   *         purpose, plus the positions that have been extracted.   
   */
  Sequence getRepresentative() const;

  /**
   * @return true iff compute() has been called and the criteria have been met.
   */
  bool hasRepresentative() const;

  /**
   * @return if the count is sufficiently elevated to be considered as expressed.
             ie. count >= getMinCover() && count*1./max >= getPercentCoverage()
   */
  bool isSufficienlyExpressed(size_t count, size_t max) const;

  /**
   * Compute the representative depending on the parameters set by the functions
   * @pre setRequiredSequence() must have been called (with a non-empty string).
   */
  virtual void compute(VirtualReadScore & readScorer = DEFAULT_READ_SCORE,
                       bool try_hard=false) = 0;

  /**
   * @param min_cover: minimal number of reads supporting each position of the 
   *                   representative
   */
  void setMinCover(size_t min_cover);

  /**
   * Set some parameters by calling the corresponding setters.
   */
  void setOptions(bool do_revcomp, size_t min_cover, float percent_cover);

  /**
   * @param percent_cover: minimal percent of the maximal coverage that is 
   *                       admissible for covering the representative.
   *                       Any position is covered by at least percent_cover %
   *                       of the maximal coverage.
   */
  void setPercentCoverage(float percent_cover);

  /**
   * @param do_revcomp: true iff sequences may be coming from any strand, and 
   *                     therefore should be revcomp-ed
   */
  void setRevcomp(bool do_revcomp);

  /**
   * Sequence that the representative must contain absolutely.
   * This sequence should appear only once in a read.
   * Calling this method is mandatory.
   */
  void setRequiredSequence(string sequence);

  /**
   * @param coverage_reference_length: reference length used to compute the coverage
   */
  void setCoverageReferenceLength(float coverage_reference_length);
};

/**
 * The representative is computed from the list of sequences.  Those sequences
 * must all share a common factor whose length is greater or equal to k.
 */
class KmerRepresentativeComputer : public RepresentativeComputer {
protected:
  string seed;
  int stability_limit;
public:
  /**
   * The provided seed must be a contiguous seed. If not provided, the default
   * one is used.
   */
  KmerRepresentativeComputer(list<Sequence> &r, string seed="");

  // Getters, setters
  string getSeed() const;
  float getCoverage() const;
  string getQuality() const;
  string getCoverageInfo() const;

  /**
   * @param limit: maximal number of iterations to be performed before reaching 
   *               stability. If after limit number of iterations, the length
   *               of the representative didn't improve, we keep it.
   */
  void setStabilityLimit(int limit);

  // Actions
  /**
   * @pre setCoverageReferenceLength() must have been called previously
   */
  void compute(VirtualReadScore & readScorer = DEFAULT_READ_SCORE,
               bool try_hard = false);

 private:

  /**
   * Check if we can extend the representative to the left (direction == -1)
   * or to the right (direction == 1), given the kmer counts, the seeds used
   * and starting from position i.
   * The cover is updated accordingly if the representative is extended.
   */
  bool tryToExtendRepresentative(const vector<Kmer> counts[],
                                 string seeds[],
                                 size_t nb_seeds,
                                 size_t i,
                                 bool *cover,
                                 size_t &length_cover,
                                 int direction);

  /**
   * Remove the ends of the representative if they contain too many N.
   * The values of start_pos and length will be updated correspondingly.
   */
  void trimRepresentative(string &sequence, size_t &start_pos, size_t &length);
};

#endif
