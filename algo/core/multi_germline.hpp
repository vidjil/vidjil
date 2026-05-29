#ifndef MULTIGERMLINE_HPP
#define MULTIGERMLINE_HPP

#include "germline.hpp"
#include "fasta.h"

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
  bool ignore_uppercase_nt;
  
public:

  /**
   * @param ignore_uppercase_nt: ignore all the nucleotides that are uppercase, once the germlines have
   *                             been indexed. This means that those sequences will be ignored for all
   *                             downstream analyses that do not rely on the k-mer index */
  MultiGermline(bool ignore_uppercase_nt=false);
  ~MultiGermline();

  void addGermline(Germline<Affect> *germline);

  /**
   * @return the codes of all the germlines that have been stored.
   */
  std::set<std::string> getCodes() const;

  /**
   * @param nb_match: minimal number of shortcuts to match
   * @return the germline that has a recombination involving the provided shortcuts or nullptr if no such germline exists
   */
  Germline<Affect> *getGermline(const std::set<Tshortcut> &shortcuts, size_t nb_match=2) const;
  
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
MultiGermline<Affect>::MultiGermline(bool ignore_uppercase_nt) :
  index(nullptr),repository(nullptr),ref("custom"),species("custom"),species_taxon_id(0),
  repository_allocated(false),ignore_uppercase_nt(ignore_uppercase_nt) {
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
Germline<Affect> *MultiGermline<Affect>::getGermline(const std::set<Tshortcut> &shortcuts, size_t nb_match) const {
  for (const auto& germline : germlines) {
    if (germline->hasRecombination(shortcuts, nb_match)) {
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
                                     configJson, repository, max_indexing, ignore_uppercase_nt));
    allocated_germlines.back() = true;
  }

}

template <typename Affect>
void MultiGermline<Affect>::addToIndex(IKmerStore<Affect> *index) {
  
  // .g files defines several recombination systems (class Germline). Each recombination system
  // defines:
  // - The set(s) of genes the system may recombine together (class GermlineElement), associated 
  //   with an ordered segment ("5", "4", "3") in field "recombinations". These sets are the values
  //   in system_segments below
  // - Which of the system's segments should be used in the designation phase to recognize
  //   recombinations belonging to that system (field "parameters.search_recombinations"). These
  //   segments are the values in segments_to_search below
  // - The (spaced) seed used to identify whether the portion of a sample's read may belong to one
  //   of the recombination system's genes
  //
  // Since V, D and J genes may share some common k-mers, it is possible for a k-mer on a read to be
  // marked as belonging to a specific recombination system's gene (affectation) during the
  // designation phase, despite being actually located on a different (recombined) gene.
  //
  // These affectations are assigned based on the k-mers derived from the set of genes to search for
  // for each recombination system, on which the recombination system's seeds are projected and the
  // resulting projections inserted in the index.
  //
  // By removing projections that are common between genes to search for and genes not to search
  // for, using the seeds provided by recombination systems, these problematic affectations can be
  // avoided.
  //
  // This is done by:
  // 1. Inserting all genes to search for in the index, indiscriminately
  // 2. Deduce which gene sets are never searched for, by comparing gene sets that compose
  //    recombination systems and the gene sets to search for for all of them
  // 3. Keeping track of seeds recombination systems use
  // 4. Removing gene sets that are never searched for, using recombination systems' seeds
  std::set<const GermlineElement<Affect>*> gene_sets_not_to_search;
  std::set<const GermlineElement<Affect>*> gene_sets_to_search;
  std::set<std::string>                    system_seeds;

  for (const auto& germline : germlines) {
    germline->addToIndex(index);

    const std::map<std::string, std::set<GermlineElement<Affect>*>>& system_segments    = germline->getGermlineElements();
    const std::list<std::string>&                                    segments_to_search = germline->getSegments();

    for (const std::pair<const std::string, std::set<GermlineElement<Affect>*>>& segment : system_segments)
    {
      const std::set<GermlineElement<Affect>*>& segment_gene_sets = segment.second;
      for (const GermlineElement<Affect>* gene_set : segment_gene_sets)
        gene_sets_not_to_search.insert(gene_set);
    }

    for (const std::string& segment_id : segments_to_search)
    {
      const std::set<GermlineElement<Affect>*>& segment_gene_sets = system_segments.at(segment_id);
      for (const GermlineElement<Affect>* gene_set : segment_gene_sets)
        gene_sets_to_search.insert(gene_set);
    }

    // The seeds are the same for all possible recombinations of a system
    const std::string& any_segment = segments_to_search.front();
    system_seeds.insert(germline->getSeed(any_segment));
  }

  for (const GermlineElement<Affect>* gene_set : gene_sets_to_search)
    gene_sets_not_to_search.erase(gene_set);

  // Remove any gene projections that were added to the index that coincides with gene projections
  // that aren't searched for, using the same seeds that were used for projections inserted in the
  // index
  for (const GermlineElement<Affect>* gene_set : gene_sets_not_to_search)
  {
    OnlineFasta genes_to_exclude(gene_set->getFilename());
    while (genes_to_exclude.hasNext())
    {
      genes_to_exclude.next();
      Sequence d_gene = genes_to_exclude.getSequence();
      for (const std::string& seed : system_seeds)
      {
        // Some genes (such as D genes) are smaller than the seeds used by searched genes to insert
        // them in the index, meaning these small genes cannot coincide with these searched genes
        // projections. They are skipped
        const size_t seed_size     = seed.size();
        const size_t sequence_size = d_gene.sequence.size();
        if (seed_size <= sequence_size)
          index->remove(d_gene.sequence, seed);
      }
    }
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
