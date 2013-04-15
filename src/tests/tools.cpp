#include <core/tools.h>
#include <iostream>
#include <cassert>
#include <core/fasta.h>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>
#include <core/affectanalyser.h>
#include <core/segment.h>
#include "tests.h"

using namespace std;

const string seq[] = {"CCCCCCCCCCCCCCCCCCCC", "C lots of",
                      "GGGGGGGGGGGGGGGGGGGG", "G lots of",
                      "AAAAAAAAAAAAAAAAAAAA", "A lots of",
                      "TTTTTTTTTTTTTTTTTTTT", "T lots of",
                      "TTTTATTTTATTTTATTTTA", "U : TTTA lots of",
                      "AAAACAAAACAAAACAAAAC", "V : AAAC lots of"};
const int nb_seq = 6;

template<typename Index>
Index *createIndex(int k, bool revcomp) {
  Index *index = new Index(k, revcomp);
  for (int i=0; i < nb_seq; i++)
    index->insert(seq[2*i], seq[2*i+1]);
  return index;
}

void testFasta1() {
  Fasta fa("data/test1.fa");
  Fasta fq("data/test1.fq");

  TAP_TEST(fa.size() == fq.size(), TEST_FASTA_SIZE, "");
  for (int i=0; i < fa.size(); i++) {
    TAP_TEST(fa.label(i) == fq.label(i), TEST_FASTA_LABEL, "");
    TAP_TEST(fa.label_full(i) == fq.label_full(i), TEST_FASTA_LABEL_FULL, "");
    TAP_TEST(fa.sequence(i) == fq.sequence(i), TEST_FASTA_SEQUENCE, "");
  }
}

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

template<template <class> class T, class KAffect>
void testAffectAnalyser1() {
  const int k = 4;
  const bool revcomp = false;
  T<KAffect> *index = createIndex<T<KAffect> >(k, revcomp);
  
  KmerAffectAnalyser<KAffect> kaa(*index, "AAAACCCCCGGGGG");

  for (int i = 2; i < nb_seq-1; i++) {
    KAffect current_affect("", seq[2*i+1], 1);
    TAP_TEST(kaa.count(current_affect) == 0, TEST_AA_COUNT, "");
    TAP_TEST(kaa.first(current_affect) == (int)string::npos, TEST_AA_FIRST, "");
    TAP_TEST(kaa.last(current_affect) == (int)string::npos, TEST_AA_LAST, "");
  }
  for (int i = 0; i < 2; i++) {
    KAffect current_affect("", seq[2*i+1], 1);
    TAP_TEST(kaa.count(current_affect) == 2, TEST_AA_COUNT, "");
    TAP_TEST(kaa.getAffectation(kaa.first(current_affect)) == current_affect, TEST_AA_GET_AFFECT, "");
    TAP_TEST(kaa.getAffectation(kaa.last(current_affect)) == current_affect, TEST_AA_GET_AFFECT, "");
  }
  TAP_TEST(kaa.count(KAffect("", seq[2*(nb_seq-1)+1], 1)) == 1, TEST_AA_COUNT, "");
  TAP_TEST((kaa.first(KAffect("", seq[2*(nb_seq-1)+1], 1)) 
          == kaa.last(KAffect("", seq[2*(nb_seq-1)+1], 1)))
           == 1, TEST_AA_FIRST, "");
  TAP_TEST(kaa.getAffectation(3).isUnknown(), TEST_AA_PREDICATES, "");
  TAP_TEST(kaa.getAffectation(8).isUnknown(), TEST_AA_PREDICATES, "");
  TAP_TEST(kaa.getAffectation(0).isAmbiguous(), TEST_AA_PREDICATES, "");
  
  TAP_TEST(kaa.getDistinctAffectations().size() == 5, TEST_AA_GET_DISTINCT_AFFECT, "");

  delete index;
}

template<template <class> class T, class KAffect>
void testAffectAnalyser2() {
  const int k = 5;
  const bool revcomp = true;
  T<KAffect> *index = createIndex<T<KAffect> >(k, revcomp);
  
  KmerAffectAnalyser<KAffect> kaa(*index, "TTTTTGGGGG");
  
  TAP_TEST(kaa.getAffectation(1) == KAffect("", seq[2*(nb_seq-1)+1], -1), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.count(kaa.getAffectation(1)) == 1, TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.getAffectation(0) == kaa.getAffectation(10 - k), TEST_AA_GET_AFFECT, "");
  for (int i = 2; i < 10 - k; i++)
    TAP_TEST(kaa.getAffectation(i).isUnknown(), TEST_AA_PREDICATES, "");

  TAP_TEST(kaa.getDistinctAffectations().size() == 3, TEST_AA_GET_DISTINCT_AFFECT, "");

  delete index;
}

void testSegmentationBug1(int delta_min, int delta_max) {
  string buggy_sequences = "bugs/kmersegment.fa";
  int k = 14;
  bool rc = true;
  Fasta seqV("data/Repertoire/TRGV.fa");
  Fasta seqJ("data/Repertoire/TRGJ.fa");

  IKmerStore<KmerAffect>  *index = new ArrayKmerStore<KmerAffect>(k, rc);
  index->insert(seqV, "V");
  index->insert(seqJ, "J");

  OnlineFasta input(buggy_sequences);

  while (input.hasNext()) {
    input.next();
    KmerAffectAnalyser<KmerAffect> *kaa = new KmerAffectAnalyser<KmerAffect>(*index, input.getSequence().sequence);

    set<KmerAffect> distinct_a = kaa->getDistinctAffectations();
    int strand = 0;
    for (set<KmerAffect>::iterator it = distinct_a.begin(); 
         it != distinct_a.end() && strand != 2; it++) {
      if (! it->isAmbiguous() && ! it->isUnknown()) {
        if (strand == 0)
          strand = affect_strand(it->affect);
        else if ((strand == 1 && affect_strand(it->affect) == -1)
                 || (strand == -1 && affect_strand(it->affect) == 1))
          strand = 2;
      }
    }

    int stats[STATS_SIZE];
    Segmenter *segment = new KmerSegmenter(input.getSequence(), index, 
                                           delta_min, delta_max, stats);

    if (strand == 2 
        || (strand == 1
            && (kaa->last(AFFECT_V) == (int)string::npos
                || kaa->first(AFFECT_J) == (int) string::npos))
        || (strand == -1
            && (kaa->first(AFFECT_V) == (int)string::npos
                || kaa->last(AFFECT_J) == (int) string::npos)))
      TAP_TEST(! segment->isSegmented(), TEST_BUG_SEGMENTATION, "");
      
    delete segment;
    delete kaa;
  }
  delete index;
}

int main(void) {
  TAP_START(NB_TESTS);
  declare_tests();

  TAP_TEST(complement("AATCAGactgactagATCGAn") == "TTAGTCTGACTGATCTAGCTN", TEST_REVCOMP, "");
  TAP_TEST(revcomp("AATCAGactgactagATCGAn") == "NTCGATCTAGTCAGTCTGATT", TEST_REVCOMP, "");
  TAP_TEST(revcomp("") == "", TEST_REVCOMP, "");
  TAP_TEST(revcomp("aaaaaa") == "TTTTTT", TEST_REVCOMP, "");

  testFasta1();

  testKmerStoreWithKmer<ArrayKmerStore>(5, false, TEST_ARRAY_KMERSTORE);
  testKmerStoreWithKmer<ArrayKmerStore>(5, true, TEST_ARRAY_KMERSTORE_RC);

  testKmerStoreWithKmer<MapKmerStore>(5, false, TEST_MAP_KMERSTORE);
  testKmerStoreWithKmer<MapKmerStore>(5, true, TEST_MAP_KMERSTORE_RC);

  testAffectAnalyser1<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser1<ArrayKmerStore,KmerStringAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerStringAffect>();

  // Bug with one sequence on segmentation
  testSegmentationBug1(-10, 15);
  
  TAP_END_TEST_EXIT
}
