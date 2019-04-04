/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011-2019 by VidjilNet consortium and Bonsai bioinformatics
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
#include "output.h"
#include "../lib/json.hpp"
#include "affectanalyser.h"
#include <sstream>
#include <cstring>
#include <string>
#include "windowExtractor.h"
#include <set>
#include "automaton.h"
#include <map>
#include <string>
#define NO_FORBIDDEN_ID (-1)

AlignBox::AlignBox(string _key, string _color) {
  key = _key;
  color = _color;

  del_left = 0 ;
  start = 0 ;
  end = 0 ;
  del_right = 0 ;

  ref_nb = 0 ;
  ref = "";
  ref_label = "";
}

int AlignBox::getLength() {
  return end - start + 1 ;
}

char AlignBox::getInitial() {

  // TRGV -> V, IGHD -> D...
  if (ref_label.size() > 4)
    return ref_label[3] ;

  if (key.size())
    return key[0] ;

  return '?' ;
}

string AlignBox::getSequence(string sequence) {
  return sequence.substr(start, end-start+1);
}

void AlignBox::addToOutput(CloneOutput *clone, int alternative_genes) {

  json j;
  j["name"] = ref_label;

  if (key != "3") // no end information for J
    {
      j["stop"] = end + 1;
      j["delRight"] = del_right;
    }

  if (key != "5") // no start information for V
    {
      j["start"] = start + 1;
      j["delLeft"] = del_left;
    }

  clone->setSeg(key, j) ;

  /*Export the N best genes if threshold parameter is specified*/
  if(rep && !this->score.empty() && rep->size() <= (int)this->score.size() && alternative_genes > 0){
    json jalt = json::array();
    int last_score = this->score[0].first;
    for(int i = 0; i < (int)this->score.size() &&
          (i < alternative_genes || last_score == this->score[i].first);++i){
        int r = this->score[i].second;
        jalt.push_back(json::object({{"name",rep->label(r)}}));
      last_score = this->score[i].first;
    }
    clone->setSeg(key + "alt", jalt);
  }
}


#define NO_COLOR "\033[0m"

int AlignBox::posInRef(int i) {
  // Works now only for V/J boxes

  if (del_left >= 0) // J
    return i - start + del_left + 1; // Why +1 ?

  if (del_right >= 0) // V
    return i + (ref.size() - del_right) - end ;

  return -99;
}

string AlignBox::refToString(int from, int to) {

  stringstream s;

  s << ref_label << "  \t" ;

  int j = posInRef(from);

  s << j << "\t" ;

  if (from > start)
    s << color;

  for (int i=from; i<=to; i++) {

    if (i == start)
      s << color;

    if (j > 0 && (size_t)j <= ref.size())
      s << ref[j-1] ;
    else
      s << ".";

    if (i == end)
      s << NO_COLOR;

    // Related position. To improve
    j++ ;
  }

  if (to < end)
    s << NO_COLOR;

  s << "\t" << j  ;

  return s.str();
}



ostream &operator<<(ostream &out, const AlignBox &box)
{
  out << "[/" << box.del_left << " " ;
  out << "@" << box.start << " " ;
  out << box.ref_label << "(" << box.ref_nb << ") " ;
  out << "@" << box.end << " " ;
  out << box.del_right << "/]" ;

  return out ;
}

string codeFromBoxes(vector <AlignBox*> boxes, string sequence)
{
  string code = "";

  int n = boxes.size();

  for (int i=0; i<n; i++) {

    if (i>0) {
      code += " " + string_of_int(boxes[i-1]->del_right) + "/"
        // From box_left->end + 1 to box_right->start - 1, both positions included
        + sequence.substr(boxes[i-1]->end + 1, boxes[i]->start - boxes[i-1]->end - 1)
        + "/" + string_of_int(boxes[i]->del_left) + " " ;
    }

    code += boxes[i]->ref_label ;
  }

  return code;
}

string posFromBoxes(vector <AlignBox*> boxes)
{
  string poss = "";
  string initials = "";

  int n = boxes.size();


  for (int i=0; i<n; i++) {
    initials += boxes[i]->getInitial() ;

    poss += " " + string_of_int(boxes[i]->start + FIRST_POS) ;
    poss += " " + string_of_int(boxes[i]->end + FIRST_POS) ;
  }

  return initials + "\t" + poss;
}


Segmenter::~Segmenter() {}

Sequence Segmenter::getSequence() const {
  Sequence s ;
  s.label_full = info ;
  if (segmented) {
    s.label = label + " " + (reversed ? "-" : "+");
    s.sequence = revcomp(sequence, reversed);
  } else {
    s.sequence = sequence;
  }

  return s ;
}

string Segmenter::getJunction(int l, int shift) {
  assert(isSegmented());

  junctionChanged = false;
  // '-w all'
  if (l == NO_LIMIT_VALUE)
    return getSequence().sequence;

  // Regular '-w'
  int central_pos = (getLeft() + getRight())/2 + shift;

  pair<int, int> length_shift = WindowExtractor::get_best_length_shifts(getSequence().sequence.size(),
                                                                        l, central_pos,
                                                                        DEFAULT_WINDOW_SHIFT);
  // Yield UNSEG_TOO_SHORT_FOR_WINDOW into windowExtractor
  if (length_shift.first < MINIMAL_WINDOW_LENGTH && length_shift.first < l) {
    info += " w" + string_of_int(length_shift.first) + "/" + string_of_int(length_shift.second);
    return "" ;
  }

  if (length_shift.first < l || length_shift.second != 0) {
    info += " w" + string_of_int(length_shift.first) + "/" + string_of_int(length_shift.second);
    junctionChanged = true;
  }

  // Window succesfully extracted
  return getSequence().sequence.substr(central_pos + length_shift.second - length_shift.first / 2, length_shift.first);
}

int Segmenter::getLeft() const {
  return box_V->end;
}
  
int Segmenter::getRight() const {
  return box_J->start;
}

int Segmenter::getMidLength() const {
  return box_J->start - box_V->end - 1;
}

int Segmenter::getLeftD() const {
  return box_D->start;
}
  
int Segmenter::getRightD() const {
  return box_D->end;
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

bool Segmenter::isJunctionChanged() const {
  return junctionChanged;
}
// E-values

void Segmenter::checkLeftRightEvaluesThreshold(double threshold, int strand)
{
  if (threshold == NO_LIMIT_VALUE)
    return ;

  if (evalue_left >= threshold && evalue_right >= threshold)
    because = UNSEG_TOO_FEW_ZERO ;
  else if ((strand == 1 ? evalue_left : evalue_right) >= threshold)
    because = UNSEG_ONLY_J ;
  else if ((strand == 1 ? evalue_right : evalue_left) >= threshold)
    because = UNSEG_ONLY_V ;
  else if (evalue >= threshold) // left and right are <= threshold, but their sum is > threshold
    because = UNSEG_TOO_FEW_ZERO ;
}


// Chevauchement

string Segmenter::removeChevauchement()
{
  assert(isSegmented());
  
  string chevauchement = "" ;

  if (box_V->end >= box_J->start)
    {
      int middle = (box_V->end + box_J->start) / 2 ;
      chevauchement = " !ov " + string_of_int (box_V->end - box_J->start + 1);
      box_V->end = middle ;
      box_J->start = middle+1 ;
    }

  return chevauchement ;
}

// Prettyprint


bool Segmenter::finishSegmentation() 
{
  assert(isSegmented());
  
  string seq = getSequence().sequence;
    
  seg_V = seq.substr(0, box_V->end+1) ;
  seg_N = seq.substr(box_V->end+1, box_J->start-box_V->end-1) ;  // Twice computed for FineSegmenter, but only once in KmerSegmenter !
  seg_J = seq.substr(box_J->start) ;
  box_D->start=0;
  box_D->end=0;

  info = (reversed ? "- " : "+ ") + info + "\t" + code ;

  return true ;
}

bool Segmenter::finishSegmentationD() 
{
  string seq = getSequence().sequence;

  seg_V = seq.substr(0, box_V->end+1) ; // From pos. 0 to box_V->end
  seg_J = seq.substr(box_J->start) ;
  seg_N = seq.substr(box_V->end+1, box_J->start-box_V->end-1) ;  // Twice computed for FineSegmenter, but only once in KmerSegmenter !
  seg_D  = seq.substr(box_D->start, box_D->end-box_D->start+1) ; // From Dstart to Dend

  info = (reversed ? "- " : "+ ") + info + "\t" + code ;

  return true ;
}

string Segmenter::getInfoLine() const
{
  string s = "" ;

  s += (segmented ? "" : "\t ! ") + info ;
  s += " " + info_extra ;
  s += " " + segmented_germline->code ;
  s += " " + string(segmented_mesg[because]) ;

  if (evalue > NO_LIMIT_VALUE)
    s += " " + scientific_string_of_double(evalue);

  if (evalue_left > NO_LIMIT_VALUE)
    s += " " + scientific_string_of_double(evalue_left);
  if (evalue_right > NO_LIMIT_VALUE)
    s += "/" + scientific_string_of_double(evalue_right);

  if (CDR3start > 0)
    s += " {" + string_of_int(JUNCTIONstart) + "(" + string_of_int(JUNCTIONend-JUNCTIONstart+1) + ")" + string_of_int(JUNCTIONend) + " "
      + "up"[JUNCTIONproductive] + " " + JUNCTIONaa + "}";

  return s ;
}

string KmerSegmenter::getInfoLineWithAffects() const
{
   stringstream ss;

   ss << "# "
      << right << setw(3) << score << " "
      << left << setw(30)
      << getInfoLine() ;

   if (getSegmentationStatus() != UNSEG_TOO_SHORT)
     ss << getKmerAffectAnalyser()->toString();

   return ss.str();
}


ostream &operator<<(ostream &out, const Segmenter &s)
{
  out << ">" << s.label << " " ;
  out << s.getInfoLine() << endl;

  if (s.segmented)
    {
      out << s.seg_V << endl ;
      out << s.seg_N << endl ;
      out << s.seg_J << endl ;
    }
  else
    {
      out << s.getSequence().sequence << endl ;
    }

  return out ;
}


// KmerSegmenter (Cheap)

KmerSegmenter::KmerSegmenter() { kaa = 0 ; }

KmerSegmenter::KmerSegmenter(Sequence seq, Germline *germline, double threshold, double multiplier)
{
  box_V = new AlignBox();
  box_D = new AlignBox();
  box_J = new AlignBox();

  CDR3start = -1;
  CDR3end = -1;

  JUNCTIONstart = -1;
  JUNCTIONend = -1;

  label = seq.label ;
  sequence = seq.sequence ;
  info = "" ;
  info_extra = "seed";
  segmented = false;
  segmented_germline = germline ;
  system = germline->code; // useful ?
  reversed = false;
  because = NOT_PROCESSED ; // Cause of unsegmentation
  score = 0 ;
  evalue = NO_LIMIT_VALUE;
  evalue_left = NO_LIMIT_VALUE;
  evalue_right = NO_LIMIT_VALUE;

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

  score = nb_strand[0] + nb_strand[1] ; // Used only for non-segmented germlines

  reversed = (nb_strand[0] > nb_strand[1]) ;



  if (germline->seg_method == SEG_METHOD_ONE) {

    KmerAffectAnalyser kaa(*(germline->index), sequence);

    KmerAffect kmer = KmerAffect(germline->affect_4, 1, germline->seed.size());
    int c = kaa.count(kmer);

    // E-value
    double pvalue = kaa.getProbabilityAtLeastOrAbove(kmer, c);
    evalue = pvalue * multiplier ;

    if (evalue >= threshold)
      {
        because = UNSEG_TOO_FEW_ZERO ;
        return ;
      }

    int pos = kaa.minimize(kmer, DEFAULT_MINIMIZE_ONE_MARGIN, DEFAULT_MINIMIZE_WIDTH);

    if (pos == NO_MINIMIZING_POSITION)
      {
        because = UNSEG_TOO_SHORT_FOR_WINDOW;
        return ;
      }

    segmented = true ;
    because = reversed ? SEG_MINUS : SEG_PLUS ;

    info = "=" + string_of_int(c) + " @" + string_of_int(pos) ;

    // getJunction() will be centered on pos
    box_V->end = pos;
    box_J->start = pos;
    finishSegmentation();

    return ;
  }
  
  
  if ((germline->seg_method == SEG_METHOD_MAX12)
      || (germline->seg_method == SEG_METHOD_MAX1U))
    { // Pseudo-germline, MAX12 and MAX1U
      pair <KmerAffect, KmerAffect> max12 ;
      CountKmerAffectAnalyser ckaa(*(germline->index), sequence);


      set<KmerAffect> forbidden;
      forbidden.insert(KmerAffect::getAmbiguous());
      forbidden.insert(KmerAffect::getUnknown());

      if (germline->seg_method == SEG_METHOD_MAX12)
        // MAX12: two maximum k-mers (no unknown)
        {
          max12 = ckaa.max12(forbidden);

          if (max12.first.isUnknown() || max12.second.isUnknown())
            {
              because = UNSEG_TOO_FEW_ZERO ;
              return ;
            }
        }

      else
        // MAX1U: the maximum k-mers (no unknown) + unknown
        {
          CountKmerAffectAnalyser ckaa(*(germline->index), sequence);
          KmerAffect max = ckaa.max(forbidden);

          if (max.isUnknown())
            {
              because = UNSEG_TOO_FEW_ZERO ;
              return ;
            }
          max12 = make_pair(max, KmerAffect::getUnknown());
        }

      pair <KmerAffect, KmerAffect> before_after =  ckaa.sortLeftRight(max12);

      before = before_after.first ;
      after = before_after.second ;

      // This strand computation is only a heuristic, especially for chimera +/- reads
      // Anyway, it allows to gather such reads and their reverse complement into a unique window...
      // ... except when the read is quite different outside the window
      strand = reversed ? -1 : 1 ;
    }

  else
    { // Regular germline

  // Test on which strand we are, select the before and after KmerAffects
  if (nb_strand[0] == 0 && nb_strand[1] == 0) {
    because = UNSEG_TOO_FEW_ZERO ;
    return ;
  } else if (nb_strand[0] > RATIO_STRAND * nb_strand[1]) {
    strand = -1;
    before = KmerAffect(germline->affect_3, -1, germline->seed.size());
    after = KmerAffect(germline->affect_5, -1, germline->seed.size());
  } else if (nb_strand[1] > RATIO_STRAND * nb_strand[0]) {
    strand = 1;
    before = KmerAffect(germline->affect_5, 1, germline->seed.size());
    after = KmerAffect(germline->affect_3, 1, germline->seed.size());
  } else {
    // Ambiguous information: we have positive and negative strands
    // and there is not enough difference to put them apart.
    if (nb_strand[0] + nb_strand[1] >= DETECT_THRESHOLD_STRAND)
      because = UNSEG_STRAND_NOT_CONSISTENT ;
    else
      because = UNSEG_TOO_FEW_ZERO ;
    return ;
  }

    } // endif Pseudo-germline
 
  computeSegmentation(strand, before, after, threshold, multiplier);
}

KmerSegmenter::~KmerSegmenter() {
  if (kaa)
    delete kaa;

  delete box_V;
  delete box_D;
  delete box_J;
}

KmerMultiSegmenter::KmerMultiSegmenter(Sequence seq, MultiGermline *multigermline, ostream *out_unsegmented,
                                       double threshold, int nb_reads_for_evalue)
{
  bool found_seg = false ; // Found a segmentation
  double best_evalue_seg = NO_LIMIT_VALUE ; // Best evalue, segmented sequences
  int best_score_unseg = 0 ; // Best score, unsegmented sequences
  the_kseg = NULL;
  multi_germline = multigermline;
  threshold_nb_expected = threshold;

  // E-value multiplier
  double multiplier = multi_germline->germlines.size() * nb_reads_for_evalue;
#ifdef DEBUG_KMS_EVALUE
  cerr << "multiplier: germline_size=" << multi_germline->germlines.size() <<", nb_reads_for_evalue=" << nb_reads_for_evalue << endl;
#endif
  
  // Iterate over the germlines
  for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
    {
      Germline *germline = *it ;
      double incomplete_multiplier = 1;

      if (germline->code.find("+") != string::npos) {
        incomplete_multiplier = 1e9;
      }

      KmerSegmenter *kseg = new KmerSegmenter(seq, germline, threshold, multiplier*incomplete_multiplier);
      bool keep_seg = false;

      if (out_unsegmented)
        {
          // Debug, display k-mer affectation and segmentation result for this germline
          *out_unsegmented << kseg->getInfoLineWithAffects() << endl ;
        }

      // Always remember the first kseg
      if (the_kseg == NULL)
        keep_seg = true;
      
      if (kseg->isSegmented())
        {
          // Yes, it is segmented
          // Should we keep the kseg ?
          if (!found_seg || (kseg->evalue < best_evalue_seg))
            {
              keep_seg = true;
              best_evalue_seg = kseg->evalue ;

              found_seg = true;
            }
        }
      else
        {
          // It is not segmented
          // Should we keep the kseg (with the unsegmentation cause) ?
            if (kseg->score > best_score_unseg)
            {              
              best_score_unseg = kseg->score ;
              if (!found_seg)
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
}

KmerMultiSegmenter::~KmerMultiSegmenter() {
  if (the_kseg)
    delete the_kseg;
}

void KmerSegmenter::computeSegmentation(int strand, KmerAffect before, KmerAffect after,
                                        double threshold, double multiplier) {
  // Try to segment, computing 'box_V->end' and 'box_J->start'
  // If not segmented, put the cause of unsegmentation in 'because'

  affect_infos max;
  max = kaa->getMaximum(before, after);

  // E-values
  pair <double, double> pvalues = kaa->getLeftRightProbabilityAtLeastOrAbove();
  evalue_left = pvalues.first * multiplier ;
  evalue_right = pvalues.second * multiplier ;
  evalue = evalue_left + evalue_right ;
#ifdef DEBUG_KMS_EVALUE
  cerr << "\tmultiplier=" << multiplier << ",\tevalues=[" << evalue_left << ", " << evalue_right << "],\t"
       << "evalue=" << evalue << endl;
#endif

  // This can lead to UNSEG_TOO_FEW_ZERO or UNSEG_ONLY_V/J
  checkLeftRightEvaluesThreshold(threshold, strand);

  if (because != NOT_PROCESSED)
    return ;

  if (!max.max_found) {
    // The 'ratioMin' checks at the end of kaa->getMaximum() failed
    because = UNSEG_AMBIGUOUS;
    return ;
  }
  

   // There was a good segmentation point

   box_V->end = max.first_pos_max;
   box_J->start = max.last_pos_max + 1;
   if (strand == -1) {
     int tmp = sequence.size() - box_V->end - 1;
     box_V->end = sequence.size() - box_J->start - 1;
     box_J->start = tmp;
   }

  // Yes, it is segmented
  segmented = true;
  because = reversed ? SEG_MINUS : SEG_PLUS ;

  // TODO: this should also use possFromBoxes()... but 'boxes' is not defined here
  info = "VJ \t"
   + string_of_int(FIRST_POS) + " "
   + string_of_int(box_V->end + FIRST_POS) + " "
   + string_of_int(box_J->start + FIRST_POS) + " "
   + string_of_int(sequence.size() - 1 + FIRST_POS) ;
  
  // removeChevauchement is called once info was already computed: it is only to output info_extra
  info_extra += removeChevauchement();
  finishSegmentation();

  return ;
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


string check_and_resolve_overlap(string seq, int seq_begin, int seq_end,
                                 AlignBox *box_left, AlignBox *box_right,
                                 Cost segment_cost, bool reverse_V, bool reverse_J)
{
  // Overlap size
  int overlap = box_left->end - box_right->start + 1;

  if (overlap > 0)
    {
      string seq_left = seq.substr(seq_begin, box_left->end - seq_begin + 1);
      string seq_right = seq.substr(box_right->start, seq_end - box_right->start + 1);

      int score_r[overlap+1];
      int score_l[overlap+1];
      
      //LEFT
      DynProg dp_l = DynProg(seq_left, revcomp(box_left->ref, reverse_V),
			   DynProg::Local, segment_cost);
      score_l[0] = dp_l.compute();

      
      //RIGHT
      // reverse right sequence
      string ref_right=string(box_right->ref.rbegin(), box_right->ref.rend());
      ref_right = revcomp(ref_right, reverse_J);
      seq_right=string(seq_right.rbegin(), seq_right.rend());


      DynProg dp_r = DynProg(seq_right, ref_right,
			   DynProg::Local, segment_cost);
      score_r[0] = dp_r.compute();



      int trim_l[overlap+1];
      int trim_r[overlap+1];

      for(size_t i=0; i<=(size_t)overlap; i++) {
        score_l[i] = i < seq_left.size()  ? dp_l.best_score_on_i(seq_left.size()  - i, trim_l + i) : MINUS_INF ;
        score_r[i] = i < seq_right.size() ? dp_r.best_score_on_i(seq_right.size() - i, trim_r + i) : MINUS_INF ;
      }


// #define DEBUG_OVERLAP
#ifdef DEBUG_OVERLAP
     cout << "=== check_and_resolve_overlap" << endl;
     cout << seq << endl;
     cout << "boxes: " << *box_left << "/" << *box_right << endl ; 

      // cout << dp_l ;
      // cout << dp_r ;

      cout << "seq:" << seq_left << "\t\t" << seq_right << endl;
      cout << "ref:" << box_left->ref << "\t\t" << ref_right << endl;
      for(int i=0; i<=overlap; i++)
        cout << i << "  left: " << score_l[i] << "/" << trim_l[i] << "     right: " << score_r[i] << "/" << trim_r[i] << endl;
#endif

      int score = MINUS_INF;
      int best_i = 0 ;
      int best_j = 0 ;


      // Find (i, j), with i+j >= overlap,
      // maximizing score_l[j] + score_r[i]
      for (int i=0; i<=overlap; i++){
	for (int j=overlap-i; j<=overlap; j++){
          int score_ij = score_l[i] + score_r[j];

	  if (score_ij > score) {
            best_i = i ;
            best_j = j ;
            box_left->del_right = box_left->ref.size() - trim_l[i];
	    box_right->del_left = box_right->ref.size() - trim_r[j];
	    score = score_ij;
	  }
	}
      }

      box_left->end -= best_i ;
      box_right->start += best_j ;

#ifdef DEBUG_OVERLAP
      cout << "overlap: " << overlap << ", " << "best_overlap_split: " << score
           << "    left: " << best_i << "-" << box_left->del_right << " @" << box_left->end
           << "    right:" << best_j << "-" << box_right->del_left << " @" << box_right->start
           << endl;
      cout << "boxes: " << *box_left << " / " << *box_right << endl ;
#endif
    } // end if (overlap > 0)

  // From box_left->end + 1 to box_right->start - 1
  return seq.substr(box_left->end + 1, box_right->start - box_left->end - 1);
}

bool comp_pair (pair<int,int> i,pair<int,int> j)
{
  return ( i.first > j.first);
}


void align_against_collection(string &read, BioReader &rep, int forbidden_rep_id,
                              bool reverse_ref, bool reverse_both, bool local,
                              AlignBox *box, Cost segment_cost, bool banded_dp,
                              double evalue_threshold)
{
  
  int best_score = MINUS_INF ;
  box->ref_nb = MINUS_INF ;
  int best_best_i = (int) string::npos ;
  int best_best_j = (int) string::npos ;
  int best_first_i = (int) string::npos ;
  int best_first_j = (int) string::npos ;

  vector<pair<int, int> > score_r;

  DynProg::DynProgMode dpMode = DynProg::LocalEndWithSomeDeletions;
  if (local==true) dpMode = DynProg::Local;

  // With reverse_ref, the read is reversed to prevent calling revcomp on each reference sequence
  string sequence_or_rc = revcomp(read, reverse_ref);
  bool onlyBottomTriangle = !local && banded_dp ;
  
  for (int r = 0 ; r < rep.size() ; r++)
    {
      if (r == forbidden_rep_id)
        continue;

      DynProg dp = DynProg(sequence_or_rc, rep.sequence(r),
			   dpMode, // DynProg::SemiGlobalTrans, 
			   segment_cost, // DNA
			   reverse_both, reverse_both,
                          rep.read(r).marked_pos);

      int score = dp.compute(onlyBottomTriangle, BOTTOM_TRIANGLE_SHIFT);
      
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
	  box->ref_nb = r ;
	  box->ref_label = rep.label(r) ;

          if (!local)
            dp.backtrack();
          box->marked_pos = dp.marked_pos_i ;
	}
	
	score_r.push_back(make_pair(score, r));

	// #define DEBUG_SEGMENT      

#ifdef DEBUG_SEGMENT	
	cout << rep.label(r) << " " << score << " " << dp.best_i << endl ;
#endif

    }

  int length = best_best_i;     // end position of the alignment in the read
  int del_end = rep.sequence(box->ref_nb).size() - best_best_j;
  if (reverse_ref || reverse_both) {
    length = read.length() - length - 1;
    del_end = best_best_j;
  }
  length = min(length, (int) rep.sequence(box->ref_nb).size());
  length += del_end;
  // length is an estimation of the number of aligned nucleotides. It would be better with #2138
  int min_number_of_matches = min(int(length * FRACTION_ALIGNED_AT_WORST), length - BOTTOM_TRIANGLE_SHIFT); // Minimal number of matches we can have with a triangle
  int max_number_of_insertions = length - min_number_of_matches;
  int score_with_limit_number_of_indels =  min_number_of_matches * segment_cost.match + max_number_of_insertions * segment_cost.insertion;
  float evalue = sequence_or_rc.size() * rep.totalSize() * segment_cost.toPValue(best_score);
  if (onlyBottomTriangle && (best_score < score_with_limit_number_of_indels
                             || evalue > evalue_threshold)) {
    // Too many indels/mismatches, let's do a full DP
    align_against_collection(read, rep, forbidden_rep_id, reverse_ref, reverse_both,
                             local, box, segment_cost, false,evalue_threshold);
    return;
  }

    sort(score_r.begin(),score_r.end(),comp_pair);

  box->ref = rep.sequence(box->ref_nb);
  box->del_right = reverse_both ? best_best_j : box->ref.size() - best_best_j - 1;
  box->del_left = best_first_j;
  box->start = best_first_i;
  box->rep = &rep; 
  box->score = score_r;

#ifdef DEBUG_SEGMENT	
  cout << "best: " << box->ref_label << " " << best_score ;
  cout << "del/del2/begin:" << (box->del_right) << "/" << (box->del_left) << "/" << (box->start) << endl;
  cout << endl;
#endif

  if (reverse_ref)
    // Why -1 here and +1 in dynprog.cpp /// best_i = m - best_i + 1 ;
    best_best_i = read.length() - best_best_i - 1 ;

  box->end = best_best_i ;
}

string format_del(int deletions)
{
  return deletions ? *"(" + string_of_int(deletions) + " del)" : "" ;
}

FineSegmenter::FineSegmenter(Sequence seq, Germline *germline, Cost segment_c,  
                double threshold, double multiplier, int kmer_threshold, int alternative_genes)
{
  box_V = new AlignBox("5");
  box_D = new AlignBox("4");
  box_J = new AlignBox("3");
  this->alternative_genes = alternative_genes;
  segmented = false;
  dSegmented = false;
  because = NOT_PROCESSED ;
  segmented_germline = germline ;
  info_extra = "" ;
  label = seq.label ;
  sequence = seq.sequence ;
  segment_cost=segment_c;
  evalue = NO_LIMIT_VALUE;
  evalue_left = NO_LIMIT_VALUE;
  evalue_right = NO_LIMIT_VALUE;
  box_V->marked_pos = 0;
  box_J->marked_pos = 0;

  CDR3start = -1;
  CDR3end = -1;

  JUNCTIONstart = -1;
  JUNCTIONend = -1;

  bool reverse_V = false ;
  bool reverse_J = false ;

  if ((germline->seg_method == SEG_METHOD_MAX12) || (germline->seg_method == SEG_METHOD_MAX1U))
    {
      // We check whether this sequence is segmented with MAX12 or MAX1U (with default e-value parameters)
      KmerSegmenter *kseg = new KmerSegmenter(seq, germline, THRESHOLD_NB_EXPECTED, 1);
      if (kseg->isSegmented())
        {
          reversed = kseg->isReverse();

          KmerAffect left = reversed ? KmerAffect(kseg->after, true) : kseg->before ;
          KmerAffect right = reversed ? KmerAffect(kseg->before, true) : kseg->after ;

          delete kseg ;

          reverse_V = (left.getStrand() == -1);
          reverse_J = (right.getStrand() == -1);

          code = "Unexpected ";

          code += left.toStringSigns() + germline->index->getLabel(left).basename;
          code += "/";
          code += right.toStringSigns() + germline->index->getLabel(right).basename;
          info_extra += " " + left.toString() + "/" + right.toString() + " (" + code + ")";

          if (germline->seg_method == SEG_METHOD_MAX1U)
            return ;

          germline->override_rep5_rep3_from_labels(left, right);
        }
      else
        {
          delete kseg ;
          return ;
        }
    }

  // Strand determination, with KmerSegmenter (with default e-value parameters)
  // Note that we use only the 'strand' component
  // When the KmerSegmenter fails, continue with positive strand
  // TODO: flag to force a strand / to test both strands ?

  KmerSegmenter *kseg = new KmerSegmenter(seq, germline, THRESHOLD_NB_EXPECTED, 1);
  reversed = kseg->isReverse();
  delete kseg ;
  
  sequence_or_rc = revcomp(sequence, reversed); // sequence, possibly reversed

  // the threshold is lowered by the number of independent tests made
  double standardised_threshold_evalue = threshold / multiplier;

  /* Read mapping */
  if (germline->seg_method == SEG_METHOD_ONE)
    {
      align_against_collection(sequence_or_rc, germline->rep_4, NO_FORBIDDEN_ID, false, false,
                               true, // local
                               box_D, segment_cost, false, standardised_threshold_evalue);

      segmented = true ;
      because = reversed ? SEG_MINUS : SEG_PLUS ;

      boxes.clear();
      boxes.push_back(box_D);
      code = codeFromBoxes(boxes, sequence_or_rc);

      box_V->end = box_D->start;
      box_J->start = box_D->end;
      finishSegmentation();

      return;
    }


  /* Regular 53 Segmentation */
  if(kmer_threshold != NO_LIMIT_VALUE){
    FilterWithACAutomaton* f = germline->getFilter_5();
    this->filtered_rep_5 = f->filterBioReaderWithACAutomaton(sequence_or_rc, kmer_threshold);
    align_against_collection(sequence_or_rc, this->filtered_rep_5, NO_FORBIDDEN_ID, reverse_V, reverse_V, false,
                                   box_V, segment_cost, false, standardised_threshold_evalue);
  }else{
    align_against_collection(sequence_or_rc, germline->rep_5, NO_FORBIDDEN_ID, reverse_V, reverse_V, false,
                             box_V, segment_cost, false, standardised_threshold_evalue);
  }
  align_against_collection(sequence_or_rc, germline->rep_3, NO_FORBIDDEN_ID, reverse_J, !reverse_J, false,
                           box_J, segment_cost, false, standardised_threshold_evalue);
  // J was run with '!reverseJ', we copy the box informations from right to left
  // Should this directly be handled in align_against_collection() ?
  box_J->start = box_J->end ;
  box_J->del_left = box_J->del_right;

  /* E-values */
  evalue_left  = multiplier * sequence.size() * germline->rep_5.totalSize() * segment_cost.toPValue(box_V->score[0].first);
  evalue_right = multiplier * sequence.size() * germline->rep_3.totalSize() * segment_cost.toPValue(box_J->score[0].first);
  evalue = evalue_left + evalue_right ;

  /* Unsegmentation causes */
  if (box_V->end == (int) string::npos)
    {
      evalue_left = BAD_EVALUE ;
    }
      
  if (box_J->start == (int) string::npos)
    {
      evalue_right = BAD_EVALUE ;
    }

  checkLeftRightEvaluesThreshold(threshold, reversed ? -1 : 1);

  if (because != NOT_PROCESSED)
    {
      segmented = false;
      info = " @" + string_of_int (box_V->end + FIRST_POS) + "  @" + string_of_int(box_J->start + FIRST_POS) ;
      return ;
    }

  /* The sequence is segmented */
  segmented = true ;
  because = reversed ? SEG_MINUS : SEG_PLUS ;

    //overlap VJ
  seg_N = check_and_resolve_overlap(sequence_or_rc, 0, sequence_or_rc.length(),
                                    box_V, box_J, segment_cost, reverse_V, reverse_J);

  // Reset extreme positions
  box_V->start = 0;
  box_J->end = sequence.length()-1;

  // Why could this happen ?
  if (box_J->start>=(int) sequence.length())
    box_J->start=sequence.length()-1;

  // seg_N will be recomputed in finishSegmentation()

  boxes.clear();
  boxes.push_back(box_V);
  boxes.push_back(box_J);
  code = codeFromBoxes(boxes, sequence_or_rc);
  info = posFromBoxes(boxes);

  finishSegmentation();
}

bool FineSegmenter::FineSegmentD(Germline *germline,
                                 AlignBox *box_Y, AlignBox *box_DD, AlignBox *box_Z,
                                 int forbidden_id,
                                 int extend_DD_on_Y, int extend_DD_on_Z,
                                 double evalue_threshold, double multiplier){

    // Create a zone where to look for D, adding some nucleotides on both sides
    int l = box_Y->end - extend_DD_on_Y;
    if (l<0) 
      l=0 ;

    int r = box_Z->start + extend_DD_on_Z;

    string seq = getSequence().sequence; // segmented sequence, possibly rev-comped

    if (r > (int) seq.length())
      r = seq.length();
      
    string str = seq.substr(l, r-l);

    // the threshold is lowered by the number of independent tests made
    double standardised_threshold_evalue = evalue_threshold / multiplier;

    // Align
    align_against_collection(str, germline->rep_4, forbidden_id, false, false, true,
                             box_DD, segment_cost, false, standardised_threshold_evalue);

    box_DD->start += l ;
    box_DD->end += l ;

    float evalue_D = multiplier * (r-l) * germline->rep_4.totalSize() * segment_cost.toPValue(box_DD->score[0].first);

#ifdef DEBUG_EVALUE
    cout << "multiplier " << multiplier
         << ", length " << (r-l)
         << ", D rep size " << germline->rep_4.totalSize()
         << " ==> e-value (D) " << std::scientific << evalue_D << std::fixed << endl ;
#endif

    if (evalue_D > evalue_threshold)
      return false;

    int save_box_Y_end = box_Y->end ;
    int save_box_Y_del_right = box_Y->del_right ;
    int save_box_Z_del_left = box_Z->del_left;
    int save_box_Z_start = box_Z->start ;
    
    //overlap VD
    seg_N1 = check_and_resolve_overlap(seq, 0, box_DD->end,
                                       box_Y, box_DD, segment_cost);
    
    //overlap DJ
    seg_N2 = check_and_resolve_overlap(seq, box_DD->start, seq.length(),
                                       box_DD, box_Z, segment_cost);

    // Realign D to see whether the score is enough
    DynProg dp = DynProg(box_DD->getSequence(seq), box_DD->ref,
                         DynProg::SemiGlobal, segment_cost, false, false);
    int score_new = dp.compute();

    float evalue_DD_new = multiplier * box_DD->getLength() * box_DD->ref.size() * segment_cost.toPValue(score_new);

#ifdef DEBUG_EVALUE
    cout << "multiplier " << multiplier
         << ", length " << box_DD->getLength()
         << ", D size " << box_DD->ref.size()
         << " ==> e-value (DD) " << std::scientific << evalue_DD_new << std::fixed << endl ;
#endif

    if (evalue_DD_new > evalue_threshold)
      {
        // Restore box_Y and box_Z
        box_Y->end =  save_box_Y_end;
        box_Y->del_right = save_box_Y_del_right;
        box_Z->del_left = save_box_Z_del_left;
        box_Z->start = save_box_Z_start;

        return false ;
      }

    return true;
}

void FineSegmenter::FineSegmentD(Germline *germline, bool several_D,
                                 double evalue_threshold, double multiplier){

  if (segmented){

    dSegmented = FineSegmentD(germline,
                              box_V, box_D, box_J,
                              NO_FORBIDDEN_ID,
                              EXTEND_D_ZONE, EXTEND_D_ZONE,
                              evalue_threshold, multiplier);

    if (!dSegmented)
      return ;

#define DD_MIN_SEARCH 5

    boxes.clear();
    boxes.push_back(box_V);

    if (several_D && (box_D->start - box_V->end >= DD_MIN_SEARCH))
      {
        AlignBox *box_D1 = new AlignBox("4a");

        bool d1 = FineSegmentD(germline,
                               box_V, box_D1, box_D,
                               box_D->ref_nb,
                               EXTEND_D_ZONE, 0,
                               evalue_threshold, multiplier);

        if (d1)
          boxes.push_back(box_D1);
        else
          delete box_D1;
      }

    boxes.push_back(box_D);

    if (several_D && (box_J->start - box_D->end >= DD_MIN_SEARCH))
      {
        AlignBox *box_D2 = new AlignBox("4b");

        bool d2 = FineSegmentD(germline,
                               box_D, box_D2, box_J,
                               box_D->ref_nb,
                               0, EXTEND_D_ZONE,
                               evalue_threshold, multiplier);

        if (d2)
          boxes.push_back(box_D2);
        else
          delete box_D2;
      }

    boxes.push_back(box_J);
    code = codeFromBoxes(boxes, sequence_or_rc);
    info = posFromBoxes(boxes);

    finishSegmentationD();
  }
}

void FineSegmenter::findCDR3(){

  JUNCTIONstart = box_V->marked_pos;
  JUNCTIONend = box_J->marked_pos;

  // There are two cases when we can not detect a JUNCTION/CDR3:
  // - Germline V or J gene has no 'marked_pos'
  // - Sequence may be too short on either side, and thus the backtrack did not find a suitable 'marked_pos'
  if (JUNCTIONstart == 0 || JUNCTIONend == 0) {
    JUNCTIONstart = -1 ;
    JUNCTIONend = -1 ;    
    return;
  }

  // We require at least two codons
  if (JUNCTIONend - JUNCTIONstart + 1 < 6) {
    JUNCTIONstart = -1 ;
    JUNCTIONend = -1 ;
    return ;
  }

  // We require at least one more nucleotide to export a CDR3
  if (JUNCTIONend - JUNCTIONstart + 1 < 7) {
    JUNCTIONproductive = false ;
    return ;
  }
  
  // IMGT-CDR3 is, on each side, 3 nucleotides shorter than IMGT-JUNCTION
  CDR3start = JUNCTIONstart + 3;
  CDR3end = JUNCTIONend - 3;

  CDR3nuc = subsequence(getSequence().sequence, CDR3start, CDR3end);

  if (CDR3nuc.length() % 3 == 0)
    {
      CDR3aa = nuc_to_aa(CDR3nuc);
    }
  else
    {
      // start of codon fully included in the germline J
      int CDR3startJfull = JUNCTIONend - ((JUNCTIONend - box_J->start) / 3) * 3 + 1 ;

      CDR3aa =
        nuc_to_aa(subsequence(getSequence().sequence, CDR3start, CDR3startJfull-1)) +
        nuc_to_aa(subsequence(getSequence().sequence, CDR3startJfull, CDR3end));
    }

  JUNCTIONaa = nuc_to_aa(subsequence(getSequence().sequence, JUNCTIONstart, CDR3start-1))
    + CDR3aa + nuc_to_aa(subsequence(getSequence().sequence, CDR3end+1, JUNCTIONend));

  JUNCTIONproductive = (CDR3nuc.length() % 3 == 0) && (! hasInFrameStopCodon(getSequence().sequence, (JUNCTIONstart-1)%3));
  // Reminder: JUNCTIONstart is 1-based
}

void FineSegmenter::checkWarnings(CloneOutput *clone)
{
  if (isSegmented())
    {
      // Non-recombined D7-27/J1 sequence
      if ((box_V->ref_label.find("IGHD7-27") != string::npos)
          && (box_J->ref_label.find("IGHJ1") != string::npos)
          && ((getMidLength() >= 90) || (getMidLength() <= 94)))
        {
          clone->add_warning("W61", "Non-recombined D7-27/J1 sequence", LEVEL_ERROR);
        }

      // Multiple candidate assignations
      for (auto box: {box_V, box_J})
      {
        if ((box->score.size() > 1) && (box->score[0].first == box->score[1].first)) {
          string genes = "";
          for (auto it: box->score) {
            if (it.first < box->score[0].first) break;
            genes += " " + box->rep->label(it.second);
          }
          clone->add_warning("W69", "Several genes with equal probability:" + genes, LEVEL_WARN);
        }
      }
    }
}

void FineSegmenter::toOutput(CloneOutput *clone){
  json seg;

  for (AlignBox *box: boxes)
    {
      box->addToOutput(clone, this->alternative_genes);
    }

  if (isSegmented()) {

    clone->set("name", code);

    if (isDSegmented()) {
      clone->setSeg("N1", seg_N1.size());
      clone->setSeg("N2", seg_N2.size());
    }
    else {
      clone->setSeg("N", seg_N.size());
    }

    if (CDR3start >= 0) {
        clone->setSeg("cdr3", {
            {"start", CDR3start},
            {"stop", CDR3end},
            {"aa", CDR3aa}
        });
    }

    if (JUNCTIONstart >= 0) {
        clone->setSeg("junction", {
            {"start", JUNCTIONstart},
            {"stop", JUNCTIONend},
            {"aa", JUNCTIONaa},
            {"productive", JUNCTIONproductive}
        });
    }
  }
  else // not segmented
  {
    clone->set("name", label);
  }
}

json toJsonSegVal(string s) {
  return {{"val", s}};
}

void KmerSegmenter::toOutput(CloneOutput *clone) {
    json seg;
    int sequenceSize = sequence.size();

    if (evalue > NO_LIMIT_VALUE)
      clone->setSeg("evalue", toJsonSegVal(scientific_string_of_double(evalue)));
    if (evalue_left > NO_LIMIT_VALUE)
      clone->setSeg("evalue_left",  toJsonSegVal(scientific_string_of_double(evalue_left)));
    if (evalue_right > NO_LIMIT_VALUE)
      clone->setSeg("evalue_right", toJsonSegVal(scientific_string_of_double(evalue_right)));

    if (getKmerAffectAnalyser() != NULL) {
      clone->setSeg("affectValues", {
        {"start", 1},
        {"stop", sequenceSize},
        {"seq", getKmerAffectAnalyser()->toStringValues()}
      });
    
      clone->setSeg("affectSigns", {
        {"start", 1},
        {"stop", sequenceSize},
        {"seq", getKmerAffectAnalyser()->toStringSigns()}
      });
    }
}


FineSegmenter::~FineSegmenter() {

  // Push box_V, box_D, box_J in boxes if they are not already there
  for (AlignBox* box: {box_V, box_D, box_J})
    if (std::find(boxes.begin(), boxes.end(), box) == boxes.end())
      boxes.push_back(box);

  // Delete all boxes
  for (AlignBox* box: boxes)
    delete box;
}
