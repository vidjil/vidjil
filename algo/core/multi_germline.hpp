#ifndef MULTIGERMLINE_HPP
#define MULTIGERMLINE_HPP

#include "germline.hpp"

enum GERMLINES_FILTER { GERMLINES_ALL,
                        GERMLINES_REGULAR,
                        GERMLINES_INCOMPLETE } ;


template <typename Affect>
class MultiGermline {

private:
  std::list<Germline<Affect> *> germlines;
  std::list<bool> allocated_germlines; // whether the germlines were allocated within the class
  IKmerStore<Affect> *index;
  GermlineElementRepository<Affect> *repository;
  std::string ref;
  std::string species;
  int species_taxon_id;
  bool repository_allocated;
  
public:

  MultiGermline();
  ~MultiGermline();

  void addGermline(Germline<Affect> *germline);

  /**
   * @return the codes of all the germlines that have been stored.
   */
  std::set<std::string> getCodes() const;

  /**
   * @return the germline that has a recombination involving the provided shortcuts or nullptr if no such germline exists
   */
  Germline<Affect> *getGermline(const std::set<Tshortcut> &shortcuts) const;
  
  /**
   * @return the germline that has the provided code (eg. IGH) or nullptr if no such germline exists
   */
  Germline<Affect> *getGermline(const std::string &code) const;

  /**
   * @return all the germlines
   * @complexity O(1)
   */
  std::list<Germline<Affect> *> getGermlines() const;

  /**
   * @return the index that was built for the add_to_index. Returns nullptr if add_to_index() was not called yet or
   * if an index was already provided to add_to_index()
   */
  IKmerStore<Affect> *getIndex() const;

  /**
   * @return the reference to the germline
   */
  std::string getReference() const;

  GermlineElementRepository<Affect> *getRepository() const;

  /**
   * @return the reference species
   */
  std::string getSpecies() const;

  /**
   * @return true iff the affects are compatible, ie. if their corresponding shortcuts return
   * a non-null Germline to the getGermline() method.
   */
  bool isCompatible(std::set<Affect> affects) const;

  /**
   * @return the taxon ID
   */
  int getTaxonId() const;
  
  /**
   * Build from a json .g germline file
   *   germlines: json object describing the germlines to be loaded (as in the .g)
   *   filter: see GERMLINES_FILTER
   *   max_indexing: see constructor of Germline
   *   build_automaton: tell for each segment whether an automaton should be built.
   */
  void buildFromJson(json germlines, int filter,
                       string default_seed="", int default_max_indexing=0, const std::map<std::string, bool> &build_automaton=std::map<std::string, bool>());

  /**
   * Add the germlines to the provided index. If no index is provided, it will create one.
   * After adding the germlines to the index, the finish() method of each germline is called.
   */
  void addToIndex(IKmerStore<Affect> *index=nullptr);

  /**
   * Sets the repository of the MultiGermline
   */
  void setRepository(GermlineElementRepository<Affect> *);

  template <typename A>
  friend ostream &operator<<(ostream &out, const MultiGermline<A> &germline);
};


template <typename Affect>
MultiGermline<Affect>::MultiGermline() : index(nullptr),repository(nullptr),ref("custom"),species("custom"),species_taxon_id(0),repository_allocated(false) {
}

template <typename Affect>
MultiGermline<Affect>::~MultiGermline(){
  if (index != nullptr)
    delete index;
  if (repository_allocated)
    delete repository;
  auto it_allocated = allocated_germlines.begin();
  for (auto& germline : germlines) {
    if (*it_allocated)
      delete germline;
    it_allocated++;
  }
}

template <typename Affect>
void MultiGermline<Affect>::addGermline(Germline<Affect> *germline) {
  germlines.push_back(germline);
  allocated_germlines.push_back(false);
  germline->setMultiGermline(this);
  if (! repository) {
    repository = germline->getRepository();
  }
}

template <typename Affect>
std::set<std::string> MultiGermline<Affect>::getCodes() const {
  std::set<std::string> shortcuts;
  for (const auto& germline : germlines) {
    shortcuts.insert(germline->getCode());
  }
  return shortcuts;  
}

template <typename Affect>
Germline<Affect> *MultiGermline<Affect>::getGermline(const std::set<Tshortcut> &shortcuts) const {
  for (const auto& germline : germlines) {
    if (germline->hasRecombination(shortcuts)) {
      return germline;
    }
  }
  return nullptr;
}

template <typename Affect>
Germline<Affect> *MultiGermline<Affect>::getGermline(const std::string &code) const {
  for (const auto& germline : germlines) {
    if (germline->getCode() == code) {
      return germline;
    }
  }
  return nullptr;
}

template <typename Affect>
std::list<Germline<Affect> *> MultiGermline<Affect>::getGermlines() const {
  return germlines;
}

template <typename Affect>
IKmerStore<Affect> *MultiGermline<Affect>::getIndex() const {
  return index;
}

template <typename Affect>
std::string MultiGermline<Affect>::getReference() const {
  return ref;
}

template <typename Affect>
GermlineElementRepository<Affect> *MultiGermline<Affect>::getRepository() const {
  return repository;
}

template <typename Affect>
std::string MultiGermline<Affect>::getSpecies() const {
  return species;
}

template <typename Affect>
int MultiGermline<Affect>::getTaxonId() const {
  return species_taxon_id;
}

template <typename Affect>
bool MultiGermline<Affect>::isCompatible(std::set<Affect> affects) const {
  std::set<Tshortcut> shortcuts;
  int strand = (*affects.begin()).getStrand();
  for (auto a: affects)
    try {
      if (a.getStrand() != strand)
        return false;
      shortcuts.insert(this->getRepository()->getShortcut(a));
    } catch(std::invalid_argument &e) {}
  return this->getGermline(shortcuts) != nullptr;
}

template <typename Affect>
void MultiGermline<Affect>::buildFromJson(json germlines, int filter,
                                                     std::string default_seed, int default_max_indexing,
                                                     const std::map<std::string, bool> &build_automaton) {
  if (repository == nullptr) {
    repository = new GermlineElementRepository<Affect>();
    repository_allocated = true;
  }

  string path = germlines["path"].get<std::string>();
  json j = germlines["systems"];

  ref = germlines["ref"].get<std::string>();
  species = germlines["species"].get<std::string>();
  species_taxon_id = germlines["species_taxon_id"];

  std::cerr << "Build from JSON" << std::endl;
  
  //for each germline
  for (auto it = j.begin(); it != j.end(); it++) {
    int max_indexing = default_max_indexing;
      
    json json_value = it.value();
    json recombinations = json_value["recombinations"];
    char shortcut = json_value["shortcut"].dump()[1];
    string code = it.key();
    json json_parameters = json_value["parameters"];
    std::map<std::string, std::map<std::string, std::string>> config;
    std::vector<std::string> order;

    string s_path = path;
    if (json_parameters.contains("path"))
      s_path = path_join(path, json_parameters["path"].get<std::string>());

    for (auto item=recombinations[0].begin(); item!=recombinations[0].end(); item++) {
      if (item.value().size() == 0)
        continue;
      if (json_parameters.find("seed_"+item.key()) != json_parameters.end()) {
        config[item.key()]["seed"] = json_parameters["seed_"+item.key()];
      } else if (json_parameters.find("seed") != json_parameters.end()) {
        config[item.key()]["seed"] = json_parameters["seed"];
      }
      if (default_seed.size() > 0)
        config[item.key()]["seed"] = default_seed;
      if (json_parameters.count("search_recombinations")>0) {
        auto it = std::find(json_parameters["search_recombinations"].begin(), json_parameters["search_recombinations"].end(),
                            item.key());
        config[item.key()]["index"] = (it != json_parameters["search_recombinations"].end()) ? "1": "0";
      } else {
        throw std::invalid_argument("The property search_recombinations has not been filled in the germline file (parameters section)");
      }
      std::string value = item.value()[0];
      value = (value.size() > 3) ? to_string(value[3]) : "";
      config[item.key()]["code"] = value;
      config[item.key()]["build"] = (build_automaton.count(item.key()) > 0 && build_automaton.at(item.key())) ? "1" : "0";
    }
    
    if (default_max_indexing == 0) {
      if (json_parameters.count("trim_sequences") > 0) {
        max_indexing = json_parameters["trim_sequences"];
      }
    }
    if (json_parameters.count("search_recombinations")>0) {
      order = json_parameters.at("search_recombinations").get<std::vector<std::string>>();
    } else {
      order.clear();
      for (auto &i: config)
        order.push_back(i.first);
    }

    switch (filter) {
    case GERMLINES_REGULAR:
      if (code.find("+") != string::npos) continue ;
      break ;

    case GERMLINES_INCOMPLETE:
      if (code.find("+") == string::npos) continue ;
      break ;

    default:
      break ;
    }

    json configJson = {{"order", order}, {"segments", config}};
    addGermline(new Germline<Affect>(code, shortcut, s_path, recombinations,
                                                configJson, repository, max_indexing));
    allocated_germlines.back() = true;
  }

}

template <typename Affect>
void MultiGermline<Affect>::addToIndex(IKmerStore<Affect> *index) {
  for (const auto& germline : germlines) {
    germline->addToIndex(index);
  }
  index->finish_building();
  this->index = index;
}

template <typename Affect>
void MultiGermline<Affect>::setRepository(GermlineElementRepository<Affect> *repo) {
  repository = repo;
}

template <typename A>
ostream &operator<<(ostream &out, const MultiGermline<A> &germline) {
  out << germline.getSpecies() << " (" << germline.getTaxonId() << ")" << std::endl;
  for (auto &g: germline.getGermlines()) {
    out << *g;
  }
  return out;
}

#endif
