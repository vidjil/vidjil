
#include <fstream>
#include <iostream>
#include <string>
#include "core/germline.h"
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/windowExtractor.h"

using namespace std;

void testFineSegment()
{
  Fasta seqV("../../germline/IGHV.fa", 2);
  Fasta seqD("../../germline/IGHD.fa", 2);
  Fasta seqJ("../../germline/IGHJ.fa", 2);
  
  Fasta data("../../data/Stanford_S22.fasta", 1, " ");

  Germline *germline ;
  germline = new Germline("IGH", 'G', seqV, seqD, seqJ, "####", 0, 50);

  Sequence seq = data.read(2);
      
  //segmentation VJ
  FineSegmenter s(seq, germline, VDJ);
	
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  
  //segmentation D
  s.FineSegmentD(germline);
  
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VDJ)") ;

  // Revcomp sequence and tests that the results are the same.
  seq.sequence = revcomp(seq.sequence);
  FineSegmenter s2(seq, germline, VDJ);

  TAP_TEST(s2.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  //segmentation D
  s2.FineSegmentD(germline);
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
  delete germline;
}

/**
 * Test segmentation when there is an overlap between V and J (and no N)
 */
void testSegmentOverlap()
{
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  Fasta data("../../data/bug-segment-overlap.fa", 1, " ");
  
  Germline *germline1 ;
  germline1 = new Germline("TRG", 'G', seqV, seqV, seqJ, "##########", -50, 50);
  Germline *germline2 ;
  germline2 = new Germline("TRG2", 'G', seqV, seqV, seqJ, "##########", -50, 50);

  MultiGermline *multi1 ;
  multi1 = new MultiGermline();
  multi1->insert(germline1);

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), multi1);
    TAP_TEST(ks.seg_V + ks.seg_N + ks.seg_J == data.sequence(i)
             || ks.seg_V + ks.seg_N + ks.seg_J == revcomp(data.sequence(i)), 
             TEST_KMER_SEGMENT_OVERLAP,
             " V= " << ks.seg_V << ", N = " << ks.seg_N << ", J = " << ks.seg_J);

    FineSegmenter fs(data.read(i), germline2, VDJ); 
    TAP_TEST(fs.seg_V + fs.seg_N + fs.seg_J == data.sequence(i)
             || fs.seg_V + fs.seg_N + fs.seg_J == revcomp(data.sequence(i)), 
             TEST_FINE_SEGMENT_OVERLAP,
             " V= " << fs.seg_V << ", N = " << fs.seg_N << ", J = " << fs.seg_J);
  }

  delete multi1;
  delete germline2;
}

void testSegmentationCause() {
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  Fasta data("../../data/segmentation.fasta", 1, " ");

  Germline *germline ;
  germline = new Germline("TRG", 'G', seqV, seqV, seqJ, "##########", 0, 10);

  MultiGermline *multi ;
  multi = new MultiGermline();
  multi->insert(germline);

  int nb_checked = 0;

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), multi);

    if (data.read(i).label == "seq-seg+") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "seq is " << data.label(i));
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, "");
      TAP_TEST(ks.getLeft() == 17, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST(ks.getRight() == 18, TEST_KMER_RIGHT, "right = " << ks.getRight());
      nb_checked++;
    } else if (data.read(i).label == "seq-seg-") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == SEG_MINUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, "");
      TAP_TEST(ks.getLeft() == 17, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST(ks.getRight() == 18, TEST_KMER_RIGHT, "right = " << ks.getRight());
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
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ: " << ks.getKmerAffectAnalyser()->toString());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_J, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min-old") {
      // This test was a test for delta_min but with the CountKmerAffectAnalyser
      // the read is segmented, now. So we keep it, but change the test
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "delta-min: " << ks.getKmerAffectAnalyser()->toString());
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, "junction: " << ks.getJunction(30));
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "delta-min: " << ks.getKmerAffectAnalyser()->toString());
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getJunction(21) == "GGCAGTTGGAACAACACTTGT",
               TEST_KMER_JUNCTION, "window: " << ks.getJunction(21));
      TAP_TEST(ks.getLeft() == 9, TEST_KMER_LEFT, "left = " << ks.getLeft() << ", aa = " << ks.getKmerAffectAnalyser()->toString());
      TAP_TEST(ks.getRight() == 19, TEST_KMER_RIGHT, "right = " << ks.getRight());
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-max") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_BAD_DELTA_MAX, TEST_KMER_SEGMENTATION_CAUSE, "");
      nb_checked++;
    } else if (data.read(i).label == "seq-seg-no-window") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, "");
      TAP_TEST(ks.getLeft() == 11, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST(ks.getRight() == 12, TEST_KMER_RIGHT, "right = " << ks.getRight());
      TAP_TEST(ks.getJunction(30) == "", TEST_KMER_JUNCTION, "");
      TAP_TEST(ks.getJunction(20) == "CTGGGACAGGGAATTATTAT"
               || ks.getJunction(20) == "CCTGGGACAGGGAATTATTA", TEST_KMER_JUNCTION,"window: " << ks.getJunction(20));
      nb_checked++;
    }
  }
  
  TAP_TEST(nb_checked == 11, TEST_KMER_DATA, "");

  delete multi;
}

void testExtractor() {
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  OnlineFasta data("../../data/segmentation.fasta", 1, " ");

  Germline *germline ;
  germline = new Germline("TRG", 'G', seqV, seqV, seqJ, "##########", 0, 10);
  
  MultiGermline *multi ;
  multi = new MultiGermline();
  multi->insert(germline);

  WindowExtractor we;
  map<string, string> labels;
  ofstream out_seg("segmented.log");
  ofstream out_unseg("unsegmented.log");
  we.setSegmentedOutput(&out_seg);
  we.setUnsegmentedOutput(&out_unseg);

  WindowsStorage *ws = we.extract(&data, multi, 30, labels);

  TAP_TEST(we.getNbReads() == 11, TEST_EXTRACTOR_NB_READS, "");

  TAP_TEST(we.getNbSegmented(SEG_PLUS) == 4, TEST_EXTRACTOR_NB_SEGMENTED, "segPlus: " << we.getNbSegmented(SEG_PLUS));
  TAP_TEST(we.getNbSegmented(SEG_MINUS) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_SHORT) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_STRAND_NOT_CONSISTENT) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_ZERO) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_V) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_J) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_BAD_DELTA_MIN) == 0, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_BAD_DELTA_MAX) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW) == 2, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(TOTAL_SEG_AND_WINDOW) == 3, TEST_EXTRACTOR_NB_SEGMENTED, "");

  TAP_TEST(we.getAverageSegmentationLength(SEG_PLUS) == 41.25, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(SEG_PLUS));
  TAP_TEST(we.getAverageSegmentationLength(SEG_MINUS) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_SHORT) == 4, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_STRAND_NOT_CONSISTENT) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_ZERO) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_V) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_J) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_BAD_DELTA_MAX) == 66, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW) == 28.5, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(TOTAL_SEG_AND_WINDOW) == 48, TEST_EXTRACTOR_AVG_LENGTH, "");

  TAP_TEST(out_seg.tellp() > 0, TEST_EXTRACTOR_OUT_SEG, "");
  TAP_TEST(out_unseg.tellp() > 0, TEST_EXTRACTOR_OUT_UNSEG, "");

  delete ws;
  delete multi;
}

void testSegment() {
  testFineSegment();
  testSegmentOverlap();
  testSegmentationCause();
  testExtractor();
}
