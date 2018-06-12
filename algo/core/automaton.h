#ifndef AUTOMATON_H
#define AUTOMATON_H

#include <list>
#include <cctype>
#include "kmerstore.h"
#include <cstdlib>
#include <queue>
#include <utility>
#include "tools.h"
#include <map>

using namespace std;

/* Max value for k (for storing the number of kmers of that size) */
#define MAX_KMER_SIZE 20

/**
 * This abstract class represents an Aho-Corasick automaton.
 * Each final state can store some information.
 */
template <class Info>
class AbstractACAutomaton: public IKmerStore<Info> {

protected:
  void *initialState;
  map<Info, size_t> kmers_inserted;
public:
  AbstractACAutomaton();

  /**
   * Builds the failure functions. This function must be called before any
   * query is made.
   */
  virtual void build_failure_functions() = 0;

  /**
   * @inherited from IKMerStore
   */
  void finish_building();

  /**
   * @inherited from IKMerStore
   */
  float getIndexLoad(Info kmer) const;

  /**
   * @inherited from IKMerStore
   */
  bool hasDifferentKmerTypes() const;

  /**
   * @return the information stored for this state
   */
  virtual list<Info> &getInfo(void *state) = 0;

  /**
   * @param starting_state: the starting state for traversing the automate.
   *                        if NULL starts from the initial state.
   * @return return the arrival state when starting from starting_state and
   * reading the string seq.
   */
  void *goto_state(const string &seq, void *starting_state=NULL);

  /**
   * @return true iff states is the initial state
   */
  bool isInitialState(void *state);

  /**
   * @return true iff states points to a final state
   */
  virtual bool isFinalState(void *state) = 0;

  /**
   * @param state: a pointer to the current state
   * @param c: the character to follow
   * @return the state accessible from state with character c.
   *         It will always return a valid pointer, at least the initial state.
   */
  virtual void *next(void *state, char c) = 0;

	/**
	 * This function returns the number of times every Kmer appears in the
	 * given sequence.
	 * It returns a map containing the number of occurences per Kmer.
	 * @param seq: The sequence that the occurences of Kmer will be determinated.
   * @param false: unused.
	 * @param seed: unused.
	 */
	virtual map<Info,int> getMultiResults
		(const seqtype &seq, bool no_revcomp=false, string seed = "") = 0;
};

#define DNA_ALPHABET_SIZE 4

typedef enum {A, C, G, T, N, NB_TRANSITIONS} nt_transition;

template <class Info>
class pointer_state {
public:
  pointer_state<Info> *transitions[NB_TRANSITIONS]; /* Transitions to the 5 nt */
  bool is_final;
  list<Info> informations;           /* != NULL when is_final */

  pointer_state():is_final(false),informations() {
    for (size_t i = 0; i < NB_TRANSITIONS; i++)
      transitions[i] = NULL;
    informations.push_back(Info());
  }

  pointer_state<Info> *transition(char c) {
    return transitions[nuc_to_int(c)];
  }
};

/**
 * PointerACAutomaton builds state which points to other states.
 * Each state stores at least one information (but possibly more).
 */
template <class Info>
class PointerACAutomaton: public AbstractACAutomaton<Info> {
private:
  bool multiple_info;

  void free_automaton(pointer_state<Info> *);
  void init(string seed, bool revcomp, bool multiple_info);
public:
  using IKmerStore<Info>::insert;

  /**
   * @param revcomp: should the revcomp of the sequences also be indexed
   * @param multiple_info: should all the Info stored in the automaton or
   *                       only a single value summarizing them all.
   *
   * The default seed will be a contiguous seed of 10 letters.  But the seed
   * can be specified when inserting sequences. This should be the preferred
   * choice as one may want to have different seeds depending on the
   * sequences.
   */
  PointerACAutomaton(bool revcomp=false, bool multiple_info=false);

  /**
   * @param seed: the seed to be used for indexing
   * @param revcomp: indexing revcomp too ?
   * @param multiple_info: storing all info?
   */
  PointerACAutomaton(string seed, bool revcomp=false, bool multiple_info=false);

  /**
   * @param k: the size of the contiguous seed
   * @param revcomp: indexing revcomp too ?
   * @param multiple_info: storing all info?
   */
  PointerACAutomaton(int k, bool revcomp=false, bool multiple_info=false);

  ~PointerACAutomaton();

  void build_failure_functions();

  /**
   * @return the information stored for this state
   */
  list<Info> &getInfo(void *state);

  /**
   * @return the automaton initial state
   */
  pointer_state<Info> *getInitialState();

  pointer_state<Info> *goto_state(const string &seq, void *starting_state=NULL);

  /**
   * Insert the sequence in the automata
   */
  void insert(const seqtype &seq, Info info);

  /**
   * Insert all the possible kmers from the sequence, depending on the
   * provided seed (or the default seed if none is provided)
   */
  void insert(const seqtype &seq, const string &label,
              bool ignore_extended_nucleotides=true,
              int keep_only=0, string seed="");

  /**
   * @return true iff states points to a final state
   */
  bool isFinalState(void *state);

  /**
   * @param state: a pointer to the current state
   * @param c: the character to follow
   * @return the state accessible from state with character c.
   *         It will always return a valid pointer, at least the initial state.
   */
  void *next(void *state, char c);

  // From IKmerStore

  vector<Info> getResults(const seqtype &seq, bool no_revcomp=false, string seed = "");
 	 
  map<Info,int> getMultiResults(const seqtype &seq, bool no_revcomp=false, string seed = "");
  Info& get(seqtype &word) ;

   Info& operator[](seqtype& word);
};

#endif
