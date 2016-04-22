#ifndef SEGMENT_H
#define SEGMENT_H

#include <string>
#include <fstream>
#include <iostream>
#include "fasta.h"
#include "dynprog.h"
#include "tools.h"
#include "germline.h"
#include "kmerstore.h"
#include "kmeraffect.h"
#include "affectanalyser.h"
#include "../lib/json.hpp"

#define EXTEND_D_ZONE 5

#define RATIO_STRAND 2          /* The ratio between the affectations in one
                                   strand and the other, to safely attribute a
                                   segment to a given strand */

#define DETECT_THRESHOLD_STRAND 5   /* If the number of total affectations
                                       is above this threshold, then a sequence with no clearly attributed
                                       stranf will be marked as STRAND_NOT_CONSISTEN */

#define DETECT_THRESHOLD 5      /* This threshold only affects the classification of unsegmented sequences.
                                   If the numbers of both V and J affectations are above this threshold,
                                   then the unsegmented sequence will be marked as AMBIGUOUS.
                                   Otherwise, if the number of either V or J affectations if above this threshold,
                                   then the unsegmented sequence will be marked as either ONLY V or ONLY J. */

#define JSON_REMEMBER_BEST  4   /* The number of V/D/J predictions to keep  */

#define BAD_EVALUE  1e10

#define THRESHOLD_NB_EXPECTED 1.0 /* Threshold of the accepted expected value for number of found k-mers */
#define THRESHOLD_NB_EXPECTED_D  .05 /* e-value threshold, D-REGION */

#define BOTTOM_TRIANGLE_SHIFT  20   /* Should equal to (max allowed 'k-band') + (max allowed number of V/J deletions) - (min size to recognize facing J/V)
                                       As we need ~10 bp to recognize the facing V/J, this value should be large enough to handle V/J deletions until ~30 bp,
                                       (and even larger V/J deletions if there is a large facing J or V in the read). */



using namespace std;
using json = nlohmann::json;

enum SEGMENTED { NOT_PROCESSED,
		 TOTAL_SEG_AND_WINDOW,
                 SEG_PLUS, SEG_MINUS,
                 UNSEG_TOO_SHORT, UNSEG_STRAND_NOT_CONSISTENT,
		 UNSEG_TOO_FEW_ZERO,  UNSEG_TOO_FEW_J, UNSEG_TOO_FEW_V,
                 UNSEG_BAD_DELTA_MIN, UNSEG_AMBIGUOUS,
		 UNSEG_TOO_SHORT_FOR_WINDOW,

		 STATS_SIZE } ;

#define STATS_FIRST_UNSEG UNSEG_TOO_SHORT

const char* const segmented_mesg[] = { "?",
                                       "SEG",
                                       "SEG_+", "SEG_-",
                                       "UNSEG too short", "UNSEG strand",
				       "UNSEG too few V/J", "UNSEG only V/5'", "UNSEG only J/3'",
				       "UNSEG < delta_min", "UNSEG ambiguous",
                                       "UNSEG too short w",
                                      } ;



/**
 * An alignment box (AlignBox) gather all parameters for a recombined gene segment (V, D, J, other D...)
 **/

class AlignBox
{
 public:
  string key;
  string color;

  int del_left;
  int start;
  int end;
  int del_right;

  AlignBox(string key = "", string color="");
  string getSequence(string sequence);
  void addToJson(json &seg);

  /**
   * Returns the position in the reference string corresponding to the position in the read
   * Preliminary implementation, only works for the start of V and J boxes
   */
  int posInRef(int i);

  /**
   * Format the reference string in a given range position, possibly adding the ANSI colors
   * where there is the alignment
   */
  string refToString(int from, int to);

  /* Identifier, label and sequence of the reference sequence (the best one) */
  int ref_nb;
  string ref_label;
  string ref;

  /* Marked position, for Cys104 and Phe118/Trp118 */
  int marked_pos;

  /* Identifiers and scores of other possible reference sequence */
  vector<pair<int, int> > score;
};

ostream &operator<<(ostream &out, const AlignBox &box);

/**
 * Check whether there is an overlap between two boxes,
 * If this is the case, fix this overlap (finding the best split point), and update segmentation accordingly
 * @param seq:                             the read
 * @param seq_begin, seq_end:              the positions to consider on 'seq' for the two sequences that may overlap
 * @param *box_left, *box_right            the two boxes
 * @param segment_cost:                    the cost used by the dynamic programing
 *
 * @post  box_left->del_left and box_right->del_right are set to the best number of nucleotides to trim in order to remove the overlap.
 *        box_left->end and box_right->start are shifted by the good number of nucleotides
 *
 * @return                                 the N segment
 */

string check_and_resolve_overlap(string seq, int seq_begin, int seq_end,
                                 AlignBox *box_left, AlignBox *box_right,
                                 Cost segment_cost);

class Segmenter {
protected:
  string sequence;
  string sequence_or_rc;

  int JUNCTIONstart, JUNCTIONend;
  string JUNCTIONaa;
  bool JUNCTIONproductive;

  int CDR3start, CDR3end;
  string CDR3nuc;
  string CDR3aa;

  bool reversed, segmented, dSegmented;
  int because;

  /**
   * Compares evalue_left, evalue_right and evalue against the provided threshold
   * @post some evalue is above the threshold ==> because is set to UNSEG_TOO_FEW_ZERO, UNSEG_TOO_FEW_V or UNSEG_TOO_FEW_J
   */
  void checkLeftRightEvaluesThreshold(double threshold, int strand);

  string removeChevauchement();
  bool finishSegmentation();
  bool finishSegmentationD();

 public:
  Germline *segmented_germline;
  string label;
  string code;
  string info;        // .vdj.fa header, fixed fields
  string info_extra;  // .vdj.fa header, other information, at the end of the header
  string seg_V, seg_N, seg_J, system;

  AlignBox *box_V, *box_D, *box_J;

  double evalue;
  double evalue_left;
  double evalue_right;
  string seg_N1, seg_D, seg_N2;
  Cost segment_cost;

  virtual ~Segmenter();

  /* Queries */



  Sequence getSequence() const ;

  /**
   * @param l: length around the junction
   * @return the string centered on the junction (ie. at position
   *         (getLeft() + getRight())/2).
   *         The string has length l unless the original string 
   *         is not long enough.
   *         The junction is revcomp-ed if the original string comes from reverse
   *         strand.
   */
  string getJunction(int l) const;

  /**
   * @return the left position (on forward strand) of the segmentation.
   */
  int getLeft() const;
  
  /**
   * @return the right position (on forward strand) of the segmentation
   */
  int getRight() const;
  
  /**
   * @return the left position (on forward strand) of the D segmentation.
   */
  int getLeftD() const;
  
  /**
   * @return the right position (on forward strand) of the D segmentation
   */
  int getRightD() const;

  /**
   * @return true iff the string comes from reverse strand
   */
  bool isReverse() const;

  /**
   * @return true iff the sequence has been successfully segmented
   */
  bool isSegmented() const;
  
  /**
   * @return true if a D gene was found in the N region
   */
  bool isDSegmented() const;

  /**
   * @return the status of the segmentation. Tells if the Sequence has been segmented
   *         of if it has not, what the reason is.
   * @assert getSegmentationStatus() == SEG_PLUS || getSegmentationStatus() == SEG_MINUS
   *         <==> isSegmented()
   */
  int getSegmentationStatus() const;

  string getInfoLine() const;

  /**
   * @post status == SEG_PLUS || status == SEG_MINUS <==> isSegmented()
   */
  void setSegmentationStatus(int status);

  friend ostream &operator<<(ostream &out, const Segmenter &s);
};



ostream &operator<<(ostream &out, const Segmenter &s);



class KmerSegmenter : public Segmenter
{
 private:
  KmerAffectAnalyser *kaa;
 protected:
  string affects;

 public:
  int score;
  int pvalue_left;
  int pvalue_right;
  KmerAffect before, after;

  KmerSegmenter();
  /**
   * Build a segmenter based on KmerSegmentation
   * @param seq: An object read from a FASTA/FASTQ file
   * @param germline: the germline
   */
  KmerSegmenter(Sequence seq, Germline *germline, double threshold = THRESHOLD_NB_EXPECTED, int multiplier=1);

  KmerSegmenter(const KmerSegmenter &seg);

  ~KmerSegmenter();

  /**
   * @return the KmerAffectAnalyser of the current sequence.
   */
  KmerAffectAnalyser *getKmerAffectAnalyser() const;

  string getInfoLineWithAffects() const;
  json toJson();

 private:
  void computeSegmentation(int strand, KmerAffect left, KmerAffect right,
                           double threshold, int multiplier);
};


class KmerMultiSegmenter
{
 private:
  double threshold_nb_expected;
 public:
  /**
   * @param seq: An object read from a FASTA/FASTQ file
   * @param multigermline: the multigerm
   * @param threshold: threshold of randomly expected segmentation
   */
  KmerMultiSegmenter(Sequence seq, MultiGermline *multigermline, ostream *out_unsegmented,
                     double threshold = THRESHOLD_NB_EXPECTED, int nb_reads_for_evalue = 1);

  ~KmerMultiSegmenter();

  KmerSegmenter *the_kseg;
  MultiGermline *multi_germline;
};


class FineSegmenter : public Segmenter
{
 public:
   vector<pair<int, int> > score_V;
   vector<pair<int, int> > score_D;
   vector<pair<int, int> > score_J;

   vector <AlignBox*> boxes ;
   
   /**
   * Build a fineSegmenter based on KmerSegmentation
   * @param seq: An object read from a FASTA/FASTQ file
   * @param germline: germline used
   */
   FineSegmenter(Sequence seq, Germline *germline, Cost segment_cost,
                 double threshold = THRESHOLD_NB_EXPECTED, int multiplier=1);

   ~FineSegmenter();

  /**
  * extend segmentation from VJ to VDJ
  * @param germline: germline used
  */
  void FineSegmentD(Germline *germline, bool several_D,
                    double threshold = THRESHOLD_NB_EXPECTED_D, int multiplier=1);

  bool FineSegmentD(Germline *germline,
                    AlignBox *box_Y, AlignBox *box_DD, AlignBox *box_Z,
                    int forbidden_id,
                    int extend_DD_on_Y, int extend_DD_on_Z,
                    double threshold = THRESHOLD_NB_EXPECTED_D, int multiplier=1);

  /**
   * find JUNCTION/CDR3, by using marked Cys104 and Phe118/Trp118 positions
   * in the germline V and J genes and the backtrack of the DP matrix
   */
  void findCDR3();

  json toJson();
  
};


void align_against_collection(string &read, Fasta &rep, int forbidden_rep_id,
                              bool reverse_ref, bool reverse_both, bool local,
                              AlignBox *box, Cost segment_cost);

#endif
