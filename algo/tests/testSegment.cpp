
#include <fstream>
#include <iostream>
#include <string>
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/windowExtractor.h"

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
           "s  = " << s.info << endl <<
	   "s2 = " << s2.info);
  TAP_TEST(s.info.substr(0,1) != s2.info.substr(0,1), TEST_SEGMENT_REVCOMP, "first character (strand) of info string " << endl <<
           "s  = " << s.info << endl <<
	   "s2 = " << s2.info);

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
  
  ArrayKmerStore<KmerAffect> index(10, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), &index, 0, 100);
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

void testSegmentationCause() {
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  Fasta data("../../data/segmentation.fasta", 1, " ");

  ArrayKmerStore<KmerAffect> index(10, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");
  int nb_checked = 0;

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), &index, 0, 10);

    if (data.read(i).label == "seq-seg+") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA", TEST_KMER_JUNCTION, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-seg-") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == SEG_MINUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA", TEST_KMER_JUNCTION, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-short") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_SHORT, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-strand") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_STRAND_NOT_CONSISTENT, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-zero") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_ZERO, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_V, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_J, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_BAD_DELTA_MIN, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-max") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_BAD_DELTA_MAX, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-seg-no-window") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(30) == "", TEST_KMER_JUNCTION, "");
      TAP_TEST(ks.getJunction(20) == "CTGGGACAGGGAATTATTAT", TEST_KMER_JUNCTION,"");
      nb_checked++;
    }
  }
  
  TAP_TEST(nb_checked == 10, TEST_KMER_DATA, "");
}

void testExtractor() {
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  OnlineFasta data("../../data/segmentation.fasta", 1, " ");

  ArrayKmerStore<KmerAffect> index(10, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");

  WindowExtractor we;
  map<string, string> labels;
  ofstream out_seg("segmented.log");
  ofstream out_unseg("unsegmented.log");
  we.setSegmentedOutput(&out_seg);
  we.setUnsegmentedOutput(&out_unseg);

  WindowsStorage *ws = we.extract(&data, &index, 30, 0, 10, labels);

  TAP_TEST(we.getNbReads() == 10, TEST_EXTRACTOR_NB_READS, "");

  TAP_TEST(we.getNbSegmented(SEG_PLUS) == 2, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(SEG_MINUS) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_SHORT) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_STRAND_NOT_CONSISTENT) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_ZERO) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_V) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_J) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_BAD_DELTA_MIN) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_BAD_DELTA_MAX) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(TOTAL_SEG_AND_WINDOW) == 2, TEST_EXTRACTOR_NB_SEGMENTED, "");

  TAP_TEST(we.getAverageSegmentationLength(SEG_PLUS) == 30, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(SEG_MINUS) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_SHORT) == 4, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_STRAND_NOT_CONSISTENT) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_ZERO) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_V) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_J) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_BAD_DELTA_MIN) == 72, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_BAD_DELTA_MAX) == 66, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW) == 24, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(TOTAL_SEG_AND_WINDOW) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");

  TAP_TEST(out_seg.tellp() > 0, TEST_EXTRACTOR_OUT_SEG, "");
  TAP_TEST(out_unseg.tellp() > 0, TEST_EXTRACTOR_OUT_UNSEG, "");

  delete ws;
}
