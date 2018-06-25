#include "tests.h"
#include <core/kmeraffect.h>

void testAffect() {
  affect_t Vminus = {'V', 1}, Vplus = {'V', 2};
  Vplus.c |= 1 << 7;
  affect_t Jplus = {'J', 3};
  Jplus.c |= 1 << 7;


  TAP_TEST_EQUAL(affect_strand(Vminus), -1, TEST_AFFECT_STRAND, "");
  TAP_TEST_EQUAL(affect_strand(Vplus), 1, TEST_AFFECT_STRAND, "");

  TAP_TEST_EQUAL(affect_length(Vminus), 1, TEST_AFFECT_LENGTH, "");
  TAP_TEST_EQUAL(affect_length(Vplus), 2, TEST_AFFECT_LENGTH, "");
  TAP_TEST_EQUAL(affect_length(Jplus), 3, TEST_AFFECT_LENGTH, "");

  TAP_TEST_EQUAL(affect_char(Vminus), 'V', TEST_AFFECT_CHAR, "");
  TAP_TEST_EQUAL(affect_char(Vplus), 'V', TEST_AFFECT_CHAR, "");
  TAP_TEST_EQUAL(affect_char(Jplus), 'J', TEST_AFFECT_CHAR, "");

  TAP_TEST(! (Vminus == Vplus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus != Vplus, TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus < Vplus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus > Vplus, TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus <= Vplus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus >= Vplus, TEST_AFFECT_COMPARISON, "");

  TAP_TEST(! (Vminus == Jplus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus != Jplus, TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus <= Jplus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus >= Jplus, TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus < Jplus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus > Jplus, TEST_AFFECT_COMPARISON, "");

  TAP_TEST(Vminus == Vminus, TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus != Vminus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus < Vminus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus > Vminus), TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus <= Vminus, TEST_AFFECT_COMPARISON, "");
  TAP_TEST(Vminus >= Vminus, TEST_AFFECT_COMPARISON, "");

  affect_t Vminus_nolength = {'V', (unsigned char) ~0};
  TAP_TEST(Vminus == Vminus_nolength, TEST_AFFECT_COMPARISON, "");
  Vminus_nolength.length = 1;
  TAP_TEST(Vminus == Vminus_nolength, TEST_AFFECT_COMPARISON, "");
  Vminus_nolength.length = 2;
  TAP_TEST(Vminus != Vminus_nolength, TEST_AFFECT_COMPARISON, "");

  affect_t unknown = {AFFECT_UNKNOWN_CHAR, 1};
  affect_t unknown2 = {AFFECT_UNKNOWN_CHAR, 2};
  TAP_TEST(unknown == unknown2, TEST_AFFECT_COMPARISON, "");
  affect_t ambiguous = {AFFECT_AMBIGUOUS_CHAR, 1};
  affect_t ambiguous2 = {AFFECT_AMBIGUOUS_CHAR, 2};
  TAP_TEST(ambiguous == ambiguous2, TEST_AFFECT_COMPARISON, "");

  TAP_TEST_EQUAL(toString(Vminus), "-V", TEST_AFFECT_TO_STRING, toString(Vminus));
  TAP_TEST_EQUAL(toString(Vplus), "+V", TEST_AFFECT_TO_STRING, toString(Vplus));
  TAP_TEST_EQUAL(toString(Jplus), "+J", TEST_AFFECT_TO_STRING, toString(Jplus));
  TAP_TEST_EQUAL(toString(AFFECT_UNKNOWN.affect), " " "_", TEST_AFFECT_TO_STRING, "");
  TAP_TEST_EQUAL(toString(AFFECT_AMBIGUOUS.affect), " " "?", TEST_AFFECT_TO_STRING, "");

  ostringstream oss;
  oss << Vminus;
  TAP_TEST(toString(Vminus) == oss.str(), TEST_AFFECT_OUT, "");
  ostringstream oss2;
  oss2 << Vplus;
  TAP_TEST(toString(Vplus) == oss2.str(), TEST_AFFECT_OUT, "");
  ostringstream oss3;
  oss3 << Jplus;
  TAP_TEST(toString(Jplus) == oss3.str(), TEST_AFFECT_OUT, "");
}

void testKmerAffectClass() {
  affect_t Vminus = {'V', 4}, Vplus = {'V', 4};
  Vplus.c |= 1 << 7;
  affect_t Jplus = {'J', 4};
  Jplus.c |= 1 << 7;
  KmerAffect KAVp("V", 1, 4);
  KmerAffect KAVm("V", -1, 4);
  KmerAffect KAJp("J", 1, 4);

  TAP_TEST_EQUAL(KAVp.affect, Vplus, TEST_KMERAFFECT_CONSTRUCTOR, "");
  TAP_TEST_EQUAL(KAVm.affect, Vminus, TEST_KMERAFFECT_CONSTRUCTOR, "");
  TAP_TEST_EQUAL(KAJp.affect, Jplus, TEST_KMERAFFECT_CONSTRUCTOR, "");

  KmerAffect copy1(KAVp, false);
  KmerAffect copy2(KAVp, true);
  TAP_TEST(copy1.getLabel() == KAVp.getLabel(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy2.getLabel() == KAVp.getLabel(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy1.getStrand() == KAVp.getStrand(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy2.getStrand() == -KAVp.getStrand(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy1.getLength() == KAVp.getLength(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy2.getLength() == KAVp.getLength(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
    
  KmerAffect test = KAVp;
  TAP_TEST(test.affect == KAVp.affect, TEST_KMERAFFECT_AFFECTATION, "");
  test += KAVp;
  TAP_TEST(test.affect == KAVp.affect, TEST_KMERAFFECT_ADD, "");
  test += KAVm;
  TAP_TEST(test == AFFECT_AMBIGUOUS, TEST_KMERAFFECT_ADD, "");
  
  KmerAffect unknown;
  TAP_TEST(unknown == AFFECT_UNKNOWN, TEST_KMERAFFECT_CONSTRUCTOR, "");
  TAP_TEST(unknown.isUnknown(), TEST_KMERAFFECT_UNKNOWN, "");
  TAP_TEST_EQUAL(unknown.getStrand(), 0, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST_EQUAL(unknown.getLabel(), "_", TEST_KMERAFFECT_LABEL, "");
  unknown += KAVm;
  TAP_TEST(unknown.affect == KAVm, TEST_KMERAFFECT_ADD, "");
  unknown += KAJp;
  TAP_TEST(unknown == AFFECT_AMBIGUOUS, TEST_KMERAFFECT_ADD, "");
  TAP_TEST(unknown.isAmbiguous(), TEST_KMERAFFECT_AMBIGUOUS, "");
  TAP_TEST_EQUAL(unknown.getLabel(), "?", TEST_KMERAFFECT_LABEL, "");
  TAP_TEST_EQUAL(unknown.getStrand(), 0, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST_EQUAL(unknown.getLength(), 4, TEST_KMERAFFECT_AMBIGUOUS, "");

  TAP_TEST_EQUAL(KAVp.getStrand(), 1, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST_EQUAL(KAVm.getStrand(), -1, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST_EQUAL(KAJp.getStrand(), 1, TEST_KMERAFFECT_STRAND, "");

  TAP_TEST_EQUAL(KAVp.getLabel(), "V", TEST_KMERAFFECT_LABEL, "");
  TAP_TEST_EQUAL(KAVm.getLabel(), "V", TEST_KMERAFFECT_LABEL, "");
  TAP_TEST_EQUAL(KAJp.getLabel(), "J", TEST_KMERAFFECT_LABEL, "");

  ostringstream ossKA, ossA;
  ossKA << KAVp;
  ossA << Vplus;
  TAP_TEST(ossA.str() == ossKA.str(), TEST_KMERAFFECT_OUT, "");

  ossKA << KAVm;
  ossA << Vminus;
  TAP_TEST(ossA.str() == ossKA.str(), TEST_KMERAFFECT_OUT, "");

  ossKA << KAJp;
  ossA << Jplus;
  TAP_TEST(ossA.str() == ossKA.str(), TEST_KMERAFFECT_OUT, "");
}


void testKmerAffectComparison() {
  KmerAffect Vminus("V", -1, 4);
  KmerAffect Vplus("V", 1, 4);
  KmerAffect Jplus("J", 1, 4);

  TAP_TEST(! (Vminus == Vplus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus != Vplus, TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus < Vplus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus > Vplus, TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus <= Vplus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus >= Vplus, TEST_KMERAFFECT_COMPARISON, "");

  TAP_TEST(! (Vminus == Jplus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus != Jplus, TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus <= Jplus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus >= Jplus, TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus < Jplus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus > Jplus, TEST_KMERAFFECT_COMPARISON, "");

  TAP_TEST(Vminus == Vminus, TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus != Vminus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus < Vminus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(! (Vminus > Vminus), TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus <= Vminus, TEST_KMERAFFECT_COMPARISON, "");
  TAP_TEST(Vminus >= Vminus, TEST_KMERAFFECT_COMPARISON, "");
}

void testKmerAffect() {
  testAffect();
  testKmerAffectClass();
  testKmerAffectComparison();
}
