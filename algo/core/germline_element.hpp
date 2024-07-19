#ifndef GERMLINE_ELEMENT_HPP
#define GERMLINE_ELEMENT_HPP
#include "bioreader.hpp"
#include "kmerstore.h"
#include <algorithm>
#include <string>

// JUNCTION/CDR3 extraction from gapped V/J sequences
#define        CYS104_IN_GAPPED_V  310   // First nucleotide of Cys104
#define PHE118_TRP118_IN_GAPPED_J   38   // Last nucleotide of Phe118/Trp118

// Tshortcut should be a type as small as possible that can be converted to string.
// By default it should be a char.
template <typename Tshortcut, typename Affect>
class GermlineElement {

private:
  std::set<std::string> locus;             // A string such as IGH
  std::set<std::string> segment;           // Segment name (eg. 5, 3)
  std::string affect;           // The full affectation with shortcut, code and extra information (such as V/D/J). This is however
                                // a common affect even if the affect is used for several different loci.
  std::string seed;             // The seed used in the current germline
  std::string filename;         // Filename containing the sequences
  Tshortcut shortcut;           // The shortcut
  int max_indexing;
  
public:
  GermlineElement(std::string locus, std::string segment, Tshortcut shortcut, std::string affect,
                  std::string filename, std::string seed="", int max_indexing=0);

  std::string getAffect() const;
  /**
   * @return code of the locus
   */
  std::set<std::string> getLocus() const;
  std::string getFilename() const;
  std::string getSeed() const;
  /**
   * @return the segment code (ie. "5" or "3")
   */
  std::set<std::string> getSegment() const;
  Tshortcut getShortcut() const;

  void add(std::string locus, std::string segment);
  
  /**
   * Add all the sequences in filename with the provided seed to the index
   */
  void addToIndex(IKmerStore<Tshortcut, Affect> *index);
};


template<typename Tshortcut, typename Affect>
GermlineElement<Tshortcut, Affect>::GermlineElement(std::string locus, std::string segment, Tshortcut shortcut, std::string affect,
                                       std::string filename, std::string seed, int max_indexing)
  :locus({locus}), segment({segment}), affect(affect), seed(seed), filename(filename), shortcut(shortcut), max_indexing(max_indexing)
{}

template<typename Tshortcut, typename Affect>
std::string GermlineElement<Tshortcut, Affect>::getAffect() const {
  return affect;
}

template<typename Tshortcut, typename Affect>
std::set<std::string> GermlineElement<Tshortcut, Affect>::getLocus() const {
  return locus;
}

template<typename Tshortcut, typename Affect>
std::string GermlineElement<Tshortcut, Affect>::getFilename() const {
  return filename;
}

template<typename Tshortcut, typename Affect>
std::string GermlineElement<Tshortcut, Affect>::getSeed() const {
  return seed;
}

template<typename Tshortcut, typename Affect>
std::set<std::string> GermlineElement<Tshortcut, Affect>::getSegment() const {
  return segment;
}

template<typename Tshortcut, typename Affect>
Tshortcut GermlineElement<Tshortcut, Affect>::getShortcut() const {
  return shortcut;
}

template<typename Tshortcut, typename Affect>
void GermlineElement<Tshortcut, Affect>::add(std::string locus, std::string segment) {
  this->locus.insert(locus);
  this->segment.insert(segment);
}

template<typename Tshortcut, typename Affect>
void GermlineElement<Tshortcut, Affect>::addToIndex(IKmerStore<Tshortcut, Affect> *index) {
  bool regular = ! (std::all_of(locus.begin(), locus.end(), [](const std::string &s) {return s.find("+") != std::string::npos;}));
  int mark_pos = 0;
  if (regular) {
    if (segment.count("5")>0)
      mark_pos = CYS104_IN_GAPPED_V;
    else if (segment.count("3") > 0)
      mark_pos = PHE118_TRP118_IN_GAPPED_J;
  }
  BioReader reader(2, "|", mark_pos);
  reader.add(filename);
  std::cerr << "Insert " << affect << std::endl;
  index->insert(reader, affect, this, max_indexing, seed);
}


std::string to_string(char c) {
  return std::string(1, c);
}
#endif
