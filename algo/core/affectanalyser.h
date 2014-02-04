#ifndef AFFECT_ANALYSER_H
#define AFFECT_ANALYSER_H

#include "kmerstore.h"
#include <set>
#include <vector>
#include <cassert>

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
  virtual int count(const T &affect)  const = 0;

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
  for (size_t i = 0; i < affectations.size(); i++) 
    kmer += affectations[i].toString();
  return kmer;
}

#endif
