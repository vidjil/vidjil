#include "read_score.h"

KmerAffectReadScore::KmerAffectReadScore(IKmerStore<KmerAffect> &idx, 
                                         float unambiguous_score,
                                         float ambiguous_score, 
                                         float unknown_score)
  :index(idx), unambiguous_score(unambiguous_score), ambiguous_score(ambiguous_score),
   unknown_score(unknown_score){}

KmerAffectReadScore::~KmerAffectReadScore() {}

float KmerAffectReadScore::getScore(const string &sequence) const {
  vector<KmerAffect> answers = index.getResults(sequence);
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

float ReadLengthScore::getScore(const string &sequence) const {
  return sequence.size();
}
