#include <core/fasta.h>
#include <core/kmerstore.h>
#include "tests.h"

 
template<template <class> class T>
void testKmerStoreWithKmer(int k, bool revcomp, int test_id ) {
  T<Kmer> *index = createIndex<T<Kmer> >(k, revcomp);
  
  for (int i = 0; i < nb_seq-2; i++) {
    string tmp = seq[2*i].substr(0, k);
    if (revcomp) {
      TAP_TEST((*index)[tmp].count == (seq[2*i].length()-k+1)*2, test_id, "");
    } else {
      TAP_TEST((*index)[tmp].count == (seq[2*i].length()-k+1), test_id, "");
    }
  }
  delete index;
}

void testStorage() {
  testKmerStoreWithKmer<ArrayKmerStore>(5, false, TEST_ARRAY_KMERSTORE);
  testKmerStoreWithKmer<ArrayKmerStore>(5, true, TEST_ARRAY_KMERSTORE_RC);

  testKmerStoreWithKmer<MapKmerStore>(5, false, TEST_MAP_KMERSTORE);
  testKmerStoreWithKmer<MapKmerStore>(5, true, TEST_MAP_KMERSTORE_RC);
}
