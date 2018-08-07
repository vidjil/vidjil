#ifndef KMERSTOREFACTORY_HPP
#define KMERSTOREFACTORY_HPP
#include "kmerstore.h"
#include "automaton.h"

/**
 * KmerStoreFactory is a factory that allows to create an index that best fits
 * your needs!
 */
template<class T=KmerAffect>
class KmerStoreFactory {
 public:
  static IKmerStore<T> *createIndex(IndexTypes indexType, string seed, bool revcomp=false);
  static IKmerStore<T> *createIndex(IndexTypes indexType, int k, bool revcomp=false);

};

template<class T=KmerAffect, IndexTypes type=KMER_INDEX>
class _KmerStoreFactory {
 public:
  static IKmerStore<T> *createIndex(string seed, bool revcomp=false);
  static IKmerStore<T> *createIndex(int k, bool revcomp=false) {
    return createIndex(seed_contiguous(k), revcomp);
  }

};

template<class T>
class _KmerStoreFactory<T, KMER_INDEX> {
public:
  static IKmerStore<T> *createIndex(string seed, bool revcomp) {
    IKmerStore<T> *index;
    try{
      index = new ArrayKmerStore<T>(seed, revcomp);
    }catch(exception &e){
      cout << "  (using a MapKmer to fit into memory)" << endl;
      index = new MapKmerStore<T>(seed, revcomp);
    }

    return index;
  }
};

template<class T>
class _KmerStoreFactory<T, AC_AUTOMATON> {
public:
  static IKmerStore<T> *createIndex(string seed, bool revcomp) {
    return new PointerACAutomaton<T>(seed, revcomp);
  }
};

template<class T>
IKmerStore<T> *KmerStoreFactory<T>::createIndex(IndexTypes indexType, string seed,
                                                       bool revcomp) {
  if (indexType == KMER_INDEX) {
    return _KmerStoreFactory<T, KMER_INDEX>::createIndex(seed, revcomp);
  } else if (indexType == AC_AUTOMATON) {
    return _KmerStoreFactory<T, AC_AUTOMATON>::createIndex(seed, revcomp);
  } else {
    throw std::domain_error("No such index type");
  }
}

template<class T>
IKmerStore<T> *KmerStoreFactory<T>::createIndex(IndexTypes indexType, int k,
                                                       bool revcomp) {
  return createIndex(indexType, seed_contiguous(k), revcomp);
}


#endif
