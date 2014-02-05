#ifndef READ_SCORE_H
#define READ_SCORE_H

#include <string>
#include "kmerstore.h"
#include "kmeraffect.h"

/**
 * This virtual class contains a single method that allows to compute a score
 * for a string.
 */
class VirtualReadScore {
 public:
  /**
   * @param sequence: some text
   * @return the score associated to the sequence.
   *         getScore(a) > getScore(b) ==> a is better than b
   */
  virtual float getScore(const string &sequence)const = 0;
};

/**
 * This implementation of VirtualReadScore computes a score for a sequence
 * given the affectation found in this sequence.
 * The more affectation will be found, the better the score will be.
 */
class KmerAffectReadScore : public VirtualReadScore {
private:
  IKmerStore<KmerAffect> &index;
  float unambiguous_score, ambiguous_score, unknown_score;
public:
  /**
   * @param idx: The KmerAffect index for computing the score.
   */
  KmerAffectReadScore(IKmerStore<KmerAffect> &idx, float unambiguous_score=1.,
                      float ambiguous_score=0.5, float unknown_score=0.);
  ~KmerAffectReadScore();
  
  /**
   * The score is computed using the affectation in the sequence and the scores
   * that have been attributed (or the default ones).
   */
  float getScore(const string &sequence) const;

  // Getters
  float getAmbiguousScore() const;
  const IKmerStore<KmerAffect> &getIndex() const;
  float getUnambiguousScore() const;
  float getUnknownScore() const;

  // Setters

  void setAmbiguousScore(float score) ;
  void setUnambiguousScore(float score) ;
  void setUnknownScore(float score) ;
};

/**
 * A simple implementation of VirtualReadScore.
 * The score is the length of the read
 */
class ReadLengthScore: public VirtualReadScore {
 public:
  ReadLengthScore();

  /**
   * @return the sequence length
   */
  float getScore(const string &sequence) const;
};
#endif
