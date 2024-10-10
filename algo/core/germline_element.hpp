#ifndef GERMLINE_ELEMENT_HPP
#define GERMLINE_ELEMENT_HPP
#include "bioreader.hpp"
#include "kmerstore.h"
#include "filter.hpp"
#include <algorithm>
#include <string>
#include <memory>

// JUNCTION/CDR3 extraction from gapped V/J sequences
#define        CYS104_IN_GAPPED_V  310   // First nucleotide of Cys104
#define PHE118_TRP118_IN_GAPPED_J   38   // Last nucleotide of Phe118/Trp118

#define KEYS_COMPRESS  1.65   //  enough for ~208 *01 genes (191 IGHV + ...) / 127

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
  std::shared_ptr<BioReader> reader;
  bool build_filter;
  FilterWithACAutomaton<Tshortcut> * filter;
  
public:
  GermlineElement(std::string locus, std::string segment, Tshortcut shortcut, std::string affect,
                  std::string filename, std::string seed="", int max_indexing=0, bool build_filter=false);
  ~GermlineElement();
  
  std::string getAffect() const;
  /**
   * @return code of the locus
   */
  std::set<std::string> getLocus() const;
  std::string getFilename() const;
  FilterWithACAutomaton<Tshortcut> *getFilter() const;
  /**
   * @return the marked position used for CDR3 computation (returns 0 when !isRegular()
   */
  int getMarkPos() const;
  std::shared_ptr<BioReader> getReader() const;
  std::string getSeed() const;
  /**
   * @return the segment code (ie. "5" or "3")
   */
  std::set<std::string> getSegment() const;
  Tshortcut getShortcut() const;

  /**
   * @return true iff all the loci are regular loci instead of incomplete
   */
  bool isRegular() const;

  void add(std::string locus, std::string segment);
  
  /**
   * Add all the sequences in filename with the provided seed to the index
   */
  void addToIndex(IKmerStore<Tshortcut, Affect> *index);
};


template<typename Tshortcut, typename Affect>
GermlineElement<Tshortcut, Affect>::GermlineElement(std::string locus, std::string segment, Tshortcut shortcut, std::string affect,
                                                    std::string filename, std::string seed, int max_indexing, bool build_filter)
  :locus({locus}), segment({segment}), affect(affect), seed(seed), filename(filename), shortcut(shortcut), max_indexing(max_indexing), build_filter(build_filter), filter(nullptr)
{}

template<typename Tshortcut, typename Affect>
GermlineElement<Tshortcut, Affect>::~GermlineElement() {
  if (build_filter)
    delete filter;
}

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
FilterWithACAutomaton<Tshortcut> *GermlineElement<Tshortcut, Affect>::getFilter() const {
  return filter;
}

template<typename Tshortcut, typename Affect>
int GermlineElement<Tshortcut, Affect>::getMarkPos() const {
  int mark_pos = 0;
  if (isRegular()) {
    if (segment.count("5")>0)
      mark_pos = CYS104_IN_GAPPED_V;
    else if (segment.count("3") > 0)
      mark_pos = PHE118_TRP118_IN_GAPPED_J;
  }
  return mark_pos;
}

template<typename Tshortcut, typename Affect>
std::shared_ptr<BioReader> GermlineElement<Tshortcut, Affect>::getReader() const {
  return reader;
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
bool GermlineElement<Tshortcut, Affect>::isRegular() const {
  return ! (std::all_of(locus.begin(), locus.end(), [](const std::string &s) {return s.find("+") != std::string::npos;}));
}

template<typename Tshortcut, typename Affect>
void GermlineElement<Tshortcut, Affect>::add(std::string locus, std::string segment) {
  this->locus.insert(locus);
  this->segment.insert(segment);
}

template<typename Tshortcut, typename Affect>
void GermlineElement<Tshortcut, Affect>::addToIndex(IKmerStore<Tshortcut, Affect> *index) {
  reader = std::make_shared<BioReader>(2, "|", getMarkPos());
  reader->add(filename);
  std::cerr << "Insert " << affect << std::endl;
  index->insert(*reader, affect, this, max_indexing, seed);
  if (build_filter) {
    filter = new FilterWithACAutomaton<Tshortcut>(*reader, seed, KEYS_COMPRESS);
  }
}

#endif
