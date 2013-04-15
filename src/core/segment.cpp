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

#include <cassert>
#include "segment.h"
#include "tools.h"
#include "affectanalyser.h"

Sequence Segmenter::getSequence() const {
  assert(isSegmented());

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
  return left;
}
  
int Segmenter::getRight() const {
  return right;
}

int Segmenter::getLeftD() const {
  return left2;
}
  
int Segmenter::getRightD() const {
  return right2;
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

  if (left > right)
    {
      int middle = (left + right) / 2 ;
      chevauchement = "!" + string_of_int (left - right) + "!" ;
      left = middle ;
      right = middle ;
    }

  return chevauchement ;
}

// Prettyprint


bool Segmenter::finishSegmentation() 
{
  assert(isSegmented());
  
  string seq = getSequence().sequence;
    
  seg_V = seq.substr(0, left) ;
  seg_N = seq.substr(left, right-left) ;
  seg_J = seq.substr(right) ;
  left2=0;
  right2=0;

  info = "VJ \t" + string_of_int(FIRST_POS) + " " + info + " " + string_of_int(seq.size() - 1 + FIRST_POS) ;
  info += "\t" + code ;

  info = (reversed ? "- " : "+ ") + info ;

  return true ;
}

bool Segmenter::finishSegmentationD() 
{
  string seq = getSequence().sequence;

  seg_V = seq.substr(0, left) ;
  seg_N = seq.substr(left, right-left) ;
  seg_J = seq.substr(right) ;
  
  seg_N1 = seq.substr(left, left2-left) ;
  if(left2-left <0) seg_N1= "overlap";
  seg_D  = seq.substr(left2, right2-left2) ;
  seg_N2 = seq.substr(right2, right-right2) ;
  if(right-right2 <0) seg_N2= "overlap";
  
  info = "VDJ \t0 " + string_of_int(left) +
		" " + string_of_int(left2) + 
		" " + string_of_int(right2) +
		" " + string_of_int(right) +
		" " + string_of_int(seq.size()) ;
		
  info += "\t" + code ;
  
  info = (reversed ? "- " : "+ ") + info ;

  return true ;
}

bool Segmenter::html(ostream &out,int flag_D)
{ 
  assert(isSegmented());
  
  out << ">" << label ;
  out << " " << info ;
  out << endl ;

  out << "<span class='seg_V'>" << seg_V << "</span>" ;
  if(flag_D==1){
    out << "<span class='seg_N'>" << seg_N1 << "</span>" ;
    out << "<span class='seg_D'>" << seg_D << "</span>" ;
    out << "<span class='seg_N'>" << seg_N2 << "</span>" ;
  }else{
    out << "<span class='seg_N'>" << seg_N << "</span>" ;
  }
  out << "<span class='seg_J'>" << seg_J << "</span>" ;

  out << endl ;

  return true ;
} 


ostream &operator<<(ostream &out, const Segmenter &s)
{
  out << ">" << s.label << " " ;
  out << (s.segmented ? "" : "! ") << s.info ;
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

KmerSegmenter::KmerSegmenter(Sequence seq, IKmerStore<KmerAffect> *index, 
			     int delta_min, int delta_max, int *stats)
{
  label = seq.label ;
  sequence = seq.sequence ;
  info = "" ;
  segmented = false;
  right2=0; 
  
  int s = (size_t)index->getS() ;

  if (sequence.length() < (size_t) s) 
    {
      stats[UNSEG_TOO_SHORT]++ ;
      return ;
    }
 
  KmerAffectAnalyser<KmerAffect> *kaa = new KmerAffectAnalyser<KmerAffect>(*index, sequence);
  
  //cout << endl ;
  //cout << seq  ;
  //cout << kaa->toString() << endl ;

  // Check strand consistency among the affectations.
  set<KmerAffect> distinct_a = kaa->getDistinctAffectations();
  int strand = DONT_KNOW;
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


  segmented = true ;

  // Zero information
  if (strand == 0)
    {
      stats[UNSEG_TOO_FEW_ZERO]++ ;
      segmented = false ;
    }
    
  // Ambiguous
  if (strand == 2) 
    {
      stats[UNSEG_STRAND_NOT_CONSISTENT]++ ;
      segmented = false ;
    }
  

  if (strand == 1)
    {
      // Strand +
      left = kaa->last(AFFECT_V);
      right = kaa->first(AFFECT_J);

      if (left == (int)string::npos) 
	{
	  stats[UNSEG_TOO_FEW_V]++ ;
	  segmented = false ;
	}
      
      if (right == (int)string::npos)
	{
	  stats[UNSEG_TOO_FEW_J]++ ;
	  segmented = false ;
	}

      left += s;
    } 
  
  if (strand == -1)
    {
      // Strand -
      int first = kaa->first(AFFECT_V_BWD), last = kaa->last(AFFECT_J_BWD);

      if (first == (int)string::npos)
	{
	  stats[UNSEG_TOO_FEW_V]++ ;
	  segmented = false ;
	}

      if (last == (int)string::npos)
	{
	  stats[UNSEG_TOO_FEW_J]++ ;
	  segmented = false ;
	}

      left = sequence.size() - first ;
      right = sequence.size() - (last + s) ;
    }
  
  // Exit if not segmented
  if (!segmented)
    {
      delete kaa;
      return ;
    }

  // Now we check the delta between left and right
   
  if (right - left < delta_min)
  {
    stats[UNSEG_BAD_DELTA_MIN]++ ;
    segmented = false ;
  }

  if (right - left > delta_max)
  {
    stats[UNSEG_BAD_DELTA_MAX]++ ;
    segmented = false ;
  }

  if (segmented)
    {
      // Yes, it is segmented

      reversed = (strand == -1); 

      info = string_of_int(left + FIRST_POS) + " " + string_of_int(right + FIRST_POS)  ;
      info += " " + removeChevauchement();
      finishSegmentation();

      // cout << "ok" << endl ;

      stats[reversed ? SEG_MINUS : SEG_PLUS]++ ;
    }

  delete kaa;
}

// FineSegmenter

void best_align(int overlap, string seq_left, string seq_right,
		string ref_left ,string ref_right, int *b_r, int *b_l)
{
      int score_r[overlap+1];
      int score_l[overlap+1];
      
      //LEFT
      ref_left=string(ref_left.rbegin(), ref_left.rend());
      seq_left=string(seq_left.rbegin(), seq_left.rend()); 
      
      DynProg dp1 = DynProg(seq_left, ref_left,
			   DynProg::Local, VDJ);
      score_l[0] = dp1.compute();
      dp1.backtrack();

      
      //RIGHT
      DynProg dp = DynProg(seq_right, ref_right,
			   DynProg::Local, VDJ);
      score_r[0] = dp.compute();
      dp.backtrack();    
      
      for(int i=1; i<=overlap; i++){
	score_r[i] = dp.S[dp.best_i-i][dp.best_j];
	score_l[i] = dp1.S[dp1.best_i-i][dp1.best_j];
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
	  //cout<< i<<"/"<<j<<"/"<<score<<"/"<<score_r[i]<<"/"<<score_l[j]<<endl;
	}
      }
      //cout <<best_r <<"/"<< best_l<<endl;
      
      *b_r=best_r;
      *b_l=best_l;
}

int align_against_collection(string &read, Fasta &rep, bool reverse_both, bool local, string *tag, 
			     int *del, int *del2, int *begin, int *length, int *score, int *best_r_)
{
  
  int best_score = MINUS_INF ;
  int best_r = MINUS_INF ;
  int best_best_i = (int) string::npos ;
  int best_best_j = (int) string::npos ;
  int best_first_i = (int) string::npos ;
  int best_first_j = (int) string::npos ;
  string best_label = "" ;

  DynProg::DynProgMode dpMode = DynProg::LocalEndWithSomeDeletions;
  if (local==true) dpMode = DynProg::Local;
  
  for (int r = 0 ; r < rep.size() ; r++)
    {
      DynProg dp = DynProg(read, rep.sequence(r),
			   dpMode, // DynProg::SemiGlobalTrans, 
			   VDJ, // DNA
			   reverse_both, reverse_both);
      int score = dp.compute();

      if (score == best_score)
	best_label += "/" + rep.label(r) ;
	
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
      
      // cout << extract_from_label(rep.label(r), "|") << " " << score << " " << dp.best_i << endl ;

    }

  *del = reverse_both ? best_best_j : rep.sequence(best_r).size() - best_best_j ;
  *del2 = best_first_j;
  *begin = best_first_i;
  *tag = best_label ; 
  
  *length -= *del ;
  *score += best_score ;
  *best_r_ = best_r ;
  
  return best_best_i ;
}

string format_del(int deletions)
{
  return deletions ? *"(" + string_of_int(deletions) + " del)" : "" ;
}

FineSegmenter::FineSegmenter(Sequence seq, Fasta &rep_V, Fasta &rep_J, 
			     int delta_min, int delta_max)
{

  
  label = seq.label ;
  sequence = seq.sequence ;
  right2=0;

  // TODO: factoriser tout cela, peut-etre en lancant deux segmenteurs, un +, un -, puis un qui chapote
  
  // Strand +
  int plus_score = 0 ;
  string tag_V, tag_J;
  int plus_length = 0 ;
  int best_plus_V, best_plus_J ;
  int del_plus_V, del_plus_J ;
  int del2=0;
  int beg=0;
  int plus_left = align_against_collection(sequence, rep_V, false, false, &tag_V, &del_plus_V, &del2, &beg, 
					   &plus_length, &plus_score,
					   &best_plus_V);
  int plus_right = align_against_collection(sequence, rep_J, true, false, &tag_J, &del_plus_J, &del2, &beg,
					    &plus_length, &plus_score,
					    &best_plus_J);
  plus_length += plus_right - plus_left ;

  string plus_info = string_of_int(plus_left + FIRST_POS) + " " + string_of_int(plus_right + FIRST_POS) ;

  // Strand -
  string rc = revcomp(sequence) ;
  int minus_score = 0 ;
  int minus_length = 0 ;
  int best_minus_V, best_minus_J ;
  int del_minus_V, del_minus_J ;
  int minus_left = align_against_collection(rc, rep_V, false, false, &tag_V, &del_minus_V, &del2, &beg,
					    &minus_length, &minus_score,
					    &best_minus_V);
  int minus_right = align_against_collection(rc, rep_J, true, false, &tag_J, &del_minus_J, &del2, &beg,
					     &minus_length, &minus_score,
					     &best_minus_J);
  minus_length += minus_right - minus_left ;

  string minus_info = string_of_int(minus_left + FIRST_POS) + " " + string_of_int(minus_right + FIRST_POS) ;

  reversed = (minus_score > plus_score) ;

  if (!reversed)
    {
      left = plus_left ;
      right = plus_right ;
      best_V = best_plus_V ;
      best_J = best_plus_J ;
      del_V = del_plus_V ;
      del_J = del_plus_J ;
    }
  else
    {
      left = minus_left ;
      right = minus_right ;
      best_V = best_minus_V ;
      best_J = best_minus_J ;
      del_V = del_minus_V ;
      del_J = del_minus_J ;
    }

  segmented = (left != (int) string::npos) && (right != (int) string::npos) && 
    (right - left >= delta_min) && (right - left <= delta_max);
    
  dSegmented=false;

  if (!segmented)
    {
      info = " @" + string_of_int (left + FIRST_POS) + "  @" + string_of_int(right + FIRST_POS) ;
      return ;
    }
    
    //overlap VJ
    if(right-left <0){
      int b_r, b_l;
      int overlap=left-left2;
      
      string seq_left = sequence.substr(0, left);
      string seq_right = sequence.substr(right);

      cout <<sequence<<endl;
      cout <<"seq left : "<<seq_left<<"//seq right : "<<seq_right<<endl;
      best_align(overlap, seq_left, seq_right, 
		 rep_V.sequence(best_V), rep_J.sequence(best_J), &b_r,&b_l);
      right+=b_r;
      left-=b_l;
    }

  string chevauchement = removeChevauchement();
  string n_junction = revcomp(sequence, reversed).substr(left, right-left);

  code = rep_V.label(best_V) +
    " "+ string_of_int(del_V) + 
    "/" + n_junction + 
    chevauchement +
    "/" + string_of_int(del_J) +
    " " + rep_J.label(best_J); 

  code_light = rep_V.label(best_V) +
    "/ " + rep_J.label(best_J); 

 
  if (!reversed)
    info = plus_info ;
  else
    info = minus_info  ;

  finishSegmentation();
}


void FineSegmenter::FineSegmentD(Fasta &rep_V, Fasta &rep_D, Fasta &rep_J){
  
  if (segmented){
    
    int end = (int) string::npos ;
    string tag_D;
    int length = 0 ;
    int begin = 0;
    int score;
    
    int l=left-5;
    if (l<0) l=0;
    int r=right+5;
    if ((right+5)>getSequence().sequence.length() ) r=getSequence().sequence.length();
      
    string str = getSequence().sequence.substr(l, r-l);

    end = align_against_collection(str, rep_D, false, true, &tag_D, &del_D_right, &del_D_left, &begin,
				&length, &score, &best_D);
    
    left2 = l + begin;
    right2 = l + end;
	
    string seq = getSequence().sequence;
    
    if (length>0) dSegmented=true;
    
    //overlap VD
    if(left2-left <0){
      int b_r, b_l;
      int overlap=left-left2;
      string seq_left = seq.substr(0, left);
      string seq_right = seq.substr(left2, right2-left2);

      best_align(overlap, seq_left, seq_right, 
		 rep_V.sequence(best_V), rep_D.sequence(best_D), &b_r,&b_l);
      left2+=b_r;
      left-=b_l;
    }
    string n1_junction = seq.substr(left, left2-left) ;
    
    //overlap DJ
    if(right-right2 <0){
      int b_r, b_l;
      int overlap=right2-right;
      string seq_right = seq.substr(left2, right2-left2);
      string seq_left = seq.substr(right, seq.length()-right);

      best_align(overlap, seq_left, seq_right, 
		 rep_V.sequence(best_D), rep_D.sequence(best_J), &b_r,&b_l);
      right2-=b_l;
      right+=b_r;

    }
    string n2_junction = seq.substr(right2, right-right2) ;
    code = rep_V.label(best_V) +
    " "+ string_of_int(del_V) + 
    "/" + n1_junction + 
    
    "/" + string_of_int(del_D_left) +
    " " + rep_D.label(best_D) +
    " " + string_of_int(del_D_right) +
    
    "/" + n2_junction +
    "/" + string_of_int(del_J) +
    " " + rep_J.label(best_J); 

    code_light = rep_V.label(best_V) +
    "/ " + rep_D.label(best_D) +
    "/ " + rep_J.label(best_J); 
    
    finishSegmentationD();
  }
}
