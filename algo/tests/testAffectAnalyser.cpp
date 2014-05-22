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

  set<KAffect> forbidden;
  forbidden.insert(KAffect::getAmbiguous());
  forbidden.insert(KAffect::getUnknown());

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

  TAP_TEST(ckaa.max(forbidden) == KAffect("", "C lots of", 1)
           || ckaa.max(forbidden) == KAffect("", "G lots of", 1), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));

  TAP_TEST(ckaa.max() == KAffect::getUnknown(), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max());

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
  TAP_TEST(ckaa.firstMax(aAffect, tAffect) == -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(aAffect, tAffect) == - 1, 
           TEST_COUNT_AA_LAST_MAX, "");

  // Test affectation with one affect not in the sequence

  TAP_TEST(ckaa.firstMax(cAffect, tAffect) == -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(cAffect, tAffect) == -1, 
           TEST_COUNT_AA_LAST_MAX, "");

  TAP_TEST(ckaa.firstMax(aAffect, gAffect) == -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(aAffect, gAffect) == -1, TEST_COUNT_AA_LAST_MAX, "");
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

  set<KAffect> forbidden;
  forbidden.insert(KAffect::getAmbiguous());
  forbidden.insert(KAffect::getUnknown());
  
  TAP_TEST(kaa.getAffectation(1) == KAffect("", seq[2*(nb_seq-1)+1], -1), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.count(kaa.getAffectation(1)) == 1, TEST_AA_GET_AFFECT, "");
  TAP_TEST(ckaa.count(kaa.getAffectation(1)) == 1, TEST_COUNT_AA_COUNT, "");
  TAP_TEST(kaa.getAffectation(0) == kaa.getAffectation(10 - k), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.getAffectation(0).isAmbiguous(), TEST_AA_PREDICATES, "");

  for (int i = 2; i < 10 - k; i++)
    TAP_TEST(kaa.getAffectation(i).isUnknown(), TEST_AA_PREDICATES, "");

  TAP_TEST(kaa.getDistinctAffectations().size() == 3, TEST_AA_GET_DISTINCT_AFFECT, "");

  TAP_TEST(ckaa.max(forbidden) == KAffect("", seq[2*(nb_seq-1)+1], -1), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));

  TAP_TEST(ckaa.max() == KAffect::getUnknown(), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max());

  delete index;
}

/**
 * A sequence and its revcomp are not affected in the same way.
 */
template<template <class> class T, template <class> class AffectA, class KAffect>
void testBugAffectAnalyser() {
  Fasta seqV("../../germline/IGHV.fa", 2);
  Fasta seqJ("../../germline/IGHJ.fa", 2);
  Fasta data("../../data/bug-revcomp.fa", 1, " ");

  T<KAffect> index(9, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");

  TAP_TEST(data.size() == 2, TEST_FASTA_SIZE, 
           "Should have 2 sequences (one seq and its revcomp), " 
           << data.size() << " instead");

  TAP_TEST(data.read(0).sequence.size() == data.read(1).sequence.size(),
           TEST_FASTA_SEQUENCE, 
           "Sequences should be of same length: sequence and its revcomp");

  AffectA<KAffect> fwdAffect(index, data.read(0).sequence);
  AffectA<KAffect> bwdAffect(index, data.read(1).sequence);

  int total = fwdAffect.count();

  TAP_TEST(fwdAffect.count() == bwdAffect.count(),
           TEST_AA_COUNT,
           "Both sequences should have the same amount of affectations. "
           << fwdAffect.count() << " for the fwd, and " << bwdAffect.count()
           << " for the bwd instead");

  for (int i = 0; i < total; i++) {
    const KAffect fwd = fwdAffect.getAffectation(i);
    const KAffect bwd = bwdAffect.getAffectation(total - 1 - i);

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
  testAffectAnalyser1<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerAffect>();
  testAffectAnalyser1<ArrayKmerStore,KmerStringAffect>();
  testAffectAnalyser2<ArrayKmerStore,KmerStringAffect>();
  testBugAffectAnalyser<ArrayKmerStore, KmerAffectAnalyser, KmerAffect>();
  testBugAffectAnalyser<ArrayKmerStore, KmerAffectAnalyser, KmerStringAffect>();
}
