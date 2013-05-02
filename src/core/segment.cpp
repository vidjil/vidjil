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

  seg_V = seq.substr(0, left+1) ; // From pos. 0 to left
  seg_J = seq.substr(right) ;
  
  seg_D  = seq.substr(left2, right2-left2+1) ; // From left2 to right2
  
  info = "VDJ \t0 " + string_of_int(left) +
		" " + string_of_int(left2) + 
		" " + string_of_int(right2) +
		" " + string_of_int(right) +
		" " + string_of_int(seq.size()-1+FIRST_POS) ;
		
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
			     int delta_min, int delta_max, int *stats, Cost segment_c)
{
  label = seq.label ;
  sequence = seq.sequence ;
  info = "" ;
  segmented = false;
  right2=0;
  segment_cost=segment_c;
  
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
      cout << best_r << "/" << best_l << endl;
      *b_r=best_r;
      *b_l=best_l;
}

bool comp_pair (pair<int,int> i,pair<int,int> j)
{
  return ( i.first > j.first);
}

int align_against_collection(string &read, Fasta &rep, bool reverse_both, bool local, string *tag, 
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
	
	score_r.push_back(make_pair(score, r));
      // cout << extract_from_label(rep.label(r), "|") << " " << score << " " << dp.best_i << endl ;

    }
    sort(score_r.begin(),score_r.end(),comp_pair);

  *del = reverse_both ? best_best_j : rep.sequence(best_r).size() - best_best_j - 1;
  *del2 = best_first_j;
  *begin = best_first_i;
  *tag = best_label ; 
  
  *length -= *del ;
  
  *score=score_r;
  
  return best_best_i ;
}

string format_del(int deletions)
{
  return deletions ? *"(" + string_of_int(deletions) + " del)" : "" ;
}

FineSegmenter::FineSegmenter(Sequence seq, Fasta &rep_V, Fasta &rep_J, 
			     int delta_min, int delta_max, Cost segment_c)
{

  
  label = seq.label ;
  sequence = seq.sequence ;
  right2=0;
  segment_cost=segment_c;

  // TODO: factoriser tout cela, peut-etre en lancant deux segmenteurs, un +, un -, puis un qui chapote
  
  // Strand +
  
  int plus_score = 0 ;
  string tag_V, tag_J;
  int plus_length = 0 ;
  int del_plus_V, del_plus_J ;
  int del2=0;
  int beg=0;
  
  vector<pair<int, int> > score_plus_V;
  vector<pair<int, int> > score_plus_J;
  
  int plus_left = align_against_collection(sequence, rep_V, false, false, &tag_V, &del_plus_V, &del2, &beg, 
					   &plus_length, &score_plus_V
					   , segment_cost);
  int plus_right = align_against_collection(sequence, rep_J, true, false, &tag_J, &del_plus_J, &del2, &beg,
					    &plus_length, &score_plus_J
					    , segment_cost);
  plus_length += plus_right - plus_left ;

  plus_score=score_plus_V[0].first + score_plus_J[0].first ;
  
  // Strand -
  string rc = revcomp(sequence) ;
  int minus_score = 0 ;
  int minus_length = 0 ;
  int del_minus_V, del_minus_J ;
  
  vector<pair<int, int> > score_minus_V;
  vector<pair<int, int> > score_minus_J;
  
  int minus_left = align_against_collection(rc, rep_V, false, false, &tag_V, &del_minus_V, &del2, &beg,
					    &minus_length, &score_minus_V
					    ,  segment_cost);
  int minus_right = align_against_collection(rc, rep_J, true, false, &tag_J, &del_minus_J, &del2, &beg,
					     &minus_length, &score_minus_J
					     , segment_cost);
  minus_length += minus_right - minus_left ;

  minus_score=score_minus_V[0].first + score_minus_J[0].first ;
  
  reversed = (minus_score > plus_score) ;

  if (!reversed)
    {
      left = plus_left ;
      right = plus_right ;
      best_V = score_plus_V[0].second;
      best_J = score_plus_J[0].second ;
      del_V = del_plus_V ;
      del_J = del_plus_J ;
      score_V=score_plus_V;
      score_J=score_plus_J;
    }
  else
    {
      left = minus_left ;
      right = minus_right ;
      best_V = score_minus_V[0].second;
      best_J = score_minus_J[0].second ;
      del_V = del_minus_V ;
      del_J = del_minus_J ;
      score_V=score_minus_V;
      score_J=score_minus_J;
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
    if(right-left <=0){
      int b_r, b_l;
      int overlap=left-left2+1;
      
      string seq_left = sequence.substr(0, left+1);
      string seq_right = sequence.substr(right);

      best_align(overlap, seq_left, seq_right, 
		 rep_V.sequence(best_V), rep_J.sequence(best_J), &b_r,&b_l, segment_cost);
      // Trim V
      left -= b_l;
      del_V += b_l;

      // Trim J
      right += b_r;
      del_J += b_r;
        if (right>=sequence.length())
	  right=sequence.length()-1;
    }

    // string chevauchement = removeChevauchement();
  seg_N = revcomp(sequence, reversed).substr(left+1, right-left-1);

  code = rep_V.label(best_V) +
    " "+ string_of_int(del_V) + 
    "/" + seg_N + 
    // chevauchement +
    "/" + string_of_int(del_J) +
    " " + rep_J.label(best_J); 

  code_light = rep_V.label(best_V) +
    "/ " + rep_J.label(best_J); 

 
  info = string_of_int(left + FIRST_POS) + " " + string_of_int(right + FIRST_POS) ;

  finishSegmentation();
}


void FineSegmenter::FineSegmentD(Fasta &rep_V, Fasta &rep_D, Fasta &rep_J){
  
  if (segmented){
    
    int end = (int) string::npos ;
    string tag_D;
    int length = 0 ;
    int begin = 0;
    int score;
    
    // Create a zone where to look for D, adding at most EXTEND_D_ZONE nucleotides at each side
    int l = left - EXTEND_D_ZONE;
    if (l<0) 
      l=0 ;

    int r = right + EXTEND_D_ZONE;

    if (r > (int)getSequence().sequence.length()) 
      r = getSequence().sequence.length();
      
    string str = getSequence().sequence.substr(l, r-l);

    // Align
    end = align_against_collection(str, rep_D, false, true, &tag_D, &del_D_right, &del_D_left, &begin,
				&length, &score_D, segment_cost);
    
    score=score_D[0].first;
    best_D=score_D[0].second;
    
    left2 = l + begin;
    right2 = l + end;
	
    string seq = getSequence().sequence;
    
    if (length>0) dSegmented=true;
    
    //overlap VD
    if(left2-left <=0){
      int b_r, b_l;
      int overlap=left-left2+1;
      string seq_left = seq.substr(0, left+1);
      string seq_right = seq.substr(left2, right2-left2+1);

      best_align(overlap, seq_left, seq_right, 
		 rep_V.sequence(best_V), rep_D.sequence(best_D), &b_r,&b_l, segment_cost);

      // Trim V
      left -= b_l;
      del_V += b_l;

      // Trim D
      left2 += b_r;
    }
    seg_N1 = seq.substr(left+1, left2-left-1) ; // From left+1 to left2-1
    
    //overlap DJ
    if(right-right2 <=0){
      int b_r, b_l;
      int overlap=right2-right+1;
      string seq_right = seq.substr(left2, right2-left2+1);
      string seq_left = seq.substr(right, seq.length()-right);

      best_align(overlap, seq_left, seq_right, 
		 rep_D.sequence(best_D), rep_J.sequence(best_J), &b_r,&b_l, segment_cost);

      // Trim D
      right2 -= b_l;

      // Trim J
      right += b_r;
      del_J += b_r;

    }
    seg_N2 = seq.substr(right2+1, right-right2-1) ; // From right2+1 to right-1
    code = rep_V.label(best_V) +
    " "+ string_of_int(del_V) + 
    "/" + seg_N1 + 
    
    "/" + string_of_int(del_D_left) +
    " " + rep_D.label(best_D) +
    " " + string_of_int(del_D_right) +
    
    "/" + seg_N2 +
    "/" + string_of_int(del_J) +
    " " + rep_J.label(best_J); 

    code_light = rep_V.label(best_V) +
    "/ " + rep_D.label(best_D) +
    "/ " + rep_J.label(best_J); 
    
    finishSegmentationD();
  }
}

string FineSegmenter::toJson(){
  
  ostringstream seg_str;
  
  seg_str << " \"seg\" : {";
  seg_str << " \"sequence\" : \""<< sequence << "\" ,"<<endl;
  seg_str << " \"name\" : \""<< code << "\" ,"<<endl;
  seg_str << " \"V\" : ["<<score_V[0].second;
  for (int i=1; i<4; i++){
      seg_str << ","<<score_V[i].second;
  }
  if (score_D.size()>0){
    seg_str << "],\n \"D\" : ["<<score_D[0].second;
      for (int i=1; i<4; i++){
	seg_str << ","<<score_D[i].second;
    }
  }
  seg_str << "],\n \"J\" : ["<<score_J[0].second;
    for (int i=1; i<4; i++){
      seg_str << ","<<score_J[i].second;
  }
  seg_str << "]}";
  
  return seg_str.str();
}



