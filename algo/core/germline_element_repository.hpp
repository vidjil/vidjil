#ifndef GERMLINE_ELEMENT_REPO_HPP
#define GERMLINE_ELEMENT_REPO_HPP

#include <map>
#include <utility>
#include "germline_element.hpp"

template <typename Affect>
class GermlineElementRepository {
private:
  std::map<std::pair<std::string, std::string>, GermlineElement<Affect>*> repository;
  std::map<Tshortcut, GermlineElement<Affect>*> shortcuts;
  std::map<Affect, Tshortcut> affect_to_shortcuts;
  Tshortcut next;                // next shortcut available

public:
  GermlineElementRepository();

  bool has(const std::string &filename, const std::string &seed) const;
  /**
   * @return the GermlineElement depending on the filename and the seed
   */
  GermlineElement<Affect> *get(const std::string &filename, const std::string &seed) const;
  /**
   * @return the GermlineElement depending on the shortcut or nullptr if no such element exists
   */
  GermlineElement<Affect> *get(const Tshortcut &shortcut) const;

  /**
   * @return all the GermlineElement
   */
  std::set<GermlineElement<Affect>*> getAll() const;

  Tshortcut getNextShortcut() const;

  /**
   * @return the shortcut of the corresponding shortcut of the affectation or raise std::invalid_argument
   */
  Tshortcut getShortcut(Affect affect) const;

  void add(const std::string &filename, const std::string &seed, GermlineElement<Affect> *germline);
  
};

template <typename Affect>
GermlineElementRepository<Affect>::GermlineElementRepository() {
  next = first_shortcut<Tshortcut>();
}

template <typename Affect>
bool GermlineElementRepository<Affect>::has(const std::string &filename, const std::string &seed) const {
  return repository.find(std::make_pair(filename, seed)) != repository.end();
}

template <typename Affect>
GermlineElement<Affect> *GermlineElementRepository<Affect>::get(const std::string &filename, const std::string &seed) const {
  return repository.at(std::make_pair(filename, seed));
}

template <typename Affect>
GermlineElement<Affect> *GermlineElementRepository<Affect>::get(const Tshortcut &shortcut) const {
  try {
    auto & elem = shortcuts.at(shortcut);
    return elem;
  } catch (const std::out_of_range &) {
    return nullptr;
  }
  
}

template <typename Affect>
std::set<GermlineElement<Affect>*> GermlineElementRepository<Affect>::getAll() const {
  std::set<GermlineElement<Affect>*> elements;
  for (auto &it: repository) {
    elements.insert(it.second);
  }
  return elements;
}

template <typename Affect>
Tshortcut GermlineElementRepository<Affect>::getNextShortcut() const {
  return next;
}

template <typename Affect>
Tshortcut GermlineElementRepository<Affect>::getShortcut(Affect affect) const {
  try {
    // Ignore strand
    affect.affect.c |= 128;
    return affect_to_shortcuts.at(affect);
  } catch (std::out_of_range &) {
    throw new std::invalid_argument("No such affect: "+affect.toString());
  }
}

template <typename Affect>
void GermlineElementRepository<Affect>::add(const std::string &filename, const std::string &seed, GermlineElement<Affect> *germline) {
  repository[std::make_pair(filename, seed)] = germline;
  shortcuts[germline->getShortcut()] = germline;
  affect_to_shortcuts[Affect(germline->getAffect(), 1, germline->getSeed().length())] = germline->getShortcut();
  next = next_shortcut<Tshortcut>(germline->getShortcut());
}

#endif
