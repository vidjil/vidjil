#ifndef SEGMENT_H
#define SEGMENT_H

#include <string>
#include <iostream>
#include "fasta.h"
#include "dynprog.h"
#include "tools.h"
#include "kmerstore.h"
#include "kmeraffect.h"
#include "affectanalyser.h"
#include "json.h"

#define EXTEND_D_ZONE 5
#define RATIO_STRAND 5          /* The ratio between the affectations in one
                                   strand and the other, to safely attribute a
                                   segment to a given strand */

#define JSON_REMEMBER_BEST  4   /* The number of V/D/J predictions to keep  */

using namespace std;

enum SEGMENTED { DONT_KNOW, SEG_PLUS, SEG_MINUS, UNSEG_TOO_SHORT, UNSEG_STRAND_NOT_CONSISTENT, 
		 UNSEG_TOO_FEW_ZERO,  UNSEG_TOO_FEW_V, UNSEG_TOO_FEW_J, 
		 UNSEG_BAD_DELTA_MIN, UNSEG_BAD_DELTA_MAX, UNSEG_AMBIGUOUS,
		 TOTAL_SEG_AND_WINDOW, 
		 TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW,
		 STATS_SIZE } ;
const char* const segmented_mesg[] = { "?", "SEG_+", "SEG_-", "UNSEG too short", "UNSEG strand",  
				       "UNSEG too few (zero)", "UNSEG too few V", "UNSEG too few J",
				       "UNSEG < delta_min", "UNSEG > delta_max", "UNSEG ambiguous",
                                       "= SEG, with window",
                                       "= SEG, but no window",
                                      } ;

class Segmenter {
protected:
  string label;
  string sequence;
  int Vend, Jstart;
  int Dstart, Dend;
  bool reversed, segmented, dSegmented;

  string removeChevauchement();
  bool finishSegmentation();
  bool finishSegmentationD();

 public:
  string code;
  string code_short;
  string code_light;
  string info;        // .vdj.fa header, fixed fields
  string info_extra;  // .vdj.fa header, other information, at the end of the header
  int best_V, best_J ;
  int del_V, del_D_left, del_D_right, del_J ;
  string seg_V, seg_N, seg_J;
  
  int best_D;
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


  friend ostream &operator<<(ostream &out, const Segmenter &s);
};



ostream &operator<<(ostream &out, const Segmenter &s);



class KmerSegmenter : public Segmenter
{
 private:
  int because;                  
  KmerAffectAnalyser<KmerAffect> *kaa;
 protected:
  string affects;

 public:
  /**
   * Build a segmenter based on KmerSegmentation
   * @param seq: An object read from a FASTA/FASTQ file
   * @param index: A Kmer index
   * @param delta_min: the minimal distance between the right bound and the left bound 
   *        so that the segmentation is accepted 
   *        (left bound: end of V, right bound : start of J)
   * @param delta_min: the maximal distance between the right bound and the left bound 
   *        so that the segmentation is accepted 
   *        (left bound: end of V, right bound : start of J)
   */
  KmerSegmenter(Sequence seq, IKmerStore<KmerAffect> *index, 
		int delta_min, int delta_max);

  ~KmerSegmenter();

  /**
   * @return the KmerAffectAnalyser of the current sequence.
   */
  KmerAffectAnalyser<KmerAffect> *getKmerAffectAnalyser() const;

  /**
   * @return the status of the segmentation. Tells if the Sequence has been segmented
   *         of if it has not, what the reason is.
   * @assert getSegmentationStatus() == SEG_PLUS || getSegmentationStatus() == SEG_MINUS
   *         <==> isSegmented()
   */
  int getSegmentationStatus() const;

 private:
  void computeSegmentation(int strand, int delta_min, int delta_max, int s);
};

class FineSegmenter : public Segmenter
{
 public:
   int because;
   vector<pair<int, int> > score_V;
   vector<pair<int, int> > score_D;
   vector<pair<int, int> > score_J;
   
   /**
   * Build a fineSegmenter based on KmerSegmentation
   * @param seq: An object read from a FASTA/FASTQ file
   * @param rep_V: germline for V
   * @param rep_J: germline for J
   * @param delta_min: the minimal distance between the right bound and the left bound 
   *        so that the segmentation is accepted 
   *        (left bound: end of V, right bound : start of J)
   * @param delta_min: the maximal distance between the right bound and the left bound 
   *        so that the segmentation is accepted 
   *        (left bound: end of V, right bound : start of J)
   */
  FineSegmenter(Sequence seq, Fasta &rep_V, Fasta &rep_J,
		int delta_min, int delta_max, Cost segment_cost);
  
  /**
  * extend segmentation from VJ to VDJ
  * @param rep_V: germline for V
  * @param rep_D: germline for D
  * @param rep_J: germline for J
  */
  void FineSegmentD(Fasta &rep_V, Fasta &rep_D, Fasta &rep_J);

  JsonList toJsonList(Fasta &rep_V, Fasta &rep_D, Fasta &rep_J);
  
};



#endif
