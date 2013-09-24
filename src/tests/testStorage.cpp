#include <core/fasta.h>
#include <core/kmerstore.h>
#include "tests.h"
 
template<template <class> class T>
void testKmerStoreWithKmerSimple(int k, bool revcomp, int test_id ) {
  T<Kmer> *index = createIndex<T<Kmer> >(k, revcomp);
  
  for (int i = 0; i < nb_seq-2; i++) {
    string tmp = seq[2*i].substr(0, k);
    if (revcomp) {
      string rc = ::revcomp(tmp);
      TAP_TEST((*index)[tmp].count == (seq[2*i].length()-k+1)*2, test_id, "");
      TAP_TEST((*index)[tmp].count == (*index)[rc].count, test_id, "K-mer and its revcomp should have the same count");
    } else {
      TAP_TEST((*index)[tmp].count == (seq[2*i].length()-k+1), test_id, "");
    }
  }
  delete index;
}

template<template <class> class T>
void testKmerStoreWithKmer(int k, int test_id) {
  T<Kmer> *index = new T<Kmer>(k, true);
  T<Kmer> *index2 = new T<Kmer>(k, true);
  Fasta reads("../../data/representative_revcomp.fa");

  index->insert(reads);
  list<Sequence> readCollection = reads.getAll();

  for (list<Sequence>::iterator it = readCollection.begin(); it != readCollection.end(); it++) {
    it->sequence = revcomp(it->sequence);
  }

  index2->insert(reads);

  // Traverse read collection
  for (int i = 0; i < reads.size(); i++) {
    vector<Kmer> counts = index->getResults(reads.sequence(i));
    vector<Kmer> counts2 = index2->getResults(reads.sequence(i));

    TAP_TEST(counts.size() == counts2.size(), test_id, "The list of kmer counts should have the same size in both cases");
    for (size_t j = 0; j < counts.size(); j++) {
      TAP_TEST(counts[j].count == counts2[j].count, test_id, "The count of kmers should be the same when reading in opposite ways" );
    }
  }
  
  delete index;
  delete index2;
}

void testStorage() {
  testKmerStoreWithKmerSimple<ArrayKmerStore>(5, false, TEST_ARRAY_KMERSTORE);
  testKmerStoreWithKmerSimple<ArrayKmerStore>(5, true, TEST_ARRAY_KMERSTORE_RC);

  testKmerStoreWithKmerSimple<MapKmerStore>(5, false, TEST_MAP_KMERSTORE);
  testKmerStoreWithKmerSimple<MapKmerStore>(5, true, TEST_MAP_KMERSTORE_RC);

  testKmerStoreWithKmer<ArrayKmerStore>(10, TEST_ARRAY_KMERSTORE_RC);
  testKmerStoreWithKmer<MapKmerStore>(14, TEST_MAP_KMERSTORE_RC);
}
