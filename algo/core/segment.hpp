/*
  This file is part of Vidjil-algo <http://www.vidjil.org>
  Copyright (C) 2011-2024 by VidjilNet consortium and Bonsai bioinformatics
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
#ifndef SEGMENT_HPP
#define SEGMENT_HPP
#include <algorithm>    // std::sort
#include <cassert>
#include "segment.h"
#include "tools.h"
#include "output.h"
#include "../lib/json.hpp"
#include "affectanalyser.hpp"
#include <sstream>
#include <cstring>
#include <string>
#include "windowExtractor.hpp"
#include <set>
#include "automaton.h"
#include <map>
#include <memory>
#include <string>
#define NO_FORBIDDEN_ID (-1)

template<typename Affect>
AlignBox<Affect>::AlignBox(string _key, string _color) {
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

template<typename Affect>
void AlignBox<Affect>::reverse() {
  int start_ = start;
  start = seq_length - end - 1;
  end = seq_length - start_ - 1;

  int del_left_ = del_left;
  del_left = del_right;
  del_right = del_left_;
}

template<typename Affect>
int AlignBox<Affect>::getLength() {
  return end - start + 1 ;
}

template<typename Affect>
char AlignBox<Affect>::getInitial() {

  // TRGV -> V, IGHD -> D...
  if (ref_label.size() > 4)
    return ref_label[3] ;

  if (key.size())
    return key[0] ;

  return '?' ;
}

template<typename Affect>
string AlignBox<Affect>::getSequence(string sequence) {
  return sequence.substr(start, end-start+1);
}

template<typename Affect>
bool AlignBox<Affect>::CoverFirstPos()
{
  return (start <= 0);
}

template<typename Affect>
bool AlignBox<Affect>::CoverLastPos()
{
  return (end >= seq_length - 1);
}

template<typename Affect>
void AlignBox<Affect>::addToOutput(CloneOutput *clone, int alternative_genes) {

  json j;
  j["name"] = ref_label;

  if (key != "3" || !CoverLastPos()) // end information for J
    {
      j["stop"] = end + 1;
      j["delRight"] = del_right;
    }

  if (key != "5" || !CoverFirstPos()) // start information for V
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

template<typename Affect>
int AlignBox<Affect>::posInRef(int i) const {
  // Works now only for V/J boxes

  if (del_left >= 0) // J
    return i - start + del_left + 1; // Why +1 ?

  if (del_right >= 0) // V
    return i + (ref.size() - del_right) - end ;

  return -99;
}

template<typename Affect>
string AlignBox<Affect>::refToString(int from, int to) const {

  stringstream s;

  s << left << setw(SHOW_NAME_WIDTH) << ref_label << " " ;

  int j = posInRef(from);

  s << right << setw(4) << j << " " ;

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

  s << right << setw(4) << j  ;

  return s.str();
}

template<typename Affect>
void show_colored_read(ostream &out, Sequence seq, const AlignBox<Affect> *box_V, const AlignBox<Affect> *box_J, int start_5, int end_3)
{
  out << left << setw(SHOW_NAME_WIDTH) << seq.label.substr(0,SHOW_NAME_WIDTH) << " "
      << right << setw(4) << start_5 << " " ;

  out << V_COLOR << seq.sequence.substr(start_5, box_V->end - start_5 + 1)
      << NO_COLOR
      << seq.sequence.substr(box_V->end+1, (box_J->start - 1) - (box_V->end + 1) +1)
      << J_COLOR
      << seq.sequence.substr(box_J->start, end_3 - box_J->start + 1)
      << NO_COLOR ;

  out << right << setw(4) << end_3 << endl ;
}

template<typename Affect>
void show_colored_read_germlines(ostream &out, Sequence seq, const AlignBox<Affect> *box_V, const AlignBox<Affect> *box_J, int max_gene_align)
{
  int align_V_length = min(max_gene_align, box_V->end - box_V->start + 1);
  int align_J_length = min(max_gene_align, (int)seq.sequence.size() - box_J->start + 1);
  int start_V = box_V->end - align_V_length + 1;
  int end_J = box_J->start + align_J_length - 1;

  show_colored_read(out, seq, box_V, box_J, start_V, end_J);
  out << box_V->refToString(start_V, end_J) << "   " << *box_V << endl ;
  out << box_J->refToString(start_V, end_J) << "   " << *box_J << endl ;
}


template<typename Affect>
ostream &operator<<(ostream &out, const AlignBox<Affect> &box)
{
  out << "[/" << box.del_left << " " ;
  out << "@" << box.start << " " ;
  out << box.ref_label << "(" << box.ref_nb << ") " ;
  out << "@" << box.end << " " ;
  out << box.del_right << "/]" ;

  return out ;
}

template<typename Affect>
string codeFromBoxes(vector <AlignBox<Affect>*> boxes, string sequence)
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

template<typename Affect>
string posFromBoxes(vector <AlignBox<Affect>*> boxes)
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


template <typename Shortcut, typename Affect>
Segmenter<Shortcut, Affect>::~Segmenter() {}

template <typename Shortcut, typename Affect>
Sequence Segmenter<Shortcut, Affect>::getSequence() const {
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

template <typename Shortcut, typename Affect>
string Segmenter<Shortcut, Affect>::getJunction(int l, int shift) {
  assert(isSegmented());

  junctionChanged = false;
  // '-w all'
  if (l == NO_LIMIT_VALUE)
    return getSequence().sequence;

  // Regular '-w'
  int central_pos = (getLeft() + getRight())/2 + shift;

  pair<int, int> length_shift = WindowExtractor<Shortcut, Affect>::get_best_length_shifts(getSequence().sequence.size(),
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

template <typename Shortcut, typename Affect>
int Segmenter<Shortcut, Affect>::getLeft() const {
  return box_V->end;
}

template <typename Shortcut, typename Affect>
int Segmenter<Shortcut, Affect>::getRight() const {
  return box_J->start;
}

template <typename Shortcut, typename Affect>
int Segmenter<Shortcut, Affect>::getMidLength() const {
  return box_J->start - box_V->end - 1;
}

template <typename Shortcut, typename Affect>
int Segmenter<Shortcut, Affect>::getLeftD() const {
  return box_D->start;
}

template <typename Shortcut, typename Affect>
int Segmenter<Shortcut, Affect>::getRightD() const {
  return box_D->end;
}

template <typename Shortcut, typename Affect>
bool Segmenter<Shortcut, Affect>::isReverse() const {
  return reversed;
}

template <typename Shortcut, typename Affect>
bool Segmenter<Shortcut, Affect>::isSegmented() const {
  return segmented;
}

template <typename Shortcut, typename Affect>
bool Segmenter<Shortcut, Affect>::isDSegmented() const {
  return dSegmented;
}

template <typename Shortcut, typename Affect>
bool Segmenter<Shortcut, Affect>::isJunctionChanged() const {
  return junctionChanged;
}
// E-values

template <typename Shortcut, typename Affect>
void Segmenter<Shortcut, Affect>::checkLeftRightEvaluesThreshold(double threshold, int strand)
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

template <typename Shortcut, typename Affect>
string Segmenter<Shortcut, Affect>::removeChevauchement()
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


template <typename Shortcut, typename Affect>
bool Segmenter<Shortcut, Affect>::finishSegmentation()
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

template <typename Shortcut, typename Affect>
bool Segmenter<Shortcut, Affect>::finishSegmentationD()
{
  string seq = getSequence().sequence;

  seg_V = seq.substr(0, box_V->end+1) ; // From pos. 0 to box_V->end
  seg_J = seq.substr(box_J->start) ;
  seg_N = seq.substr(box_V->end+1, box_J->start-box_V->end-1) ;  // Twice computed for FineSegmenter, but only once in KmerSegmenter !
  seg_D  = seq.substr(box_D->start, box_D->end-box_D->start+1) ; // From Dstart to Dend

  info = (reversed ? "- " : "+ ") + info + "\t" + code ;

  return true ;
}

template <typename Shortcut, typename Affect>
string Segmenter<Shortcut, Affect>::getInfoLine() const
{
  string s = "" ;

  s += (segmented ? "" : "\t ! ") + info ;
  s += " " + info_extra ;
  s += " " + (segmented_germline?segmented_germline->getCode():"(none)") ;
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

template <typename Shortcut, typename Affect>
string KmerSegmenter<Shortcut, Affect>::getInfoLineWithAffects() const
{
   stringstream ss;

   ss << "= " << right << setw(9) << this->segmented_germline->getCode() << " "
      << right << setw(3) << score << " "
      << left << setw(30)
      << this->getInfoLine();

   if (this->getSegmentationStatus() != UNSEG_TOO_SHORT)
   {
     ss << endl;
     ss << "# " << right << setw(9) << this->segmented_germline->getCode() << endl
        << this->getKmerAffectAnalyser()->toStringValues();
     ss << endl;
     ss << "$ " << right << setw(9) << this->segmented_germline->getCode() << endl
        << this->getKmerAffectAnalyser()->toStringSigns();
   }

   return ss.str();
}


template <typename Shortcut, typename Affect>
ostream &operator<<(ostream &out, const Segmenter<Shortcut, Affect> &s)
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

template <typename Shortcut, typename Affect>
KmerSegmenter<Shortcut, Affect>::KmerSegmenter() { kaa = 0 ; }

template <typename Shortcut, typename Affect>
KmerSegmenter<Shortcut, Affect>::KmerSegmenter(Sequence seq, IKmerStore<Shortcut, Affect> *index, int segmentation_method, MultiGermline<Shortcut, Affect> *germlines, Germline<Shortcut, Affect> *required_germline, ostream *out_unsegmented, double threshold, double multiplier)
{
  set<KmerAffect> before_set, after_set;

  this->box_V = new AlignBox<Affect>("5", V_COLOR);
  this->box_D = new AlignBox<Affect>();
  this->box_J = new AlignBox<Affect>("3", J_COLOR);

  this->CDR3start = -1;
  this->CDR3end = -1;

  this->JUNCTIONstart = -1;
  this->JUNCTIONend = -1;

  this->label = seq.label ;
  this->sequence = seq.sequence ;
  this->info = "" ;
  this->info_extra = "seed";
  this->segmented = false;
  this->segmented_germline = required_germline ;
  this->reversed = false;
  this->because = NOT_PROCESSED ; // Cause of unsegmentation
  this->score = 0 ;
  this->evalue = NO_LIMIT_VALUE;
  this->evalue_left = NO_LIMIT_VALUE;
  this->evalue_right = NO_LIMIT_VALUE;

  int s = (size_t)index->getS() ;
  int length = this->sequence.length() ;

  if (length < s)
    {
      this->because = UNSEG_TOO_SHORT;
      kaa = NULL;
      return ;
    }

  kaa = new MultipleAffectAnalyser<Shortcut>(*(index), this->sequence);

  // Check strand consistency among the affectations.
  int strand=0;
  int nb_strand[2] = {0,0};     // In cell 0 we'll put the number of negative
                                // strand, while in cell 1 we'll put the
                                // positives
  for (KmerAffect affect: kaa->getAffectations()) {
    if (! affect.isAmbiguous() && ! affect.isUnknown()) {
      strand = affect.getStrand();
      nb_strand[(strand + 1) / 2] += kaa->count(affect); // (strand+1) / 2 → 0 if strand == -1; 1 if strand == 1
    }
  }

  this->score = nb_strand[0] + nb_strand[1] ; // Used only for non-segmented germlines

  this->reversed = (nb_strand[0] > nb_strand[1]) ;



  if (segmentation_method == SEG_METHOD_ONE) {

    KmerAffectAnalyser<Shortcut> ka(*(index), this->sequence);

    std::set<GermlineElement<Shortcut, Affect>*> elements = required_germline->getGermlineElements("4");
    GermlineElement<Shortcut, Affect> *element = *(elements.begin());
    if (elements.size() > 1)
      std::cerr << "WARNING: only one Germline element from segment 4 will be taken into account ("
                << element->getFilename() << ")" << std::endl;
    KmerAffect kmer = KmerAffect(element->getAffect(), 1, element->getSeed().size());
    int c = ka.count(kmer);

    // E-value
    double pvalue = ka.getProbabilityAtLeastOrAbove(kmer, c);
    this->evalue = pvalue * multiplier ;

    if (this->evalue >= threshold)
      {
        this->because = UNSEG_TOO_FEW_ZERO ;
        return ;
      }

    int pos = ka.minimize(kmer, DEFAULT_MINIMIZE_ONE_MARGIN, DEFAULT_MINIMIZE_WIDTH);

    if (pos == NO_MINIMIZING_POSITION)
      {
        this->because = UNSEG_TOO_SHORT_FOR_WINDOW;
        return ;
      }

    this->segmented = true ;
    this->because = this->reversed ? SEG_MINUS : SEG_PLUS ;

    this->info = "=" + string_of_int(c) + " @" + string_of_int(pos) ;

    // getJunction() will be centered on pos
    this->box_V->end = pos;
    this->box_J->start = pos;
    this->finishSegmentation();

    return ;
  }

  if ((segmentation_method == SEG_METHOD_MAX12)
      || (segmentation_method == SEG_METHOD_MAX1U))
    { // Pseudo-germline, MAX12 and MAX1U
      pair <set<KmerAffect>, set<KmerAffect>> max12 ;

      set<KmerAffect> forbidden;
      forbidden.insert(KmerAffect::getAmbiguous());
      forbidden.insert(KmerAffect::getUnknown());

      if (segmentation_method == SEG_METHOD_MAX12)
        // MAX12: two maximum k-mers (no unknown)
        {
          size_t nb_affects = kaa->countUnique();
          KmerAffect unique_affect;
          if (nb_affects == 0) {
            this->because = UNSEG_TOO_FEW_ZERO ;
            return ;
          }
          if (nb_affects == 1) {
            unique_affect = *(kaa->getAffectations().begin());
          } else {
            max12 = kaa->max12(forbidden);
            if (max12.first.size() &&
                max12.first.begin()->isAmbiguous()) {
              this->because = UNSEG_TOO_FEW_ZERO ;
              return ;
            }
            if (max12.first.size() &&
                max12.second.begin()->isAmbiguous()) {
              nb_affects = 1;
              unique_affect = *(max12.first.begin());
            }
          }
          if (nb_affects == 1) {
            char affect = unique_affect.getLabel()[0];
            for (auto g: index->getLabel(unique_affect)) {
              if (g->getSegment().count("5") > 0 && g->getAffect()[0] == affect) {
                this->because = UNSEG_ONLY_V;
                return;
              } else if (g->getSegment().count("3") > 0 && g->getAffect()[0] == affect) {
                this->because = UNSEG_ONLY_J;
                return;
              }
            }
          }
        }

      else
        // MAX1U: the maximum k-mers (no unknown) + unknown
        {
          CountKmerAffectAnalyser<Shortcut> ckaa(*(index), this->sequence);
          KmerAffect max = ckaa.max(forbidden);

          if (max.isUnknown())
            {
              this->because = UNSEG_TOO_FEW_ZERO ;
              return ;
            }
          max12 = make_pair(set<KmerAffect>({max}), set<KmerAffect>({KmerAffect::getUnknown()}));
        }

      pair <set<KmerAffect>, set<KmerAffect>> before_after =  kaa->sortLeftRight(max12);

      before_set = before_after.first;
      after_set = before_after.second;

    }


  if (this->because == 0) {
    chooseGermline(germlines, before_set, after_set, strand);
    strand = this->reversed ? -1 : 1 ;
    if (this->segmented_germline) {
      // Test on which strand we are
      if (nb_strand[0] == 0 && nb_strand[1] == 0) {
        this->because = UNSEG_TOO_FEW_ZERO ;
        return ;
      } else if (nb_strand[0] < RATIO_STRAND * nb_strand[1] &&
                 nb_strand[1] < RATIO_STRAND * nb_strand[0]) {
        // Ambiguous information: we have positive and negative strands
        // and there is not enough difference to put them apart.
        if (nb_strand[0] + nb_strand[1] >= DETECT_THRESHOLD_STRAND)
          this->because = UNSEG_STRAND_NOT_CONSISTENT ;
        else
          this->because = UNSEG_TOO_FEW_ZERO ;
      }
    } else
      this->segmented_germline = Germline<Shortcut, Affect>::getUnseg();
  }
  if (this->because == 0)
    computeSegmentation(strand, before, after, threshold, multiplier);

  if (out_unsegmented)
    {
      // Debug, display k-mer affectation and segmentation result for this germline
      *out_unsegmented << this->getInfoLineWithAffects() << endl ;
    }
}

template <typename Shortcut, typename Affect>
void KmerSegmenter<Shortcut, Affect>::chooseGermline(MultiGermline<Shortcut, Affect> *germlines, set<KmerAffect> &before_set, set<KmerAffect> &after_set, int strand) {

  std::set<Shortcut> before_shortcuts, after_shortcuts;
  std::list<Germline<Shortcut, Affect> *> possible_germlines;
  std::list<std::pair<KmerAffect, KmerAffect>> matching_affects;
  std::map<Shortcut, KmerAffect> shortcut_affect;

  for (auto val: before_set) {
    Shortcut c = germlines->getRepository()->getShortcut(val);
    before_shortcuts.insert(c);
    shortcut_affect[c] = val;
  }
  for (auto val: after_set) {
    Shortcut c = germlines->getRepository()->getShortcut(val);
    after_shortcuts.insert(c);
    shortcut_affect[c] = val;
  }

  assert(germlines != nullptr);

  for (auto left: before_shortcuts) {
    for (auto right: after_shortcuts) {
      std::set<Shortcut> shortcuts = {left, right};
      Germline<Shortcut, Affect> *possible_germline = germlines->getGermline(shortcuts);
      if (possible_germline != nullptr) {
        possible_germlines.push_back(possible_germline);
        matching_affects.push_back(std::make_pair(shortcut_affect[left], shortcut_affect[right]));
      }
    }
  }

  if (possible_germlines.size() >= 1) {
    if (possible_germlines.size() > 1) {
      // Select shorter codes as it will favor complete over incomplete recombinations
      auto min_germline = std::min_element(possible_germlines.begin(), possible_germlines.end(),
                                           [](Germline<Shortcut, Affect>* a, Germline<Shortcut, Affect>* b) {
                                             return a->getCode().length() < b->getCode().length();
                                           });
      this->segmented_germline = *min_germline;
    } else {
      this->segmented_germline = possible_germlines.front();
    }
    std::pair<KmerAffect, KmerAffect> affects = matching_affects.front();
    std::list<std::string> segments = this->segmented_germline->getSegments();
    before = affects.first;
    after = affects.second;
    if (this->segmented_germline->getGermlineElement(germlines->getRepository()->getShortcut(affects.first))->getSegment().count(segments.front()) > 0) {
      this->reversed = false;
    } else {
      this->reversed = true;
    }
  } else {
        // Unexpected germline ?
    before = *(before_set.begin());
    after = *(after_set.begin());
  }
#ifdef DEBUG
  PRINT_VAR(segmented_germline->getCode());
  PRINT_VAR(segmented_germline);
  PRINT_VAR(before);
  PRINT_VAR(after);
  // PRINT_VAR(multiplier);
#endif

}


template <typename Shortcut, typename Affect>
KmerSegmenter<Shortcut, Affect>::~KmerSegmenter() {
  if (kaa)
    delete kaa;

  delete this->box_V;
  delete this->box_D;
  delete this->box_J;
}

template <typename Shortcut, typename Affect>
void KmerSegmenter<Shortcut, Affect>::computeSegmentation(int strand, KmerAffect before, KmerAffect after,
                                        double threshold, double multiplier) {
  // Try to segment, computing 'box_V->end' and 'box_J->start'
  // If not segmented, put the cause of unsegmentation in 'because'

  affect_infos max;
  max = kaa->getMaximum(before, after);

  // E-values
  pair <double, double> pvalues = kaa->getLeftRightProbabilityAtLeastOrAbove();
  this->evalue_left = pvalues.first * multiplier ;
  this->evalue_right = pvalues.second * multiplier ;
  this->evalue = this->evalue_left + this->evalue_right ;
#ifdef DEBUG_KMS_EVALUE
  cerr << "\tmultiplier=" << multiplier << ",\tevalues=[" << evalue_left << ", " << evalue_right << "],\t"
       << "evalue=" << evalue << endl;
#endif

  // This can lead to UNSEG_TOO_FEW_ZERO or UNSEG_ONLY_V/J
  this->checkLeftRightEvaluesThreshold(threshold, strand);

  if (this->because != NOT_PROCESSED)
    return ;

  if (!max.max_found) {
    // The 'ratioMin' checks at the end of kaa->getMaximum() failed
    this->because = UNSEG_AMBIGUOUS;
    return ;
  }


   // There was a good segmentation point

   this->box_V->end = max.first_pos_max;
   this->box_J->start = max.last_pos_max + 1;
   if (strand == -1) {
     int tmp = this->sequence.size() - this->box_V->end - 1;
     this->box_V->end = this->sequence.size() - this->box_J->start - 1;
     this->box_J->start = tmp;
   }
   this->box_V->affect = before;
   this->box_J->affect = after;

  // Yes, it is segmented
  this->segmented = true;
  this->because = this->reversed ? SEG_MINUS : SEG_PLUS ;

  // TODO: this should also use possFromBoxes()... but 'boxes' is not defined here
  this->info = "VJ \t"
   + string_of_int(FIRST_POS) + " "
   + string_of_int(this->box_V->end + FIRST_POS) + " "
   + string_of_int(this->box_J->start + FIRST_POS) + " "
   + string_of_int(this->sequence.size() - 1 + FIRST_POS) ;

  // removeChevauchement is called once info was already computed: it is only to output info_extra
  this->info_extra += this->removeChevauchement();
  this->finishSegmentation();

  return ;
}

template <typename Shortcut, typename Affect>
MultipleAffectAnalyser<Shortcut> *KmerSegmenter<Shortcut, Affect>::getKmerAffectAnalyser() const {
  return kaa;
}

template <typename Shortcut, typename Affect>
int Segmenter<Shortcut, Affect>::getSegmentationStatus() const {
  return because;
}

template <typename Shortcut, typename Affect>
void Segmenter<Shortcut, Affect>::setSegmentationStatus(int status) {
  because = status;
  segmented = (status == SEG_PLUS || status == SEG_MINUS);
}

// FineSegmenter


template<typename Affect>
string check_and_resolve_overlap(string seq, int seq_begin, int seq_end,
                                 AlignBox<Affect> *box_left, AlignBox<Affect> *box_right,
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


template<typename Affect>
void align_against_collection(string &read, std::shared_ptr<BioReader> rep, int forbidden_rep_id,
                              bool reverse_ref, bool reverse_both, bool local,
                              AlignBox<Affect> *box, Cost segment_cost, bool banded_dp,
                              double evalue_threshold)
{

  int best_score = MINUS_INF ;

  box->rep = rep;
  box->ref_nb = MINUS_INF ;
  box->start = (int) string::npos ;
  box->end = (int) string::npos ;
  int best_best_j = (int) string::npos ;

  vector<pair<int, int> > score_r;

  DynProg::DynProgMode dpMode = DynProg::LocalEndWithSomeDeletions;
  if (local==true) dpMode = DynProg::Local;

  // With reverse_ref, the read is reversed to prevent calling revcomp on each reference sequence
  string sequence_or_rc = revcomp(read, reverse_ref);
  bool onlyBottomTriangle = !local && banded_dp ;

  for (int r = 0 ; r < rep->size() ; r++)
    {
      if (r == forbidden_rep_id)
        continue;

      DynProg dp = DynProg(sequence_or_rc, rep->sequence(r),
			   dpMode, // DynProg::SemiGlobalTrans,
			   segment_cost, // DNA
			   reverse_both, reverse_both,
                          rep->read(r).marked_pos);

      int score = dp.compute(onlyBottomTriangle, BOTTOM_TRIANGLE_SHIFT);

      if (score > best_score)
      {
         dp.backtrack();
         best_score = score ;

         // Reference identification
         box->ref_nb = r ;

         // Alignment positions *on the read*
         box->start = dp.first_i;            // start position
         box->end = dp.best_i ;              // end position
         box->marked_pos = dp.marked_pos_i ; // marked position

         // Alignment positions *on the reference*
         box->del_left = dp.first_j;     // around start position
         best_best_j = dp.best_j;        // around end position
       }

	score_r.push_back(make_pair(score, r));

	// #define DEBUG_SEGMENT

#ifdef DEBUG_SEGMENT
	cout << rep->label(r) << " " << score << " " << dp.first_i <<  " " << dp.best_i << endl ;
#endif

    }

  sort(score_r.begin(),score_r.end(),comp_pair);
  box->score = score_r;

  box->ref_label = rep->label(box->ref_nb) ;
  box->ref = rep->sequence(box->ref_nb);
  box->del_right = box->ref.size() - best_best_j - 1;
  box->seq_length = read.length();

  if (reverse_both) {
    box->reverse();
  }

  // Should we run a full DP?
  int length = min(box->getLength(), (int) box->ref.size());
  // length is an estimation of the number of aligned nucleotides.
  int min_number_of_matches = min(int(length * FRACTION_ALIGNED_AT_WORST), length - BOTTOM_TRIANGLE_SHIFT); // Minimal number of matches we can have with a triangle
  int max_number_of_insertions = length - min_number_of_matches;
  int score_with_limit_number_of_indels =  min_number_of_matches * segment_cost.match + max_number_of_insertions * segment_cost.insertion;
  float evalue = sequence_or_rc.size() * rep->totalSize() * segment_cost.toPValue(best_score);
  if (onlyBottomTriangle && (best_score < score_with_limit_number_of_indels
                             || evalue > evalue_threshold)) {
    // Too many indels/mismatches, let's do a full DP
    align_against_collection(read, rep, forbidden_rep_id, reverse_ref, reverse_both,
                             local, box, segment_cost, false,evalue_threshold);
    return;
  }

#ifdef DEBUG_SEGMENT
  cout << "reverse_both " << reverse_both << "   reverse_left " << reverse_ref << "   local " << local << endl;
  cout << "best:   " << *box <<  "   read length: " << read.length() << "   ref length: " <<   box->ref.size()  << endl;
#endif


}

string format_del(int deletions)
{
  return deletions ? *"(" + string_of_int(deletions) + " del)" : "" ;
}

template <typename Shortcut, typename Affect>
FineSegmenter<Shortcut, Affect>::FineSegmenter(Sequence seq, Germline<Shortcut, Affect> *germline, Cost segment_c,
                double threshold, double multiplier, int kmer_threshold, int alternative_genes)
{
  this->box_V = new AlignBox<Affect>("5");
  this->box_D = new AlignBox<Affect>("4");
  this->box_J = new AlignBox<Affect>("3");
  this->alternative_genes = alternative_genes;
  this->segmented = false;
  this->dSegmented = false;
  this->because = NOT_PROCESSED ;
  this->segmented_germline = germline ;
  this->info_extra = "" ;
  this->label = seq.label ;
  this->sequence = seq.sequence ;
  this->segment_cost=segment_c;
  this->evalue = NO_LIMIT_VALUE;
  this->evalue_left = NO_LIMIT_VALUE;
  this->evalue_right = NO_LIMIT_VALUE;
  this->box_V->marked_pos = 0;
  this->box_J->marked_pos = 0;

  this->CDR3start = -1;
  this->CDR3end = -1;

  this->JUNCTIONstart = -1;
  this->JUNCTIONend = -1;

  if (germline == Germline<Shortcut, Affect>::getUnseg())
    return;

  bool reverse_V = false ;
  bool reverse_J = false ;
  GermlineElement<Shortcut, Affect> *g_left=NULL, *g_right=NULL;

  if ((germline->getSegmentationMethod() == SEG_METHOD_MAX12) || (germline->getSegmentationMethod() == SEG_METHOD_MAX1U))
    {
      // We check whether this sequence is segmented with MAX12 or MAX1U (with default e-value parameters)
      KmerSegmenter<Shortcut, Affect> *kseg = new KmerSegmenter<Shortcut, Affect>(seq, germline->getIndex(), germline->getSegmentationMethod(), germline->getMultiGermline(), germline, nullptr, THRESHOLD_NB_EXPECTED, 1);
      if (kseg->isSegmented())
        {
          this->reversed = kseg->isReverse();

          KmerAffect left = this->reversed ? KmerAffect(kseg->after, true) : kseg->before ;
          KmerAffect right = this->reversed ? KmerAffect(kseg->before, true) : kseg->after ;

          delete kseg ;

          reverse_V = (left.getStrand() == -1);
          reverse_J = (right.getStrand() == -1);

          this->code = "Unexpected ";

          // TODO: don't choose the first one
          g_left = *(germline->getIndex()->getLabel(left).begin());
          g_right = *(germline->getIndex()->getLabel(right).begin());
          this->code += left.toStringSigns() + *(g_left->getLocus().begin());
          this->code += "/";
          this->code += right.toStringSigns() + *(g_right->getLocus().begin());
          this->info_extra += " " + left.toString() + "/" + right.toString() + " (" + this->code + ")";

          if (germline->getSegmentationMethod() == SEG_METHOD_MAX1U)
            return ;

        }
      else
        {
          delete kseg ;
          return ;
        }
    } else {
    // Strand determination, with KmerSegmenter (with default e-value parameters)
    // Note that we use only the 'strand' component
    // When the KmerSegmenter fails, continue with positive strand
    // TODO: flag to force a strand / to test both strands ?
    KmerSegmenter<Shortcut, Affect> *kseg = new KmerSegmenter<Shortcut, Affect>(seq, germline->getIndex(), germline->getSegmentationMethod(), germline->getMultiGermline(), germline, nullptr, THRESHOLD_NB_EXPECTED, 1);
    this->reversed = kseg->isReverse();
    delete kseg ;
  }

  this->sequence_or_rc = revcomp(this->sequence, this->reversed); // sequence, possibly reversed

  // the threshold is lowered by the number of independent tests made
  double standardised_threshold_evalue = threshold / multiplier;

  /* Read mapping */
  if (germline->getSegmentationMethod() == SEG_METHOD_ONE)
    {
      std::shared_ptr<BioReader> leftReader = g_left->getReader();
      align_against_collection(this->sequence_or_rc, leftReader, NO_FORBIDDEN_ID, false, false,
                               true, // local
                               this->box_D, this->segment_cost, false, standardised_threshold_evalue);

      this->segmented = true ;
      this->because = this->reversed ? SEG_MINUS : SEG_PLUS ;

      boxes.clear();
      boxes.push_back(this->box_D);
      this->code = codeFromBoxes(boxes, this->sequence_or_rc);

      this->box_V->end = this->box_D->start;
      this->box_J->start = this->box_D->end;
      this->finishSegmentation();

      return;
    }


  std::shared_ptr<BioReader> leftReader = g_left->getReader(),
    rightReader = g_right->getReader();
  /* Regular 53 Segmentation */
  if(kmer_threshold != NO_LIMIT_VALUE && g_left->getFilter() != nullptr ){
    FilterWithACAutomaton<Shortcut>* f = g_left->getFilter();
    this->filtered_rep_5 = f->filterBioReaderWithACAutomaton(this->sequence_or_rc, kmer_threshold);
    align_against_collection(this->sequence_or_rc, std::make_shared<BioReader>(this->filtered_rep_5), NO_FORBIDDEN_ID, reverse_V, reverse_V, false,
                                   this->box_V, this->segment_cost, false, standardised_threshold_evalue);
  }else{
    align_against_collection(this->sequence_or_rc, leftReader, NO_FORBIDDEN_ID, reverse_V, reverse_V, false,
                             this->box_V, this->segment_cost, false, standardised_threshold_evalue);
  }
  align_against_collection(this->sequence_or_rc, rightReader, NO_FORBIDDEN_ID, reverse_J, !reverse_J, false,
                           this->box_J, this->segment_cost, false, standardised_threshold_evalue);

  /* E-values */
  this->evalue_left  = multiplier * this->sequence.size() * leftReader->totalSize() * this->segment_cost.toPValue(this->box_V->score[0].first);
  this->evalue_right = multiplier * this->sequence.size() * rightReader->totalSize() * this->segment_cost.toPValue(this->box_J->score[0].first);
  this->evalue = this->evalue_left + this->evalue_right ;

  /* Unsegmentation causes */
  if (this->box_V->end == (int) string::npos)
    {
      this->evalue_left = BAD_EVALUE ;
    }

  if (this->box_J->start == (int) string::npos)
    {
      this->evalue_right = BAD_EVALUE ;
    }

  this->checkLeftRightEvaluesThreshold(threshold, this->reversed ? -1 : 1);

  if (this->because != NOT_PROCESSED)
    {
      this->segmented = false;
      this->info = this->code + " @" + string_of_int (this->box_V->end + FIRST_POS) + "  @" + string_of_int(this->box_J->start + FIRST_POS) ;
      return ;
    }

  /* The sequence is segmented */
  this->segmented = true ;
  this->because = this->reversed ? SEG_MINUS : SEG_PLUS ;

    //overlap VJ
  this->seg_N = check_and_resolve_overlap(this->sequence_or_rc, 0, this->sequence_or_rc.length(),
                                    this->box_V, this->box_J, this->segment_cost, reverse_V, reverse_J);

  // Why could this happen ?
  if (this->box_J->start>=(int) this->sequence.length())
    this->box_J->start=this->sequence.length()-1;

  // seg_N will be recomputed in finishSegmentation()

  boxes.clear();
  boxes.push_back(this->box_V);
  boxes.push_back(this->box_J);
  this->code = codeFromBoxes(boxes, this->sequence_or_rc);
  this->info = posFromBoxes(boxes);

  this->finishSegmentation();
}

template <typename Shortcut, typename Affect>
bool FineSegmenter<Shortcut, Affect>::FineSegmentD(Germline<Shortcut, Affect> *germline,
                                 AlignBox<Affect> *box_Y, AlignBox<Affect> *box_DD, AlignBox<Affect> *box_Z,
                                 int forbidden_id,
                                 int extend_DD_on_Y, int extend_DD_on_Z,
                                 double evalue_threshold, double multiplier){

    // Create a zone where to look for D, adding some nucleotides on both sides
    int l = box_Y->end - extend_DD_on_Y;
    if (l<0)
      l=0 ;

    int r = box_Z->start + extend_DD_on_Z;

    string seq = this->getSequence().sequence; // segmented sequence, possibly rev-comped

    if (r > (int) seq.length())
      r = seq.length();

    string str = seq.substr(l, r-l);

    // the threshold is lowered by the number of independent tests made
    double standardised_threshold_evalue = evalue_threshold / multiplier;

    // Align
    std::shared_ptr<BioReader> reader_4 = germline->getReader("4");
    align_against_collection(str, reader_4, forbidden_id, false, false, true,
                             box_DD, this->segment_cost, false, standardised_threshold_evalue);

    box_DD->start += l ;
    box_DD->end += l ;

    float evalue_D = multiplier * (r-l) * reader_4->totalSize() * this->segment_cost.toPValue(box_DD->score[0].first);

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
    this->seg_N1 = check_and_resolve_overlap(seq, 0, box_DD->end,
                                       box_Y, box_DD, this->segment_cost);

    //overlap DJ
    this->seg_N2 = check_and_resolve_overlap(seq, box_DD->start, seq.length(),
                                       box_DD, box_Z, this->segment_cost);

    // Realign D to see whether the score is enough
    DynProg dp = DynProg(box_DD->getSequence(seq), box_DD->ref,
                         DynProg::SemiGlobal, this->segment_cost, false, false);
    int score_new = dp.compute();

    float evalue_DD_new = multiplier * box_DD->getLength() * box_DD->ref.size() * this->segment_cost.toPValue(score_new);

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

template <typename Shortcut, typename Affect>
void FineSegmenter<Shortcut, Affect>::FineSegmentD(Germline<Shortcut, Affect> *germline, bool several_D,
                                 double evalue_threshold, double multiplier){

  if (this->segmented){

    this->dSegmented = FineSegmentD(germline,
                              this->box_V, this->box_D, this->box_J,
                              NO_FORBIDDEN_ID,
                              EXTEND_D_ZONE, EXTEND_D_ZONE,
                              evalue_threshold, multiplier);

    if (!this->dSegmented)
      return ;

#define DD_MIN_SEARCH 5

    boxes.clear();
    boxes.push_back(this->box_V);

    if (several_D && (this->box_D->start - this->box_V->end >= DD_MIN_SEARCH))
      {
        AlignBox<Affect> *box_D1 = new AlignBox<Affect>("4a");

        bool d1 = FineSegmentD(germline,
                               this->box_V, box_D1, this->box_D,
                               this->box_D->ref_nb,
                               EXTEND_D_ZONE, 0,
                               evalue_threshold, multiplier);

        if (d1)
          boxes.push_back(box_D1);
        else
          delete box_D1;
      }

    boxes.push_back(this->box_D);

    if (several_D && (this->box_J->start - this->box_D->end >= DD_MIN_SEARCH))
      {
        AlignBox<Affect> *box_D2 = new AlignBox<Affect>("4b");

        bool d2 = FineSegmentD(germline,
                               this->box_D, box_D2, this->box_J,
                               this->box_D->ref_nb,
                               0, EXTEND_D_ZONE,
                               evalue_threshold, multiplier);

        if (d2)
          boxes.push_back(box_D2);
        else
          delete box_D2;
      }

    boxes.push_back(this->box_J);
    this->code = codeFromBoxes(boxes, this->sequence_or_rc);
    this->info = posFromBoxes(boxes);

    this->finishSegmentationD();
  }
}

template <typename Shortcut, typename Affect>
void FineSegmenter<Shortcut, Affect>::findCDR3(){

  this->JUNCTIONstart = this->box_V->marked_pos;
  this->JUNCTIONend = this->box_J->marked_pos;

  // There are two cases when we can not detect a JUNCTION/CDR3:
  // - Germline V or J gene has no 'marked_pos'
  // - Sequence may be too short on either side, and thus the backtrack did not find a suitable 'marked_pos'
  if (this->JUNCTIONstart == 0 || this->JUNCTIONend == 0) {
    this->JUNCTIONstart = -1 ;
    this->JUNCTIONend = -1 ;
    return;
  }

  // We require at least two codons
  if (this->JUNCTIONend - this->JUNCTIONstart + 1 < 6) {
    this->JUNCTIONstart = -1 ;
    this->JUNCTIONend = -1 ;
    return ;
  }

  // Now a junction is detected. Is it productive?
  this->JUNCTIONproductive = false ;

  // We require at least one more nucleotide to export a CDR3
  if (this->JUNCTIONend - this->JUNCTIONstart + 1 < 7) {
    this->JUNCTIONunproductive = UNPROD_TOO_SHORT;
    return ;
  }

  // IMGT-CDR3 is, on each side, 3 nucleotides shorter than IMGT-JUNCTION
  this->CDR3start = this->JUNCTIONstart + 3;
  this->CDR3end = this->JUNCTIONend - 3;

  this->CDR3nuc = subsequence(this->getSequence().sequence, this->CDR3start, this->CDR3end);

  if (this->CDR3nuc.length() % 3 == 0)
    {
      this->CDR3aa = nuc_to_aa(this->CDR3nuc);
      string sequence_startV_stopJ = subsequence(this->getSequence().sequence, this->box_V->start+1, this->box_J->end+1);
      int frame = (this->JUNCTIONstart-1 - this->box_V->start) % 3;

      if (hasInFrameStopCodon(sequence_startV_stopJ, frame))
      {
        // Non-productive CDR3
        this->JUNCTIONunproductive = UNPROD_STOP_CODON;
      }
      else
      {
        // Productive CDR3
        this->JUNCTIONproductive = true;
      }
    }
  else
    {
      // Non-productive CDR3
      this->JUNCTIONunproductive = UNPROD_OUT_OF_FRAME;

      // We want to output a '#' somewhere around the end of the N, and then restart
      // at the start of the first codon fully included in the germline J
      int CDR3startJfull = this->JUNCTIONend - ((this->JUNCTIONend - this->box_J->start) / 3) * 3 + 1 ;

      this->CDR3aa =
        nuc_to_aa(subsequence(this->getSequence().sequence, this->CDR3start, CDR3startJfull-1)) +
        nuc_to_aa(subsequence(this->getSequence().sequence, CDR3startJfull, this->CDR3end));
    }

  this->JUNCTIONaa = nuc_to_aa(subsequence(this->getSequence().sequence, this->JUNCTIONstart, this->CDR3start-1))
    + this->CDR3aa + nuc_to_aa(subsequence(this->getSequence().sequence, this->CDR3end+1, this->JUNCTIONend));

  // Reminder: JUNCTIONstart is 1-based

  // IGH without a {WP}GxG pattern
  if (this->JUNCTIONproductive && (this->segmented_germline->getCode().find("IGH") != string::npos))
  {
    string FR4aastart = nuc_to_aa(subsequence(this->getSequence().sequence, this->CDR3end+1, this->CDR3end+1+11));

    if (!WPGxG(FR4aastart))
    {
      this->JUNCTIONproductive = false;
      this->JUNCTIONunproductive = UNPROD_NO_WPGxG;
    }
  }
}

template <typename Shortcut, typename Affect>
void FineSegmenter<Shortcut, Affect>::checkWarnings(CloneOutput *clone, bool phony)
{
  if (this->isSegmented())
    {
      // Non-recombined D7-27/J1 sequence
      if ((this->box_V->ref_label.find("IGHD7-27") != string::npos)
          && (this->box_J->ref_label.find("IGHJ1") != string::npos)
          && ((this->getMidLength() >= 90) && (this->getMidLength() <= 94)))
        {
          clone->add_warning(W61_NON_RECOMBINED_D7_27_J1, "Non-recombined D7-27/J1 sequence", LEVEL_ERROR, phony);
        }

      // Multiple candidate assignations
      for (auto box: {this->box_V, this->box_J})
      {
        if ((box->score.size() > 1) && (box->score[0].first == box->score[1].first)) {
          string genes = "";
          for (auto it: box->score) {
            if (it.first < box->score[0].first) break;
            genes += " " + box->rep->label(it.second);
          }
          clone->add_warning("W69", "Several genes with equal probability:" + genes, LEVEL_WARN, phony);
        }
      }
    }
}

template <typename Shortcut, typename Affect>
void FineSegmenter<Shortcut, Affect>::showAlignments(ostream &out){
  show_colored_read_germlines(out, this->getSequence(), this->box_V, this->box_J, SHOW_MAX_GENE_ALIGNMENT);
}

template <typename Shortcut, typename Affect>
void FineSegmenter<Shortcut, Affect>::toOutput(CloneOutput *clone, bool details){
  UNUSED(details);
  json seg;

  for (AlignBox<Affect> *box: boxes)
    {
      box->addToOutput(clone, this->alternative_genes);
    }

  clone->set("name", this->code);

  if (this->isSegmented()) {
    if (this->isDSegmented()) {
      clone->setSeg("N1", this->seg_N1.size());
      clone->setSeg("N2", this->seg_N2.size());
    }
    else {
      clone->setSeg("N", this->seg_N.size());
    }

    if (this->CDR3start >= 0) {
        clone->setSeg("cdr3", {
            {"start", this->CDR3start},
            {"stop", this->CDR3end},
            {"seq", this->CDR3nuc},
            {"aa", this->CDR3aa}
        });
    }

    if (this->JUNCTIONstart >= 0) {
        clone->setSeg("junction", {
            {"start", this->JUNCTIONstart},
            {"stop", this->JUNCTIONend},
            {"aa", this->JUNCTIONaa},
            {"productive", this->JUNCTIONproductive}
        });
        if (this->JUNCTIONunproductive.length())
        {
          clone->set(KEY_SEG, "junction", "unproductive", this->JUNCTIONunproductive);
        }
    }
  }
}

json toJsonSegVal(string s) {
  return {{"val", s}};
}

template <typename Shortcut, typename Affect>
void KmerSegmenter<Shortcut, Affect>::toOutput(CloneOutput *clone, bool details) {
    json seg;
    int sequenceSize = this->sequence.size();

    if (this->evalue > NO_LIMIT_VALUE)
      clone->setSeg("evalue", toJsonSegVal(scientific_string_of_double(this->evalue)));

    if (!details)
      return ;

    if (this->evalue_left > NO_LIMIT_VALUE)
      clone->setSeg("evalue_left",  toJsonSegVal(scientific_string_of_double(this->evalue_left)));
    if (this->evalue_right > NO_LIMIT_VALUE)
      clone->setSeg("evalue_right", toJsonSegVal(scientific_string_of_double(this->evalue_right)));

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


template <typename Shortcut, typename Affect>
FineSegmenter<Shortcut, Affect>::~FineSegmenter() {

  // Push box_V, box_D, box_J in boxes if they are not already there
  for (AlignBox<Affect>* box: {this->box_V, this->box_D, this->box_J})
    if (std::find(boxes.begin(), boxes.end(), box) == boxes.end())
      boxes.push_back(box);

  // Delete all boxes
  for (AlignBox<Affect>* box: boxes)
    delete box;
}

#endif
