#ifndef AUTOMATON_HPP
#define AUTOMATON_HPP

#include "automaton.h"

//////////////////// IMPLEMENTATIONS ////////////////////

template <class Info>
bool AbstractACAutomaton<Info>::isInitialState(void *state) {
  return state == initialState;
}

template <class Info>
void *AbstractACAutomaton<Info>::goto_state(const string &seq, void *starting_state) {
  void *current_state = starting_state;
  size_t seq_length = seq.length();

  if (! current_state)
    current_state = initialState;

  for (size_t i = 0; i < seq_length; i++) {
    current_state = this->next(current_state, seq[i]);
  }

  return current_state;
}

///////////////////////

template <class Info>
PointerACAutomaton<Info>::PointerACAutomaton(bool revcomp){
  init("##########",revcomp);
}

template <class Info>
PointerACAutomaton<Info>::PointerACAutomaton(string seed, bool revcomp) {
  init(seed, revcomp);
}

template <class Info>
PointerACAutomaton<Info>::PointerACAutomaton(int k, bool revcomp) {
  init(seed_contiguous(k), revcomp);
}

template <class Info>
void PointerACAutomaton<Info>::init(string seed, bool revcomp) {
  if (revcomp && Info::hasRevcompSymetry()) {
    cerr << "PointerACAutomaton cannot deal with revcomp symmetry at the moment."
         << endl;
    exit(42);
  }
  this->initialState = new pointer_state<Info>();
  this->nb_kmers_inserted = 0;
  this->seed = seed;
  this->k = seed_weight(seed);
  this->s = seed.length();
  this->revcomp_indexed = revcomp;
  this->max_size_indexing = 0;
}

template <class Info>
PointerACAutomaton<Info>::~PointerACAutomaton() {
  set<void *>deleted_states;
  free_automaton(this->getInitialState(), deleted_states);
}

template <class Info>
void PointerACAutomaton<Info>::free_automaton(pointer_state<Info> *state,
                                              set<void *> &deleted_states) {
  deleted_states.insert(state);
  for (size_t i = 0; i < NB_TRANSITIONS; i++) {
    if (state->transitions[i] != NULL
        && deleted_states.count(state->transitions[i]) == 0
        && state->transitions[i] != state)
      free_automaton(state->transitions[i], deleted_states);
  }
  delete state;
}

template <class Info>
void PointerACAutomaton<Info>::build_failure_functions() {
  queue<pair<pointer_state<Info>*,pointer_state<Info>*> > q;
  pointer_state<Info> *current_state = this->getInitialState();

  // Algorithm ALP-COMPLET in CHL, 2001
  for (size_t i = 0; i < NB_TRANSITIONS; i++) {
    if (current_state->transitions[i] == NULL) {
      current_state->transitions[i] = current_state;
    } else {
      q.push(pair<pointer_state<Info>*,pointer_state<Info>*>(current_state->transitions[i],
                                                             this->getInitialState()));
    }
  }
  while (! q.empty()) {
    pair<pointer_state<Info>*, pointer_state<Info>*> couple = q.front();
    q.pop();
    current_state = couple.first;
    pointer_state<Info> *failed_state = couple.second;
    if (failed_state->is_final)
      current_state->is_final = true;
    for (size_t i = 0; i < NB_TRANSITIONS; i++) {
      if (current_state->transitions[i] != NULL) {
        q.push(pair<pointer_state<Info>*, pointer_state<Info>*>(current_state->transitions[i],
                                                    failed_state->transitions[i]));
      } else {
        current_state->transitions[i] = failed_state->transitions[i];
      }
    }
  }
}

template <class Info>
list<Info> &PointerACAutomaton<Info>::getInfo(void *state) {
  return ((pointer_state<Info> *)state)->informations;
}

template <class Info>
pointer_state<Info>* PointerACAutomaton<Info>::getInitialState() {
  return (pointer_state<Info>*) this->initialState;
}

template <class Info>
pointer_state<Info>* PointerACAutomaton<Info>::goto_state(const string &seq,
                                                          void *starting_state) {
  return (pointer_state<Info>*) AbstractACAutomaton<Info>::goto_state(seq, starting_state);
}

template <class Info>
void PointerACAutomaton<Info>::insert(const seqtype &seq, Info info) {
  pointer_state<Info> *state = getInitialState();
  size_t seq_length = seq.length();
  size_t i;

  for (i = 0; i < seq_length && state->transition(seq[i]) != NULL; i++) {
    state = state->transition(seq[i]);
  }

  if (i < seq_length) {
    // Need to create more states
    for (; i < seq_length; i++) {
      pointer_state<Info> *new_state = new pointer_state<Info>();
      this->nb_kmers_inserted++;
      state->transitions[nuc_to_int(seq[i])] = new_state;
      state = new_state;
    }
  }
  state->is_final = true;
  state->informations.front() += info;
}

template <class Info>
void PointerACAutomaton<Info>::insert(const seqtype &sequence, const string &label,
                                      bool ignore_extended_nucleotides,
                                      int keep_only,
                                      string seed) {
  size_t start_indexing = 0;
  size_t end_indexing = sequence.length();
  if (keep_only > 0 && sequence.length() > (size_t)keep_only) {
    start_indexing = sequence.length() - keep_only;
  } else if (keep_only < 0 && sequence.length() > (size_t) -keep_only) {
    end_indexing = -keep_only;
  }

  size_t size_indexing = end_indexing - start_indexing;
  if (size_indexing > this->max_size_indexing) {
    this->max_size_indexing = size_indexing;
  }

  if (seed.empty())
    seed = this->seed;
  size_t seed_span = seed.length();

  for(size_t i = start_indexing ; i + seed_span < end_indexing + 1 ; i++) {
    seqtype substr = sequence.substr(i, seed_span);
    vector<seqtype> sequences = generate_all_seeds(substr, seed);
    vector<seqtype> sequences_rev;

    if (ignore_extended_nucleotides && has_extended_nucleotides(substr))
      continue;

    if (this->revcomp_indexed && ! Info::hasRevcompSymetry()) {
      sequences_rev = generate_all_seeds(revcomp(substr), reverse(seed));
    }

    for (seqtype &seq: sequences) {
      insert(seq, Info(label, 1));
    }
    if (! Info::hasRevcompSymetry()) {
      for (seqtype &seq: sequences_rev) {
        insert(seq, Info(label, -1));
      }
    }
  }
}

template <class Info>
bool PointerACAutomaton<Info>::isFinalState(void *state) {
  return ((pointer_state<Info> *)state)->is_final;
}

template <class Info>
void *PointerACAutomaton<Info>::next(void *state, char c) {
  void *next_state = state;
  c = toupper(c);
  return ((pointer_state<Info> *)next_state)->transition(c);
}


template <class Info>
vector<Info> PointerACAutomaton<Info>::getResults(const seqtype &seq, bool no_revcomp) {
  // TODO: what should we do with several info at the same place?
  //       for now they are overwritten

  pointer_state<Info>* current_state = getInitialState();
  size_t seq_len = seq.length();
  vector<Info> result(seq.length());

  for (size_t i = 0; i < seq_len; i++) {
    current_state = (pointer_state<Info> *)next(current_state, seq[i]);
    result[i] = current_state->informations.front();
  }

  return result;
}

template <class Info>
Info& PointerACAutomaton<Info>::get(seqtype &word) {
  pointer_state<Info> *state = (pointer_state<Info> *)this->goto_state(word);
  return state->informations.front();
}

template <class Info>
Info &PointerACAutomaton<Info>::operator[](seqtype &word) {
  return get(word);
}


#endif
