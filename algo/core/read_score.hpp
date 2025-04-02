#ifndef READ_SCORE_HPP
#define READ_SCORE_HPP
#include "read_score.h"

template <typename S, typename A>
KmerAffectReadScore<S,A>::KmerAffectReadScore(IKmerStore<S, KmerAffect> &idx, 
                                         float unambiguous_score,
                                         float ambiguous_score, 
                                         float unknown_score)
  :index(idx), unambiguous_score(unambiguous_score), ambiguous_score(ambiguous_score),
   unknown_score(unknown_score){}

template <typename S, typename A>
KmerAffectReadScore<S,A>::~KmerAffectReadScore() {}

template <typename S, typename A>
float KmerAffectReadScore<S,A>::getScore(const Sequence &sequence) const {
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
template <typename S, typename A>
float KmerAffectReadScore<S,A>::getAmbiguousScore() const {
  return ambiguous_score;
}

template <typename S, typename A>
const IKmerStore<S, KmerAffect> &KmerAffectReadScore<S,A>::getIndex() const {
  return index;
}

template <typename S, typename A>
float KmerAffectReadScore<S,A>::getUnambiguousScore() const {
  return unambiguous_score;
}

template <typename S, typename A>
float KmerAffectReadScore<S,A>::getUnknownScore() const {
  return unknown_score;
}

// Setters

template <typename S, typename A>
void KmerAffectReadScore<S,A>::setAmbiguousScore(float score) {
  ambiguous_score = score;
}

template <typename S, typename A>
void KmerAffectReadScore<S,A>::setUnambiguousScore(float score) {
  unambiguous_score = score;
}

template <typename S, typename A>
void KmerAffectReadScore<S,A>::setUnknownScore(float score) {
  unknown_score = score;
}

#endif
