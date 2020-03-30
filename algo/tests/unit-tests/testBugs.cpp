#include <core/bioreader.hpp>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>
#include <core/affectanalyser.h>
#include <core/segment.h>
#include <iostream>

using namespace std;

void testSegmentationBug1(IndexTypes index) {
  string buggy_sequences = "bugs/kmersegment.fa";
  BioReader seqV("../../germline/homo-sapiens/TRGV.fa");
  BioReader seqJ("../../germline/homo-sapiens/TRGJ.fa");

  Germline *germline ;
  germline = new Germline("custom", 'x', seqV, seqV, seqJ,
                          "#############", "#############", "#############");
  germline->new_index(index);
  germline->finish();
  
  OnlineFasta input(buggy_sequences);

  while (input.hasNext()) {
    input.next();
    KmerAffectAnalyser *kaa = new KmerAffectAnalyser(*(germline->index), input.getSequence().sequence);

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

    KmerSegmenter *segment = new KmerSegmenter(input.getSequence(), germline);

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
  testSegmentationBug1(KMER_INDEX);
  testSegmentationBug1(AC_AUTOMATON);
}
