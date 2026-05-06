
#include <fstream>
#include <iostream>
#include <string>
#include "core/germline.hpp"
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/bioreader.hpp"
#include "core/segment.hpp"
#include "core/output.h"
#include "core/windowExtractor.h"
#include "core/locations_to_mark.h"
#include "lib/json.hpp"

using namespace std;

void testOverlap()
{
  AlignBox<KmerAffect> *box_A = new AlignBox<KmerAffect>() ;
  AlignBox<KmerAffect> *box_C = new AlignBox<KmerAffect>() ;

  box_A->ref = "AAAAAAAAAA";
  box_C->ref = "TCCCCCCCCC";

  // here box_A.ref and box_C.ref do not actullay overlap, but the goal is to find the good split point
  string seq = "AAAAAAACCACCCCCC";
  // positions -->    6..9

  box_A->end = 9;
  box_C->ref = 6;  // this value is not really meaningful here, but allows anyway to test the function

  check_and_resolve_overlap(seq, 0, seq.length(),
                            box_A, box_C, VDJ);

  TAP_TEST_EQUAL(box_A->del_right, 3, TEST_FINE_SEGMENT_OVERLAP, "number of trim nucleotides : " << box_A);
  TAP_TEST_EQUAL(box_C->del_left, 1, TEST_FINE_SEGMENT_OVERLAP, "number of trim nucleotides : " << box_C);

  TAP_TEST_EQUAL(box_A->end, 6, TEST_FINE_SEGMENT_OVERLAP, "end position of left region : " << box_A);
  TAP_TEST_EQUAL(box_A->getLength(), 7, TEST_FINE_SEGMENT_OVERLAP, "length of left region : " << box_A->getLength());
  TAP_TEST_EQUAL(box_C->start, 7,  TEST_FINE_SEGMENT_OVERLAP, "start position of right region : " << box_C);

  delete box_A;
  delete box_C;
}

void testFineSegment(IndexTypes index)
{
  BioReader seqV("../../germline/homo-sapiens/IGHV.fa", 2);
  BioReader seqD("../../germline/homo-sapiens/IGHD.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/IGHJ.fa", 2);
  
  OnlineFasta data("data/Stanford_S22.fasta", 1, " ");
  data.next();
  data.next();

  Germline<KmerAffect> *germline ;
  json jconfig = {{"order", {"5", "3"}},
    {"segments", {{"5", {{"seed", "8c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                  {"4", {{"seed", "8c"}, {"code", "D"}, {"build", "0"}, {"index", "0"}}},
                  {"3", {{"seed", "8c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  germline = new Germline<KmerAffect>("IGH", 'G', "../../germline/homo-sapiens/",
                                      {{{"5", {"IGHV.fa"}},
                                        {"4", {"IGHD.fa"}},
                                        {"3", {"IGHJ.fa"}}}},
                                      jconfig);
  MultiGermline<KmerAffect> mg;
  mg.addGermline(germline);
  mg.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline->getSeed("5"), true));

  Sequence seq = data.getSequence();
      
  //segmentation VJ
  FineSegmenter<KmerAffect> s(seq, germline, VDJ);
	
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  
  //segmentation D
  s.FineSegmentD(germline, false);
  
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VDJ)") ;

  // Revcomp sequence and tests that the results are the same.
  seq.sequence = revcomp(seq.sequence);
  FineSegmenter<KmerAffect> s2(seq, germline, VDJ);

  TAP_TEST(s2.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  //segmentation D
  s2.FineSegmentD(germline, false);
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
void testSegmentOverlap(IndexTypes index)
{
  BioReader seqV("../../germline/homo-sapiens/TRGV.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/TRGJ.fa", 2);
  
  BioReader data("data/bug-segment-overlap.fa", 1, " ");

  json jconfig = {{"order", {"5", "3"}},
    {"segments", {{"5", {{"seed", "10c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                  {"3", {{"seed", "10c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};

  Germline<KmerAffect> *germline1 ;
  germline1 = new Germline<KmerAffect>("TRG", 'G', "../../germline/homo-sapiens/",
                           {{{"5", {"TRGV.fa"}}, {"3", {"TRGJ.fa"}}}},
                           jconfig);

  Germline<KmerAffect> *germline2 ;
  germline2 = new Germline<KmerAffect>("TRG2", 'G', "../../germline/homo-sapiens/",
                           {{{"5", {"TRGV.fa"}}, {"3", {"TRGJ.fa"}}}},
                           jconfig);

  germline1->finish();
  germline2->finish();

  MultiGermline<KmerAffect> mg;
  mg.addGermline(germline1);
  mg.addGermline(germline2);
  mg.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline1->getSeed("5"), true));


  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter<KmerAffect> ks(data.read(i), germline1->getIndex(),
                                    SEG_METHOD_MAX12, false, &mg, germline1);

    TAP_TEST(ks.seg_V + ks.seg_N + ks.seg_J == data.sequence(i)
             || ks.seg_V + ks.seg_N + ks.seg_J == revcomp(data.sequence(i)), 
             TEST_KMER_SEGMENT_OVERLAP,
             " V= " << ks.seg_V << ", N = " << ks.seg_N << ", J = " << ks.seg_J);

    FineSegmenter<KmerAffect> fs(data.read(i), germline2, VDJ);
    TAP_TEST(fs.seg_V + fs.seg_N + fs.seg_J == data.sequence(i)
             || fs.seg_V + fs.seg_N + fs.seg_J == revcomp(data.sequence(i)), 
             TEST_FINE_SEGMENT_OVERLAP,
             " V= " << fs.seg_V << ", N = " << fs.seg_N << ", J = " << fs.seg_J);
  }

  delete germline1;
  delete germline2;
}

void testSegmentationCause(IndexTypes index) {
  BioReader seqV("../../germline/homo-sapiens/TRGV.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/TRGJ.fa", 2);
  
  BioReader data("data/segmentation.fasta", 1, " ");

  json jconfig = {{"order", {"5", "3"}},
    {"segments", {{"5", {{"seed", "10c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                  {"3", {{"seed", "10c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};

  Germline<KmerAffect> *germline ;
  germline = new Germline<KmerAffect>("TRG", 'G', "../../germline/homo-sapiens/",
                           {{{"5", {"TRGV.fa"}}, {"3", {"TRGJ.fa"}}}},
                           jconfig);

  MultiGermline<KmerAffect> mg;
  mg.addGermline(germline);
  mg.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline->getSeed("5"), true));

  int nb_checked = 0;

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter<KmerAffect> ks(data.read(i), germline->getIndex(),
                                 SEG_METHOD_MAX12, false, &mg, germline, nullptr, 0.01);
    
    if (data.read(i).label == "seq-seg+") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "seq is " << data.label(i));
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getLeft(), 17, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST_EQUAL(ks.getRight(), 18, TEST_KMER_RIGHT, "right = " << ks.getRight());
      TAP_TEST_EQUAL(ks.getMidLength(), 0, TEST_KMER_RIGHT, "mid length = " << ks.getMidLength());

      ks.setSegmentationStatus(NOT_PROCESSED);
      TAP_TEST(! ks.isSegmented(), TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), NOT_PROCESSED, TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      ks.setSegmentationStatus(SEG_PLUS);
      TAP_TEST(ks.isSegmented(), TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus(), TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-seg-") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), SEG_MINUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getLeft(), 17, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST_EQUAL(ks.getRight(), 18, TEST_KMER_RIGHT, "right = " << ks.getRight());
      nb_checked++;
    } else if (data.read(i).label == "seq-short") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_TOO_SHORT, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-strand") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_STRAND_NOT_CONSISTENT, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-zero") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_TOO_FEW_ZERO, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewV: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_V, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV-rc") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewV-rc: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ-rc") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ-rc: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_V, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV2") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewV2: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ2") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ2: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_V, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-ambiguous-VJVJ") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "ambiguous-VJVJ: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_AMBIGUOUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min") {
      // This test was a test for delta_min but the read is now reported as UNSEG_ONLY_J,
      // as they are, at the left of the segmentation point, much not enough Vs
      // We keep the test, but change it.
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "delta-min: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), UNSEG_ONLY_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min-padded") {
      // This one has enough k-mers to be segmented
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "delta-min: " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(21) == "GGCAGTTGGAACAACACTTGT",
               TEST_KMER_JUNCTION, "window: " << ks.getJunction(21));

      TAP_TEST(ks.getJunction(21, -5) == "ACTTGGGCAGTTGGAACAACA",
               TEST_KMER_JUNCTION, "window (-7): " << ks.getJunction(21, -7));
      TAP_TEST(ks.getJunction(21, 9) == "AACAACACTTGTTGTCACAGG",
               TEST_KMER_JUNCTION, "window (+9): " << ks.getJunction(21, 9));
      TAP_TEST(ks.getJunction(21, 140) == "",
               TEST_KMER_JUNCTION, "window (+140): " << ks.getJunction(21, 9));

      TAP_TEST(ks.getJunction(NO_LIMIT_VALUE) == "TCTTCCAACTTGGAAGGGAGAACGAAGTCAGTCACCAGGCTGACTGGGTCATCTGCTGAACTTGGGCAGTTGGAACAACACTTGTTGTCACAGGAATTATTATAAGAAACTCTTTGGCAGTGGAACAACACTGGTTGTCAC",
               TEST_KMER_JUNCTION, "window: " << ks.getJunction(NO_LIMIT_VALUE));
      TAP_TEST_EQUAL(ks.getLeft(), 69, TEST_KMER_LEFT, "left = " << ks.getLeft() << ", " << ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getRight(), 79, TEST_KMER_RIGHT, "right = " << ks.getRight() << ", " << ks.getInfoLineWithAffects());
    } else if (data.read(i).label == "seq-seg-no-window") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getSegmentationStatus(), SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST_EQUAL(ks.getLeft(), 9, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST_EQUAL(ks.getRight(), 10, TEST_KMER_RIGHT, "right = " << ks.getRight());
      TAP_TEST_EQUAL(ks.getJunction(30), "", TEST_KMER_JUNCTION, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(15) == "GGACAGGGAATTATT"
               || ks.getJunction(15) == "GGGACAGGGAATTAT", TEST_KMER_JUNCTION,"window: " << ks.getJunction(15));
      nb_checked++;
    }
  }
  
  TAP_TEST_EQUAL(nb_checked, 14, TEST_KMER_DATA, "");

  delete germline;
}

void testBug2224(IndexTypes index) {
  BioReader seqV("../../germline/homo-sapiens/TRGV.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/TRGJ.fa", 2);

  BioReader data(true, "virtual");
  Sequence s = {">label", ">label", "ATTATATA", "", {}};
  data.add(s);

  json jconfig = {{"order", {"5", "3"}},
    {"segments", {{"5", {{"seed", "11c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                  {"3", {{"seed", "11c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};

  Germline<KmerAffect> *germline ;
  germline = new Germline<KmerAffect>("TRG", 'G', "../../germline/homo-sapiens/",
                                      {{{"5", {"TRGV.fa"}}, {"3", {"TRGJ.fa"}}}},
                                      jconfig);

  MultiGermline<KmerAffect> mg;
  mg.addGermline(germline);
  mg.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline->getSeed("5"), true));

  KmerSegmenter<KmerAffect> ks(data.read(0), germline->getIndex(),
                               SEG_METHOD_MAX12,false, &mg, germline);
  TAP_TEST(ks.getKmerAffectAnalyser() == NULL, TEST_BUG2224, "");

  CloneOutput clone ;
  ks.toOutput(&clone);
  json json_output = clone.toJson();
  TAP_TEST_EQUAL(json_output.count("affectValues"), 0, TEST_BUG2224, "");
  TAP_TEST_EQUAL(json_output.count("affectSigns"), 0, TEST_BUG2224, "");
  TAP_TEST_EQUAL(json_output.count("affectevalue"), 0, TEST_BUG2224, "");

  delete germline;
}


void testExtractor(IndexTypes index) {
  BioReader seqV("../../germline/homo-sapiens/TRGV.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/TRGJ.fa", 2);
  
  OnlineFasta data("data/segmentation.fasta", 1, " ");

  json jconfig = {{"order", {"5", "3"}},
    {"segments", {{"5", {{"seed", "10c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                  {"3", {{"seed", "10c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  Germline<KmerAffect> *germline ;
  germline = new Germline<KmerAffect>("TRG", 'G', "../../germline/homo-sapiens/",
                                      {{{"5", {"TRGV.fa"}}, {"3", {"TRGJ.fa"}}}},
                                      jconfig);
  MultiGermline<KmerAffect> mg;
  mg.addGermline(germline);
  mg.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline->getSeed("5"), true));


  WindowExtractor<KmerAffect> we(&mg);
  map<string, string> labels;
  ofstream out_seg("segmented.log");
  ofstream out_unseg("unsegmented.log");
  we.setSegmentedOutput(&out_seg);
  we.setUnsegmentedOutput(&out_unseg);

  WindowsStorage<KmerAffect> *ws = we.extract(&data, 30, labels,
                                              false, false,
                                              0.01);
  // we.out_stats(cout);

  TAP_TEST_EQUAL(we.getNbReads(), 15, TEST_EXTRACTOR_NB_READS, "");

  TAP_TEST_EQUAL(we.getNbSegmented(SEG_PLUS), 2, TEST_EXTRACTOR_NB_SEGMENTED, "segPlus: " << we.getNbSegmented(SEG_PLUS));
  TAP_TEST_EQUAL(we.getNbSegmented(SEG_MINUS), 2, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_TOO_SHORT), 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_STRAND_NOT_CONSISTENT), 0, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_TOO_FEW_ZERO), 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_ONLY_J), 4, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_ONLY_V), 3, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_BAD_DELTA_MIN), 0, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_AMBIGUOUS), 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(UNSEG_TOO_SHORT_FOR_WINDOW), 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST_EQUAL(we.getNbSegmented(TOTAL_SEG_AND_WINDOW), 4, TEST_EXTRACTOR_NB_SEGMENTED, "");

  TAP_TEST_EQUAL(we.getAverageSegmentationLength(SEG_PLUS), 88.5, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(SEG_PLUS));
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(SEG_MINUS), 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(UNSEG_TOO_SHORT), 4, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(UNSEG_TOO_FEW_ZERO), 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(UNSEG_ONLY_J), 42.75, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_ONLY_J));
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(UNSEG_ONLY_V), 48, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_ONLY_V));
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(UNSEG_AMBIGUOUS), 72, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_AMBIGUOUS));
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(UNSEG_TOO_SHORT_FOR_WINDOW), 21, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_TOO_SHORT_FOR_WINDOW));
  TAP_TEST_EQUAL(we.getAverageSegmentationLength(TOTAL_SEG_AND_WINDOW), 62.25, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(TOTAL_SEG_AND_WINDOW));

  TAP_TEST(out_seg.tellp() > 0, TEST_EXTRACTOR_OUT_SEG, "");
  TAP_TEST(out_unseg.tellp() > 0, TEST_EXTRACTOR_OUT_UNSEG, "");

  delete germline;
  delete ws;
}

void testBestLengthShifts() {
  list<pair<pair<int, int>, pair<int, int> > > test_sets =
  // pos, shift| length, shift
    { {{50, 5}, {30, 0}},
      {{85, 5}, {30, 0}},  {{90, 5}, {30, -5}},  {{91, 5}, {30, -10}},  {{96, 5}, {25, -10}},  {{99, 5}, {20, -10}},
      {{15, 5}, {30, 0}},  {{10, 5}, {30,  5}},  {{ 9, 5}, {30, 10}},   {{ 4, 5}, {25,  10}},  {{ 0, 5}, {20,  10}},
      {{-100, 5}, {0, 0}}
    };

  for (auto test: test_sets) {
    pair<int, int> param = test.first;
    pair<int, int> expected = test.second;
    pair<int, int> result = WindowExtractor<KmerAffect>::get_best_length_shifts(100, 30,
                                                                    param.first,
                                                                    param.second);
    TAP_TEST(result == expected, TEST_EXTRACTOR_LENGTH_SHIFT,
             "Obtained (" << result.first << ", " << result.second
             << ") but expected (" << expected.first << ", "
             << expected.second << ") "
             <<  " (with "<< param.first << ", " << param.second << ")");

    if (param.first >= 0) {
      int first_pos = param.first + result.second - result.first / 2;
      TAP_TEST(first_pos >= 0, TEST_EXTRACTOR_LENGTH_SHIFT, " First position is " << first_pos<<  " (with "<< param.first << ", " << param.second << ")");
      TAP_TEST(first_pos + result.first - 1 < 100, TEST_EXTRACTOR_LENGTH_SHIFT, " Last position is " << first_pos + result.first - 1<<  " (with "<< param.first << ", " << param.second << ")");
    }

  }

  pair<int, int> result = WindowExtractor<KmerAffect>::get_best_length_shifts(20, 30, 9, 5);
  TAP_TEST(result == make_pair(15, 0), TEST_EXTRACTOR_LENGTH_SHIFT, "");
}

// void testProbability(IndexTypes index) {
//   string v_seq[] = {"AAAA", "AAAC", "AAAG", "AAAT", "AACA", "AACC",
//                 "AACG", "AACT", "AAGA", "AAGC", "AAGG", "AAGT",
//                     "AATA", "AATC", "AATG", "AATT", "ACAA", "ACAC",
//                 "ACAG", "ACAT", "ACCA", "ACCC", "ACCG", "ACCT",
//                 "ACGA", "ACGC", "ACGG", "ACGT", "ACTA", "ACTC",
//                 "ACTG", "ACTT", "AGAA", "AGAC", "AGAG", "AGAT",
//                 "AGCA", "AGCC", "AGCG", "AGCT", "AGGA", "AGGC",
//                 "AGGG", "AGGT", "AGTA", "AGTC", "AGTG", "AGTT",
//                 "ATAA", "ATAC", "ATAG", "ATAT", "ATCA", "ATCC",
//                 "ATCG", "ATCT", "ATGA", "ATGC", "ATGG", "ATGT",
//                 "ATTA", "ATTC", "ATTG", "ATTT"};
//   string j_seq[] = {"CAAA", "CAAC",
//                 "CAAG", "CAAT", "CACA", "CACC", "CACG", "CACT",
//                 "CAGA", "CAGC", "CAGG", "CAGT", "CATA", "CATC",
//                 "CATG", "CATT", "CCAA", "CCAC", "CCAG", "CCAT",
//                 "CCCA", "CCCC", "CCCG", "CCCT", "CCGA", "CCGC",
//                 "CCGG", "CCGT", "CCTA", "CCTC", "CCTG", "CCTT",
//                 "CGAA", "CGAC", "CGAG", "CGAT", "CGCA", "CGCC",
//                 "CGCG", "CGCT", "CGGA", "CGGC", "CGGG", "CGGT",
//                 "CGTA", "CGTC", "CGTG", "CGTT", "CTAA", "CTAC",
//                 "CTAG", "CTAT", "CTCA", "CTCC", "CTCG", "CTCT",
//                 "CTGA", "CTGC", "CTGG", "CTGT", "CTTA", "CTTC",
//                 "CTTG", "CTTT"};
//   BioReader V, J;
//   for (int i = 0; i < 64; i++) {
//     Sequence v = {"V_" + string_of_int(i+33), "V" + string_of_int(i+33), v_seq[i], "", 0};
//     Sequence j = {"J_" + string_of_int(i+33), "J" + string_of_int(i+33), j_seq[i], "", 0};
//     V.add(v);
//     J.add(j);
//   }
//   Germline germline("Test", 'T', V, BioReader(), J,
//                     "####", "####", "####");
//   germline.new_index(index);
//   germline.finish();

//   if (! germline.index->hasDifferentKmerTypes()) {
//     TAP_TEST(germline.index->getIndexLoad(KmerAffect(germline.affect_5, 1, 4)) == .75, TEST_GET_INDEX_LOAD, "index load = " << germline.index->getIndexLoad(KmerAffect(germline.affect_5, 1, 4)));
//   } else {
//     TAP_TEST(germline.index->getIndexLoad(KmerAffect(germline.affect_5, 1, 4)) == 58./256, TEST_GET_INDEX_LOAD, "index load = " << germline.index->getIndexLoad(KmerAffect(germline.affect_5, 1, 4)));
//   }
//   TAP_TEST_EQUAL(germline.index->getIndexLoad(AFFECT_NOT_UNKNOWN), .75, TEST_GET_INDEX_LOAD, ".getIndexLoad with AFFECT_NOT_UNKNOWN = " << germline.index->getIndexLoad(AFFECT_NOT_UNKNOWN));
//   TAP_TEST_EQUAL(germline.index->getIndexLoad(AFFECT_UNKNOWN), .25, TEST_GET_INDEX_LOAD, ".getIndexLoad with AFFECT_UNKNOWN : " << germline.index->getIndexLoad(AFFECT_UNKNOWN));

//   Sequence seq = {"to_segment", "to_segment", "TATCG", "", 0};
//   KmerSegmenter kseg(seq, &germline);

//   MultipleAffectAnalyser *kaa = kseg.getKmerAffectAnalyser();

//   // We have only 2 k-mers, thus we can't have 3 "not unknowns". Thus, it is the probability of having 2 among 2 (with p=.75), same as the test below
//   TAP_TEST_EQUAL(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 3), 0, TEST_PROBABILITY_SEGMENTATION, "");
//   TAP_TEST_EQUAL(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 2), .75 * .75, TEST_PROBABILITY_SEGMENTATION, "");
//   TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 1) == .75 * 2 * .25 + kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 2), TEST_PROBABILITY_SEGMENTATION, "");
//   TAP_TEST_EQUAL(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 0), 1, TEST_PROBABILITY_SEGMENTATION, "");

//  // Same: we only have 2
//   TAP_TEST_EQUAL(kaa->getProbabilityAtLeastOrAbove(AFFECT_UNKNOWN, 3), 0, TEST_PROBABILITY_SEGMENTATION, ".getProbabilityAtLeastOrAbove() with AFFECT_UNKOWN");
//   TAP_TEST_EQUAL(kaa->getProbabilityAtLeastOrAbove(AFFECT_UNKNOWN, 2), .25 * .25, TEST_PROBABILITY_SEGMENTATION, ".getProbabilityAtLeastOrAbove() with AFFECT_UNKOWN");
//   TAP_TEST_EQUAL(kaa->getProbabilityAtLeastOrAbove(AFFECT_UNKNOWN, 0), 1, TEST_PROBABILITY_SEGMENTATION, ".getProbabilityAtLeastOrAbove() with AFFECT_UNKOWN");
// }

void testDifferentSeeds(IndexTypes index) {
  Sequence  seq = {"seq", "seq", "AGAGAGAGCACACACA", "", {}};

  json jconfig = {{"order", {"5", "3"}},
                  {"segments", {{"5", {{"seed", ""}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                                {"3", {{"seed", ""}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  Germline<KmerAffect> germline_basic("Test1", 'T', "data/",
                                      {{{"5", {"toy_V2.fa"}}, {"3", {"toy_J2.fa"}}}},
                                      jconfig);

  json jconfig_seed_5 = {{"order", {"5", "3"}},
                         {"segments", {{"5", {{"seed", "4c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                                       {"3", {{"seed", ""}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  Germline<KmerAffect> germline_small_seed_5("Test1", 'T', "data/",
                                             {{{"5", {"toy_V2.fa"}}, {"3", {"toy_J2.fa"}}}},
                                             jconfig_seed_5);

  json jconfig_seed_3 = {{"order", {"5", "3"}},
                         {"segments", {{"5", {{"seed", ""}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                                       {"3", {{"seed", "4c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  Germline<KmerAffect> germline_small_seed_3("Test1", 'T', "data/",
                                             {{{"5", {"toy_V2.fa"}}, {"3", {"toy_J2.fa"}}}},
                                             jconfig_seed_3);

  json jconfig_short = {{"order", {"5", "3"}},
                        {"segments", {{"5", {{"seed", "4c"}, {"code", "V"}, {"build", "0"}, {"index", "1"}}},
                                      {"3", {{"seed", "4c"}, {"code", "J"}, {"build", "0"}, {"index", "1"}}}}}};
  Germline<KmerAffect> germline_small_seeds("Test1", 'T', "data/",
                                            {{{"5", {"toy_V2.fa"}}, {"3", {"toy_J2.fa"}}}},
                                            jconfig_short);

  MultiGermline<KmerAffect> mg1;
  mg1.addGermline(&germline_basic);
  mg1.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline_basic.getSeed("5"), true));

  MultiGermline<KmerAffect> mg2;
  mg2.addGermline(&germline_small_seed_5);
  mg2.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline_small_seed_5.getSeed("5"), true));

  MultiGermline<KmerAffect> mg3;
  mg3.addGermline(&germline_small_seed_3);
  mg3.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline_small_seed_3.getSeed("5"), true));

  MultiGermline<KmerAffect> mg4;
  mg4.addGermline(&germline_small_seeds);
  mg4.addToIndex(KmerStoreFactory<KmerAffect>::createIndex(index, germline_small_seeds.getSeed("5"), true));


  KmerSegmenter<KmerAffect> ks1(seq, mg1.getIndex(), SEG_METHOD_MAX12, false, &mg1, &germline_basic);
  KmerSegmenter<KmerAffect> ks2(seq, mg2.getIndex(), SEG_METHOD_MAX12, false, &mg2, &germline_small_seed_5);
  KmerSegmenter<KmerAffect> ks3(seq, mg3.getIndex(), SEG_METHOD_MAX12, false, &mg3, &germline_small_seed_3);
  KmerSegmenter<KmerAffect> ks4(seq, mg4.getIndex(), SEG_METHOD_MAX12, false, &mg4, &germline_small_seeds);

  TAP_TEST(! ks1.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
  TAP_TEST(! ks2.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
  TAP_TEST(! ks3.isSegmented(), TEST_KMER_IS_SEGMENTED, "");
  TAP_TEST(ks4.isSegmented(), TEST_KMER_IS_SEGMENTED, "");

  TAP_TEST_EQUAL(ks1.getSegmentationStatus(), UNSEG_TOO_FEW_ZERO, TEST_KMER_SEGMENTATION_CAUSE, "");
  TAP_TEST_EQUAL(ks2.getSegmentationStatus(), UNSEG_ONLY_V, TEST_KMER_SEGMENTATION_CAUSE, ks2.getInfoLineWithAffects());
  TAP_TEST_EQUAL(ks3.getSegmentationStatus(), UNSEG_ONLY_J, TEST_KMER_SEGMENTATION_CAUSE, ks3.getInfoLineWithAffects());
  TAP_TEST_EQUAL(ks4.getSegmentationStatus(), SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks4.getInfoLineWithAffects());
}


void testAlignmentBounds()
{
  // The parameters are taken from test large-r.should, which used to return a JUNCTION ending at an
  // invalid 1-based position of 43 on a read of length 42
  //
  // dp.str_back output:
  //  0 GTCACGACCTTCATAAGTCG
  //    ||||||||||||||||||||
  // 92 GTCACGACCTTCATAAGTCG
  // score: 80
  //
  // GCTGAATACTTCCAGCACTG
  std::string              read         = "CCGTGTATTACTGTGCGAGAGAGCTGAATACTTCCAGCACTG";
  std::string              ighj1_01     = "GCTGAATACTTCCAGCACTGGGGCCAGGGCACCCTGGTCACCGTCTCCTCAGGAGTCTGCTGTCTGGGGATAGCGGGGAGCCAGGTGTACTGGGCCAGGCAAGGGCTTTGGC";
  DynProg::DynProgMode     dpMode       = DynProg::LocalEndWithSomeDeletions;
  Cost                     cost         = VDJ;
  std::map<size_t, size_t> marked_pos   = {{START_GENE, 0}, {END_GENE, 51}, {FR3_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE, 20}};

  bool onlyBottomTriangle      = false;
  int  onlyBottomTriangleShift = BOTTOM_TRIANGLE_SHIFT;

  // Verify the JUNTION, whose aligned position is just past the length of the read, isn't aligned,
  // while the end of the read (once reversed) is aligned to the start of the gene
  bool reverse_both = true;
  DynProg dp(read, ighj1_01, dpMode, cost, reverse_both, reverse_both, marked_pos);
  dp.compute(onlyBottomTriangle, onlyBottomTriangleShift);
  dp.backtrack();

  const auto end_it = dp.marked_pos_i.end();

  auto start_gene_it    = dp.marked_pos_i.find(START_GENE);
  bool start_gene_found = (start_gene_it != end_it);
  TAP_TEST(start_gene_found, TEST_KMER_ALIGNMENT_BOUNDS, "The start of the gene should have been aligned, but isn't");
  if (start_gene_found)
  {
    TAP_TEST_EQUAL(start_gene_it->second, 22, TEST_KMER_ALIGNMENT_BOUNDS, "");
  }

  auto end_gene_it        = dp.marked_pos_i.find(END_GENE);
  bool end_gene_not_found = (end_gene_it == end_it);
  TAP_TEST(end_gene_not_found, TEST_KMER_ALIGNMENT_BOUNDS, "");

  auto junction_it        = dp.marked_pos_i.find(FR3_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE);
  bool junction_not_found = (junction_it == end_it);
  TAP_TEST(junction_not_found, TEST_KMER_ALIGNMENT_BOUNDS, "");
}


void testSegment() {
  //  testSegmentOverlap(KMER_INDEX);
  testSegmentOverlap(AC_AUTOMATON);
  // testSegmentationCause(KMER_INDEX);
  testSegmentationCause(AC_AUTOMATON);
  // testExtractor(KMER_INDEX);
  testExtractor(AC_AUTOMATON);
  // testProbability(KMER_INDEX);
  // testProbability(AC_AUTOMATON); // TODO
  testOverlap();
  // testFineSegment(KMER_INDEX);
  testFineSegment(AC_AUTOMATON);
  // testBug2224(KMER_INDEX);
  testBug2224(AC_AUTOMATON);
  testBestLengthShifts();
  testDifferentSeeds(AC_AUTOMATON); // KMER_INDEX can't deal with seeds of different sizes

  testAlignmentBounds();
}
