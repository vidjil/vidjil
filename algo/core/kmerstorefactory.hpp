#ifndef KMERSTOREFACTORY_HPP
#define KMERSTOREFACTORY_HPP
#include "kmerstore.h"
#include "automaton.h"

/**
 * KmerStoreFactory is a factory that allows to create an index that best fits
 * your needs!
 */
template<typename Tshortcut, class T=KmerAffect>
class KmerStoreFactory {
 public:
  static IKmerStore<Tshortcut, T> *createIndex(IndexTypes indexType, string seed, bool revcomp=false);
  static IKmerStore<Tshortcut, T> *createIndex(IndexTypes indexType, int k, bool revcomp=false);

};

template<typename Tshortcut, class T=KmerAffect, IndexTypes type=KMER_INDEX>
class _KmerStoreFactory {
 public:
  static IKmerStore<Tshortcut, T> *createIndex(string seed, bool revcomp=false);
  static IKmerStore<Tshortcut, T> *createIndex(int k, bool revcomp=false) {
    return createIndex(seed_contiguous(k), revcomp);
  }

};

template<typename Tshortcut, class T>
class _KmerStoreFactory<Tshortcut, T, KMER_INDEX> {
public:
  static IKmerStore<Tshortcut, T> *createIndex(string seed, bool revcomp) {
    IKmerStore<Tshortcut, T> *index;
    try{
      index = new ArrayKmerStore<Tshortcut, T>(seed, revcomp);
    }catch(exception &e){
      cout << "  (using a MapKmer to fit into memory)" << endl;
      index = new MapKmerStore<Tshortcut, T>(seed, revcomp);
    }

    return index;
  }
};

template<typename Tshortcut, class T>
class _KmerStoreFactory<Tshortcut, T, AC_AUTOMATON> {
public:
  static IKmerStore<Tshortcut, T> *createIndex(string seed, bool revcomp) {
    return new PointerACAutomaton<Tshortcut, T>(seed, revcomp, true);
  }
};

template<typename Tshortcut, class T>
IKmerStore<Tshortcut, T> *KmerStoreFactory<Tshortcut, T>::createIndex(IndexTypes indexType, string seed,
                                                       bool revcomp) {
  if (indexType == KMER_INDEX) {
    return _KmerStoreFactory<Tshortcut, T, KMER_INDEX>::createIndex(seed, revcomp);
  } else if (indexType == AC_AUTOMATON) {
    return _KmerStoreFactory<Tshortcut, T, AC_AUTOMATON>::createIndex(seed, revcomp);
  } else {
    throw std::domain_error("No such index type");
  }
}

template<typename Tshortcut, class T>
IKmerStore<Tshortcut, T> *KmerStoreFactory<Tshortcut, T>::createIndex(IndexTypes indexType, int k,
                                                       bool revcomp) {
  return createIndex(indexType, seed_contiguous(k), revcomp);
}


#endif
