/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011, 2012, 2013, 2014, 2015 by Bonsai bioinformatics 
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
*/
#include <algorithm>    // std::sort
#include <cassert>
#include "segment.h"
#include "tools.h"
#include "affectanalyser.h"
#include <sstream>
#include <string>
#include <math.h>

Segmenter::~Segmenter() {}

Sequence Segmenter::getSequence() const {
  Sequence s ;
  s.label_full = info ;
  s.label = label + " " + (reversed ? "-" : "+");
  s.sequence = revcomp(sequence, reversed);

  return s ;
}

string Segmenter::getJunction(int l) const {
  assert(isSegmented());

  int start = (getLeft() + getRight())/2 - l/2;
  
  if (start < 0 or start + l > (int)sequence.size())  // TODO: +l ou +l-1 ?
    return "" ;

  return getSequence().sequence.substr(start, l);
}

int Segmenter::getLeft() const {
  return Vend;
}
  
int Segmenter::getRight() const {
  return Jstart;
}

int Segmenter::getLeftD() const {
  return Dstart;
}
  
int Segmenter::getRightD() const {
  return Dend;
}

bool Segmenter::isReverse() const {
  return reversed;
}

bool Segmenter::isSegmented() const {
  return segmented;
}

bool Segmenter::isDSegmented() const {
  return dSegmented;
}

bool KmerSegmenter::isDetected() const {
  return detected;
}

// Chevauchement

string Segmenter::removeChevauchement()
{
  assert(isSegmented());
  
  string chevauchement = "" ;

  if (Vend >= Jstart)
    {
      int middle = (Vend + Jstart) / 2 ;
      chevauchement = " !ov " + string_of_int (Vend - Jstart + 1);
      Vend = middle ;
      Jstart = middle+1 ;
    }

  return chevauchement ;
}

// Prettyprint


bool Segmenter::finishSegmentation() 
{
  assert(isSegmented());
  
  string seq = getSequence().sequence;
    
  seg_V = seq.substr(0, Vend+1) ;
  seg_N = seq.substr(Vend+1, Jstart-Vend-1) ;  // Twice computed for FineSegmenter, but only once in KmerSegmenter !
  seg_J = seq.substr(Jstart) ;
  Dstart=0;
  Dend=0;

  info = "VJ \t" + string_of_int(FIRST_POS) + " " + info + " " + string_of_int(seq.size() - 1 + FIRST_POS) ;
  info += "\t" + code ;

  info = (reversed ? "- " : "+ ") + info ;

  return true ;
}

bool Segmenter::finishSegmentationD() 
{
  string seq = getSequence().sequence;

  seg_V = seq.substr(0, Vend+1) ; // From pos. 0 to Vend
  seg_J = seq.substr(Jstart) ;
  
  seg_D  = seq.substr(Dstart, Dend-Dstart+1) ; // From Dstart to Dend
  
  info = "VDJ \t0 " + string_of_int(Vend) +
		" " + string_of_int(Dstart) + 
		" " + string_of_int(Dend) +
		" " + string_of_int(Jstart) +
		" " + string_of_int(seq.size()-1+FIRST_POS) ;
		
  info += "\t" + code ;
  
  info = (reversed ? "- " : "+ ") + info ;

  return true ;
}

string Segmenter::getInfoLine() const
{
  string s = ">" ;

  s += label + " " ;
  s += (segmented ? "" : "! ") + info ;
  s += " " + info_extra ;
  s += " " + segmented_germline->code ;
  s += " " + string(segmented_mesg[because]) ;
  return s ;
}

ostream &operator<<(ostream &out, const Segmenter &s)
{
  out << s.getInfoLine() << endl;

  if (s.segmented)
    {
      out << s.seg_V << endl ;
      out << s.seg_N << endl ;
      out << s.seg_J << endl ;
    }
  else
    {
      out << s.sequence << endl ;
    }

  return out ;
}


// KmerSegmenter (Cheap)

KmerSegmenter::KmerSegmenter() { kaa = 0 ; }

KmerSegmenter::KmerSegmenter(Sequence seq, Germline *germline)
{
  label = seq.label ;
  sequence = seq.sequence ;
  info = "" ;
  info_extra = "seed";
  segmented = false;
  segmented_germline = germline ;
  reversed = false;
  Dend=0;
  because = 0 ; // Cause of unsegmentation
  score = 0 ;
  evalue = NO_LIMIT_VALUE;

  int s = (size_t)germline->index->getS() ;
  int length = sequence.length() ;

  if (length < s) 
    {
      because = UNSEG_TOO_SHORT;
      kaa = NULL;
      return ;
    }
 
  kaa = new KmerAffectAnalyser(*(germline->index), sequence);
  
  // Check strand consistency among the affectations.
  int strand;
  int nb_strand[2] = {0,0};     // In cell 0 we'll put the number of negative
                                // strand, while in cell 1 we'll put the
                                // positives
  for (int i = 0; i < kaa->count(); i++) { 
    KmerAffect it = kaa->getAffectation(i);
    if (! it.isAmbiguous() && ! it.isUnknown()) {
      strand = affect_strand(it.affect);
      nb_strand[(strand + 1) / 2] ++; // (strand+1) / 2 → 0 if strand == -1; 1 if strand == 1
    }
  }

  KmerAffect before, after;

  // Test on which strand we are, select the before and after KmerAffects
  if (nb_strand[0] == 0 && nb_strand[1] == 0) {
    because = UNSEG_TOO_FEW_ZERO ;
    return ;
  } else if (nb_strand[0] > RATIO_STRAND * nb_strand[1]) {
    strand = -1;
    before = KmerAffect(germline->affect_3, -1); 
    after = KmerAffect(germline->affect_5, -1);
  } else if (nb_strand[1] > RATIO_STRAND * nb_strand[0]) {
    strand = 1;
    before = KmerAffect(germline->affect_5, 1); 
    after = KmerAffect(germline->affect_3, 1);    
  } else {
    // Ambiguous information: we have positive and negative strands
    // and there is not enough difference to put them aparat.
    because = UNSEG_STRAND_NOT_CONSISTENT ;
    return ;
  }

  detected = false ;
  computeSegmentation(strand, before, after);

  if (! because)
    {
      // Now we check the delta between Vend and right
   
      if (Jstart - Vend < germline->delta_min)
	{
	  because = UNSEG_BAD_DELTA_MIN ;
	}

      if (Jstart - Vend > germline->delta_max)
	{
	  because = UNSEG_BAD_DELTA_MAX ;
	}
    } 

  if (!because)
    {
      // Yes, it is segmented
      segmented = true;
      reversed = (strand == -1); 
      because = reversed ? SEG_MINUS : SEG_PLUS ;

      info = string_of_int(Vend + FIRST_POS) + " " + string_of_int(Jstart + FIRST_POS)  ;
      // removeChevauchement is called once info was already computed: it is only to output info_extra
      info_extra += removeChevauchement();
      finishSegmentation();
      system = germline->code;
      return ;
    } 

 
}

KmerSegmenter::~KmerSegmenter() {
  if (kaa)
    delete kaa;
}

KmerMultiSegmenter::KmerMultiSegmenter(Sequence seq, MultiGermline *multigermline, ostream *out_unsegmented, double threshold)
{
  int best_score_seg = 0 ; // Best score, segmented sequences
  int best_score_unseg = 0 ; // Best score, unsegmented sequences
  the_kseg = NULL;
  multi_germline = multigermline;
  threshold_nb_expected = threshold;
  
  // Iterate over the germlines
  for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
    {
      Germline *germline = *it ;

      KmerSegmenter *kseg = new KmerSegmenter(seq, germline);
      bool keep_seg = false;

      if (out_unsegmented)
        {
          // Debug, display k-mer affectation and segmentation result for this germline
          *out_unsegmented << "#"
                           << left << setw(4) << kseg->segmented_germline->code << " "
                           << left << setw(20) << segmented_mesg[kseg->getSegmentationStatus()] << " ";

          *out_unsegmented << right << setw(3) << kseg->score << " ";
          
          if (kseg->getSegmentationStatus() != UNSEG_TOO_SHORT) 
            *out_unsegmented << kseg->getKmerAffectAnalyser()->toString();

          *out_unsegmented << endl ;
        }

      // Always remember the first kseg
      if (the_kseg == NULL)
        keep_seg = true;
      
      if (kseg->isSegmented())
        {
          // Yes, it is segmented
          // Should we keep the kseg ?
          if (kseg->score > best_score_seg)
            {
              keep_seg = true;
              best_score_seg = kseg->score ;
            }
        }
      else
        {
          // It is not segmented
          // Should we keep the kseg (with the unsegmentation cause) ?
            if (kseg->score > best_score_unseg)
            {              
              best_score_unseg = kseg->score ;
              if (!best_score_seg)
                keep_seg = true;
            }
        }
      
      if (keep_seg) {
        if (the_kseg)
          delete the_kseg;
        the_kseg = kseg;
      } else {
        delete kseg;
      }
    } // end for (Germlines)

  // E-value threshold
  if (threshold_nb_expected > NO_LIMIT_VALUE)
    if (the_kseg->isSegmented()) {
        // the_kseg->evalue also depends on the number of germlines from the *Multi*KmerSegmenter
        the_kseg->evalue = getNbExpected();
        if (the_kseg->evalue > threshold_nb_expected) {
          the_kseg->setSegmentationStatus(UNSEG_NOISY);
        }
      }
}

double KmerSegmenter::getProbabilityAtLeastOrAbove(int at_least) const {

  // n: number of kmers in the sequence
  int n = getSequence().sequence.size() - getKmerAffectAnalyser()->getIndex().getS();
  float index_load = getKmerAffectAnalyser()->getIndex().getIndexLoad() ;

  double proba = 0;
  double probability_having_system = pow(index_load, at_least);
  double probability_not_having_system = pow(1 - index_load, n - at_least);
  for (int i=at_least; i<n; i++) {
    proba += nChoosek(n, i) * probability_having_system * probability_not_having_system;
    probability_having_system *= index_load;
    probability_not_having_system /= index_load;
  }

  return proba;
}

double KmerMultiSegmenter::getNbExpected() const {
  double proba = the_kseg->getProbabilityAtLeastOrAbove(the_kseg->score);
  return multi_germline->germlines.size() * proba;
}

KmerMultiSegmenter::~KmerMultiSegmenter() {
  if (the_kseg)
    delete the_kseg;
}

void KmerSegmenter::computeSegmentation(int strand, KmerAffect before, KmerAffect after) {
  // Try to segment, computing 'Vend' and 'Jstart'
  // If not segmented, put the cause of unsegmentation in 'because'

  affect_infos max;

  max = kaa->getMaximum(before, after); 

      // We labeled it detected if there were both enough affect_5 and enough affect_3
      detected = (max.nb_before_left + max.nb_before_right >= DETECT_THRESHOLD)
        && (max.nb_after_left + max.nb_after_right >= DETECT_THRESHOLD);
      
      if (! max.max_found) {
        if ((strand == 1 && max.nb_before_left == 0)
            || (strand == -1 && max.nb_after_right == 0)) 
          because = detected ? UNSEG_AMBIGUOUS : UNSEG_TOO_FEW_V ;
        else if ((strand == 1 && max.nb_after_right == 0)
                 || (strand == -1 && max.nb_before_left == 0))
	{
	  because = detected ? UNSEG_AMBIGUOUS : UNSEG_TOO_FEW_J ;
	} else 
          because = UNSEG_AMBIGUOUS; 
      } else {
        Vend = max.first_pos_max;
        Jstart = max.last_pos_max + 1;
        if (strand == -1) {
          int tmp = sequence.size() - Vend - 1;
          Vend = sequence.size() - Jstart - 1;
          Jstart = tmp;
        }
      }
  
    score = max.nb_before_left + max.nb_before_right + max.nb_after_left + max.nb_after_right;  
}

KmerAffectAnalyser *KmerSegmenter::getKmerAffectAnalyser() const {
  return kaa;
}

int Segmenter::getSegmentationStatus() const {
  return because;
}

void Segmenter::setSegmentationStatus(int status) {
  because = status;
  segmented = (status == SEG_PLUS || status == SEG_MINUS);
}

// FineSegmenter

void best_align(int overlap, string seq_left, string seq_right,
		string ref_left ,string ref_right, int *b_r, int *b_l, Cost segment_cost)
{
      int score_r[overlap+1];
      int score_l[overlap+1];
      
      //LEFT
      ref_left=string(ref_left.rbegin(), ref_left.rend());
      seq_left=string(seq_left.rbegin(), seq_left.rend()); 
      
      DynProg dp1 = DynProg(seq_left, ref_left,
			   DynProg::Local, segment_cost);
      score_l[0] = dp1.compute();
      dp1.backtrack();
      
      //RIGHT
      DynProg dp = DynProg(seq_right, ref_right,
			   DynProg::Local, segment_cost);
      score_r[0] = dp.compute();
      dp.backtrack();    
      
      for(int i=1; i<=overlap; i++){
	if(dp.best_i-i >0)
	score_r[i] = dp.B[dp.best_i-i][dp.best_j].score;
	else
	score_r[i] =0;
	if(dp1.best_i-i >0)
	score_l[i] = dp1.B[dp1.best_i-i][dp1.best_j].score;	
	else
	score_l[i] =0;
      }
      int score=-1000000;
      int best_r=0;
      int best_l=0;

      for (int i=0; i<=overlap; i++){
	for (int j=overlap-i; j<=overlap; j++){
	  if ( ((score_r[i]+score_l[j]) == score) && (i+j < best_r+best_l )){
	    best_r=i;
	    best_l=j;
	    score=(score_r[i]+score_l[j]) ;
	  }
	  if ( (score_r[i]+score_l[j]) > score){
	    best_r=i;
	    best_l=j;
	    score=(score_r[i]+score_l[j]) ;
	  }
	}
      }
      *b_r=best_r;
      *b_l=best_l;
}

bool comp_pair (pair<int,int> i,pair<int,int> j)
{
  return ( i.first > j.first);
}

int align_against_collection(string &read, Fasta &rep, bool reverse_both, bool local, int *tag, 
			     int *del, int *del2, int *begin, int *length, vector<pair<int, int> > *score
			    , Cost segment_cost)
{
  
  int best_score = MINUS_INF ;
  int best_r = MINUS_INF ;
  int best_best_i = (int) string::npos ;
  int best_best_j = (int) string::npos ;
  int best_first_i = (int) string::npos ;
  int best_first_j = (int) string::npos ;
  string best_label = "" ;
  vector<pair<int, int> > score_r;

  DynProg::DynProgMode dpMode = DynProg::LocalEndWithSomeDeletions;
  if (local==true) dpMode = DynProg::Local;
  
  for (int r = 0 ; r < rep.size() ; r++)
    {
      DynProg dp = DynProg(read, rep.sequence(r),
			   dpMode, // DynProg::SemiGlobalTrans, 
			   segment_cost, // DNA
			   reverse_both, reverse_both);
      int score = dp.compute();
      
      if (local==true){ 
	dp.backtrack();
      }
      
      if (score > best_score)
	{
	  best_score = score ;
	  best_best_i = dp.best_i ;
	  best_best_j = dp.best_j ;
	  best_first_i = dp.first_i ;
	  best_first_j = dp.first_j ;
	  best_r = r ;
	  best_label = rep.label(r) ;
	}
	
	score_r.push_back(make_pair(score, r));

	// #define DEBUG_SEGMENT      

#ifdef DEBUG_SEGMENT	
	cout << rep.label(r) << " " << score << " " << dp.best_i << endl ;
#endif

    }
    sort(score_r.begin(),score_r.end(),comp_pair);

  *del = reverse_both ? best_best_j : rep.sequence(best_r).size() - best_best_j - 1;
  *del2 = best_first_j;
  *begin = best_first_i;
  *tag = best_r ; 
  
  *length -= *del ;
  
  *score=score_r;

#ifdef DEBUG_SEGMENT	
  cout << "best: " << best_labels << " " << best_score ;
  cout << "del/del2/begin:" << (*del) << "/" << (*del2) << "/" << (*begin) << endl;
  cout << endl;
#endif
  
  return best_best_i ;
}

string format_del(int deletions)
{
  return deletions ? *"(" + string_of_int(deletions) + " del)" : "" ;
}

FineSegmenter::FineSegmenter(Sequence seq, Germline *germline, Cost segment_c)
{
  segmented = false;
  dSegmented = false;
  because = 0 ;
  segmented_germline = germline ;
  info_extra = "" ;
  label = seq.label ;
  sequence = seq.sequence ;
  Dend=0;
  segment_cost=segment_c;

  CDR3start = -1;
  CDR3end = -1;
  
  // TODO: factoriser tout cela, peut-etre en lancant deux segmenteurs, un +, un -, puis un qui chapote
  
  // Strand +
  
  int plus_score = 0 ;
  int tag_plus_V, tag_plus_J;
  int plus_length = 0 ;
  int del_plus_V, del_plus_J ;
  int del2=0;
  int beg=0;
  
  vector<pair<int, int> > score_plus_V;
  vector<pair<int, int> > score_plus_J;
  
  int plus_left = align_against_collection(sequence, germline->rep_5, false, false, &tag_plus_V, &del_plus_V, &del2, &beg, 
					   &plus_length, &score_plus_V
					   , segment_cost);
  int plus_right = align_against_collection(sequence, germline->rep_3, true, false, &tag_plus_J, &del_plus_J, &del2, &beg,
					    &plus_length, &score_plus_J
					    , segment_cost);
  plus_length += plus_right - plus_left ;

  plus_score=score_plus_V[0].first + score_plus_J[0].first ;
  
  // Strand -
  string rc = revcomp(sequence) ;
  int minus_score = 0 ;
  int tag_minus_V, tag_minus_J;
  int minus_length = 0 ;
  int del_minus_V, del_minus_J ;
  
  vector<pair<int, int> > score_minus_V;
  vector<pair<int, int> > score_minus_J;
  
  int minus_left = align_against_collection(rc, germline->rep_5, false, false, &tag_minus_V, &del_minus_V, &del2, &beg,
					    &minus_length, &score_minus_V
					    ,  segment_cost);
  int minus_right = align_against_collection(rc, germline->rep_3, true, false, &tag_minus_J, &del_minus_J, &del2, &beg,
					     &minus_length, &score_minus_J
					     , segment_cost);
  minus_length += minus_right - minus_left ;

  minus_score=score_minus_V[0].first + score_minus_J[0].first ;
  
  reversed = (minus_score > plus_score) ;

  if (!reversed)
    {
      Vend = plus_left ;
      Jstart = plus_right ;
      best_V = tag_plus_V ;
      best_J = tag_plus_J ;
      del_V = del_plus_V ;
      del_J = del_plus_J ;
      score_V=score_plus_V;
      score_J=score_plus_J;
    }
  else
    {
      Vend = minus_left ;
      Jstart = minus_right ;
      best_V = tag_minus_V ;
      best_J = tag_minus_J ;
      del_V = del_minus_V ;
      del_J = del_minus_J ;
      score_V=score_minus_V;
      score_J=score_minus_J;
    }

  segmented = (Vend != (int) string::npos) && (Jstart != (int) string::npos) && 
    (Jstart - Vend >= germline->delta_min) && (Jstart - Vend <= germline->delta_max);
    
  if (!segmented)
    {
      because = DONT_KNOW;
      info = " @" + string_of_int (Vend + FIRST_POS) + "  @" + string_of_int(Jstart + FIRST_POS) ;
      
      if (Jstart - Vend < germline->delta_min)
        {
          because = UNSEG_BAD_DELTA_MIN  ;
        }

      if (Jstart - Vend > germline->delta_max)
        {
          because = UNSEG_BAD_DELTA_MAX  ;
        }
        
      if (Vend == (int) string::npos) 
        {
          because = UNSEG_TOO_FEW_V ;
        }
      
      if (Jstart == (int) string::npos)
        {
          because = UNSEG_TOO_FEW_J ;
        }
      
      return ;
    }
    
    because = reversed ? SEG_MINUS : SEG_PLUS ;
    
    //overlap VJ
    if(Jstart-Vend <=0){
      int b_r, b_l;
      int overlap=Vend-Jstart+1;
      
      string seq_left = sequence.substr(0, Vend+1);
      string seq_right = sequence.substr(Jstart);

      best_align(overlap, seq_left, seq_right, 
		 germline->rep_5.sequence(best_V), germline->rep_3.sequence(best_J), &b_r,&b_l, segment_cost);
      // Trim V
      Vend -= b_l;
      del_V += b_l;

      // Trim J
      Jstart += b_r;
      del_J += b_r;
      if (Jstart>=(int) sequence.length())
	  Jstart=sequence.length()-1;
    }

    // string chevauchement = removeChevauchement();

    /// used only below, then recomputed in finishSegmentation() ;
    seg_N = revcomp(sequence, reversed).substr(Vend+1, Jstart-Vend-1); 

  code = germline->rep_5.label(best_V) +
    " "+ string_of_int(del_V) + 
    "/" + seg_N + 
    // chevauchement +
    "/" + string_of_int(del_J) +
    " " + germline->rep_3.label(best_J); 

    stringstream code_s;
   code_s<< germline->rep_5.label(best_V) <<
    " -" << string_of_int(del_V) << "/" 
    << seg_N.size()
    // chevauchement +
    << "/-" << string_of_int(del_J)
    <<" " << germline->rep_3.label(best_J);
    code_short=code_s.str();
    
  code_light = germline->rep_5.label(best_V) +
    "/ " + germline->rep_3.label(best_J); 

 
  info = string_of_int(Vend + FIRST_POS) + " " + string_of_int(Jstart + FIRST_POS) ;
  finishSegmentation();
}


void FineSegmenter::FineSegmentD(Germline *germline){
  
  if (segmented){
    
    int end = (int) string::npos ;
    int tag_D;
    int length = 0 ;
    int begin = 0;
    
    // Create a zone where to look for D, adding at most EXTEND_D_ZONE nucleotides at each side
    int l = Vend - EXTEND_D_ZONE;
    if (l<0) 
      l=0 ;

    int r = Jstart + EXTEND_D_ZONE;

    if (r > (int)getSequence().sequence.length()) 
      r = getSequence().sequence.length();
      
    string str = getSequence().sequence.substr(l, r-l);

    // Align
    end = align_against_collection(str, germline->rep_4, false, true, &tag_D, &del_D_right, &del_D_left, &begin,
				&length, &score_D, segment_cost);
    
    best_D = tag_D;
    
    Dstart = l + begin;
    Dend = l + end;
	
    string seq = getSequence().sequence;


    // recompute remaining length for D
    length = germline->rep_4.sequence(best_D).length() - del_D_right - del_D_left;

    if (length < MIN_D_LENGTH)
      return ;


    dSegmented=true;
    
    //overlap VD
    if(Dstart-Vend <=0){
      int b_r, b_l;
      int overlap=Vend-Dstart+1;
      string seq_left = seq.substr(0, Vend+1);
      string seq_right = seq.substr(Dstart, Dend-Dstart+1);

      best_align(overlap, seq_left, seq_right, 
		 germline->rep_5.sequence(best_V), germline->rep_4.sequence(best_D), &b_r,&b_l, segment_cost);

      // Trim V
      Vend -= b_l;
      del_V += b_l;

      // Trim D
      Dstart += b_r;
    }
    seg_N1 = seq.substr(Vend+1, Dstart-Vend-1) ; // From Vend+1 to Dstart-1
    
    //overlap DJ
    if(Jstart-Dend <=0){
      int b_r, b_l;
      int overlap=Dend-Jstart+1;
      string seq_right = seq.substr(Dstart, Dend-Dstart+1);
      string seq_left = seq.substr(Jstart, seq.length()-Jstart);

      best_align(overlap, seq_left, seq_right, 
		 germline->rep_4.sequence(best_D), germline->rep_3.sequence(best_J), &b_r,&b_l, segment_cost);

      // Trim D
      Dend -= b_l;

      // Trim J
      Jstart += b_r;
      del_J += b_r;

    }
    seg_N2 = seq.substr(Dend+1, Jstart-Dend-1) ; // From Dend+1 to right-1
    code = germline->rep_5.label(best_V) +
    " "+ string_of_int(del_V) + 
    "/" + seg_N1 + 
    
    "/" + string_of_int(del_D_left) +
    " " + germline->rep_4.label(best_D) +
    " " + string_of_int(del_D_right) +
    
    "/" + seg_N2 +
    "/" + string_of_int(del_J) +
    " " + germline->rep_3.label(best_J); 

    stringstream code_s;
    code_s << germline->rep_5.label(best_V) 
    << " -" << string_of_int(del_V) << "/" 
    << seg_N1.size()
    
    << "/-" << string_of_int(del_D_left) 
    << " " << germline->rep_4.label(best_D) 
    << " -" << string_of_int(del_D_right) << "/"
    
    << seg_N2.size()
    << "/-" << string_of_int(del_J) 
    << " " << germline->rep_3.label(best_J);
    code_short=code_s.str();
    
    
    code_light = germline->rep_5.label(best_V) +
    "/ " + germline->rep_4.label(best_D) +
    "/ " + germline->rep_3.label(best_J); 
    
    finishSegmentationD();
  }
}

void FineSegmenter::findCDR3(){
    string str = getSequence().sequence;
    
    list<string> codon_start;
    codon_start.push_back("TGT");
    codon_start.push_back("TGC");
    
    list<string> codon_end;
    codon_end.push_back("TTT");
    codon_end.push_back("TTC");
    codon_end.push_back("TGG");
    
    list<int> p_start;
    list<int> p_end;

    size_t loc;
    std::list<string>::const_iterator it;
    for (it = codon_start.begin(); it != codon_start.end(); ++it) {//filter 1 : start codon must be in V
        loc = 0;
        while ( loc != string::npos && loc < (size_t)Vend){
            loc = str.find(*it, loc+3);
            if (loc != string::npos && loc < (size_t)Vend) {
                p_start.push_front(loc);
            }
        }
    }

    for (it = codon_end.begin(); it != codon_end.end(); ++it) {//filter 2 : end codon must be in J
        loc = Jstart;
        while ( loc != string::npos){
            loc = str.find(*it, loc+3);
            if (loc != string::npos) {
                p_end.push_back(loc);
            }
        }
    }

    CDR3start = -1;
    CDR3end = -1;
    
    std::list<int>::const_iterator it1;
    for (it1 = p_start.begin(); it1 != p_start.end(); ++it1) {
        
        std::list<int>::const_iterator it2;
        for (it2 = p_end.begin(); it2 != p_end.end(); ++it2) {
            
            if ( (*it2-*it1)%3 == 0){       //filter 3 : start/stop codon must be seprated by a multiple of 3
                
                if ( fabs((*it2-*it1)-36 ) < fabs((CDR3end-CDR3start)-36) ){ //filter 4 : cdr3 length must be close to 12 AA
                    CDR3start = *it1;
                    CDR3end = *it2;
                }
            }
        }
    }
    
}

void FineSegmenter::toJsonList(JsonList *seg){

  if (isSegmented()) {
    seg->add("5", segmented_germline->rep_5.label(best_V));
    seg->add("5start", 0);
    seg->add("5end", Vend);
    
    if (score_D.size()>0){
      seg->add("4", segmented_germline->rep_4.label(best_D));
      seg->add("4start", Dstart);
      seg->add("4end", Dend);
    }
    
    seg->add("3", segmented_germline->rep_3.label(best_J));
    seg->add("3start", Jstart);

    if (CDR3start >= 0)
      {
    JsonList *json_cdr;
    json_cdr=new JsonList();
    json_cdr->add("start", CDR3start);
    json_cdr->add("stop", CDR3end);
    seg->add("cdr3", *json_cdr);
      }

  }
}

void KmerSegmenter::toJsonList(JsonList *seg)
{
    int sequenceSize = sequence.size();

    if (evalue > NO_LIMIT_VALUE)
      seg->add("evalue", evalue);

    JsonList *json_affectValues;
    json_affectValues=new JsonList();
    json_affectValues->add("start", 0);
    json_affectValues->add("stop", sequenceSize); 
    json_affectValues->add("seq", getKmerAffectAnalyser()->toStringValues());
    seg->add("affectValues", *json_affectValues);
      

    JsonList *json_affectSigns;
    json_affectSigns=new JsonList();
    json_affectSigns->add("start", 0);
    json_affectSigns->add("stop", sequenceSize); 
    json_affectSigns->add("seq", getKmerAffectAnalyser()->toStringSigns());
    seg->add("affectSigns", *json_affectSigns);

    delete json_affectValues;
    delete json_affectSigns;
}


