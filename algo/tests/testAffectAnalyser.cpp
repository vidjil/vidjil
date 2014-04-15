#include "tests.h"
#include <core/affectanalyser.h>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>

template<template <class> class T, class KAffect>
void testAffectAnalyser1() {
  const int k = 4;
  const bool revcomp = false;
  T<KAffect> *index = createIndex<T<KAffect> >(k, revcomp);
  
  KmerAffectAnalyser<KAffect> kaa(*index, "AAAACCCCCGGGGG");
  CountKmerAffectAnalyser<KAffect> ckaa(*index, "AAAACCCCCGGGGG");
  ckaa.setAllowedOverlap(k-1);

  for (int i = 2; i < nb_seq-1; i++) {
    // i starts at 2 because AAAA is not found: there is an ambiguity with
    // AAAA coming from AAAACAAAACAAAAC or AAAAAAAAAAAAAAA
    KAffect current_affect("", seq[2*i+1], 1);
    TAP_TEST(kaa.count(current_affect) == 0, TEST_AA_COUNT, "");
    TAP_TEST(ckaa.count(current_affect) == 0, TEST_COUNT_AA_COUNT, ckaa.count(current_affect));
    TAP_TEST(kaa.first(current_affect) == (int)string::npos, TEST_AA_FIRST, "");
    TAP_TEST(kaa.last(current_affect) == (int)string::npos, TEST_AA_LAST, "");
  }
  for (int i = 0; i < 2; i++) {
    KAffect current_affect("", seq[2*i+1], 1);
    TAP_TEST(kaa.count(current_affect) == 2, TEST_AA_COUNT, "");
    TAP_TEST(ckaa.count(current_affect) == 2, TEST_COUNT_AA_COUNT, "");
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

  KAffect cAffect = KAffect("", seq[1], 1);
  KAffect gAffect = KAffect("", seq[3], 1);
  TAP_TEST(ckaa.countBefore(cAffect, 4) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(cAffect, 5) == 1, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countAfter(cAffect, 4) == 1, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(cAffect, 5) == 0, TEST_COUNT_AA_COUNT_AFTER, "");

  TAP_TEST(ckaa.countAfter(gAffect, 4) == 2, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(gAffect, 5) == 2, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countBefore(gAffect, 4) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(gAffect, 5) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST(ckaa.countBefore(cAffect, 9) == 2, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(cAffect, 10) == 2, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countAfter(cAffect, 9) == 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(cAffect, 10) == 0, TEST_COUNT_AA_COUNT_AFTER, "");

  TAP_TEST(ckaa.countAfter(gAffect, 9) == 1, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(gAffect, 10) == 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countBefore(gAffect, 9) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(gAffect, 10) == 1, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST(ckaa.firstMax(cAffect, gAffect) == 6, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(cAffect, gAffect) == 8, TEST_COUNT_AA_LAST_MAX, ckaa.lastMax(cAffect, gAffect));

  // Test affectation with two affects that are not in the sequence
  KAffect aAffect = KAffect("", seq[5], 1);
  KAffect tAffect = KAffect("", seq[7], 1);
  TAP_TEST(ckaa.firstMax(aAffect, tAffect) == 0, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(aAffect, tAffect) == ckaa.count() - 1, 
           TEST_COUNT_AA_LAST_MAX, "");

  // Test affectation with one affect not in the sequence

  TAP_TEST(ckaa.firstMax(cAffect, tAffect) == 6, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(cAffect, tAffect) == ckaa.count()-1, 
           TEST_COUNT_AA_LAST_MAX, "");

  TAP_TEST(ckaa.firstMax(aAffect, gAffect) == 0, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(aAffect, gAffect) == 8, TEST_COUNT_AA_LAST_MAX, "");
  delete index;
}

// Test with revcomp
template<template <class> class T, class KAffect>
void testAffectAnalyser2() {
  const int k = 5;
  const bool revcomp = true;
  T<KAffect> *index = createIndex<T<KAffect> >(k, revcomp);
  
  KmerAffectAnalyser<KAffect> kaa(*index, "TTTTTGGGGG");
  CountKmerAffectAnalyser<KAffect> ckaa(*index, "TTTTTGGGGG");
  ckaa.setAllowedOverlap(k-1);
  
  TAP_TEST(kaa.getAffectation(1) == KAffect("", seq[2*(nb_seq-1)+1], -1), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.count(kaa.getAffectation(1)) == 1, TEST_AA_GET_AFFECT, "");
  TAP_TEST(ckaa.count(kaa.getAffectation(1)) == 1, TEST_COUNT_AA_COUNT, "");
  TAP_TEST(kaa.getAffectation(0) == kaa.getAffectation(10 - k), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.getAffectation(0).isAmbiguous(), TEST_AA_PREDICATES, "");

  for (int i = 2; i < 10 - k; i++)
    TAP_TEST(kaa.getAffectation(i).isUnknown(), TEST_AA_PREDICATES, "");

  TAP_TEST(kaa.getDistinctAffectations().size() == 3, TEST_AA_GET_DISTINCT_AFFECT, "");

  delete index;
}

void testAffectAnalyser() {
  testAffectAnalyser1<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser1<ArrayKmerStore,KmerStringAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerStringAffect>();
}
