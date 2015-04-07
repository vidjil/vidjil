
#ifndef AFFECT_ANALYSER_H
#define AFFECT_ANALYSER_H

#include "kmerstore.h"
#include "kmeraffect.h"
#include <set>
#include <vector>
#include <cassert>
#include <map>

// Define two constant affectations: ambiguous and unknown.

/* Declaration of types */

typedef enum affect_options_e {
  AO_NONE, AO_NO_CONSECUTIVE, AO_NO_MULTIPLICITY
} affect_options_t;


/* Stores results during .getMaximum() computation */
typedef struct affect_infos_s {
  int first_pos_max;            /* First position of maximum */
  int last_pos_max;             /* Last position of maximum */
  int max_value;                /* Maximal value */
  int nb_before_right;          /* Nb of “before” right of the maximum */
  int nb_after_right;           /* Same with “after” */
  int nb_before_left;           /* Nb of “before” left of the maximum */
  int nb_after_left;            /* Same with “after” */
  bool max_found;               /* We have found a maximum */
} affect_infos;

bool operator==(const affect_infos &ai1, const affect_infos &ai2);
ostream &operator<<(ostream &out, const affect_infos &a);

/**
 * Class that records for every k-mer of a given sequence
 * in which sequences this k-mer was also seen.
 * It can either record one affectation per kmer (the only sequence where it
 * occurs or ambiguous case if there are several possibilities, or 
 * unknown otherwise), or all the possible affectations (ie. there is no ambiguous
 * case, all the possibilities for one k-mer are stored).
 *
 * Input: Index that constitutes the k-mer sequence repertoire
 * Input: Sequence whose k-mers must be affected
 */

class AffectAnalyser {
 public:

  virtual ~AffectAnalyser() {}

  /* Queries */

  /**
   * @return the total number of affectations
   */
  virtual int count() const = 0;

  /**
   * @param affect: An affectation
   * @return the number of times this affectation has been given in the read.
   */
  virtual int count(const KmerAffect &affect) const = 0;

  /**
   * @param i: the position to consider
   * @pre i >= 0 && i < count()
   * @return the affectation of the k-mer at position i.
   */
  virtual const KmerAffect &getAffectation(int i)  const = 0;

  /**
   * @param options: options can either be AO_NONE or AO_NO_CONSECUTIVE 
   * @return all the affectations contained in the read from left to right.
   *         if AO_NO_CONSECUTIVE is given: two consecutive elements in the vector
   *                                     will be different (we remove consecutive
   *                                     duplicates)
   */
  virtual vector<KmerAffect> getAllAffectations(affect_options_t options) const = 0;

  /**
   * @return the distinct affectations
   */
  virtual set<KmerAffect> getDistinctAffectations() const = 0;

  /**
   * @return the sequence we are analysing
   */
  virtual const string &getSequence() const = 0;

  /**
   * @param affect: an affectation
   * @return the first occurrence of this affectation in the read
   *         or string::npos if the affectation was not found
   * @post getAffectation(first(affect)) == affect 
   * ==>  getAffectation(1...first(affect)-1) != affect
   */
  virtual int first(const KmerAffect &affect) const  = 0;

  /**
   * @param affect: an affectation
   * @return the last occurrence of this affectation in the read
   *         or string::npos if the affectation was not found
   * @post getAffectation(last(affect)) == affect 
   * ==> getAffectation(last(affect)+1 ... count() -1) != affect
   */
  virtual int last(const KmerAffect &affect) const  = 0;

  /**
   * @return a string representation of the object
   */
  virtual string toString() const  = 0;
};


class KmerAffectAnalyser: public AffectAnalyser {
 protected:
  IKmerStore<KmerAffect> &kms;
  const string &seq;
  vector<KmerAffect> affectations;
  double left_evalue, right_evalue;

 public:
  /**
   * @param kms: the index storing the affectation for the k-mers
   *             (parameter is not copied)
   * @param seq: the sequence to analyse (parameter is not copied)
   */
  KmerAffectAnalyser(IKmerStore<KmerAffect> &kms, const string &seq);

  /**
   * This constructor must be seen as a “toy” constructor, used for 
   * testing.
   * It allows to directly provide the affectation and therefore avoids
   * the need to search a long time for good example that could be tested.
   * @param kms: mainly used for retrieving the seed or its size
   * @param seq: basically not used in the class
   * @param a: the affectation we must use.
   */
  KmerAffectAnalyser(IKmerStore<KmerAffect> &kms, const string &seq, vector<KmerAffect> a);

  ~KmerAffectAnalyser();

  int count() const;

  int count(const KmerAffect &affect) const;

  const KmerAffect &getAffectation(int i) const;

  vector<KmerAffect> getAllAffectations(affect_options_t options) const;

  set<KmerAffect> getDistinctAffectations() const;

  IKmerStore<KmerAffect> &getIndex() const;

  /**
   * @param maxOverlap: if greater than kms.getS(), it is automatically set
   *                    to that value.
   * @return A structure where the maximum is such that those positions
   *         maximise the number of affectations before, minus the number of
   *         affectations after the returned positions.
   *
   *         The maximum reached must be above max(0, total number of
   *         <before>) and such that the number of <before> after the
   *         rightmost max position is <ratioMin> times less than the number
   *         of <after> after that position. If no so much maximum is found,
   *         the boolean <max_found> is set to false in the structure.
   *
   * @complexity time: linear in count(), space: constant
   */
  affect_infos getMaximum(const KmerAffect &before, const KmerAffect &after, 
                          float ratioMin=2., 
                          int maxOverlap=1);


  /**
   * @return probability that the number of kmers is 'at_least' or more
   */
  double getProbabilityAtLeastOrAbove(int at_least) const;

  /**
   * @return probabilities that the number of left/right kmers is 'at_least' or more
   */
  pair <double, double> getLeftRightProbabilityAtLeastOrAbove() const;

  const string &getSequence() const;

  /**
   * @param  A pair of KmerAffects
   * @return The same pair of KmerAffects, but sorted.
   *         The first one is 'more on the left' than the second one.
   */
  pair <KmerAffect, KmerAffect> sortLeftRight(const pair <KmerAffect, KmerAffect> ka12) const;

  int first(const KmerAffect &affect) const;

  int last(const KmerAffect &affect) const ;

  string toString() const;

  string toStringValues() const;

  string toStringSigns() const;

};

/**
 * Class that allows to count in constant time the number of affectations
 * before or after a given point.
 */

class CountKmerAffectAnalyser: public KmerAffectAnalyser {
 private:
  map<KmerAffect, int* >counts;
  int overlap;
 public:

  CountKmerAffectAnalyser(IKmerStore<KmerAffect> &kms, const string &seq);
  ~CountKmerAffectAnalyser();

  int count() const;

  /**
   * @complexity constant time
   */
  int count(const KmerAffect &affect) const;

  /**
   * Count the number of an affectation before (strictly) than a position
   * @complexity constant time
   */
  int countBefore(const KmerAffect &affect, int pos) const;

  /**
   * Count the number of an affectation after (strictly) than a position)
   * @complexity constant time
   */
  int countAfter(const KmerAffect &affect, int pos) const;

  /**
   * @return the first position pos in the sequence such that 
   *         countBefore(before, pos - s) 
             + countAfter(after, pos) is maximal
   *         and pos >= start, and the maximum is greater than min; 
   *         or -1 if such a position doesn't exist.
   *         Where s is kms.getS() - getAllowedOverlap() - 1.
   * @complexity linear in getSequence().size() 
   */
  int firstMax(const KmerAffect &before, const KmerAffect &after, int start=0, int min=-1) const;

  /**
   * @return the last position pos in the sequence such that
   *         countBefore(before, pos - s) 
   *         + countAfter(after, pos) is maximal
   *         and pos <= end (if end == -1 considers end of sequence), and the 
   *         maximum is greater than min; or -1 if such a position doesn't exist.
   *         Where s is kms.getS() - getAllowedOverlap() - 1.
   * @complexity linear in getSequence().size()
   */
  int lastMax(const KmerAffect &before, const KmerAffect &after, int end=-1, int min=-1) const;

  /**
   * @return the allowed overlap between two k-mers with distinct affectations
   * (default is 0)
   */
  int getAllowedOverlap();

  /**
   * @parameter forbidden: a set of forbidden affectations that must not 
   *                       be taken into account for the max computation.
   * @pre There must have at least one affectation that is not forbidden otherwise
   *      the returned value is the unknown affectation.
   * @return the affectation that is seen the most frequently in the sequence
   *         taken apart the forbidden ones.
   * @complexity Time: linear on the number of distinct affectations
   */
  KmerAffect max(const set<KmerAffect> forbidden = set<KmerAffect>()) const;

  /*
   * @return the two affectations that are seen the most frequently in the sequence
   *         taken apart the forbidden ones.
   */
  pair <KmerAffect, KmerAffect> max12(const set<KmerAffect> forbidden) const;
  
  /**
   * Set the overlap allowed between two k-mers with two different affectations,
   * when looking for the maximum.
   * The overlap should not be greater than the span of the seed used.
   */
  void setAllowedOverlap(int overlap);

 private:
  /**
   * Build the counts map.
   */
  void buildCounts();

  /**
   * Search the maximum. Used by firstMax and lastMax.
   * @param iter: should be either 1 or -1
   */
  int searchMax(const KmerAffect &before, const KmerAffect &after,
                int start, int end, int iter, int min) const;
};

#endif
