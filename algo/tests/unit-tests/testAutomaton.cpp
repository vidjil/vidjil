#include "tests.h"
#include <core/automaton.hpp>
#include <core/kmeraffect.h>

void testSimpleInsertACAutomaton() {
  PointerACAutomaton<Kmer> aho;

  Kmer count_acag = Kmer("ACAG");
  count_acag.count = 5;
  Kmer count_caga = Kmer("CAGA");
  count_caga.count = 2;
  Kmer count_caca = Kmer("CACA");
  count_caca.count = 3;
  Kmer count_gca = Kmer("GCA");
  count_gca.count = 1;

  aho.insert("ACAG", count_acag);
  aho.insert("CAGA", count_caga);
  aho.insert("CACA", count_caca);
  aho.insert("GCA", count_gca);

  aho.build_failure_functions();

  pointer_state<Kmer> *state_ac = aho.goto_state("ac");
  pointer_state<Kmer> *state_aca = aho.goto_state("aca");
  pointer_state<Kmer> *state_c = aho.goto_state("c");
  pointer_state<Kmer> *state_g = aho.goto_state("g");
  pointer_state<Kmer> *state_cag = aho.goto_state("cag");

  TAP_TEST(aho.getInitialState()->transitions[T] == aho.getInitialState()
           && aho.getInitialState()->transitions[N] == aho.getInitialState(),
           TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_ac->transitions[A] == state_aca, TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_ac->transitions[C] == state_c, TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_aca->transitions[A] == state_g->transitions[A], TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_c->transitions[C] == state_c, TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_g->transitions[G] == state_g, TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_g->transitions[C]->transitions[C] == state_c, TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_cag->transitions[G] == state_g, TEST_AC_TRANSITIONS, "");
  TAP_TEST(state_cag->transitions[A]->is_final, TEST_AC_FINAL, "");

  string caga = "caga";
  string caca = "caca";
  string acag = "acag";
  TAP_TEST(aho.get(caga).count == 2, TEST_AC_GET, "");
  TAP_TEST(aho.get(caca).count == 3, TEST_AC_GET, "");
  TAP_TEST(aho.get(acag).count == 5, TEST_AC_GET, "");
}

void testRCInsertAcAutomaton() {
  PointerACAutomaton<KmerAffect> aho(true);

  aho.insert("ACAGTC", "V", true, 0, "##-##");
  aho.build_failure_functions();
  // Will insert AC-GT → ACAGT, ACCGT, ACGGT, ACTGT
  //         and CA-TC → CAATC, CACTC, CAGTC, CATTC
  // plus the revcomps:
  // Will insert GA-TG → GAATG, GACTG, GAGTG, GATTG

  //         and AC-GT → ACAGT, ACCGT, ACGGT, ACTGT

  pointer_state<KmerAffect> *state = aho.goto_state("ACCGT");

  TAP_TEST(state->informations.size() == 1, TEST_AC_GET, "");
  TAP_TEST(state->informations.front() == AFFECT_AMBIGUOUS, TEST_AC_GET, "");
  TAP_TEST(state->is_final, TEST_AC_FINAL, "");

  TAP_TEST(! aho.goto_state("CAAT")->is_final, TEST_AC_FINAL, "");
  TAP_TEST(aho.goto_state("CAAT")->informations.size() == 1, TEST_AC_GET, "");
  TAP_TEST(aho.goto_state("CAAT")->informations.front() == AFFECT_UNKNOWN, TEST_AC_GET, "");

  TAP_TEST(aho.goto_state("GAGTG")->informations.front() == AFFECT_V_BWD, TEST_AC_GET, "");
  TAP_TEST(aho.goto_state("GAGTG")->is_final, TEST_AC_FINAL, "");

  TAP_TEST(aho.goto_state("GAGTG")->transitions[A] == aho.goto_state("GA"), TEST_AC_TRANSITIONS, "");

  vector<KmerAffect> results = aho.getResults("ACCGTgaatgCATTCA");
  vector<KmerAffect> expected = {AFFECT_AMBIGUOUS,
                                 AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                                 AFFECT_UNKNOWN, AFFECT_V_BWD, AFFECT_UNKNOWN,
                                 AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                                 AFFECT_V, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                                 AFFECT_UNKNOWN };

  TAP_TEST(results.size() == expected.size(), TEST_AC_GET_RESULTS, "");
  TAP_TEST_EQUAL(results, expected, TEST_AC_GET_RESULTS, "");
}


void testAutomaton() {
  testSimpleInsertACAutomaton();
  testRCInsertAcAutomaton();
}
