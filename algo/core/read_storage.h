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

/**
 * Store reads in bins as well as their scores (the scores are used for binning the reads).
 */
class BinReadStorage: public VirtualReadStorage {
 private:
  size_t nb_bins;
  list<Sequence> *bins;
  double *score_bins;
  size_t *nb_scores;
  size_t total_nb_scores;
  size_t max_score;
  size_t nb_inserted;
  size_t nb_stored;
  size_t smallest_bin_not_empty;
  string label;
public:
  BinReadStorage();
  
  /**
   * Creates a storage with bins. This function *must* be called before using the object
   * nb_bins are created and the maximal score for the reads that will be added is assumed 
   * to be max_score. If higher score are met, they are put in the nb_bins+1 bin.
   * The class doesn't destruct the VirtualReadScore. It is the responsability of the caller.
   * @pre all scores must be >= 0
   * @param no_list: don't create a list (useful for storing only stats,
   *                 false by default: lists are created). If the option is set to true, the
   *                 function add() must not be called but only the addScore().
   */
  void init(size_t nb_bins, size_t max_score, const VirtualReadScore *vrs, bool no_list = false);

  ~BinReadStorage();
  
  void add(Sequence &s);

  /**
   * @return the number of bins requested by the used. Note that an additional
   * bin is created for the values greater than the provided max value.
   */
  size_t getNbBins() const;

  size_t getNbInserted() const;

  size_t getNbStored() const;

  /**
   * Add score information only (not the sequence itself)
   * depending on the scorer that was given to the init() function.
   */
  void addScore(Sequence &s);

  /**
   * Add score information based on the provided score.
   */
  void addScore(float score);

  /**
   * Add score information in the given bin based on the provided score.
   * This method should not be used, prefer the one with the score only.
   */
  void addScore(size_t bin, float score);

  /**
   * @return the average score stored in the bin corresponding to the score
   * obtained for the provided sequence.
   */
  double getAverageScoreBySeq(Sequence &s);

  /**
   * @return the average score stored in the bin of the corresponding score
   */
  double getAverageScoreByScore(float score);

  /**
   * @return the average score stored in the corresponding bin. If no
   * parameter is provided or if the parameter is outside the range [0,
   * getNbBins()] then the average over all the score is returned.
   */
  double getAverageScore(size_t bin=~0);

  /**
   * @return the sum of all the scores stored in the bin corresponding to the score
   * obtained for the provided sequence.
   */
  double getScoreBySeq(Sequence &s);

  /**
   * @return the sum of all the scores stored in the bin of the corresponding score
   */
  double getScoreByScore(float score);

  /**
   * @return the sum of all the scores stored in the corresponding bin. If no parameter is
   * provided or if the parameter is outside the range [0, getNbBins()] then
   * the sum of all the scores is returned.
   */
  double getScore(size_t bin=~0);

  /**
   * @return the number of score stored in the given bin. If no parameter
   * is given or if the parameter is out of the ranges [0, getNbBins()], then
   * the total number of scores stored is returned.
   * @complexity O(1)
   */
  size_t getNbScores(size_t bin=~0) const;

  bool hasLabel() const;

  string getLabel() const;

  list<Sequence> getReads() const;

  /**
   * Set the label of the statistics
   */
  void setLabel(string &label);

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
