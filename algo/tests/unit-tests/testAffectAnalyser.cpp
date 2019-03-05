#include "tests.h"
#include <core/affectanalyser.h>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>

template<template <class> class T>
void testAffectAnalyser1() {
  const int k = 4;
  const bool revcomp = false;

  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);
  
  string sequence = "AAAACCCCCGGGGG";
  KmerAffectAnalyser kaa(*index, sequence);
  CountKmerAffectAnalyser ckaa(*index, sequence);
  TAP_TEST_EQUAL(ckaa.getAllowedOverlap(), 0, TEST_COUNT_AA_GET_OVERLAP, "");
  ckaa.setAllowedOverlap(k-1);

  set<KmerAffect> forbidden;
  forbidden.insert(KmerAffect::getAmbiguous());
  forbidden.insert(KmerAffect::getUnknown());

  TAP_TEST_EQUAL(ckaa.getAllowedOverlap(), k-1, TEST_COUNT_AA_GET_OVERLAP, "");
  TAP_TEST_EQUAL(ckaa.getSequence(), "AAAACCCCCGGGGG", TEST_AA_GET_SEQUENCE, "actual: " << ckaa.getSequence());

  bool full_length = (kaa.getAllAffectations(AO_NONE).size() == 14); // Hack for different lenghts
  int shift = 4/2 ; // getS(), See #3727
  TAP_TEST_EQUAL(kaa.minimize(KmerAffect::getAmbiguous(), 0, 4), 0+shift, TEST_AA_MINIMIZE, ""); // first k-mer, AAAA is ambiguous
  TAP_TEST_EQUAL(kaa.minimize(KmerAffect::getAmbiguous(), 1, 4), NO_MINIMIZING_POSITION, TEST_AA_MINIMIZE, ""); // too large margin (left side)
  TAP_TEST_EQUAL(kaa.minimize(KmerAffect("A", 1, k), 0, 3), NO_MINIMIZING_POSITION, TEST_AA_MINIMIZE, ""); // no non-ambiguous AAAA
  TAP_TEST_EQUAL(kaa.minimize(KmerAffect("C", 1, k), 3, 4), 4+shift, TEST_AA_MINIMIZE, ""); // margin = 3, does not affect C
  if (full_length)
  TAP_TEST_EQUAL(kaa.minimize(KmerAffect("C", 1, k), 5, 4), 5+shift, TEST_AA_MINIMIZE, ""); // margin = 5, second k-mer C exactly fits between both margins
  TAP_TEST_EQUAL(kaa.minimize(KmerAffect("G", 1, k), 5, 4), NO_MINIMIZING_POSITION, TEST_AA_MINIMIZE, ""); // too large margin (right side)

  for (int i = 2; i < nb_seq-1; i++) {
    // i starts at 2 because AAAA is not found: there is an ambiguity with
    // AAAA coming from AAAACAAAACAAAAC or AAAAAAAAAAAAAAA
    KmerAffect current_affect(seq[2*i+1], 1, k);
    TAP_TEST_EQUAL(kaa.count(current_affect), 0, TEST_AA_COUNT, "");
    TAP_TEST_EQUAL(ckaa.count(current_affect), 0, TEST_COUNT_AA_COUNT, ckaa.count(current_affect));
    TAP_TEST(kaa.first(current_affect) == (int)string::npos, TEST_AA_FIRST, "");
    TAP_TEST(kaa.last(current_affect) == (int)string::npos, TEST_AA_LAST, "");
  }
  for (int i = 0; i < 2; i++) {
    KmerAffect current_affect(seq[2*i+1], 1, k);
    TAP_TEST_EQUAL(kaa.count(current_affect), 2, TEST_AA_COUNT, kaa.count(current_affect));
    TAP_TEST_EQUAL(ckaa.count(current_affect), 2, TEST_COUNT_AA_COUNT, ckaa.count(current_affect));
    TAP_TEST(kaa.getAffectation(kaa.first(current_affect)) == current_affect, TEST_AA_GET_AFFECT, "");
    TAP_TEST(kaa.getAffectation(kaa.last(current_affect)) == current_affect, TEST_AA_GET_AFFECT, "");
  }
  TAP_TEST(kaa.count(KmerAffect(seq[2*(nb_seq-1)+1], 1, k)) == 1, TEST_AA_COUNT, "");
  TAP_TEST((kaa.first(KmerAffect(seq[2*(nb_seq-1)+1], 1, k))
           == kaa.last(KmerAffect(seq[2*(nb_seq-1)+1], 1, k)))
           == 1, TEST_AA_FIRST, "");

  TAP_TEST(ckaa.max(forbidden) == KmerAffect("C lots of", 1, k)
           || ckaa.max(forbidden) == KmerAffect("G lots of", 1, k),
           TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));

  TAP_TEST(ckaa.max() == KmerAffect::getUnknown(), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max());

  TAP_TEST(kaa.getAffectation(6  - k + 1).isUnknown(), TEST_AA_PREDICATES, "");
  TAP_TEST(kaa.getAffectation(11  - k + 1).isUnknown(), TEST_AA_PREDICATES, "");
  TAP_TEST(kaa.getAffectation(3  - k + 1).isAmbiguous(), TEST_AA_PREDICATES, "");
  
  TAP_TEST(kaa.getDistinctAffectations().size() == 5, TEST_AA_GET_DISTINCT_AFFECT, "");

  KmerAffect cAffect = KmerAffect(seq[1], 1, k);
  KmerAffect gAffect = KmerAffect(seq[3], 1, k);
  TAP_TEST_EQUAL(ckaa.countBefore(cAffect, 0), 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countBefore(gAffect, 0), 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countAfter(cAffect, 10), 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countAfter(gAffect, 13  - k + 1), 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST_EQUAL(ckaa.countBefore(cAffect, 7  - k + 1), 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countBefore(cAffect, 8  - k + 1), 1, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countAfter(cAffect, 7  - k + 1), 1, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countAfter(cAffect, 8  - k + 1), 0, TEST_COUNT_AA_COUNT_AFTER, "");

  TAP_TEST_EQUAL(ckaa.countAfter(gAffect, 7  - k + 1), 2, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countAfter(gAffect, 8  - k + 1), 2, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countBefore(gAffect, 7  - k + 1), 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countBefore(gAffect, 8  - k + 1 ), 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST_EQUAL(ckaa.countBefore(cAffect, 12  - k + 1), 2, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countBefore(cAffect, 13  - k + 1), 2, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countAfter(cAffect, 12  - k + 1), 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countAfter(cAffect, 13  - k + 1), 0, TEST_COUNT_AA_COUNT_AFTER, "");

  TAP_TEST_EQUAL(ckaa.countAfter(gAffect, 12  - k + 1), 1, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countAfter(gAffect, 13  - k + 1), 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countBefore(gAffect, 12  - k + 1), 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST_EQUAL(ckaa.countBefore(gAffect, 13  - k + 1), 1, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST_EQUAL(ckaa.firstMax(cAffect, gAffect), 9 - k + 1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST_EQUAL(ckaa.lastMax(cAffect, gAffect), 11 -  k + 1, TEST_COUNT_AA_LAST_MAX, ckaa.lastMax(cAffect, gAffect));

  // Test affectation with two affects that are not in the sequence
  KmerAffect aAffect = KmerAffect(seq[5], 1, k);
  KmerAffect tAffect = KmerAffect(seq[7], 1, k);
  TAP_TEST_EQUAL(ckaa.firstMax(aAffect, tAffect), -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST_EQUAL(ckaa.lastMax(aAffect, tAffect), - 1, 
           TEST_COUNT_AA_LAST_MAX, "");
  TAP_TEST_EQUAL(ckaa.countAfter(tAffect, 7  - k + 1), 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST_EQUAL(ckaa.countBefore(tAffect, 7  - k + 1), 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  // Test affectation with one affect not in the sequence

  TAP_TEST_EQUAL(ckaa.firstMax(cAffect, tAffect), -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST_EQUAL(ckaa.lastMax(cAffect, tAffect), -1, 
           TEST_COUNT_AA_LAST_MAX, "");

  TAP_TEST_EQUAL(ckaa.firstMax(aAffect, gAffect), -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST_EQUAL(ckaa.lastMax(aAffect, gAffect), -1, TEST_COUNT_AA_LAST_MAX, "");
  delete index;
}

// Test with revcomp
template<template <class> class T>
void testAffectAnalyser2() {
  const int k = 5;
  const bool revcomp = true;
  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);
  string sequence = "TTTTTGGGGG";
  KmerAffectAnalyser kaa(*index, sequence);
  CountKmerAffectAnalyser ckaa(*index, sequence);
  ckaa.setAllowedOverlap(k-1);

  set<KmerAffect> forbidden;
  forbidden.insert(KmerAffect::getAmbiguous());
  forbidden.insert(KmerAffect::getUnknown());
  
  TAP_TEST_EQUAL(kaa.getSequence(), "TTTTTGGGGG", TEST_AA_GET_SEQUENCE, "actual: ");
  TAP_TEST_EQUAL(ckaa.getSequence(), "TTTTTGGGGG", TEST_AA_GET_SEQUENCE, "actual: " << ckaa.getSequence());

  TAP_TEST(kaa.getAffectation(1) == KmerAffect(seq[2*(nb_seq-1)+1], -1, k), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.count(kaa.getAffectation(1)) == 1, TEST_AA_GET_AFFECT, "");
  TAP_TEST(ckaa.count(kaa.getAffectation(1)) == 1, TEST_COUNT_AA_COUNT, "");
  TAP_TEST(kaa.getAffectation(0) == kaa.getAffectation(10 - k), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.getAffectation(0).isAmbiguous(), TEST_AA_PREDICATES, "");

  for (int i = 6; i < 14 - k; i++)
    TAP_TEST(kaa.getAffectation(i  - k + 1).isUnknown(), TEST_AA_PREDICATES, "");

  TAP_TEST(kaa.getDistinctAffectations().size() == 3, TEST_AA_GET_DISTINCT_AFFECT, "");

  TAP_TEST(ckaa.max(forbidden) == KmerAffect(seq[2*(nb_seq-1)+1], -1, k),
           TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));

  TAP_TEST(ckaa.max() == KmerAffect::getUnknown(), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max());


  for (int i = 4; i < 14 - k; i++)
    TAP_TEST(kaa.getAffectation(i  - k + 1) == kaa.getAllAffectations(AO_NONE)[i  - k + 1], TEST_AA_GET_ALL_AO_NONE, "");

  TAP_TEST(kaa.getAffectation(0) == kaa.getAllAffectations(AO_NO_CONSECUTIVE)[0], TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "");
  if ((size_t)kaa.count() == sequence.length() - k + 1) {
    TAP_TEST(kaa.getAllAffectations(AO_NO_CONSECUTIVE).size() == 4, TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "size = " << kaa.getAllAffectations(AO_NO_CONSECUTIVE).size());
  } else if ((size_t) kaa.count() == sequence.length()) {
    TAP_TEST(kaa.getAllAffectations(AO_NO_CONSECUTIVE).size() == 5, TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "size = " << kaa.getAllAffectations(AO_NO_CONSECUTIVE).size());
  }
  TAP_TEST(kaa.getAffectation(1) == kaa.getAllAffectations(AO_NO_CONSECUTIVE)[1], TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "actual: " << kaa.getAllAffectations(AO_NO_CONSECUTIVE)[1] << ", expected: " << kaa.getAffectation(1));
  TAP_TEST(kaa.getAffectation(2) == kaa.getAllAffectations(AO_NO_CONSECUTIVE)[2], TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, kaa.getAllAffectations(AO_NO_CONSECUTIVE)[2] << ", expected: " << kaa.getAffectation(2));
  TAP_TEST(kaa.getAllAffectations(AO_NO_CONSECUTIVE)[3] == kaa.getAffectation(10-k), TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, kaa.getAllAffectations(AO_NO_CONSECUTIVE)[3] << ", expected: " << kaa.getAffectation(10-k));

  delete index;
}


template<template <class> class T>
void testAffectAnalyserMaxes() {
  const int k = 4;
  const bool revcomp = false;

  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);
  
  string sequence = "ACCCCAGGGGGA";
  CountKmerAffectAnalyser ckaa(*index, sequence);

  KmerAffect cAffect = KmerAffect("C", 1, k);
  KmerAffect gAffect = KmerAffect("G", 1, k);

  set<KmerAffect> forbidden;
  forbidden.insert(KmerAffect::getAmbiguous());
  forbidden.insert(KmerAffect::getUnknown());

  TAP_TEST(ckaa.max(forbidden) == gAffect, TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));
  TAP_TEST(ckaa.max12(forbidden).first == gAffect, TEST_COUNT_AA_MAX12, "max1 is " << ckaa.max12(forbidden).first);
  TAP_TEST(ckaa.max12(forbidden).second == cAffect, TEST_COUNT_AA_MAX12, "max2 is " << ckaa.max12(forbidden).second);

  TAP_TEST(ckaa.sortLeftRight(ckaa.max12(forbidden)).first == cAffect, TEST_AA_SORT_LEFT_RIGHT, "bad max12, left");
  TAP_TEST(ckaa.sortLeftRight(ckaa.max12(forbidden)).second == gAffect, TEST_AA_SORT_LEFT_RIGHT, "bad max12, right");

  forbidden.insert(gAffect);
  TAP_TEST(ckaa.max(forbidden) == cAffect, TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));
  TAP_TEST(ckaa.max12(forbidden).first == cAffect, TEST_COUNT_AA_MAX12, "max1 is " << ckaa.max12(forbidden).first);
  TAP_TEST(ckaa.max12(forbidden).second == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX12, "max2 is " << ckaa.max12(forbidden).second);

  forbidden.insert(cAffect);
  TAP_TEST(ckaa.max(forbidden) == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));
  TAP_TEST(ckaa.max12(forbidden).first == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX12, "max1 is " << ckaa.max12(forbidden).first);
  TAP_TEST(ckaa.max12(forbidden).second == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX12, "max2 is " << ckaa.max12(forbidden).second);

  delete index;
}

template<template <class> class T>
void testAffectAnalyserSpaced() {
  const string seed = "##-##";
  const bool revcomp = false;

  T<KmerAffect> *index = createIndex<T<KmerAffect> >(seed, revcomp);

  string sequence = "AAAACCCCCGGGGG";
  // AA-AC, AA-CC, AA-CC, AC-CC, CC-CC, CC-CG, CC-GG, CG-GG, GG-GG
  KmerAffectAnalyser kaa(*index, sequence);
  CountKmerAffectAnalyser ckaa(*index, sequence);

  KmerAffect affect_AAAC(seq[11], 1, seed.size());
  KmerAffect affect_AAAC_bad(seq[11], 1, seed_weight(seed));
  KmerAffect affect_CCCC(seq[1], 1, seed.size());
  KmerAffect affect_CCCC_bad(seq[1], 1, seed_weight(seed));
  KmerAffect affect_GGGG(seq[3], 1, seed.size());
  KmerAffect affect_GGGG_bad(seq[3], 1, seed_weight(seed));

  TAP_TEST(kaa.toString().find("+V _ _ _+C _ _ _ _+G") != string::npos,
           TEST_AA_TO_STRING, "");
  TAP_TEST_EQUAL(kaa.count(affect_AAAC), 1, TEST_AA_COUNT, "Expected 1, got " << kaa.count(affect_AAAC) << " in " << __PRETTY_FUNCTION__);
  TAP_TEST_EQUAL(kaa.count(affect_CCCC), 1, TEST_AA_COUNT, "Expected 1, got " << kaa.count(affect_CCCC) << " in " << __PRETTY_FUNCTION__);
  TAP_TEST_EQUAL(kaa.count(affect_GGGG), 1, TEST_AA_COUNT, "Expected 1, got " << kaa.count(affect_GGGG) << " in " << __PRETTY_FUNCTION__);

  TAP_TEST_EQUAL(kaa.count(affect_AAAC_bad), 0, TEST_AA_COUNT, "Expected 0, got " << kaa.count(affect_AAAC_bad) << " in " << __PRETTY_FUNCTION__);
  TAP_TEST_EQUAL(kaa.count(affect_CCCC_bad), 0, TEST_AA_COUNT, "Expected 0, got " << kaa.count(affect_CCCC_bad) << " in " << __PRETTY_FUNCTION__);
  TAP_TEST_EQUAL(kaa.count(affect_GGGG_bad), 0, TEST_AA_COUNT, "Expected 0, got " << kaa.count(affect_GGGG_bad) << " in " << __PRETTY_FUNCTION__);
  delete index;
}

template<template <class> class T>
void testGetMaximum() {
  const int k = 4;
  const bool revcomp = true;
  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);

  KmerAffect a[] = {AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_J_BWD, AFFECT_J_BWD};
  //  0 1 2 3 4 5 6 7 8 9  11  13
  // J-J- _ _ _ _V-V-V- _ _ _J-J-
  //   ^^^^^^^^^^
  vector<KmerAffect> affectations(a, a+sizeof(a)/sizeof(KmerAffect));

  KmerAffectAnalyser kaa(*index, "", affectations);
  TAP_TEST_EQUAL(kaa.getSequence(), "", TEST_AA_GET_SEQUENCE, "");

  affect_infos results = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 2., 0);
  TAP_TEST(! results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND, 
           "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");

  results = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 0.9, 0);
  TAP_TEST(results.max_found , 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.first_pos_max == 5 && results.last_pos_max == 5,
           TEST_AA_GET_MAXIMUM_POSITIONS,"(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST_EQUAL(results.max_value, 2, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);

  results = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 0.9, k);
  TAP_TEST(results.max_found, 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.first_pos_max == 1 && results.last_pos_max == 5,
           TEST_AA_GET_MAXIMUM_POSITIONS,"(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST_EQUAL(results.max_value, 2, TEST_AA_GET_MAXIMUM_VALUE, "");

  affect_infos results2 = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 0.9, k+5);
  TAP_TEST(results == results2, TEST_AA_GET_MAXIMUM_VALUE, "");

  KmerAffect a2[] = {AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, 
                     AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_J, AFFECT_J, AFFECT_J,
                     AFFECT_V, AFFECT_V, AFFECT_V};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15
  //  V V V V V V V V V V J J J V V V
  //                    ^^^^^^^^^^^^
  vector<KmerAffect> affectations2(a2, a2+sizeof(a2)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa2(*index, "", affectations2);
  results = kaa2.getMaximum(AFFECT_V, AFFECT_J, 2., 0);
  TAP_TEST(! results.max_found, 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");

  results = kaa2.getMaximum(AFFECT_V, AFFECT_J, 1., k);
  TAP_TEST(! results.max_found, 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST_EQUAL(results.max_value, 10, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 9
           && results.last_pos_max == 15, TEST_AA_GET_MAXIMUM_POSITIONS,
           "max positions: [" << results.first_pos_max << ", " 
           << results.last_pos_max << "]");
  TAP_TEST(results.nb_before_right == 0 && results.nb_after_right == 0, 
           TEST_AA_GET_MAXIMUM_COUNTS, 
           "before right: " << results.nb_before_right
           << ", after right: " << results.nb_after_right);

  results = kaa2.getMaximum(AFFECT_V_BWD, AFFECT_J_BWD);
  // No result

  TAP_TEST(! results.max_found,
           TEST_AA_GET_MAXIMUM_MAX_FOUND, 
           "(" << results.first_pos_max << ", " 
           << results.last_pos_max << ")");
  TAP_TEST_EQUAL(results.max_value, 0, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);

  
  KmerAffect a3[] = {AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, 
                     AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                     AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                     AFFECT_J, AFFECT_J, AFFECT_V, AFFECT_J};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15  17  19
  //  V V V V V V V V V V _ _ _ _ _ _ J J V J
  //0 0 0 0 0 1 2 3 4 5 6 7 8 9101010 9 8 7 6
  //                           ^^^^^^
  //  V V V V V V                     J J   J    // nb_before_left (6), nb_after_right (3)
  //                                      V      // nb_before_right (1)
  vector<KmerAffect> affectations3(a3, a3+sizeof(a3)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa3(*index, "", affectations3);
  // span = 4, maxOverlap = 0
  results = kaa3.getMaximum(AFFECT_V, AFFECT_J, 2., 0);

  TAP_TEST(results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND,
           "max_found = " << results.max_found);
  TAP_TEST(results.max_value == 10, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 13 && results.last_pos_max == 15,
           TEST_AA_GET_MAXIMUM_POSITIONS, 
           "first = " << results.first_pos_max 
           << ", last = " << results.last_pos_max);
  TAP_TEST(results.nb_before_left == 10 && results.nb_before_right == 1
           && results.nb_after_left == 0 && results.nb_after_right == 3,
           TEST_AA_GET_MAXIMUM_COUNTS, 
           "before:: left: " << results.nb_before_left <<", right: " 
           << results.nb_before_right << "\nafter:: left: " 
           << results.nb_after_left << ", right: " 
           << results.nb_after_right);


  KmerAffect a4[] = {AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_J, AFFECT_J, AFFECT_J, AFFECT_J, AFFECT_J,
                     AFFECT_J, AFFECT_J, AFFECT_J, AFFECT_J, AFFECT_J};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15  17  19    // i
  //  V V V V V V V V V V J J J J J J J J J J
  //0 0 0 0 0 1 2 3 4 5 6 6 6 6 6 5 4 3 2 1 0    // currentValue, after iteration i
  //                    ^^^^^^^^^
  //  V V V V V V                 J J J J J J    // nb_before_left (6), nb_after_right (6)
  vector<KmerAffect> affectations4(a4, a4+sizeof(a4)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa4(*index, "", affectations4);
  // span = 4, maxOverlap = 0
  results = kaa4.getMaximum(AFFECT_V, AFFECT_J, 2., 0);

  TAP_TEST(results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND,
           "max_found = " << results.max_found);
  TAP_TEST(results.max_value == 6, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 9 && results.last_pos_max == 13,
           TEST_AA_GET_MAXIMUM_POSITIONS,
           "first = " << results.first_pos_max
           << ", last = " << results.last_pos_max);
  TAP_TEST(results.nb_before_left == 6 && results.nb_before_right == 0
           && results.nb_after_left == 0 && results.nb_after_right == 6,
           TEST_AA_GET_MAXIMUM_COUNTS,
           "before:: left: " << results.nb_before_left <<", right: "
           << results.nb_before_right << "\nafter:: left: "
           << results.nb_after_left << ", right: "
           << results.nb_after_right);


  KmerAffect a5[] = {AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_J,
                     AFFECT_J, AFFECT_J, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_V, AFFECT_V, AFFECT_J, AFFECT_J, AFFECT_J,
                     AFFECT_J, AFFECT_J, AFFECT_J, AFFECT_J, AFFECT_J};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15  17  19   // i
  //  V V V V J J J V V V V V J J J J J J J J
  //0 0 0 0 0 0 0 0 1 1 1 1 2 2 2 2 2 1 0-1-2   // currentValue, after iteration i
  //                        ^^^^^^^^^
  //  V V V V       V                 J J J J   // nb_before_left (5), nb_after_right (4)
  //          J J J                             // nb_after_left (3)

  vector<KmerAffect> affectations5(a5, a5+sizeof(a5)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa5(*index, "", affectations5);
  results = kaa5.getMaximum(AFFECT_V, AFFECT_J, 2., 0);

  TAP_TEST(! results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND,
           "max_found = " << results.max_found);
  TAP_TEST(results.max_value == 2, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 11 && results.last_pos_max == 15,
           TEST_AA_GET_MAXIMUM_POSITIONS,
           "first = " << results.first_pos_max
           << ", last = " << results.last_pos_max);
  TAP_TEST(results.nb_before_left == 5 && results.nb_before_right == 0
           && results.nb_after_left == 3 && results.nb_after_right == 4,
           TEST_AA_GET_MAXIMUM_COUNTS,
           "before:: left: " << results.nb_before_left <<", right: "
           << results.nb_before_right << "\nafter:: left: "
           << results.nb_after_left << ", right: "
           << results.nb_after_right);


  KmerAffect a6[] = {AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_J_BWD,
                     AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_J_BWD,
                     AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_V_BWD,
                     AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_J_BWD,
                     AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_V_BWD};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15  17  19
  // J-J-J-J-J-J-J-J-V-V-V-V-V-J-J-J-V-V-V-V-
  //               ^^^^^^^^^^
  vector<KmerAffect> affectations6(a6, a6+sizeof(a6)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa6(*index, "", affectations6);
  results = kaa6.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 2., 0);

  TAP_TEST(! results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND,
           "max_found = " << results.max_found);
  TAP_TEST(results.max_value == 4, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 7 && results.last_pos_max == 11,
           TEST_AA_GET_MAXIMUM_POSITIONS,
           "first = " << results.first_pos_max
           << ", last = " << results.last_pos_max);
  TAP_TEST(results.nb_before_left == 4 && results.nb_before_right == 3
           && results.nb_after_left == 0 && results.nb_after_right == 5,
           TEST_AA_GET_MAXIMUM_COUNTS,
           "before:: left: " << results.nb_before_left <<", right: "
           << results.nb_before_right << "\nafter:: left: "
           << results.nb_after_left << ", right: "
           << results.nb_after_right);

  delete index;
}

/**
 * A sequence and its revcomp are not affected in the same way.
 */
template<template <class> class T>
void testBugAffectAnalyser() {
  BioReader seqV("../../germline/homo-sapiens/IGHV.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/IGHJ.fa", 2);
  BioReader data("data/bug-revcomp.fa", 1, " ");

  int k = 9;
  T<KmerAffect> index(k, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");
  index.finish_building();

  TAP_TEST_EQUAL(data.size(), 2, TEST_FASTA_SIZE, 
           "Should have 2 sequences (one seq and its revcomp), " 
           << data.size() << " instead");

  TAP_TEST(data.read(0).sequence.size() == data.read(1).sequence.size(),
           TEST_FASTA_SEQUENCE, 
           "Sequences should be of same length: sequence and its revcomp");

  KmerAffectAnalyser fwdAffect(index, data.read(0).sequence);
  KmerAffectAnalyser bwdAffect(index, data.read(1).sequence);

  int total = data.read(0).sequence.size() -k + 1;

  TAP_TEST(fwdAffect.getSequence() == data.read(0).sequence, TEST_AA_GET_SEQUENCE, "actual: " << fwdAffect.getSequence() << ", expected: " << data.read(0).sequence);
  TAP_TEST(bwdAffect.getSequence() == data.read(1).sequence, TEST_AA_GET_SEQUENCE, "actual: " << bwdAffect.getSequence() << ", expected: " << data.read(1).sequence);

  TAP_TEST(fwdAffect.count() == bwdAffect.count(),
           TEST_AA_COUNT,
           "Both sequences should have the same amount of affectations. "
           << fwdAffect.count() << " for the fwd, and " << bwdAffect.count()
           << " for the bwd instead");

  for (int i = 0; i < total; i++) {
    const KmerAffect fwd = fwdAffect.getAffectation(i);
    const KmerAffect bwd = bwdAffect.getAffectation(total - 1 - i);

    if (fwd.isAmbiguous() || bwd.isAmbiguous()
        || fwd.isUnknown() || bwd.isUnknown()) {
      TAP_TEST(fwd == bwd, TEST_AA_PREDICATES, 
               "If ambiguous or unknown, both affectations should be the same (fwd="
               << fwd << ", bwd=" << bwd << ", i= " << i << ") "
               << __PRETTY_FUNCTION__);
    } else {
      TAP_TEST(fwd.getLabel() == bwd.getLabel(), TEST_AA_REVCOMP_LABEL,
               "Label should be the same, instead: fwd=" << fwd.getLabel()
               << ", bwd=" << bwd.getLabel() << ", i=" <<i
               << " " << __PRETTY_FUNCTION__);
      TAP_TEST(-1*fwd.getStrand() == bwd.getStrand(), TEST_AA_REVCOMP_STRAND,
               "Strands should be the opposite, instead: fwd=" << fwd.getStrand()
               << ", bwd=" << bwd.getStrand() << ", i=" << i << " "
               << __PRETTY_FUNCTION__);
    }
  }
}

void testAffectAnalyser() {
  testAffectAnalyser1<MapKmerStore>();
  testAffectAnalyser2<MapKmerStore>();
  testBugAffectAnalyser<MapKmerStore>();
  testGetMaximum<MapKmerStore>();
  testAffectAnalyserSpaced<MapKmerStore>();

  testAffectAnalyser1<ArrayKmerStore>();
  testAffectAnalyser2<ArrayKmerStore>();
  testAffectAnalyserMaxes<ArrayKmerStore>();
  testBugAffectAnalyser<ArrayKmerStore>();
  testGetMaximum<ArrayKmerStore>();
  testAffectAnalyserSpaced<ArrayKmerStore>();


  testAffectAnalyser1<PointerACAutomaton>();
  testAffectAnalyser2<PointerACAutomaton>();
  testAffectAnalyserMaxes<PointerACAutomaton>();
  testBugAffectAnalyser<PointerACAutomaton>();
  testGetMaximum<PointerACAutomaton>();
  testAffectAnalyserSpaced<PointerACAutomaton>();
}
