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

void testAffectAnalyser() {
  testAffectAnalyser1<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser1<ArrayKmerStore,KmerStringAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerStringAffect>();
}
