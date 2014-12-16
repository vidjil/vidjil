/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>, Marc Duez

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

ostream &operator<<(ostream &out, const Segmenter &s)
{
  out << ">" << s.label << " " ;
  out << (s.segmented ? "" : "! ") << s.info ;
  out << " " << s.info_extra ;
  out << " " << s.segmented_germline->code ;
  out << endl ;

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

KmerSegmenter::KmerSegmenter(Sequence seq, MultiGermline *multigermline)
{
  label = seq.label ;
  sequence = seq.sequence ;
  info = "" ;
  info_extra = "seed";
  segmented = false;
  segmented_germline = 0;
  reversed = false;
  Dend=0;
  
  // Iterate over the germlines
  for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
    {
      Germline *germline = *it ;
      segmented_germline = germline;

  int s = (size_t)germline->index->getS() ;
  int length = sequence.length() ;

  if (length < s) 
    {
      because = UNSEG_TOO_SHORT;
      kaa = NULL;
      continue ;
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

  // Test on which strand we are.
  if (nb_strand[0] == 0 && nb_strand[1] == 0) {
    strand = 0;                 // No info
  } else if (nb_strand[0] > RATIO_STRAND * nb_strand[1]) {
    strand = -1;
  } else if (nb_strand[1] > RATIO_STRAND * nb_strand[0]) {
    strand = 1;
  } else {
    // Ambiguous information: we have positive and negative strands
    // and there is not enough difference to put them aparat.
    strand = 2;
  }

  detected = false ;
  computeSegmentation(strand, germline);

  if (segmented)
    {
      // Yes, it is segmented
      germline->stats.insert(length);

      reversed = (strand == -1); 
      because = reversed ? SEG_MINUS : SEG_PLUS ;

      info = string_of_int(Vend + FIRST_POS) + " " + string_of_int(Jstart + FIRST_POS)  ;
      // removeChevauchement is called once info was already computed: it is only to output info_extra
      info_extra += removeChevauchement();
      finishSegmentation();
      system = germline->code;
      return ;
    } 

  // If the germline was detected, do not test other germlines
  if (detected)
    return ;

  } // end for (Germlines)
}

KmerSegmenter::~KmerSegmenter() {
  if (kaa)
    delete kaa;
}

void KmerSegmenter::computeSegmentation(int strand, Germline* germline) {
  // Try to segment, computing 'Vend' and 'Jstart', and 'segmented'
  // If not segmented, put the cause of unsegmentation in 'because'

  segmented = true ;
  because = 0 ; // Cause of unsegmentation

  // Zero information
  if (strand == 0)
    {
      because = UNSEG_TOO_FEW_ZERO ;
    } 
  else if (strand == 2) // Ambiguous
    {
      because = UNSEG_STRAND_NOT_CONSISTENT ;
    } 
  else
    {
      affect_infos max;
      if (strand == 1)
        max = kaa->getMaximum(KmerAffect(germline->affect_5, 1), 
			      KmerAffect(germline->affect_3, 1));
      else
        max = kaa->getMaximum(KmerAffect(germline->affect_3, -1), 
			      KmerAffect(germline->affect_5, -1));


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
    } 
  
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
  if (because)
    segmented = false;
}

KmerAffectAnalyser *KmerSegmenter::getKmerAffectAnalyser() const {
  return kaa;
}

int KmerSegmenter::getSegmentationStatus() const {
  return because;
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
	score_r[i] = dp.S[dp.best_i-i][dp.best_j];
	else
	score_r[i] =0;
	if(dp1.best_i-i >0)
	score_l[i] = dp1.S[dp1.best_i-i][dp1.best_j];	
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
  segmented_germline = germline ;
  info_extra = "" ;
  label = seq.label ;
  sequence = seq.sequence ;
  Dend=0;
  segment_cost=segment_c;

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
    
  dSegmented=false;

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
    
    if (length>0) dSegmented=true;
    
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

JsonList FineSegmenter::toJsonList(Germline *germline){
  JsonList result;
  
  result.add("sequence", revcomp(sequence, reversed) );
  if (isSegmented()) {
    result.add("name", code_short);
    
    JsonList seg;
    seg.add("5", germline->rep_5.label(best_V));
    seg.add("5start", 0);
    seg.add("5end", Vend);
    
    if (score_D.size()>0){
      seg.add("4", germline->rep_4.label(best_D));
      seg.add("4start", Dstart);
      seg.add("4end", Dend);      
    }
    
    seg.add("3", germline->rep_3.label(best_J));
    seg.add("3start", Jstart);
    
    result.add("seg", seg);
  }
  return result;
}


