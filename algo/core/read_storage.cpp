#include "read_storage.h"

size_t VirtualReadStorage::getMaxNbReadsStored() const{
  return maxNbStored;
}

void VirtualReadStorage::setMaxNbReadsStored(size_t nb_reads) {
  maxNbStored = nb_reads;
}


//////////////////////////////////////////////////

BinReadStorage::BinReadStorage()
  :nb_bins(0), max_score(0), nb_inserted(0), nb_stored(0), smallest_bin_not_empty(~0) {
    bins = NULL;
}

void BinReadStorage::init(size_t nb_bins, size_t max_score, const VirtualReadScore *vrs) {
  this->nb_bins = nb_bins;
  this->max_score = max_score;
  bins = new list<Sequence>[nb_bins+1];
  scorer = vrs;
}

BinReadStorage::~BinReadStorage() {
  if (bins)
    delete [] bins;
}

void BinReadStorage::add(Sequence &s) {
  size_t bin = scoreToBin(scorer->getScore(s.sequence));
  if (nb_stored < getMaxNbReadsStored()) {
    bins[bin].push_back(s);
    nb_stored++;
    if (bin < (size_t)smallest_bin_not_empty)
      smallest_bin_not_empty = bin;
  } else {
    // We don't have space left.
    // Either we don't insert that sequence or it replaces another one
    if (bin > smallest_bin_not_empty) {
      bins[smallest_bin_not_empty].erase(bins[smallest_bin_not_empty].begin());
      if (bins[smallest_bin_not_empty].size() == 0)
        update_smallest_bin_not_empty();
      bins[bin].push_back(s);
    }
  }
  nb_inserted++;
}

size_t BinReadStorage::getNbInserted() const {
  return nb_inserted;
}

size_t BinReadStorage::getNbStored() const {
  return nb_stored;
}

list<Sequence> BinReadStorage::getReads() const {
  list<Sequence>results;

  for (size_t i = smallest_bin_not_empty; i <= nb_bins; i++) {
    if (bins[i].size() > 0) {
      for (list<Sequence>::iterator it = bins[i].begin(); it != bins[i].end();
           it++)
        results.push_back(*it);
    }
  }
  return results;
}

size_t BinReadStorage::scoreToBin(float score) {
  assert(score >= 0);
  if (score > max_score)
    return nb_bins;
  return (int)((score / (max_score+1)) * nb_bins);
}

void BinReadStorage::update_smallest_bin_not_empty() {
  for (size_t i = smallest_bin_not_empty; i <= nb_bins; i++) {
    if (bins[i].size() > 0) {
      smallest_bin_not_empty = i;
      return;
    }
  }
  smallest_bin_not_empty = ~0;
}
