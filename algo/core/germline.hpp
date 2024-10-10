#ifndef GERMLINE_HPP
#define GERMLINE_HPP

#include "bioreader.hpp"
#include "filter.hpp"
#include "germline_element.hpp"
#include "germline_element_repository.hpp"
#include "kmerstore.h"
#include "../lib/json_fwd.hpp"
#include "../lib/json.hpp"
#include <memory>
#include <tuple>
#include <vector>
#include <string>

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

template <typename Tshortcut, typename Affect>
class MultiGermline;

template <typename Tshortcut, typename Affect>
class Germline {
private:
  std::map<GermlineElement<Tshortcut, Affect>*, bool> allocated;
  std::list<std::string> segments;
  json config;
  std::map<std::string, std::set<GermlineElement<Tshortcut, Affect>*>> germline_elements; // bind segment code (as in .g file) to germline element
  GermlineElementRepository<Tshortcut, Affect> *repository;
  Tshortcut shortcut;
  std::string code;
  int max_indexing;
  int seg_method;
  MultiGermline<Tshortcut, Affect> *multi;
  std::map<Tshortcut, std::set<size_t>> shortcuts_to_identifier; // bind shortcuts to the recombinations in
  // which they are used. The integers denote the number of the recombination
  IKmerStore<Tshortcut, Affect> *index;
public:

  /**
   * @return an Unsegmented germline
   */
  static Germline<Tshortcut, Affect>* getUnseg();
  
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
   */
  Germline(std::string code, Tshortcut shortcut, std::string path, json filenames,
           json config, GermlineElementRepository<Tshortcut, Affect> *repository = NULL,
           int max_indexing = 0);

  ~Germline();

  /**
   * @return the locus of the germline
   */
  std::string getCode() const;

  /**
   * @return the segment of the recombination which has the provided shortcut or nullptr if no such segment exist
   * @complexity access to a map
   */
  GermlineElement<Tshortcut, Affect>* getGermlineElement(const Tshortcut &shortcut) const;
  
  /**
   * @return the germline elements associated to the segment (code as given in the .g file, eg. "5" or "3")
   */
  std::set<GermlineElement<Tshortcut, Affect>*> getGermlineElements(const std::string &segment) const;

  /**
   * @return the index used on the germline
   */
  IKmerStore<Tshortcut, Affect> *getIndex() const;
  
  MultiGermline<Tshortcut, Affect> *getMultiGermline() const;

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
  std::list<std::string> getSegments() const;

  GermlineElementRepository<Tshortcut, Affect> *getRepository() const;

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
   * @return whether a recombination with all the shortcuts provided in parameter correspond to an existing recombination in the
   * current germline. At least nb_match shortcuts must correspond to the recombination.
   */ 
  bool hasRecombination(const std::set<Tshortcut> &shortcuts, size_t nb_match=2) const;

  /**
   * Finishes the construction of the germlines, which involves updating the index with the content of the germline
   * (the germline elements which were not already added to the index) and finishes the construction of the index.
   */
  void finish(IKmerStore<Tshortcut, Affect> *index);
  void setMultiGermline(MultiGermline<Tshortcut, Affect> *multi);

  template <typename S, typename A>
  friend ostream &operator<<(ostream &out, const Germline<S, A> &germline);
  
};

template <typename Tshortcut, typename Affect>
Germline<Tshortcut, Affect>::Germline() {
  shortcut = PSEUDO_UNEXPECTED_CODE;
  code = PSEUDO_UNEXPECTED;
  repository = nullptr;
  multi = nullptr;
  index = nullptr;
}

template <typename Tshortcut, typename Affect>
Germline<Tshortcut, Affect>::Germline(std::string code, Tshortcut shortcut,
                                      std::string path, json filenames,
                                      json &jconfig,
                                      GermlineElementRepository<Tshortcut, Affect> *repo,
                                      int max_indexing)
  : segments(jconfig["order"].get<std::list<std::string>>()), config(jconfig["segments"]), repository(repo), shortcut(shortcut), code(code),
                                                             max_indexing(max_indexing),
                                                             multi(nullptr), index(nullptr) {

  if (filenames[0].size() != config.size())
    throw runtime_error("config and filenames list differ in size");
  
  if (!repository) {
    this->repository = new GermlineElementRepository<Tshortcut, Affect>();
  }

  std::map<std::string, BioReader> readers;
  size_t recombination_nb = 0;

  seg_method = SEG_METHOD_MAX12;

  for (const auto& filename_map : filenames) {
    for (const auto& item: filename_map.items()) {
      for (const std::string filenam : item.value()) {
        std::string seed = (config[item.key()].count("seed") > 0) ? expand_seed(config[item.key()]["seed"].get<std::string>()) : "";
        config[item.key()]["seed"] = seed;
        std::string segment_code = (config[item.key()].count("code") > 0) ? config[item.key()]["code"].get<std::string>() : "";
        Tshortcut current_shortcut = repository->getNextShortcut();
        std::string affect = to_string(current_shortcut)+"-"+code+segment_code;
        std::cerr << filenam << "\t" << affect << std::endl;
        GermlineElement<Tshortcut, Affect>* element;
        std::string filename = path + filenam;
        if (repository->has(filename, seed)) {
          element = repository->get(filename, seed);
          allocated[element] = false;
          current_shortcut = element->getShortcut();
          element->add(code, item.key());
        } else {
          element = new GermlineElement<Tshortcut, Affect>(code, item.key(), current_shortcut, affect, filename, seed,
                                                           max_indexing,
                                                           config[item.key()].count("build") > 0 && config[item.key()]["build"] == "1");
          repository->add(filename, seed, element);
          allocated[element] = true;
        }
        germline_elements[item.key()].insert(element);
        if (config[item.key()]["build"] == "1") {
          readers[item.key()].add(filename);
        }
        if (config[item.key()].count("index") > 0 && config[item.key()]["index"] == "1")
          shortcuts_to_identifier[current_shortcut].insert(recombination_nb);
      }
    }
    recombination_nb++;
  }
}

template <typename Tshortcut, typename Affect>
Germline<Tshortcut, Affect>::~Germline() {
  for (const auto &key_val : allocated) {
    if (key_val.second)
      delete key_val.first;
  }
}

template <typename Tshortcut, typename Affect>
std::set<Tshortcut> Germline<Tshortcut, Affect>::getAllShortcuts() const {
  std::set<Tshortcut> keys;

  std::transform(shortcuts_to_identifier.begin(), shortcuts_to_identifier.end(), std::inserter(keys, keys.begin()),
                 [](const std::pair<Tshortcut, std::set<size_t>>& pair) { return pair.first; });

  return keys;
}

template <typename Tshortcut, typename Affect>
std::string Germline<Tshortcut, Affect>::getCode() const {
  return code;
}

template <typename Tshortcut, typename Affect>
GermlineElement<Tshortcut, Affect>* Germline<Tshortcut, Affect>::getGermlineElement(const Tshortcut &shortcut) const {
  GermlineElement<Tshortcut, Affect>* element = getRepository()->get(shortcut);
  if (element != nullptr && allocated.count(element) > 0)
    return element;
  return nullptr;
}

template <typename Tshortcut, typename Affect>
std::set<GermlineElement<Tshortcut, Affect>*> Germline<Tshortcut, Affect>::getGermlineElements(const std::string &code) const {
  return germline_elements.at(code);
}

template <typename Tshortcut, typename Affect>
IKmerStore<Tshortcut, Affect> *Germline<Tshortcut, Affect>::getIndex() const {
  return index;
}

template <typename Tshortcut, typename Affect>
MultiGermline<Tshortcut, Affect> *Germline<Tshortcut, Affect>::getMultiGermline() const {
  return multi;
}

template <typename Tshortcut, typename Affect>
std::shared_ptr<BioReader> Germline<Tshortcut, Affect>::getReader(const std::string &segment) const {
  std::set<GermlineElement<Tshortcut, Affect>*> elements = getGermlineElements(segment);
  std::shared_ptr<BioReader> reader = std::make_shared<BioReader>(2, "|", (*(elements.begin()))->getMarkPos());
  for (auto &element: elements) {
    reader->add(element->getFilename(), false);
  }
  return reader;
}

template <typename Tshortcut, typename Affect>
GermlineElementRepository<Tshortcut, Affect> *Germline<Tshortcut, Affect>::getRepository() const {
  return repository;
}

template <typename Tshortcut, typename Affect>
std::string Germline<Tshortcut, Affect>::getSeed(const std::string &segment) const {
  return config[segment]["seed"];
}

template <typename Tshortcut, typename Affect>
int Germline<Tshortcut, Affect>::getSegmentationMethod() const {
  return seg_method;
}

template <typename Tshortcut, typename Affect>
std::list<std::string> Germline<Tshortcut, Affect>::getSegments() const {
  return segments;
}

template <typename Tshortcut, typename Affect>
Tshortcut Germline<Tshortcut, Affect>::getShortcut() const {
  return shortcut;
}

template <typename Tshortcut, typename Affect>
bool Germline<Tshortcut, Affect>::hasRecombination(const std::set<Tshortcut> &shortcuts, size_t nb_match) const {
  auto it = shortcuts.begin();
  auto set_it = shortcuts_to_identifier.find(*it);
  if (set_it == shortcuts_to_identifier.end())
    return false;
  std::set<size_t> result = set_it->second;
  it++;
  for (; it != shortcuts.end(); it++) {
    std::set<size_t> temp;
    auto set_it = shortcuts_to_identifier.find(*it);
    if (set_it == shortcuts_to_identifier.end())
      return false;
    std::set<size_t> newSet = set_it->second;
    
    std::set_intersection(result.begin(), result.end(),
                          newSet.begin(), newSet.end(),
                          std::inserter(temp, temp.begin()));
    result = std::move(temp);
  }

  if (result.size() == 0)
    return false;
  
  return result.size() > 0 && shortcuts.size() >= nb_match;
}

template <typename Tshortcut, typename Affect>
void Germline<Tshortcut, Affect>::finish(IKmerStore<Tshortcut, Affect> *index) {
  if (code == PSEUDO_UNEXPECTED)
    return;
  this->index = index;
  for (const auto &key_val : allocated) {
    for (auto &segment: key_val.first->getSegment()) {
      std::cerr << key_val.second << " " << config[segment].count("index") << " " << config[segment]["index"] << std::endl;
      if (key_val.second
          && config[segment].count("index") > 0
          && config[segment]["index"] == "1")
        key_val.first->addToIndex(index);
    }
  }
}

template <typename Tshortcut, typename Affect>
void Germline<Tshortcut, Affect>::setMultiGermline(MultiGermline<Tshortcut, Affect> *multi) {
  this->multi = multi;
}

template <typename Tshortcut, typename Affect>
ostream &operator<<(ostream &out, const Germline<Tshortcut, Affect> &germline)
{
  out << setw(5) << left << germline.getCode() << right << " '" << germline.getShortcut() << "' "
      << " " << std::endl;

  const size_t shortcut_width = 4;
  const size_t index_load_width = 9;
  const size_t l_k_width = 4;
  const size_t seed_width = 21;
  const size_t segment_width = shortcut_width + index_load_width + l_k_width * 2 + seed_width;

  // for (auto &s : germline.getSegments()) {
  //   size_t width = segment_width / 2 + s.size() / 2;
  //   out << std::setw(width) << s << std::string(segment_width-width, ' ') << "|";
  // }
  // out << std::endl;

  bool finished = false;
  size_t current_index = 0;

  std::map<std::string, typename std::set<GermlineElement<Tshortcut, Affect>*>::iterator> iterators;
  std::map<std::string, typename std::set<GermlineElement<Tshortcut, Affect>*>::iterator> end_iterators;

  for (auto& kv : germline.germline_elements) {
      iterators[kv.first] = kv.second.begin();
      end_iterators[kv.first] = kv.second.end();
  }

  while (! finished) {
    finished = true;
    for (auto &s: germline.getSegments()) {
      if (iterators[s] == end_iterators[s]) {
        out << std::string(segment_width, ' ');
      } else {
        std::string seed = germline.getSeed(s);
        double index_load = 0;
        GermlineElement<Tshortcut, Affect>* element = *(iterators[s]);
        out << std::setw(shortcut_width-1) << element->getShortcut()
            << dec << setfill(' ') << " " ;
        if (germline.index) {
          index_load = germline.index->getIndexLoad(Affect(element->getAffect(), 1, seed.length()));
          out << fixed << setprecision(3) << setw(index_load_width - 2)
              << 100 * index_load << "% ";
        } else {
          out << std::string(index_load_width, ' ');
        }
        out << "l" << std::setw(l_k_width-2) << seed.length() << " "
            << "k" << std::setw(l_k_width-2) << seed_weight(seed) << " "
            << std::left << std::setw(seed_width) << seed << std::right;
        iterators[s]++;
        if (iterators[s] != end_iterators[s])
          finished = false;
      }
      out << "|";
    }
    out << std::endl;
    current_index++;
  }
  return out;
}

template<typename Tshortcut, typename Affect>
Germline<Tshortcut, Affect>* Germline<Tshortcut, Affect>::getUnseg() {
  static Germline<Tshortcut, Affect> unseg;
  return &unseg;
}


#endif
