#include "read_storage.h"

size_t VirtualReadStorage::getMaxNbReadsStored() const{
  return maxNbStored;
}

void VirtualReadStorage::setMaxNbReadsStored(size_t nb_reads) {
  maxNbStored = nb_reads;
}


//////////////////////////////////////////////////

BinReadStorage::BinReadStorage()
  :nb_bins(0), bins(NULL), score_bins(NULL), nb_scores(NULL), total_nb_scores(0), max_score(0),
   nb_inserted(0), nb_stored(0), smallest_bin_not_empty(~0) {}

void BinReadStorage::init(size_t nb_bins, size_t max_score, const VirtualReadScore *vrs, bool no_list) {
  this->nb_bins = nb_bins;
  this->max_score = max_score;
  if (no_list)
    bins = NULL;
  else
    bins = new list<Sequence>[nb_bins+1];

  score_bins = new double[nb_bins+1];
  nb_scores = new size_t[nb_bins+1];
  for (size_t i = 0; i <= nb_bins; i++) {
    score_bins[i] = 0;
    nb_scores[i] = 0;
  }
  scorer = vrs;
}

BinReadStorage::~BinReadStorage() {
  if (bins)
    delete [] bins;
  if (score_bins) {
    delete [] score_bins;
    delete [] nb_scores;
  }

}

void BinReadStorage::addScore(Sequence &s) {
  addScore(scorer->getScore(s.sequence));
}

void BinReadStorage::addScore(float score) {
  addScore(scoreToBin(score), score);
}

void BinReadStorage::addScore(size_t bin, float score) {
  score_bins[bin] += score;
  nb_scores[bin]++;
  total_nb_scores++;
}

void BinReadStorage::add(Sequence &s) {
  float score = scorer->getScore(s.sequence);
  size_t bin = scoreToBin(score);
  addScore(bin, score);
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

size_t BinReadStorage::getNbBins() const {
  return nb_bins;
}

size_t BinReadStorage::getNbInserted() const {
  return nb_inserted;
}

double BinReadStorage::getAverageScoreBySeq(Sequence &s) {
  return getAverageScoreByScore(scorer->getScore(s.sequence));
}

double BinReadStorage::getAverageScoreByScore(float score) {
  return getAverageScore(scoreToBin(score));
}

double BinReadStorage::getAverageScore(size_t bin) {
  return getScore(bin) / getNbScores(bin);
}

double BinReadStorage::getScoreBySeq(Sequence &s) {
  return getScoreByScore(scorer->getScore(s.sequence));
}

double BinReadStorage::getScoreByScore(float score) {
  return getScore(scoreToBin(score));
}

double BinReadStorage::getScore(size_t bin) {
  if (bin > getNbBins()) {
    double sum = 0;
    for (size_t i = 0; i <= getNbBins(); i++)
      sum += score_bins[i];
    return sum;
  }
  return score_bins[bin];
}

size_t BinReadStorage::getNbScores(size_t bin) const {
  if (bin > getNbBins())
    return total_nb_scores;
  return nb_scores[bin];
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
