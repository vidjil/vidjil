#ifndef AUTOMATON_HPP
#define AUTOMATON_HPP

#include "automaton.h"
#include <stack>
#include <set>
//////////////////// IMPLEMENTATIONS ////////////////////

template <class Info>
AbstractACAutomaton<Info>::AbstractACAutomaton():IKmerStore<Info>() {}

template <class Info>
void AbstractACAutomaton<Info>::finish_building() {
  if (! IKmerStore<Info>::finished_building) {
    IKmerStore<Info>::finish_building();
    build_failure_functions();
  }
  all_index_load = 0;
  for(auto iter: kmers_inserted) {
    all_index_load += getIndexLoad(iter.first);
  }
}

template<class Info>
float AbstractACAutomaton<Info>::getIndexLoad(Info kmer) const {
  if (kmers_inserted.count(kmer) == 0) {
    return (kmer.isUnknown()) ? 1 - all_index_load : all_index_load;
  } else {
    return kmers_inserted.at(kmer) / pow(4.0, kmer.getLength());
  }
}

template<class T>
bool AbstractACAutomaton<T>::hasDifferentKmerTypes() const {
  return true;
}

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
PointerACAutomaton<Info>::PointerACAutomaton(bool revcomp, bool multiple_info):AbstractACAutomaton<Info>(){
  init("##########",revcomp, multiple_info);
}

template <class Info>
PointerACAutomaton<Info>::PointerACAutomaton(string seed, bool revcomp, bool multiple_info):AbstractACAutomaton<Info>() {
  init(seed, revcomp, multiple_info);
}

template <class Info>
PointerACAutomaton<Info>::PointerACAutomaton(int k, bool revcomp, bool multiple_info):AbstractACAutomaton<Info>() {
  init(seed_contiguous(k), revcomp, multiple_info);
}

template <class Info>
void PointerACAutomaton<Info>::init(string seed, bool revcomp, bool multiple_info) {
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
  this->multiple_info = multiple_info;
}

template <class Info>
PointerACAutomaton<Info>::~PointerACAutomaton() {
  free_automaton(this->getInitialState());
}

template <class Info>
void PointerACAutomaton<Info>::free_automaton(pointer_state<Info> *state) {
  set<void *> deleted_states;
  stack<pointer_state<Info> *> states_stacked;
  deleted_states.insert(state);
  states_stacked.push(state);

  while (! states_stacked.empty()) {
    pointer_state<Info> *current_state = states_stacked.top();
    states_stacked.pop();
    for (size_t i = 0; i < NB_TRANSITIONS; i++) {
      if (current_state->transitions[i] != NULL
          && deleted_states.count(current_state->transitions[i]) == 0
          && current_state->transitions[i] != current_state) {
        deleted_states.insert(current_state->transitions[i]);
        states_stacked.push(current_state->transitions[i]);
      }
    }
    delete current_state;
  }
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
    if (failed_state->is_final) {
      current_state->is_final = true;
      current_state->informations = failed_state->informations;
    }
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
  bool existing_final = true;

  for (i = 0; i < seq_length && state->transition(seq[i]) != NULL; i++) {
    state = state->transition(seq[i]);
  }

  if (i < seq_length) {
    existing_final = false;
    // Need to create more states
    for (; i < seq_length; i++) {
      pointer_state<Info> *new_state = new pointer_state<Info>();
      state->transitions[nuc_to_int(seq[i])] = new_state;
      state = new_state;
    }
  }
  state->is_final = true;
  if (! existing_final) {
    this->nb_kmers_inserted++;
    this->kmers_inserted[info]++;
  }
  if (state->informations.front().isNull() || ! this->multiple_info)
    state->informations.front() += info;
  else
    state->informations.push_back(info);
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
      insert(seq, Info(label, 1, seed_span));
    }
    if (! Info::hasRevcompSymetry()) {
      for (seqtype &seq: sequences_rev) {
        insert(seq, Info(label, -1, seed_span));
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
  void *accessed_state = ((pointer_state<Info> *)next_state)->transition(c);
  assert(accessed_state != NULL);        // Did you call finish_building()?
  return accessed_state;
}


template <class Info>
vector<Info> PointerACAutomaton<Info>::getResults(const seqtype &seq, bool no_revcomp, string seed) {
  UNUSED(no_revcomp);
  UNUSED(seed);
  // TODO: what should we do with several info at the same place?
  //       for now they are overwritten

  pointer_state<Info>* current_state = getInitialState();
  size_t seq_len = seq.length();
  vector<Info> result(seq.length());

  for (size_t i = 0; i < seq_len; i++) {
    current_state = (pointer_state<Info> *)next(current_state, seq[i]);
    Info info = current_state->informations.front();
    result[i - info.getLength()+1] = info;
  }

  return result;
}

template <class Info>
map<Info, int> PointerACAutomaton<Info>::getMultiResults(const seqtype &seq, bool no_revcomp, string seed) {
  UNUSED(no_revcomp);
  UNUSED(seed);
  pointer_state<Info>* current_state = getInitialState();
  size_t seq_len = seq.length();
  map<Info, int> results;

  for(size_t i = 0;i < seq_len;++i) {
    current_state = (pointer_state<Info> *)next(current_state, seq[i]);
    set<Info> informations(current_state->informations.begin(),
                           current_state->informations.end());
    for(auto const& info : informations){
      /* If map contain info, increase its occurence. */
      if(results.count(info) > 0){
        results[info] = results[info] + 1;
      }
      /* Otherwise add info into map with a value of 1. */
      else{ 
        results.insert(pair<Info,int>(info,1));
      }
    } 
  }   
  return results;
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
