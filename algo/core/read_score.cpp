#include "read_score.h"
#include <cstdlib>

KmerAffectReadScore::KmerAffectReadScore(IKmerStore<KmerAffect> &idx, 
                                         float unambiguous_score,
                                         float ambiguous_score, 
                                         float unknown_score)
  :index(idx), unambiguous_score(unambiguous_score), ambiguous_score(ambiguous_score),
   unknown_score(unknown_score){}

KmerAffectReadScore::~KmerAffectReadScore() {}

float KmerAffectReadScore::getScore(const Sequence &sequence) const {
  vector<KmerAffect> answers = index.getResults(sequence.sequence);
  float score = 0;
  for (size_t i = 0; i < answers.size(); i++) {
    if (answers[i].affect == AFFECT_AMBIGUOUS)
      score += ambiguous_score;
    else if (answers[i].affect == AFFECT_UNKNOWN) 
      score += unknown_score;
    else 
      score += unambiguous_score;
  }
  return score;
}

// Getters
float KmerAffectReadScore::getAmbiguousScore() const {
  return ambiguous_score;
}

const IKmerStore<KmerAffect> &KmerAffectReadScore::getIndex() const {
  return index;
}

float KmerAffectReadScore::getUnambiguousScore() const {
  return unambiguous_score;
}

float KmerAffectReadScore::getUnknownScore() const {
  return unknown_score;
}

// Setters

void KmerAffectReadScore::setAmbiguousScore(float score) {
  ambiguous_score = score;
}

void KmerAffectReadScore::setUnambiguousScore(float score) {
  unambiguous_score = score;
}

void KmerAffectReadScore::setUnknownScore(float score) {
  unknown_score = score;
}


////////////////////////////////////////////////////////////////////////////////
//////////////////////////////  ReadLengthScore  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

ReadLengthScore::ReadLengthScore(){}
ReadLengthScore::~ReadLengthScore(){}

float ReadLengthScore::getScore(const Sequence &sequence) const {
  return sequence.sequence.size();
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////  ReadQualityScore  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

ReadQualityScore::ReadQualityScore(){}
ReadQualityScore::~ReadQualityScore(){}

float ReadQualityScore::getScore(const Sequence &sequence) const {
  size_t *qualities = (size_t *)calloc(MAX_QUALITY, sizeof(size_t));
  for (size_t i = 0; i < sequence.quality.size(); i++) {
    qualities[(sequence.quality[i]) - '!']++;
  }
  int max_percentile = (int) round(sequence.quality.size()*1. / 100);
  int percent_quality = 0;
  // Computes the percentile of the quality
  for (size_t i = 0; i < MAX_QUALITY; i++) {
    max_percentile -= qualities[i];
    if (max_percentile < 0) {
      percent_quality = i;
      break;
    }
  }
  free(qualities);
  return percent_quality * sequence.sequence.size() / GOOD_QUALITY;
}
