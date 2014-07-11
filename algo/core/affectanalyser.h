#ifndef AFFECT_ANALYSER_H
#define AFFECT_ANALYSER_H

#include "kmerstore.h"
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
template<class T>
class AffectAnalyser {
 public:

  /* Queries */

  /**
   * @return the total number of affectations
   */
  virtual int count() const = 0;

  /**
   * @param affect: An affectation
   * @return the number of times this affectation has been given in the read.
   */
  virtual int count(const T &affect) const = 0;

  /**
   * @param i: the position to consider
   * @pre i >= 0 && i < count()
   * @return the affectation of the k-mer at position i.
   */
  virtual const T&getAffectation(int i)  const = 0;

  /**
   * @param options: options can either be AO_NONE or AO_NO_CONSECUTIVE 
   * @return all the affectations contained in the read from left to right.
   *         if AO_NO_CONSECUTIVE is given: two consecutive elements in the vector
   *                                     will be different (we remove consecutive
   *                                     duplicates)
   */
  virtual vector<T> getAllAffectations(affect_options_t options) const = 0;

  /**
   * @return the distinct affectations
   */
  virtual set<T> getDistinctAffectations() const = 0;

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
  virtual int first(const T &affect) const  = 0;

  /**
   * @param affect: an affectation
   * @return the last occurrence of this affectation in the read
   *         or string::npos if the affectation was not found
   * @post getAffectation(last(affect)) == affect 
   * ==> getAffectation(last(affect)+1 ... count() -1) != affect
   */
  virtual int last(const T &affect) const  = 0;

  /**
   * @return a string representation of the object
   */
  virtual string toString() const  = 0;
};

template <class T>
class KmerAffectAnalyser: public AffectAnalyser<T> {
 protected:
  IKmerStore<T> &kms;
  const string &seq;
  vector<T> affectations;
 public:
  /**
   * @param kms: the index storing the affectation for the k-mers
   *             (parameter is not copied)
   * @param seq: the sequence to analyse (parameter is not copied)
   */
  KmerAffectAnalyser(IKmerStore<T> &kms, const string &seq);

  /**
   * This constructor must be seen as a “toy” constructor, used for 
   * testing.
   * It allows to directly provide the affectation and therefore avoids
   * the need to search a long time for good example that could be tested.
   * @param kms: mainly used for retrieving the seed or its size
   * @param seq: basically not used in the class
   * @param a: the affectation we must use.
   */
  KmerAffectAnalyser(IKmerStore<T> &kms, const string &seq, vector<T> a);

  ~KmerAffectAnalyser();

  int count() const;

  int count(const T &affect) const;

  const T&getAffectation(int i) const;

  vector<T> getAllAffectations(affect_options_t options) const;

  set<T> getDistinctAffectations() const;

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
  affect_infos getMaximum(const T &before, const T &after, 
                          float ratioMin=2., 
                          int maxOverlap=1) const;

  const string &getSequence() const;

  int first(const T &affect) const;

  int last(const T &affect) const ;

  string toString() const;
};

/**
 * Class that allows to count in constant time the number of affectations
 * before or after a given point.
 */
template <class T>
class CountKmerAffectAnalyser: public KmerAffectAnalyser<T> {
 private:
  map<T, int* >counts;
  int overlap;
 public:

  CountKmerAffectAnalyser(IKmerStore<T> &kms, const string &seq);
  ~CountKmerAffectAnalyser();

  int count() const;

  /**
   * @complexity constant time
   */
  int count(const T &affect) const;

  /**
   * Count the number of an affectation before (strictly) than a position
   * @complexity constant time
   */
  int countBefore(const T&affect, int pos) const;

  /**
   * Count the number of an affectation after (strictly) than a position)
   * @complexity constant time
   */
  int countAfter(const T&affect, int pos) const;

  /**
   * @return the first position pos in the sequence such that 
   *         countBefore(before, pos - s) 
             + countAfter(after, pos) is maximal
   *         and pos >= start, and the maximum is greater than min; 
   *         or -1 if such a position doesn't exist.
   *         Where s is kms.getS() - getAllowedOverlap() - 1.
   * @complexity linear in getSequence().size() 
   */
  int firstMax(const T&before, const T&after, int start=0, int min=-1) const;

  /**
   * @return the last position pos in the sequence such that
   *         countBefore(before, pos - s) 
   *         + countAfter(after, pos) is maximal
   *         and pos <= end (if end == -1 considers end of sequence), and the 
   *         maximum is greater than min; or -1 if such a position doesn't exist.
   *         Where s is kms.getS() - getAllowedOverlap() - 1.
   * @complexity linear in getSequence().size()
   */
  int lastMax(const T&before, const T&after, int end=-1, int min=-1) const;

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
  T max(const set<T> forbidden = set<T>()) const;

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
  int searchMax(const T&before, const T &after,
                int start, int end, int iter, int min) const;
};

template <class T>
KmerAffectAnalyser<T>::KmerAffectAnalyser(IKmerStore<T> &kms, 
                                       const string &seq)
  :kms(kms), seq(seq) {
  assert(seq.length() >=  (size_t)kms.getS());
  affectations = kms.getResults(seq, true);
}

template <class T>
KmerAffectAnalyser<T>::KmerAffectAnalyser(IKmerStore<T> &kms,
                                          const string &seq,
                                          vector <T> a):
kms(kms), seq(seq), affectations(a){}

template <class T>
KmerAffectAnalyser<T>::~KmerAffectAnalyser(){}

template <class T>
int KmerAffectAnalyser<T>::count() const{
  return affectations.size();
}

template <class T>
int KmerAffectAnalyser<T>::count(const T &affect) const{
  int count = 0;
  for (typename vector<T>::const_iterator it = affectations.begin(); 
       it < affectations.end(); it++) {
    if (*it == affect)
      count++;
  }
  return count;
}

template <class T>
const T&KmerAffectAnalyser<T>::getAffectation(int i) const{
  assert(i >= 0 && i < count());
  return affectations[i];
}

template <class T>
vector<T> KmerAffectAnalyser<T>::getAllAffectations(affect_options_t options) const{
  if (options == AO_NONE)
    return affectations;
  vector<T> result;
  T previous = affectations[0];
  result.push_back(previous);
  for (size_t i = 1; i < affectations.size(); i++) {
    if (! (previous == affectations[i]))
      result.push_back(previous);
  }
  return result;
}

template <class T>
set<T> KmerAffectAnalyser<T>::getDistinctAffectations() const{
  set<T> result;
  for (size_t i = 0; i < affectations.size(); i++) {    
    result.insert(affectations[i]);
  }
  return result;
}

template <class T>
affect_infos KmerAffectAnalyser<T>::getMaximum(const T &before, 
                                               const T &after, 
                                               float ratioMin,
                                               int maxOverlap) const {
  /* currentValue is the  { affectations[t] == before | t \in 1..i  } - | { affectations[i] == after | t \in 1..i }  */
  int currentValue;
  int span = kms.getS();
  int length = count();
  affect_infos results;

  if (maxOverlap > span)
    maxOverlap = span;

  /* Initialize results */
  results.max_found = false;
  results.max_value = 0;
  results.first_pos_max = results.last_pos_max = -1;
  results.nb_before_left = results.nb_before_right = results.nb_after_right = results.nb_after_left = 0;
  currentValue = 0;

  for (int i = 0; i < span - maxOverlap; i++) {
    if (affectations[i] == after) {
      currentValue--;
      results.nb_after_right++;
    }
  }

  for (int i = span - maxOverlap; i < length; i++) {
    /* i - span + maxOverlap, to avoir overlapping k-mers */


    /* Read the current affectations, and store them both in currentValue and at the right of the previous maximum.
       The affectation of 'before' is interpreted relatively to span and maxOverlap */

    if (affectations[i - span + maxOverlap] == before) {
      currentValue++;
      results.nb_before_right++;
    } 
    if (affectations[i] == after) {
      currentValue--;
      results.nb_after_right++;
    }

    /* Now currentValue = | { affectations[t - span + maxOverlap] == 'before' | t \in span-maxOverlap..i } | - | { affectations[i] == 'after' | t \in 0..i } | */

    /* If we raise above the max, or if we continue a previous maximum (even from a distant position), store in results */
    if (currentValue >= results.max_value) {
      if (currentValue > results.max_value)
        results.first_pos_max = i;
      results.max_value = currentValue;
      results.last_pos_max = i;

      /* What was at the right of the previous maximum is now at the left of the current maximum */
      results.nb_after_left += results.nb_after_right;
      results.nb_before_left += results.nb_before_right;
      results.nb_after_right = 0;
      results.nb_before_right = 0;
    }
  }
  for (int i = length - span + maxOverlap; i < length; i++) {
    if (affectations[i] == before)
      results.nb_before_right++;
  }

  /* Main test: 
     1) do we have enough affectations in good positions ('before' at the left and 'after' at the right) ?
     We tolerate some of them in bad positions, but there must be 'ratioMin' more in good positions
     2) there should be at least one 'before' and one 'after' (? CHECK ?)
  */

  if (results.nb_after_right >= results.nb_before_right*ratioMin
      && (results.nb_after_right > 0 || results.nb_before_right == 0)
      && currentValue < results.max_value
      && results.max_value > 0) {
    results.max_found = true;
    return results;
  }
  return results;
}

template <class T>
const string &KmerAffectAnalyser<T>::getSequence() const{
  return seq;
}

template <class T>
int KmerAffectAnalyser<T>::first(const T &affect) const{
  for (size_t i = 0; i < affectations.size(); i++) 
    if (affect == affectations[i])
      return i;
  return (int) string::npos;
}

template <class T>
int KmerAffectAnalyser<T>::last(const T &affect) const{
  for (size_t i = affectations.size(); i > 0;  i--) 
    if (affect == affectations[i-1])
      return i-1;
  return (int) string::npos;
}

template <class T>
string KmerAffectAnalyser<T>::toString() const{
  string kmer;
  for (size_t i = 0; i < affectations.size(); i++) {
    kmer += affectations[i].toString();
#ifdef DEBUG_KMERS
    kmer += ": "+spaced(seq.substr(i,kms.getS()), kms.getSeed())+"\n";
#endif
  }
  return kmer;
}

/* CountKmerAffectAnalyser */

template <class T>
CountKmerAffectAnalyser<T>::CountKmerAffectAnalyser(IKmerStore<T> &kms, const string &seq): KmerAffectAnalyser<T>(kms, seq) {
  buildCounts();
  overlap=0;
}

template <class T>
CountKmerAffectAnalyser<T>::~CountKmerAffectAnalyser() {
  set<T> affects = this->getDistinctAffectations();

  /* Initialize each key with a 0-integer array */
  for (typename set<T>::iterator it = affects.begin(); 
       it != affects.end(); it++) {
    delete [] counts[*it];
  }  
}

template <class T>
int CountKmerAffectAnalyser<T>::count() const {
  return KmerAffectAnalyser<T>::count();
}

template <class T>
int CountKmerAffectAnalyser<T>::count(const T &affect) const {
  if (counts.count(affect) == 0)
    return 0;

  return counts.find(affect)->second[KmerAffectAnalyser<T>::count() - 1];
}

template <class T>
T CountKmerAffectAnalyser<T>::max(const set<T> forbidden) const {
  typename map<T, int* >::const_iterator it = counts.begin();
  T max_affect = T::getUnknown();
  int max_count = -1;

  for (; it != counts.end(); it++) {
    if (forbidden.count(it->first) == 0) {
      int current_count = count(it->first);
      if (current_count > max_count) {
        max_affect = it->first;
        max_count = current_count;
      }
    }
  }

  return max_affect;
}

template <class T>
int CountKmerAffectAnalyser<T>::countBefore(const T&affect, int pos) const {
  if (pos == 0 || counts.count(affect) == 0)
    return 0;
  return counts.find(affect)->second[pos-1];
}

template <class T>
int CountKmerAffectAnalyser<T>::countAfter(const T&affect, int pos) const {
  if (counts.count(affect) == 0)
    return 0;
  int length = KmerAffectAnalyser<T>::count();
  typename map<T, int*>::const_iterator it = counts.find(affect);
  return it->second[length-1] - it->second[pos];
}  

template <class T>
int CountKmerAffectAnalyser<T>::firstMax(const T&before, const T&after, 
                                         int start, int min) const {
  return searchMax(before, after, start, KmerAffectAnalyser<T>::count()-1,1, min);
}

template <class T>
int CountKmerAffectAnalyser<T>::lastMax(const T&before, const T&after, 
                                        int end, int min) const {
  if (end == -1)
    end = KmerAffectAnalyser<T>::count()-1;
  return searchMax(before, after, end, 0, -1, min);
}

template <class T>
int CountKmerAffectAnalyser<T>::getAllowedOverlap() {
  return overlap;
}

template <class T>
void CountKmerAffectAnalyser<T>::setAllowedOverlap(int overlap) {
  this->overlap = overlap;
}

template <class T>
int CountKmerAffectAnalyser<T>::searchMax(const T&before, const T& after,
                                          int start, int end, int iter, int min) const {
  if (count(before) == 0 || count(after) == 0)
    return -1;
  int first_pos_max = -1;
  int max_value = min;
  int shift = KmerAffectAnalyser<T>::kms.getS() - overlap - 1;
  int shiftedStart = start, shiftedEnd = end;
  if (iter == 1)
    shiftedStart += shift;
  else
    shiftedEnd += shift;
  for (int i = shiftedStart; (i)*iter <= iter*shiftedEnd; i+=iter) {
    int valueBefore = countBefore(before, i - shift);
    int valueAfter = countAfter(after, i);
    if (valueAfter + valueBefore > max_value 
        && valueAfter > 0 && valueBefore > 0) {
      max_value = valueAfter + valueBefore;
      first_pos_max = i;
    }
  }
  return first_pos_max;
}

template <class T>
void CountKmerAffectAnalyser<T>::buildCounts() {
  int length = KmerAffectAnalyser<T>::count();
  set<T> affects = this->getDistinctAffectations();

  for (typename set<T>::iterator it = affects.begin(); 
       it != affects.end(); it++) {
    int *array = new int[length];
    /* Initialize each key with a 0-integer array */
    array[0] = (this->getAffectation(0) == *it) ? 1 : 0;

    /* Fill the array with actual values */
    for (int i = 1; i < length; i++) {
      T current = this->getAffectation(i);
      int value = (current == *it) ? 1 : 0;

      array[i] = array[i-1]+value;
    }
    counts[*it] = array;
  }

}

#endif
