#ifndef READ_STORAGE_H
#define READ_STORAGE_H

#include "read_score.h"
#include <list>
using namespace std;

/**
 * Stores reads so that we can easily store only the best reads among all the reads.
 * Only a limited amount of reads may be stored.
 */
class VirtualReadStorage {
 protected:
  size_t maxNbStored;
  const VirtualReadScore *scorer;

 public:

  virtual ~VirtualReadStorage() {}
  
  /**
   * Add a sequence s to all the reads.
   * The sequence may or may no be inserted depending on its score
   * and the number of sequences already inserted.
   */
  virtual void add(Sequence &s) = 0;

  /**
   * Sets how many reads should be stored in maximum.
   */
  void setMaxNbReadsStored(size_t nb);

  /**
   * @return the maximal number of reads stored
   */
  size_t getMaxNbReadsStored() const;

  /**
   * @return the number of elements that have been inserted (all may not be stored)
   */
  virtual size_t getNbInserted() const = 0;

  /**
   * @return the number of elements actually stored
   */
  virtual size_t getNbStored() const = 0;

  /**
   * @return all the stored reads
   */
  virtual list<Sequence> getReads() const = 0;
};

class BinReadStorage: public VirtualReadStorage {
 private:
  size_t nb_bins;
  list<Sequence> *bins;
  size_t max_score;
  size_t nb_inserted;
  size_t nb_stored;
  size_t smallest_bin_not_empty;

public:
  BinReadStorage();
  
  /**
   * Creates a storage with bins. This function *must* be called before using the object
   * nb_bins are created and the maximal score for the reads that will be added is assumed 
   * to be max_score. If higher score are met, they are put in the nb_bins+1 bin.
   * The class doesn't destruct the VirtualReadScore. It is the responsability of the caller.
   * @pre all scores must be >= 0
   */
  void init(size_t nb_bins, size_t max_score, const VirtualReadScore *vrs);

  ~BinReadStorage();
  
  void add(Sequence &s);

  size_t getNbInserted() const;

  size_t getNbStored() const;

  list<Sequence> getReads() const;

 private:
  /**
   * @return the bin a sequence of the given score must lie.
   */
  size_t scoreToBin(float score);

  /**
   * Search for a largest value such that the bin is not empty.
   * If none is found ~0 is stored.
   */
  void update_smallest_bin_not_empty();

  friend void testBinReadStorage();
};
#endif
