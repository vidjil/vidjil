#ifndef REPRESENTATIVE_H
#define REPRESENTATIVE_H
#include <string>
#include <cassert>
#include <list>
#include "fasta.h"

using namespace std;

#define DEFAULT_STABILITY_LIMIT 30

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
   * @return the input sequences we are working on
   */
  list<Sequence>& getSequenceList() const;

  size_t getMinCover() const;
  float getPercentCoverage() const;
  bool getRevcomp() const;

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
   */
  virtual void compute() = 0;

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
  KmerRepresentativeComputer(list<Sequence> &r, string seed);

  // Getters, setters
  string getSeed() const;

  /**
   * Sets the length of the k-mer used for computing the representative
   */
  void setSeed(string seed);

  int getStabilityLimit() const;

  /**
   * @param limit: maximal number of iterations to be performed before reaching 
   *               stability. If after limit number of iterations, the length
   *               of the representative didn't improve, we keep it.
   */
  void setStabilityLimit(int limit);

  // Actions
  void compute();

};

#endif
