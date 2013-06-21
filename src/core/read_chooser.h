#ifndef READ_FINDER_H
#define READ_FINDER_H
#include <list>
#include "fasta.h"
#include "read_score.h"
#include <map>

/**
 * This class aims at choosing the best read among a group of read.
 * As an input, the class needs a list of reads (sequence + id)
 * as well as the file containing all the sequences
 * and an object able to compute a score for a read.
 * The goal of the class is to find, among the reads,
 * the sequence that has the best score.
 */
class ReadChooser {

 private:
  list<Sequence> reads;
  map<string, float> scores;
 public:
  
  ReadChooser(list<Sequence> &r, VirtualReadScore &scorer);

  /**
   * @return the best sequence among the list of sequences that have been 
   *         given to the object
   */
  Sequence getBest() const;

  /**
   * @return the list of sorted sequence from the best (the first one) to the worst.
   */
  list<Sequence> getSorted() const;

  /**
   * A comparison based on scorer of the two sequences.
   */
  bool operator()(Sequence first, Sequence second);
};


#endif
