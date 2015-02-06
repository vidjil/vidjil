#include "tests.h"
#include <core/kmeraffect.h>

void testAffect() {
  affect_t Vminus = {'V'}, Vplus = {'V'};
  Vplus.c |= 1 << 7;
  affect_t Jplus = {'J'};
  Jplus.c |= 1 << 7;


  TAP_TEST(affect_strand(Vminus) == -1, TEST_AFFECT_STRAND, "");
  TAP_TEST(affect_strand(Vplus) == 1, TEST_AFFECT_STRAND, "");

  TAP_TEST(affect_char(Vminus) == 'V', TEST_AFFECT_CHAR, "");
  TAP_TEST(affect_char(Vplus) == 'V', TEST_AFFECT_CHAR, "");
  TAP_TEST(affect_char(Jplus) == 'J', TEST_AFFECT_CHAR, "");

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

  TAP_TEST(toString(Vminus) == "-V", TEST_AFFECT_TO_STRING, toString(Vminus));
  TAP_TEST(toString(Vplus) == "+V", TEST_AFFECT_TO_STRING, toString(Vplus));
  TAP_TEST(toString(Jplus) == "+J", TEST_AFFECT_TO_STRING, toString(Jplus));
  TAP_TEST(toString(AFFECT_UNKNOWN.affect) == " "AFFECT_UNKNOWN_SYMBOL, TEST_AFFECT_TO_STRING, "");
  TAP_TEST(toString(AFFECT_AMBIGUOUS.affect) == " "AFFECT_AMBIGUOUS_SYMBOL, TEST_AFFECT_TO_STRING, "");

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
  affect_t Vminus = {'V'}, Vplus = {'V'};
  Vplus.c |= 1 << 7;
  affect_t Jplus = {'J'};
  Jplus.c |= 1 << 7;
  KmerAffect KAVp("V", 1);
  KmerAffect KAVm("V", -1);
  KmerAffect KAJp("J", 1);

  TAP_TEST(KAVp.affect == Vplus, TEST_KMERAFFECT_CONSTRUCTOR, "");
  TAP_TEST(KAVm.affect == Vminus, TEST_KMERAFFECT_CONSTRUCTOR, "");
  TAP_TEST(KAJp.affect == Jplus, TEST_KMERAFFECT_CONSTRUCTOR, "");

  KmerAffect copy1(KAVp, false);
  KmerAffect copy2(KAVp, true);
  TAP_TEST(copy1.getLabel() == KAVp.getLabel(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy2.getLabel() == KAVp.getLabel(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy1.getStrand() == KAVp.getStrand(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
  TAP_TEST(copy2.getStrand() == -KAVp.getStrand(), TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "");
    
  KmerAffect test = KAVp;
  TAP_TEST(test.affect == KAVp.affect, TEST_KMERAFFECT_AFFECTATION, "");
  test += KAVp;
  TAP_TEST(test.affect == KAVp.affect, TEST_KMERAFFECT_ADD, "");
  test += KAVm;
  TAP_TEST(test == AFFECT_AMBIGUOUS, TEST_KMERAFFECT_ADD, "");
  
  KmerAffect unknown;
  TAP_TEST(unknown == AFFECT_UNKNOWN, TEST_KMERAFFECT_CONSTRUCTOR, "");
  TAP_TEST(unknown.isUnknown(), TEST_KMERAFFECT_UNKNOWN, "");
  TAP_TEST(unknown.getStrand() == 0, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST(unknown.getLabel() == AFFECT_UNKNOWN_SYMBOL, TEST_KMERAFFECT_LABEL, "");
  unknown += KAVm;
  TAP_TEST(unknown.affect == KAVm, TEST_KMERAFFECT_ADD, "");
  unknown += KAJp;
  TAP_TEST(unknown == AFFECT_AMBIGUOUS, TEST_KMERAFFECT_ADD, "");
  TAP_TEST(unknown.isAmbiguous(), TEST_KMERAFFECT_AMBIGUOUS, "");
  TAP_TEST(unknown.getLabel() == AFFECT_AMBIGUOUS_SYMBOL, TEST_KMERAFFECT_LABEL, "");
  TAP_TEST(unknown.getStrand() == 0, TEST_KMERAFFECT_STRAND, "");

  TAP_TEST(KAVp.getStrand() == 1, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST(KAVm.getStrand() == -1, TEST_KMERAFFECT_STRAND, "");
  TAP_TEST(KAJp.getStrand() == 1, TEST_KMERAFFECT_STRAND, "");

  TAP_TEST(KAVp.getLabel() == "V", TEST_KMERAFFECT_LABEL, "");
  TAP_TEST(KAVm.getLabel() == "V", TEST_KMERAFFECT_LABEL, "");
  TAP_TEST(KAJp.getLabel() == "J", TEST_KMERAFFECT_LABEL, "");

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
  KmerAffect Vminus("V", -1);
  KmerAffect Vplus("V", 1);
  KmerAffect Jplus("J", 1);

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
