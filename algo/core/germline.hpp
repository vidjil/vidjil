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
#include "germline.h"

template <typename Affect>
Germline<Affect>::Germline() {
  shortcut = PSEUDO_UNEXPECTED_CODE;
  code = PSEUDO_UNEXPECTED;
  repository = nullptr;
  repository_allocated = false;
  multi = nullptr;
  index = nullptr;
  ignore_uppercase_nt = false;
}

template <typename Affect>
Germline<Affect>::Germline(std::string code, Tshortcut shortcut,
                                      std::string path, json filenames,
                                      json &jconfig,
                                      GermlineElementRepository<Affect> *repo,
                                      int max_indexing,
                                      bool ignore_uppercase_nt)
  : segments(jconfig["order"].get<std::list<std::string>>()), config(jconfig["segments"]), repository(repo), repository_allocated(false),
    shortcut(shortcut), code(code),
    max_indexing(max_indexing),
    multi(nullptr), index(nullptr),ignore_uppercase_nt(ignore_uppercase_nt) {

  if (filenames[0].size() != config.size())
    throw runtime_error("config and filenames list differ in size");
  
  if (!repository) {
    this->repository = new GermlineElementRepository<Affect>();
    repository_allocated = true;
  }

  std::map<std::string, BioReader> readers;
  size_t recombination_nb = 0;

  seg_method = (segments.size() == 1) ? SEG_METHOD_ONE : SEG_METHOD_MAX12;

  for (const auto& filename_map : filenames) {
    for (const auto& item: filename_map.items()) {
      segments_by_recomb.push_back(std::set<std::string>());

      for (const std::string filenam : item.value()) {
        std::string seed = (config[item.key()].count("seed") > 0) ? expand_seed(config[item.key()]["seed"].template get<std::string>()) : "";
        segments_by_recomb[recombination_nb].insert(item.key());
        config[item.key()]["seed"] = seed;
        std::string segment_code = (config[item.key()].count("code") > 0) ? config[item.key()]["code"].template get<std::string>() : "";
        Tshortcut current_shortcut = repository->getNextShortcut();
        std::string affect = to_string(current_shortcut)+"-"+code+segment_code;
        GermlineElement<Affect>* element;
        std::string filename = path_join(path, filenam);
        if (repository->has(filename, seed)) {
          element = repository->get(filename, seed);
          if (allocated.count(element) == 0)
            allocated[element] = false;
          current_shortcut = element->getShortcut();
          element->add(code, item.key());
        } else {
          element = new GermlineElement<Affect>(code, item.key(), current_shortcut, affect, filename, seed,
                                                           max_indexing,
                                                           config[item.key()].count("build") > 0 && config[item.key()]["build"] == "1");
          repository->add(filename, seed, element);
          allocated[element] = true;
        }
        germline_elements[item.key()].insert(element);
        if (config[item.key()]["build"] == "1") {
          readers[item.key()].add(filename, false);
        }
        if (config[item.key()].count("index") > 0 && config[item.key()]["index"] == "1")
          shortcuts_to_identifier[current_shortcut].insert(recombination_nb);
      }
    }
    recombination_nb++;
  }
}

template <typename Affect>
Germline<Affect>::~Germline() {
  for (const auto &key_val : allocated) {
    if (key_val.second)
      delete key_val.first;
  }
  if (repository_allocated)
    delete repository;
}

template <typename Affect>
std::set<Tshortcut> Germline<Affect>::getAllShortcuts() const {
  std::set<Tshortcut> keys;

  std::transform(shortcuts_to_identifier.begin(), shortcuts_to_identifier.end(), std::inserter(keys, keys.begin()),
                 [](const std::pair<Tshortcut, std::set<size_t>>& pair) { return pair.first; });

  return keys;
}

template <typename Affect>
std::string Germline<Affect>::getCode() const {
  return code;
}

template <typename Affect>
GermlineElement<Affect>* Germline<Affect>::getGermlineElement(const Tshortcut &shortcut) const {
  GermlineElement<Affect>* element = getRepository()->get(shortcut);
  if (element != nullptr && allocated.count(element) > 0)
    return element;
  return nullptr;
}

template <typename Affect>
std::set<GermlineElement<Affect>*> Germline<Affect>::getSegmentGermlineElements(const std::string &code) const {
  try {
    return germline_elements.at(code);
  } catch (std::out_of_range &e) {
    return {};
  }
}

template <typename Affect>
const std::map<std::string, std::set<GermlineElement<Affect>*>>& Germline<Affect>::getGermlineElements() const
{
  return germline_elements;
}

template <typename Affect>
IKmerStore<Affect> *Germline<Affect>::getIndex() const {
  return index;
}

template <typename Affect>
MultiGermline<Affect> *Germline<Affect>::getMultiGermline() const {
  return multi;
}

template <typename Affect>
std::shared_ptr<BioReader> Germline<Affect>::getReader(const std::string &segment) const {
  std::set<GermlineElement<Affect>*> elements = getSegmentGermlineElements(segment);
  std::shared_ptr<BioReader> reader = std::make_shared<BioReader>(2,
                                                                  "|",
                                                                  (*(elements.begin()))->getLocationsToMark(),
                                                                  ignore_uppercase_nt);
  for (auto &element: elements) {
    reader->add(element->getFilename(), false);
  }
  return reader;
}

template <typename Affect>
GermlineElementRepository<Affect> *Germline<Affect>::getRepository() const {
  return repository;
}

template <typename Affect>
std::string Germline<Affect>::getSeed(const std::string &segment) const {
  return config[segment]["seed"];
}

template <typename Affect>
int Germline<Affect>::getSegmentationMethod() const {
  return seg_method;
}

template <typename Affect>
const std::list<std::string>& Germline<Affect>::getSegments() const {
  return segments;
}

template <typename Affect>
Tshortcut Germline<Affect>::getShortcut() const {
  return shortcut;
}

template <typename Affect>
bool Germline<Affect>::hasSegment(const std::string &segment,
                                             const std::set<Tshortcut> &shortcuts) const {
  bool segment_exists = config.count(segment) > 0;
  if (! segment_exists)
    return false;
  bool found = false;
  if (shortcuts.size() > 0) {
    std::set<size_t> recomb_id = getRecombinationsNb(shortcuts);
    for (auto id: recomb_id)
      if (segments_by_recomb[id].count("4") > 0)
        found = true;
  } else
    found = true;

  return found;
}

template <typename Affect>
bool Germline<Affect>::hasRecombination(const std::set<Tshortcut> &shortcuts, size_t nb_match) const {
  std::set<size_t> result = getRecombinationsNb(shortcuts);

  if (result.size() == 0)
    return false;
  
  return result.size() > 0 && shortcuts.size() >= nb_match;
}

template <typename Affect>
void Germline<Affect>::addToIndex(IKmerStore<Affect> *index) {
  if (code == PSEUDO_UNEXPECTED)
    return;
  this->index = index;
  for (const auto &key_val : allocated) {
    for (auto &segment: key_val.first->getSegment()) {
      if (key_val.second
          && config[segment].count("index") > 0
          && config[segment]["index"] == "1")
        key_val.first->addToIndex(index, ignore_uppercase_nt);
    }
  }
}

template <typename Affect>
void Germline<Affect>::finish() {
  if (this->index)
    this->index->finish_building();
}

template <typename Affect>
void Germline<Affect>::setMultiGermline(MultiGermline<Affect> *multi) {
  this->multi = multi;
}


template <typename Affect>
void Germline<Affect>::unsetIndex() {
  this->index = nullptr;
}

template <typename Affect>
std::set<size_t> Germline<Affect>::getRecombinationsNb(const std::set<Tshortcut> &shortcuts) const{
auto it = shortcuts.begin();
  auto set_it = shortcuts_to_identifier.find(*it);
  if (set_it == shortcuts_to_identifier.end())
    return std::set<size_t>();
  std::set<size_t> result = set_it->second;
  it++;
  for (; it != shortcuts.end(); it++) {
    std::set<size_t> temp;
    auto set_it = shortcuts_to_identifier.find(*it);
    if (set_it == shortcuts_to_identifier.end())
      return std::set<size_t>();
    std::set<size_t> newSet = set_it->second;

    std::set_intersection(result.begin(), result.end(),
                          newSet.begin(), newSet.end(),
                          std::inserter(temp, temp.begin()));
    result = std::move(temp);
  }
  return result;
}

template <typename Affect>
ostream &operator<<(ostream &out, const Germline<Affect> &germline)
{
  const size_t locus_width = 10;
  const size_t locus_shortcut = 4;
  const size_t shortcut_width = 4;
  const size_t index_load_width = 9;
  const size_t l_k_width = 4;
  const size_t seed_width = 21;
  const size_t segment_width = // locus_width + locus_shortcut
    shortcut_width + index_load_width + l_k_width * 2 + seed_width;

  out << setw(locus_width-1) << right << germline.getCode() << " '" << germline.getShortcut() << "' ";

  // for (auto &s : germline.getSegments()) {
  //   size_t width = segment_width / 2 + s.size() / 2;
  //   out << std::setw(width) << s << std::string(segment_width-width, ' ') << "|";
  // }
  // out << std::endl;

  bool finished = false;
  size_t current_index = 0;

  std::map<std::string, typename std::set<GermlineElement<Affect>*>::iterator> iterators;
  std::map<std::string, typename std::set<GermlineElement<Affect>*>::iterator> end_iterators;

  for (auto& kv : germline.germline_elements) {
      iterators[kv.first] = kv.second.begin();
      end_iterators[kv.first] = kv.second.end();
  }

  while (! finished) {
    finished = true;
    for (auto &s: germline.getSegments()) {
      if (current_index > 0 && current_index % 2 == 0)
        out << std::string(locus_width + locus_shortcut, ' ');
      if (iterators[s] == end_iterators[s]) {
        out << std::string(segment_width, ' ');
      } else {
        std::string seed = germline.getSeed(s);
        double index_load = 0;
        GermlineElement<Affect>* element = *(iterators[s]);
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
      current_index++;
    }
    out << std::endl;
  }
  return out;
}

template<typename Affect>
Germline<Affect>* Germline<Affect>::getUnseg() {
  static Germline<Affect> unseg;
  return &unseg;
}


#endif
