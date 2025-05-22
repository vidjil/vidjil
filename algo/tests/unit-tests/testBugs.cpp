#include <core/bioreader.hpp>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>
#include <core/affectanalyser.hpp>
#include <core/segment.hpp>
#include <iostream>

using namespace std;

void testSegmentationBug1(IndexTypes index) {
  string buggy_sequences = "bugs/kmersegment.fa";
  BioReader seqV("../../germline/homo-sapiens/TRGV.fa");
  BioReader seqJ("../../germline/homo-sapiens/TRGJ.fa");

  Germline<KmerAffect> *germline ;
  json jconfig = {{"order", {"5", "3"}},
    {"segments", {{"5", {{"seed", "13c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                  {"4", {{"seed", "13c"}, {"code", "D"}, {"build", "0"}, {"index", "0"}}},
                  {"3", {{"seed", "13c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  MultiGermline<KmerAffect> multig;
  germline = new Germline<KmerAffect>("custom", 'x', "../../germline/homo-sapiens/",
                                      {{{"5", {"TRGV.fa"}},
                                        {"4", {"TRGV.fa"}},
                                        {"3", {"TRGJ.fa"}}}},
                                      jconfig);
  multig.addGermline(germline);
  multig.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline->getSeed("5"), true));
  
  OnlineFasta input(buggy_sequences);

  while (input.hasNext()) {
    input.next();
    KmerAffectAnalyser *kaa = new KmerAffectAnalyser(*(germline->getIndex()), input.getSequence().sequence);

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

    KmerSegmenter<KmerAffect> *segment = new KmerSegmenter<KmerAffect>(input.getSequence(),
                                                                       germline->getIndex(),
                                                                       SEG_METHOD_MAX12,
                                                                       false,
                                                                       &multig);

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
  delete germline;
}

void testBugs() {
  //  testSegmentationBug1(KMER_INDEX);
  testSegmentationBug1(AC_AUTOMATON);
}
