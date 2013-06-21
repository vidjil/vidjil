#ifndef REPRESENTATIVE_H
#define REPRESENTATIVE_H
#include <string>
#include <cassert>
#include <list>
#include "fasta.h"

using namespace std;

/**
 * Compute a representative sequence from a list of sequences.
 * The sequences are supposed to share a common juction.
 */
class RepresentativeComputer {
protected:
  list<Sequence> &sequences;
  bool is_computed;
  string representative;
public:
  RepresentativeComputer(list<Sequence> &r);

  /**
   * @pre hasRepresentative()
   * @return the representative sequence of the set of sequences.
   *         The representative meets the criteria given to compute().
   */
  string getRepresentative() const;

  /**
   * @return the input sequences we are working on
   */
  list<Sequence>& getSequenceList() const;

  /**
   * @return true iff compute() has been called and the criteria have been met.
   */
  bool hasRepresentative() const;

  /**
   * Compute the representative depending on the specified parameters.
   * @param min_cover: minimal number of reads supporting each position of the 
   *                   representative
   * @param percent_cover: minimal percent of the maximal coverage that is 
   *                       admissible for covering the representative.
   *                       Any position is covered by at least percent_cover %
   *                       of the maximal coverage.
   */
  virtual void compute(size_t min_cover, float percent_cover) = 0;
};

/**
 * The representative is computed from the list of sequences.  Those sequences
 * must all share a common factor whose length is greater or equal to k.
 */
class KmerRepresentativeComputer : public RepresentativeComputer {
protected:
  int k;
public:
  KmerRepresentativeComputer(list<Sequence> &r, int k);

  // Getters, setters
  int getK() const;

  /**
   * Sets the length of the k-mer used for computing the representative
   */
  void setK(int k);

  // Actions
  void compute(size_t min_cover, float percent_cover);

};

#endif
