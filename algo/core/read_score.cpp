#include "read_score.h"
#include <cstdlib>
#include <cstring>

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
    if (answers[i] == AFFECT_AMBIGUOUS)
      score += ambiguous_score;
    else if (answers[i] == AFFECT_UNKNOWN)
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

size_t ReadQualityScore::qualities[MAX_QUALITY];

float ReadQualityScore::getScore(const Sequence &sequence) const {
  memset(qualities, 0, MAX_QUALITY * sizeof(size_t));
  for (size_t i = 0; i < sequence.quality.size(); i++) {
    int current_quality = (sequence.quality[i]) - ' ';
    if(current_quality >= MAX_QUALITY)
      current_quality = MAX_QUALITY - 1;
    else if (current_quality < 0)
      current_quality = 0;
    qualities[current_quality]++;
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
  if (! percent_quality)
    percent_quality = GOOD_QUALITY;
  return percent_quality * sequence.sequence.size() / GOOD_QUALITY;
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////  RandomScore  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

RandomScore::RandomScore(){srand(1);} // Ensures a deterministic output
RandomScore::~RandomScore(){}

float RandomScore::getScore(const Sequence &sequence) const {
  UNUSED(sequence);
  return rand() % 500;
}
