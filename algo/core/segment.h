#ifndef SEGMENT_H
#define SEGMENT_H

#include <string>
#include <fstream>
#include <iostream>
#include "bioreader.hpp"
#include "dynprog.h"
#include "tools.h"
#include "output.h"
#include "germline.h"
#include "kmerstore.h"
#include "kmeraffect.h"
#include "affectanalyser.h"
#include "../lib/json_fwd.hpp"
#include "filter.h"

// #define DEBUG_EVALUE

#define EXTEND_D_ZONE 5

#define RATIO_STRAND 2          /* The ratio between the affectations in one
                                   strand and the other, to safely attribute a
                                   segment to a given strand */

#define DETECT_THRESHOLD_STRAND 5   /* If the number of total affectations
                                       is above this threshold, then a sequence with no clearly attributed
                                       strand will be marked as STRAND_NOT_CONSISTENT */

#define JSON_REMEMBER_BEST  4   /* The number of V/D/J predictions to keep  */

#define BAD_EVALUE  1e10

#define THRESHOLD_NB_EXPECTED 1.0 /* Threshold of the accepted expected value for number of found k-mers */
#define THRESHOLD_NB_EXPECTED_D  .05 /* e-value threshold, D-REGION */

#define BOTTOM_TRIANGLE_SHIFT  20   /* Should equal to (max allowed 'k-band') + (max allowed number of V/J deletions) - (min size to recognize facing J/V)
                                       As we need ~10 bp to recognize the facing V/J, this value should be large enough to handle V/J deletions until ~30 bp,
                                       (and even larger V/J deletions if there is a large facing J or V in the read). */

#define DEFAULT_WINDOW_SHIFT 5  /* Number of nucleotide to try shifting or
                                   reducing the window when it doesn't fit at
                                   its place */
#define MINIMAL_WINDOW_LENGTH 30 /* As we now dynamically adapt the window
                                    length we need to specify a minimum
                                    otherwise we could go as low as
                                    2*DEFAULT_WINDOW_SHIFT. Of course this can
                                    be overriden by the command line by
                                    providing a shorter -w*/

#define DEFAULT_MINIMIZE_WIDTH       12   /* Number of nucleotides on which the minimization integer is computed */

#define DEFAULT_MINIMIZE_ONE_MARGIN  20   /* Number of nucleotides on ends of the reads excluded from the minimization in SEG_METHOD_ONE.
                                             - A read smaller than (DEFAULT_MINIMIZE_ONE_MARGIN*2 + max(k, DEFAULT_MINIMIZE_WIDTH)), that is 52,
                                               will trigger UNSEG_TOO_SHORT_FOR_WINDOW.
                                             - Margins above the half of the window length may produce shortened or shifted windows
                                          */
#define FRACTION_ALIGNED_AT_WORST .5 /* Fraction of the sequence that should be aligned before deactivating the heuristics */

using namespace std;
using json = nlohmann::json;

enum SEGMENTED { NOT_PROCESSED,
		 TOTAL_SEG_AND_WINDOW,
                 SEG_PLUS, SEG_MINUS,
                 SEG_CHANGED_WINDOW,
                 UNSEG_TOO_SHORT, UNSEG_STRAND_NOT_CONSISTENT,
		 UNSEG_TOO_FEW_ZERO,  UNSEG_ONLY_V, UNSEG_ONLY_J,
                 UNSEG_BAD_DELTA_MIN, UNSEG_AMBIGUOUS,
		 UNSEG_TOO_SHORT_FOR_WINDOW,

		 STATS_SIZE } ;

#define STATS_FIRST_UNSEG UNSEG_TOO_SHORT

const char* const segmented_mesg[] = { "?",
                                       "SEG",
                                       "SEG_+", "SEG_-",
                                       "SEG changed w",
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
  BioReader *rep;
  string key;
  string color;


  /**
  * Alignment positions *on the read*
  */

  int start;
  int end;
  int marked_pos;    // Marked position, for Cys104 and Phe118/Trp118
  int seq_length;

  /**
  * Alignment positions *compared to reference sequence*
  */

  int del_left;
  int del_right;

  AlignBox(string key = "", string color="");
  string getSequence(string sequence);
  void addToOutput(CloneOutput *clone, int alternative_genes);

  /**
  * Mirror the AlignBox (over a a sequence length seq_length)
  */
  void reverse();

  /**
   * Returns 'V', 'D', 'J', or possibly '5', '4', '3', '?', depending on the ref_label and on the key
   */
  char getInitial();

  /**
   * Returns the length
   */
  int getLength();

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

  /* Scores and identifiers of other possible reference sequence */
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
 * @param reverse_V, reverse_J             should we revcomp the sequence on 5' or 3'?
 *
 * @post  box_left->del_left and box_right->del_right are set to the best number of nucleotides to trim in order to remove the overlap.
 *        box_left->end and box_right->start are shifted by the good number of nucleotides
 *
 * @return                                 the N segment
 */

string check_and_resolve_overlap(string seq, int seq_begin, int seq_end,
                                 AlignBox *box_left, AlignBox *box_right,
                                 Cost segment_cost, bool reverse_V = false,
                                 bool reverse_J = false);

class Segmenter {
protected:
  string sequence;
  string sequence_or_rc;

  // JUNCTIONstart/end and CDR3start/end are 1-based
  int JUNCTIONstart, JUNCTIONend;
  string JUNCTIONaa;
  bool JUNCTIONproductive;

  int CDR3start, CDR3end;
  string CDR3nuc;
  string CDR3aa;

  bool reversed, segmented, dSegmented;
  bool junctionChanged;
  int because;

  /**
   * Compares evalue_left, evalue_right and evalue against the provided threshold
   * @post some evalue is above the threshold ==> because is set to UNSEG_TOO_FEW_ZERO, UNSEG_ONLY_J or UNSEG_ONLY_V
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
   * @post If the size or position of the window had to be dynamically adapted to fit
   *       in the read, isJunctionChanged() will return true
   */
  string getJunction(int l, int shift=0);

  /**
   * @return the left position (on forward strand) of the segmentation.
   */
  int getLeft() const;
  
  /**
   * @return the right position (on forward strand) of the segmentation
   */
  int getRight() const;

  
  /**
   * @return the number of positions between the left and the right positions
   */
  int getMidLength() const;


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
   * @return true iff the junction has been shifted or shortened
   *              dynamically to fit into the sequence
   */
  bool isJunctionChanged() const;

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
  KmerSegmenter(Sequence seq, Germline *germline, double threshold = THRESHOLD_NB_EXPECTED, double multiplier=1.0);

  KmerSegmenter(const KmerSegmenter &seg);

  ~KmerSegmenter();

  /**
   * @return the KmerAffectAnalyser of the current sequence.
   */
  KmerAffectAnalyser *getKmerAffectAnalyser() const;

  string getInfoLineWithAffects() const;
  void toOutput(CloneOutput *clone);

 private:
  void computeSegmentation(int strand, KmerAffect left, KmerAffect right,
                           double threshold, double multiplier);
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
 private:
  BioReader filtered_rep_5;
  int alternative_genes;
 public:
   vector<pair<int, int> > score_V;
   vector<pair<int, int> > score_D;
   vector<pair<int, int> > score_J;

   vector <AlignBox*> boxes ;

   /**
   * Build a fineSegmenter based on KmerSegmentation
   * @param seq: An object read from a FASTA/FASTQ file
   * @param germline: germline used
   * @param threshold: threshold of randomly expected segmentation
   * @param kmer_threshold: This threshold is used while filtering the V
   *   BioReader in Germline. If this value is 0, every K-mer from getMultiResults
   *   is used for the filtering. Otherwise if N > 0, the N best K-mers are used
   *   for the filtering.
   * By default this parameter doesn't filter the germline.
   */
   FineSegmenter(Sequence seq, Germline *germline, Cost segment_cost,
                 double threshold = THRESHOLD_NB_EXPECTED, double multiplier=1.0,
                int kmer_threshold=NO_LIMIT_VALUE, int alternative_genes=NO_LIMIT_VALUE);

   ~FineSegmenter();

  /**
  * extend segmentation from VJ to VDJ
  * @param germline: germline used
  */
  void FineSegmentD(Germline *germline, bool several_D,
                    double threshold = THRESHOLD_NB_EXPECTED_D, double multiplier=1.0);

  bool FineSegmentD(Germline *germline,
                    AlignBox *box_Y, AlignBox *box_DD, AlignBox *box_Z,
                    int forbidden_id,
                    int extend_DD_on_Y, int extend_DD_on_Z,
                    double threshold = THRESHOLD_NB_EXPECTED_D, double multiplier=1.0);

  /**
   * find JUNCTION/CDR3, by using marked Cys104 and Phe118/Trp118 positions
   * in the germline V and J genes and the backtrack of the DP matrix
   */
  void findCDR3();

  void checkWarnings(CloneOutput *clone);
  void toOutput(CloneOutput *clone);
  
};



/**
 * Align a read against a collection of sequences, maximizing the alignment 'score'
 * @param read:         the read
 * @param rep:          a collection of reference sequences
 * @param reverse_ref:  if true, reverse the reference sequences (VkVk)
 * @param reverse_both: if true, reverse both the read and the reference sequences (J segment)
 * @param local:        if true, Local alignment (D segment), otherwise LocalEndWithSomeDeletions and onlyBottomTriangle (V and J segments)
 * @param box:          the AligBox to fill
 * @param segment_cost: the cost used by the dynamic programing
 * @param banded_dp: Should we use banded dynamic programming?
 * @param evalue_threshold: threshold for randomly expected segmentation (evalue) to relaunch a full DP without banded_dp
 * @post  box is filled
 */
void align_against_collection(string &read, BioReader &rep, int forbidden_rep_id,
                              bool reverse_ref, bool reverse_both, bool local,
                              AlignBox *box, Cost segment_cost, bool banded_dp=true,
                              double evalue_threshold=1.);

#endif
