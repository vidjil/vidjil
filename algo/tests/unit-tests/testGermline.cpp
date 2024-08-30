
#include <fstream>
#include <iostream>
#include <string>
#include "core/germline.h"
#include "core/kmerstore.h"
#include "core/bioreader.hpp"

using namespace std;

void testGermline1(Germline *g1)
{
    
  // Test metadata
  TAP_TEST_EQUAL(g1->code, "IGH", TEST_GERMLINE, "code") ;
  TAP_TEST_EQUAL(g1->shortcut, 'G', TEST_GERMLINE, "shortcut") ;
                    
  // Test seeds
  TAP_TEST_EQUAL(g1->seed_5, "####-####", TEST_GERMLINE, "seed_5") ;
  TAP_TEST_EQUAL(g1->seed_4, "###-###", TEST_GERMLINE, "seed_4") ;  
  TAP_TEST_EQUAL(g1->seed_3, "#######", TEST_GERMLINE, "seed_3") ;
}

void testIndexLoad(Germline *g1, IndexTypes index, float expected_index_load)
{
  g1->new_index(index);
  g1->finish();
  
  size_t seed_5_span = g1->seed_5.size();
  float index_load_5 = g1->index->getIndexLoad(KmerAffect(g1->affect_5, 1, seed_5_span));
  
  TAP_TEST_APPROX(index_load_5, expected_index_load, 0.02, TEST_GERMLINE, "seed_5, index_load") ;
}

void testGermline() {
  BioReader seqV("../../germline/homo-sapiens/IGHV.fa", 2);
  BioReader seqD("../../germline/homo-sapiens/IGHD.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/IGHJ.fa", 2);

  Germline *g1 ;
  g1 = new Germline("IGH", 'G', {{"5", {"../../germline/homo-sapiens/IGHV.fa"}},
                                 {"4", {"../../germline/homo-sapiens/IGHD.fa"}},
                                 {"3", {"../../germline/homo-sapiens/IGHJ.fa"}}},
    {"5", {"seed", "12s", "code", "V", "build", "0"},
     "4", {"seed", "10s", "code", "D", "build", "0"},
     "3", {"seed", "8s", "code", "J", "build", "0"}});

  TAP_TEST_EQUAL(g1->code, "IGH", TEST_GERMLINE, "");
  // testGermline1(g1);
  // testIndexLoad(g1, KMER_INDEX, 0.24);
  // delete g1->index;
  // // TODO: Tests to really check the index load (with toy examples)
  // testIndexLoad(g1, AC_AUTOMATON, 0.33);
  
  delete g1;
}
