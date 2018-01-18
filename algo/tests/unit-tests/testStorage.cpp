#include <core/bioreader.hpp>
#include <core/kmerstore.h>
#include <core/automaton.hpp>
#include "tests.h"

template<template<class> class Index>
void testInsertOneSeq(bool revcomp) {
  Index<Kmer> index(4, revcomp);

  string seq = "ACAA";
  string label = "s";

  index.insert(seq, label);
  index.finish_building();

  string other1 = "TTGT", other2 = "AACA", other3 = "AAAA",
    other4 = "CAAA";

  TAP_TEST(index.get(seq).count == 1, TEST_KMERSTORE_INSERT_ONE_SEQ, "");
  TAP_TEST(index.get(other1).count == 0, TEST_KMERSTORE_INSERT_ONE_SEQ, "");
  TAP_TEST(index.get(other2).count == 0, TEST_KMERSTORE_INSERT_ONE_SEQ, "");
  TAP_TEST(index.get(other3).count == 0, TEST_KMERSTORE_INSERT_ONE_SEQ, "");
  TAP_TEST(index.get(other4).count == 0, TEST_KMERSTORE_INSERT_ONE_SEQ, "");
}
 
template<template <class> class T>
void testKmerStoreWithKmerSimple(int k, bool revcomp, int test_id ) {
  T<Kmer> *index = createIndex<T<Kmer> >(k, revcomp);

  TAP_TEST(k == index->getK(), TEST_KMERSTORE_GET_K, "");
  
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
  BioReader reads("data/representative_revcomp.fq");

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

  // Test with no result
  vector<Kmer> counts = index->getResults("ATTA");
  TAP_TEST_EQUAL(counts.size(), 0, test_id, "");
  
  delete index;
  delete index2;
}

template<template <class> class KmerStore>
void testKmerStoreSeed() {
  KmerStore<Kmer> *index = new KmerStore<Kmer>(8, true);

  TAP_TEST_EQUAL(index->getK(), 8, TEST_KMERSTORE_GET_K, "");
  TAP_TEST_EQUAL(index->getS(), 8, TEST_KMERSTORE_GET_S, "");
  TAP_TEST_EQUAL(index->getSeed(), "########", TEST_KMERSTORE_GET_SEED, "");
  delete index;

  string seed = "#####-#####";
  index = new KmerStore<Kmer>(seed, true);
  TAP_TEST_EQUAL(index->getK(), 10, TEST_KMERSTORE_GET_K, "");
  TAP_TEST_EQUAL(index->getS(), 11, TEST_KMERSTORE_GET_S, "");
  TAP_TEST_EQUAL(index->getSeed(), seed, TEST_KMERSTORE_GET_SEED, "");

  delete index;

  seed = "##-##-##-##";
  index = new KmerStore<Kmer>(seed, true);
  TAP_TEST_EQUAL(index->getK(), 8, TEST_KMERSTORE_GET_K, "");
  TAP_TEST_EQUAL(index->getS(), 11, TEST_KMERSTORE_GET_S, "");
  TAP_TEST_EQUAL(index->getSeed(), seed, TEST_KMERSTORE_GET_SEED, "");

  delete index;
}

void testStorage() {
  testInsertOneSeq<ArrayKmerStore>(true);
  testInsertOneSeq<MapKmerStore>(true);
  testInsertOneSeq<PointerACAutomaton>(false);

  testKmerStoreWithKmerSimple<ArrayKmerStore>(5, false, TEST_ARRAY_KMERSTORE);
  testKmerStoreWithKmerSimple<ArrayKmerStore>(5, true, TEST_ARRAY_KMERSTORE_RC);

  testKmerStoreWithKmerSimple<MapKmerStore>(5, false, TEST_MAP_KMERSTORE);
  testKmerStoreWithKmerSimple<MapKmerStore>(5, true, TEST_MAP_KMERSTORE_RC);

  testKmerStoreWithKmerSimple<PointerACAutomaton>(5, false, TEST_AHO_KMERSTORE);

  testKmerStoreWithKmer<ArrayKmerStore>(10, TEST_ARRAY_KMERSTORE_RC);
  testKmerStoreWithKmer<MapKmerStore>(14, TEST_MAP_KMERSTORE_RC);

  testKmerStoreSeed<ArrayKmerStore>();
  testKmerStoreSeed<MapKmerStore>();
}
