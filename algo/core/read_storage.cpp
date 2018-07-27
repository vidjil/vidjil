#include "read_storage.h"
#include "tools.h"

size_t VirtualReadStorage::getMaxNbReadsStored() const{
  return maxNbStored;
}

void VirtualReadStorage::setMaxNbReadsStored(size_t nb_reads) {
  maxNbStored = nb_reads;
}


//////////////////////////////////////////////////

BinReadStorage::BinReadStorage()
  :nb_bins(0), bins(NULL), score_bins(NULL), nb_scores(NULL), total_nb_scores(0), max_score(0),
   nb_inserted(0), nb_stored(0), smallest_bin_not_empty(~0),label(),inited(false) {}

void BinReadStorage::init(size_t nb_bins, size_t max_score, const VirtualReadScore *vrs, bool no_list) {
  this->max_bins = nb_bins;
  __init(0, max_score, vrs, no_list);
}

void BinReadStorage::__init(size_t nb_bins, size_t max_score, const VirtualReadScore *vrs, bool no_list) {
  this->all_read_lengths = 0;
  if (inited)
    return;

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
  inited=true;
}

void BinReadStorage::reallocate(){
  list<Sequence> tmpBin;
  if (bins)
    tmpBin = bins[0];

  free_objects();

  all_read_lengths = 0;
  smallest_bin_not_empty = ~0;
  total_nb_scores = 0;
  nb_stored = 0;
  inited = false;
  __init(max_bins, max_score, scorer, tmpBin.size() == 0);
  for(auto s : tmpBin){
    this->add(s);
  }
  nb_inserted -= nb_stored;
}

BinReadStorage::~BinReadStorage() {
  free_objects();
}

void BinReadStorage::free_objects() {
  if (bins)
    delete [] bins;
  if (score_bins) {
    delete [] score_bins;
    delete [] nb_scores;
  }

}

void BinReadStorage::addScore(Sequence &s) {
  addScore(scorer->getScore(s));
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
  if(nb_stored == getMaxNbReadsStored() && nb_inserted == nb_stored){
    reallocate();
  }
  float score = scorer->getScore(s);
  size_t bin = scoreToBin(score);
  addScore(bin, score);
  all_read_lengths += s.sequence.length();
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

list<Sequence> BinReadStorage::getBin(size_t bin) const{
  return bins[bin];
}

size_t BinReadStorage::getNbBins() const {
  return nb_bins;
}

size_t BinReadStorage::getNbInserted() const {
  return nb_inserted;
}

double BinReadStorage::getAverageScoreBySeq(Sequence &s) {
  return getAverageScoreByScore(scorer->getScore(s));
}

double BinReadStorage::getAverageScoreByScore(float score) {
  return getAverageScore(scoreToBin(score));
}

double BinReadStorage::getAverageLength() const{
  return all_read_lengths *1. / getNbScores();
}

double BinReadStorage::getAverageScore(size_t bin) {
  return getScore(bin) / getNbScores(bin);
}
double BinReadStorage::getInvertedAverageScore(size_t bin) {
  return getNbScores(bin) / getScore(bin);
}

double BinReadStorage::getScoreBySeq(Sequence &s) {
  return getScoreByScore(scorer->getScore(s));
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

list<Sequence> BinReadStorage::getBestReads(size_t max_nb, size_t min_score) const {
  list<Sequence>best_reads;
  size_t smallest_interesting_bin = max(smallest_bin_not_empty, scoreToBin(min_score));

  for (size_t i = nb_bins+1; i > smallest_interesting_bin; i--) {
    size_t j = i-1;
    if (bins[j].size() > 0) {
      if (bins[j].size() <= max_nb) {
        best_reads.insert(best_reads.end(), bins[j].begin(), bins[j].end());
        max_nb -= bins[j].size();
      } else {
        for (list<Sequence>::iterator it = bins[j].begin(); max_nb > 0 && it != bins[j].end();
             it++) {
          best_reads.push_back(*it);
          max_nb--;
        }
      }
    }
  }
  return best_reads;

}

string BinReadStorage::getLabel() const {
  return label;
}

bool BinReadStorage::hasLabel() const {
  return this->label.length() > 0;
}

void BinReadStorage::setLabel(string &label) {
  this->label = label;
}

void BinReadStorage::out_average_scores(ostream &out, bool inversed) {
  output_label_average(out, getLabel(), getNbScores(), inversed ? getInvertedAverageScore() : getAverageScore(), inversed ? 3 : 1);
}

size_t BinReadStorage::scoreToBin(float score) const{
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
