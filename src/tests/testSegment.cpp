
#include <fstream>
#include <iostream>
#include <string>
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"

using namespace std;

void testSegment()
{
  Fasta seqV("../../germline/IGHV.fa", 2);
  Fasta seqD("../../germline/IGHD.fa", 2);
  Fasta seqJ("../../germline/IGHJ.fa", 2);
  
  Fasta data("../../data/Stanford_S22.fasta", 1, " ");

  Sequence seq = data.read(2);
      
  //segmentation VJ
  FineSegmenter s(seq, seqV, seqJ, 0, 50, VDJ);
	
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  
  //segmentation D
  s.FineSegmentD(seqV, seqD, seqJ);
  
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VDJ)") ;

  // Revcomp sequence and tests that the results are the same.
  seq.sequence = revcomp(seq.sequence);
  FineSegmenter s2(seq, seqV, seqJ, 0, 50, VDJ);

  TAP_TEST(s2.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  //segmentation D
  s2.FineSegmentD(seqV, seqD, seqJ);
  TAP_TEST(s2.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VDJ)") ;
  
  TAP_TEST(s.getLeft() == s2.getLeft(), TEST_SEGMENT_REVCOMP, " left segmentation position");
  TAP_TEST(s.getRight() == s2.getRight(), TEST_SEGMENT_REVCOMP, " right segmentation position");
  TAP_TEST(s.getLeftD() == s2.getLeftD(), TEST_SEGMENT_REVCOMP, " left D segmentation position");
  TAP_TEST(s.getRightD() == s2.getRightD(), TEST_SEGMENT_REVCOMP, " right D segmentation position");
  TAP_TEST(s.isReverse() == !s2.isReverse(), TEST_SEGMENT_REVCOMP, " sequence reversed");
  TAP_TEST(s.info.substr(1) == s2.info.substr(1), TEST_SEGMENT_REVCOMP, " info string " << endl <<
           "s = " << s.info <<", s2 = " << s2.info);
  TAP_TEST(s.info.substr(0,1) != s2.info.substr(0,1), TEST_SEGMENT_REVCOMP, "first character (strand) of info string " << endl <<
           "s = " << s.info <<", s2 = " << s2.info);

  TAP_TEST(s.code == s2.code, TEST_SEGMENT_REVCOMP, " code string");

}

/**
 * Test segmentation when there is an overlap between V and J (and no N)
 */
void testSegmentOverlap()
{
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  Fasta data("../../data/bug-segment-overlap.fa", 1, " ");
  
  int stats[STATS_SIZE];
  int stats_length[STATS_SIZE];
  ArrayKmerStore<KmerAffect> index(10, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), &index, 0, 100, 
                     stats, stats_length, DNA, cout); // Grmph: we should not have those
                                        // parameters. All of them are useless
                                        // for our purpose!
    TAP_TEST(ks.seg_V + ks.seg_N + ks.seg_J == data.sequence(i)
             || ks.seg_V + ks.seg_N + ks.seg_J == revcomp(data.sequence(i)), 
             TEST_KMER_SEGMENT_OVERLAP,
             " V= " << ks.seg_V << ", N = " << ks.seg_N << ", J = " << ks.seg_J);

    FineSegmenter fs(data.read(i), seqV, seqJ, -50, 50, VDJ); 
    TAP_TEST(fs.seg_V + fs.seg_N + fs.seg_J == data.sequence(i)
             || fs.seg_V + fs.seg_N + fs.seg_J == revcomp(data.sequence(i)), 
             TEST_FINE_SEGMENT_OVERLAP,
             " V= " << fs.seg_V << ", N = " << fs.seg_N << ", J = " << fs.seg_J);
  }
}
