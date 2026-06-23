#ifndef GERMLINE_H_
#define GERMLINE_H_

#include <memory>
#include <tuple>
#include <vector>
#include <string>
#include "bioreader.hpp"
#include "filter.hpp"
#include "germline_element.hpp"
#include "germline_element_repository.hpp"
#include "kmerstore.h"
#include "../lib/json_fwd.hpp"
#include "../lib/json.hpp"

using json = nlohmann::json;

#define PSEUDO_UNEXPECTED         "unexpected"
#define PSEUDO_UNEXPECTED_CODE    'x'

enum SEGMENTATION_METHODS {
  SEG_METHOD_53,      // Regular or incomplete germlines, 5'-3'
  SEG_METHOD_543,     // Regular or incomplete germlines, 5'-3', with an additional middle gene (such a D gene)
  SEG_METHOD_MAX12,   // Pseudo-germline, most two frequent kmer affectations  (-2)
  SEG_METHOD_MAX1U,   // Pseudo-germline, most frequent kmer affection and unknwon affectation (-4)
  SEG_METHOD_ONE      // Map a read onto a genomic region, without recombination. Evil.
} ;

template <typename Affect>
class MultiGermline;

/**
 * A germline should always be integrated in a MultiGermline
 */
template <typename Affect>
class Germline {
private:
  std::map<GermlineElement<Affect>*, bool> allocated;
  std::list<std::string> segments;
  json config;
  std::map<std::string, std::set<GermlineElement<Affect>*>> germline_elements; // bind segment code (as in .g file) to germline element
  GermlineElementRepository<Affect> *repository;
  bool repository_allocated;
  Tshortcut shortcut;
  std::string code;
  int max_indexing;
  int seg_method;
  MultiGermline<Affect> *multi;
  std::map<Tshortcut, std::set<size_t>> shortcuts_to_identifier; // bind shortcuts to the recombinations in
  // which they are used. The integers denote the number of the recombination
  IKmerStore<Affect> *index;
  std::vector<std::set<std::string>> segments_by_recomb; // Store for each recombination the set of segments it has
  bool ignore_uppercase_nt;
public:

  /**
   * @return an Unsegmented germline
   */
  static Germline<Affect>* getUnseg();

  /**
   * Builds an unexpected germline
   */
  Germline();

  /**
   * Build a germline provided:
   * @param code: the code of the germline (eg. IGH)
   * @param shortcut: the shortcut of the germline (eg. H). Beware the shortcut used by each element of the germline will differ
   *                  from this shortcut.
   * @param path: relative or absolute path used to get to the path given in the filenames parameter.
   * @param filenames: a json object describing the repertoires, as in the germline file (in the key "recombinations")
   * @param config: a json object. A key "order" describes the segment, in the order they should appear.
   * An object "segments", for which each key correspond to each segment, this object describes some informations:
   * - the seeds (key "seed")
   * - the code (key "code", eg. "V")
   * - whether or not to index this data (key "index", with values "0" or "1")
   * - whether or not a filter should be build (key "build", with values "0" or "1").
   * An example of the maps: {"order": ["5", "3"], "segments": {"5": {"seed": "10s", "code": "V", "build": "0", "index": "1"}, "3": {"seed": "12s", "code": "J", "build": "0", "index": "1"}}}
   * @param repository: the repository of already used germline elements in order to not build them several times.
   * if NULL, the repository will be created.
   * @param max_indexing: the maximal number of bases to index (default: 0, everything).
   * @param ignore_uppercase_nt: ignore all the nucleotides that are uppercase, once the germlines have
   *                             been indexed. This means that those sequences will be ignored for all
   *                             downstream analyses that do not rely on the k-mer index
   */
  Germline(std::string code, Tshortcut shortcut, std::string path, json filenames,
           json &config, GermlineElementRepository<Affect> *repository = NULL,
           int max_indexing = 0, bool ignore_uppercase_nt=false);

  ~Germline();

  /**
   * @return the locus of the germline
   */
  std::string getCode() const;

  /**
   * @return the segment of the recombination which has the provided shortcut or nullptr if no such segment exist
   * @complexity access to a map
   */
  GermlineElement<Affect>* getGermlineElement(const Tshortcut &shortcut) const;

  /**
   * @return the germline elements associated to the segment (code as given in the .g file, eg. "5" or "3")
   */
  std::set<GermlineElement<Affect>*> getSegmentGermlineElements(const std::string &segment) const;

  /**
   * @return germline_elements
   */
  const std::map<std::string, std::set<GermlineElement<Affect>*>>& getGermlineElements() const;

  /**
   * @return the index used on the germline
   */
  IKmerStore<Affect> *getIndex() const;

  MultiGermline<Affect> *getMultiGermline() const;

  /**
   * @return a reader to all the elements that are stored in the Germline for the given segment
   */
  std::shared_ptr<BioReader> getReader(const std::string &segment) const;

  /**
   * @return the considered segmentation method
   */
  int getSegmentationMethod() const;

  /**
   * @return the segments of the recombination which are indexed. They are returned in the order they should be recombined.
   */
  const std::list<std::string>& getSegments() const;

  GermlineElementRepository<Affect> *getRepository() const;

  /**
   * @return the seed for the given segment
   */
  std::string getSeed(const std::string &segment) const;

  /**
   * @return shortcut of the whole germline
   */
  Tshortcut getShortcut() const;

  /**
   * @return get all the shortcuts used for each segment
   */
  std::set<Tshortcut> getAllShortcuts() const;

  /**
   * @param segment: the segment to query
   * @param shortcuts: will additionally require that the segment exists for a recombination involving
   *        the provided shortcuts
   * @return true iff the germline has a segment with this name
  */
  bool hasSegment(const std::string &segment,
                  const std::set<Tshortcut> &shortcuts=std::set<Tshortcut>()) const;

  /**
   * @return whether a recombination with all the shortcuts provided in parameter correspond to an existing recombination in the
   * current germline. At least nb_match shortcuts must correspond to the recombination.
   */
  bool hasRecombination(const std::set<Tshortcut> &shortcuts, size_t nb_match=2) const;

  /**
   * Update the index with the content of the germline
   * (the germline elements which were not already added to the index)
   * @post getIndex() == index (unless getCode() == PSEUDO_UNEXPECTED)
   */
  void addToIndex(IKmerStore<Affect> *index);
  /**
   * Finishes the construction of the index.
   * @pre addToIndex() must have been called before
   */
  void finish();

  void setMultiGermline(MultiGermline<Affect> *multi);

  /**
   * Unset the index
   * @post getIndex() == NULL. The memory occupied by the index is not freed
   */
  void unsetIndex();
  template <typename A>
  friend ostream &operator<<(ostream &out, const Germline<A> &germline);

  private:
    /**
     * @return the recombination numbers that contain all the given shortcuts
     */
    std::set<size_t> getRecombinationsNb(const std::set<Tshortcut> &shortcuts) const;
};


#endif // GERMLINE_H_
