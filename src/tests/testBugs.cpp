#include <core/fasta.h>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>
#include <core/affectanalyser.h>
#include <core/segment.h>
#include <iostream>

using namespace std;

void testSegmentationBug1(int delta_min, int delta_max) {
  string buggy_sequences = "bugs/kmersegment.fa";
  int k = 14;
  bool rc = true;
  Fasta seqV("../../germline/TRGV.fa");
  Fasta seqJ("../../germline/TRGJ.fa");

  IKmerStore<KmerAffect>  *index = new ArrayKmerStore<KmerAffect>(k, rc);
  index->insert(seqV, "V");
  index->insert(seqJ, "J");

  OnlineFasta input(buggy_sequences);

  while (input.hasNext()) {
    input.next();
    KmerAffectAnalyser<KmerAffect> *kaa = new KmerAffectAnalyser<KmerAffect>(*index, input.getSequence().sequence);

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

    int stats[STATS_SIZE];
    ofstream file("/dev/null");
    Segmenter *segment = new KmerSegmenter(input.getSequence(), index, 
                                           delta_min, delta_max, stats, VDJ, 
                                           file);

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
  delete index;
}

void testBugs() {
  testSegmentationBug1(-10, 15);
}
