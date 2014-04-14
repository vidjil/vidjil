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
 private:
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
  ~KmerAffectAnalyser();

  int count() const;

  int count(const T &affect) const;

  const T&getAffectation(int i) const;

  vector<T> getAllAffectations(affect_options_t options) const;

  set<T> getDistinctAffectations() const;

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
   *         countBefore(before, pos) + countAfter(after, pos) is maximal
   *         and pos >= start, and the maximum is greater than min; 
   *         or -1 if such a position doesn't exist
   * @complexity linear in getSequence().size() 
   */
  int firstMax(const T&before, const T&after, int start=0, int min=-1) const;

  /**
   * @return the last position pos in the sequence such that
   *         countBefore(before, pos) + countAfter(after, pos) is maximal
   *         and pos <= end (if end == -1 considers end of sequence), and the 
   *         maximum is greater than min; or -1 if such a position doesn't exist.
   * @complexity linear in getSequence().size()
   */
  int lastMax(const T&before, const T&after, int end=-1, int min=-1) const;

 private:
  /**
   * Build the counts map.
   */
  void buildCounts();

  /**
   * Search the maximum. Used by firstMax and lastMax.
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
int CountKmerAffectAnalyser<T>::searchMax(const T&before, const T& after,
                                          int start, int end, int iter, int min) const {
  int first_pos_max = -1;
  for (int i = start; i <= end; i+=iter) {
  int max_value = min;
    int value = countBefore(before, i) + countAfter(after, i);
    if (value > max_value) {
      max_value = value;
      first_pos_max = i;
    }
  }
  return first_pos_max;
}

template <class T>
void CountKmerAffectAnalyser<T>::buildCounts() {
  int length = KmerAffectAnalyser<T>::count();
  set<T> affects = this->getDistinctAffectations();

  /* Initialize each key with a 0-integer array */
  for (typename set<T>::iterator it = affects.begin(); 
       it != affects.end(); it++) {
    counts[*it] = new int[length];
  }

  /* Fill in the counts arrays */
  for (int i = 0; i < length; i++) {
    T current = this->getAffectation(i);
    for (typename set<T>::iterator it = affects.begin(); 
         it != affects.end(); it++) {
      int value = (current == *it) ? 1 : 0;

      if (i == 0)
        counts[*it][i] = value;
      else
        counts[*it][i] = counts[*it][i-1] + value;
    }
  }
}

#endif
