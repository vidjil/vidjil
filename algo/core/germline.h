
#ifndef GERMLINE_H
#define GERMLINE_H

#include <string>
#include <list>
#include "kmeraffect.h"
#include "kmerstore.h"
#include "automaton.hpp"
#include "stats.h"
#include "tools.h"
#include "../lib/json.hpp"
#include "kmerstorefactory.hpp"
#include "bioreader.hpp"
#include "filter.h"
#include <climits>

#define DEFAULT_GERMLINE_SEED SEED_S10

enum SEGMENTATION_METHODS {
  SEG_METHOD_53,      // Regular or incomplete germlines, 5'-3'
  SEG_METHOD_543,     // Regular or incomplete germlines, 5'-3', with an additional middle gene (such a D gene)
  SEG_METHOD_MAX12,   // Pseudo-germline, most two frequent kmer affectations  (-2)
  SEG_METHOD_MAX1U,   // Pseudo-germline, most frequent kmer affection and unknwon affectation (-4)
  SEG_METHOD_ONE      // Map a read onto a genomic region, without recombination. Evil.
} ;


// JUNCTION/CDR3 extraction from gapped V/J sequences
#define        CYS104_IN_GAPPED_V  310   // First nucleotide of Cys104
#define PHE118_TRP118_IN_GAPPED_J   38   // Last nucleotide of Phe118/Trp118

#define PSEUDO_UNEXPECTED         "unexpected"
#define PSEUDO_UNEXPECTED_CODE    'x'
#define PSEUDO_NOT_ANALYZED       "not analyzed"
#define PSEUDO_NOT_ANALYZED_CODE  'z'


using namespace std;
using json = nlohmann::json;

class Germline {
 private:
  FilterWithACAutomaton* filter;

  int max_indexing;

  void init(string _code, char _shortcut,
            string seed, int max_indexing, bool build_automaton=false);

 public:
  /*
   * @param max_indexing: maximal length of the sequence to be indexed (0: all)
   */

  Germline(string _code, char _shortcut,
           list <string> f_rep_5, list <string> f_rep_4, list <string> f_rep_3,
           string seed="", int max_indexing=0, bool build_automaton=false);

  Germline(string _code, char _shortcut,
  	   string f_rep_5, string f_rep_4, string f_rep_3,
	   string seed="", int max_indexing=0, bool build_automaton=false);

  Germline(string _code, char _shortcut,
      BioReader _rep_5, BioReader _rep_4, BioReader _rep_3,
	   string seed="", int max_indexing=0, bool build_automaton=false);

  Germline(string _code, char _shortcut,
	   string seed="", int max_indexing=0, bool build_automaton=false);

  Germline(string _code, char shortcut, string path, json json_recom,
           string seed="", int max_indexing=0, bool build_automaton=false);

  ~Germline();

	pair<vector<int>*, AbstractACAutomaton<KmerAffect>*>* automaton_5;
  int seg_method ;
  string code ;
  char   shortcut ;

  /**
   * The string used for indexing the germline.
   */
  string seed;

  /**
   * Finishes the construction of the germline so that it can be used
   */
  void finish();
	
	/* Return the max indexing of a germline */
	int getMaxIndexing();
  void new_index(IndexTypes type);
  void set_index(IKmerStore<KmerAffect> *index);

  void update_index(IKmerStore<KmerAffect> *_index = NULL);

  void mark_as_ambiguous(Germline *other);
    
  /*
   * This function sets the rep5/3 according to two KmerAffects.
   * Quite useful for some pseudo-germlines.
   * This should not be used for regular germlines that have and use some rep5/3.
   * @param left, right: two KmerAffects
   * @post  set rep_5 and rep_3 stored in the labels of the index
   */
  void override_rep5_rep3_from_labels(KmerAffect left, KmerAffect right);

  list <string> f_reps_5 ;
  list <string> f_reps_4 ;
  list <string> f_reps_3 ;

  // KmerAffect affect_5 ;
  // KmerAffect affect_3 ;
  string affect_5 ;
  string affect_4 ;
  string affect_3 ;
  
  BioReader  rep_5 ;
  BioReader  rep_4 ;
  BioReader  rep_3 ;
  IKmerStore<KmerAffect> *index;
};

ostream &operator<<(ostream &out, const Germline &germline);



enum GERMLINES_FILTER { GERMLINES_ALL,
                        GERMLINES_REGULAR,
                        GERMLINES_INCOMPLETE } ;

class MultiGermline {
 private:
  IndexTypes indexType;
 public:
  bool one_index_per_germline;
  list <Germline*> germlines;

  string ref;
  string species;
  int species_taxon_id;

  // A unique index can be used
  IKmerStore<KmerAffect> *index;

  MultiGermline(IndexTypes indexType, bool one_index_per_germline = true);
  ~MultiGermline();

  void insert(Germline *germline);
  void add_germline(Germline *germline);

  /**
   * Build from a json .g germline file
   *   path: path, such as 'germline/'
   *   json_filename_and_filter: filename, optionally embedding a filter, such as 'homo-sapiens.g:IGH,TRG'
   *   filter: see GERMLINES_FILTER
   *   max_indexing:
   */
  void build_from_json(string path, string json_filename_and_filter, int filter,
                       string default_seed="", int default_max_indexing=0, bool build_automaton=false);

  /**
   * Finishes the construction of the multi germline so that it can be used
   */
  void finish();
  // Creates and update an unique index for all the germlines
  // If 'set_index' is set, set this index as the index for all germlines
  void insert_in_one_index(IKmerStore<KmerAffect> *_index, bool set_index);
  void build_with_one_index(string seed, bool set_index);

  void mark_cross_germlines_as_ambiguous();
};

ostream &operator<<(ostream &out, const MultiGermline &multigermline);

#endif
