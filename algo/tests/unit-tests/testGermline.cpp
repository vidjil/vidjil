
#include <fstream>
#include <iostream>
#include <string>
#include "core/germline.hpp"
#include "core/kmerstore.h"
#include "core/bioreader.hpp"
#include "core/kmeraffect.h"
#include "core/kmerstorefactory.hpp"

using namespace std;

void testGermline1(Germline<KmerAffect> *g1)
{

  // Test metadata
  TAP_TEST_EQUAL(g1->getCode(), "IGH", TEST_GERMLINE, "code") ;
  TAP_TEST_EQUAL(g1->getShortcut(), 'G', TEST_GERMLINE, "shortcut") ;

  // Test seeds
  TAP_TEST_EQUAL(g1->getSeed("5"), "####-####", TEST_GERMLINE, "seed_5") ;
  TAP_TEST_EQUAL(g1->getSeed("4"), "###-###", TEST_GERMLINE, "seed_4") ;
  TAP_TEST_EQUAL(g1->getSeed("3"), "#######", TEST_GERMLINE, "seed_3") ;
}

void testIndexLoad(Germline<KmerAffect> *g1, IndexTypes index, float expected_index_load)
{
  size_t seed_5_span = g1->getSeed("5").size();
  g1->addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, g1->getSeed("5"), true));
  g1->finish();
  GermlineElement<KmerAffect> *elem = *(g1->getGermlineElements("5").begin());
  float index_load_5 = g1->getIndex()->getIndexLoad(KmerAffect(elem->getAffect(), 1, seed_5_span));

  // 15046 k-mers espacés ####-#### d'après kmc → 60184. In practice 78k…
  // 262144 k-mers de longueur 9
  TAP_TEST_APPROX(index_load_5, expected_index_load, 0.02, TEST_GERMLINE, "seed_5, index_load") ;
}

void testGermline() {
  BioReader seqV("../../germline/homo-sapiens/IGHV.fa", 2);
  BioReader seqD("../../germline/homo-sapiens/IGHD.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/IGHJ.fa", 2);

  Germline<KmerAffect> *g1 ;
  json json_config = {{"order", {"5", "3"}},
                      {"segments", {{"5", {{"seed", "8s"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                                    {"4", {{"seed", "6s"}, {"code", "D"}, {"build", "0"}, {"index", "0"}}},
                                    {"3", {{"seed", "7c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  g1 = new Germline<KmerAffect>("IGH", 'G', "../../germline/homo-sapiens/",
                                {{{"5", {"IGHV.fa"}},
                                 {"4", {"IGHD.fa"}},
                                 {"3", {"IGHJ.fa"}}}},
                                json_config);

  testGermline1(g1);
  testIndexLoad(g1, KMER_INDEX, 0.40);
  delete g1->getIndex();
  g1->unsetIndex();
  testIndexLoad(g1, AC_AUTOMATON, 0.30);
  delete g1->getIndex();
  g1->unsetIndex();
  delete g1;
}
