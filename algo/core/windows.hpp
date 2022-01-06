#ifndef WINDOWS_HPP
#define WINDOWS_HPP
#include <iostream>
#include <string>
#include "tools.h"
#include "../lib/json.hpp"
#include "windows.h"
#include "representative.h"
#include "segment.h"

template <typename Tshortcut, typename Affect>
WindowsStorage<Tshortcut, Affect>::WindowsStorage(map<string, string> &labels)
  : windows_labels(labels), max_reads_per_window(~0), scorer(&DEFAULT_READ_SCORE), nb_bins(NB_BINS), max_value_bins(MAX_VALUE_BINS) {}

template <typename Tshortcut, typename Affect>
list<pair<junction, size_t>> &WindowsStorage<Tshortcut, Affect>::getSortedList() {
  return sort_all_windows;
}

template <typename Tshortcut, typename Affect>
map<junction, BinReadStorage>::iterator WindowsStorage<Tshortcut, Affect>::begin() {
  return seqs_by_window.begin();
}

template <typename Tshortcut, typename Affect>
map<junction, BinReadStorage>::iterator WindowsStorage<Tshortcut, Affect>::end() {
  return seqs_by_window.end();
}

template <typename Tshortcut, typename Affect>
float WindowsStorage<Tshortcut, Affect>::getAverageLength(junction window) {
  assert(hasWindow(window));
  return seqs_by_window[window].getAverageLength();
}

template <typename Tshortcut, typename Affect>
Germline<Tshortcut, Affect>* WindowsStorage<Tshortcut, Affect>::getGermline(junction window) {
  auto result = germline_by_window.find(window);
  if (result == germline_by_window.end())
    return NULL;
  return result->second;
}

template <typename Tshortcut, typename Affect>
size_t WindowsStorage<Tshortcut, Affect>::getMaximalNbReadsPerWindow() {
  return max_reads_per_window;
}

template <typename Tshortcut, typename Affect>
json WindowsStorage<Tshortcut, Affect>::statusToJson(junction window) {
  json result;
    
  for (unsigned int i = 0; i < status_by_window[window].size(); i++) {
    if (status_by_window[window][i] != 0) {
      ostringstream oss;
      oss << i;
      result[oss.str()] = status_by_window[window][i];
    }
  }
    
  return result;
}

template <typename Tshortcut, typename Affect>
size_t WindowsStorage<Tshortcut, Affect>::getNbReads(junction window) {
  assert(hasWindow(window));
  return seqs_by_window[window].getNbInserted();
}

template <typename Tshortcut, typename Affect>
list<Sequence> WindowsStorage<Tshortcut, Affect>::getReads(junction window) {
  return seqs_by_window[window].getReads();
}

template <typename Tshortcut, typename Affect>
KmerRepresentativeComputer WindowsStorage<Tshortcut, Affect>::getRepresentativeComputer(junction window,
                                                                                        string seed, size_t min_cover, 
                                                                                        float percent_cover,
                                                                                        size_t nb_sampled) {
  assert(!hasLimitForReadsPerWindow() || nb_sampled <= getMaximalNbReadsPerWindow());
  list<Sequence> auditioned_sequences = getSample(window, nb_sampled);
  KmerRepresentativeComputer repComp(auditioned_sequences, seed);
  repComp.setRevcomp(true);
  repComp.setMinCover((!isInterestingJunction(window)) ? min_cover : 1);
  repComp.setPercentCoverage(percent_cover);
  repComp.setRequiredSequence(window);
  repComp.setCoverageReferenceLength(getAverageLength(window));
  repComp.compute(*scorer);

  // We should always have a representative, because either the junction is labelled (thus setMinCover(1)), or:
  // - there is at least min('min_reads_clone', 'max_auditioned') sequences in auditioned_sequences
  // - and 'min_cover' = min('min_reads_clone', 'max_auditioned')
  // - and these sequence are at least as long as the seed
  if (!repComp.hasRepresentative())
    throw invalid_argument("No representative for junction " + window);

  return repComp;
}

template <typename Tshortcut, typename Affect>
list<Sequence> WindowsStorage<Tshortcut, Affect>::getSample(junction window, size_t nb_sampled) {
  return seqs_by_window[window].getBestReads(nb_sampled);
}

template <typename Tshortcut, typename Affect>
set<Germline<Tshortcut, Affect>*> WindowsStorage<Tshortcut, Affect>::getTopGermlines(size_t top, size_t min_reads) {
  assert(sort_all_windows.size() == seqs_by_window.size());

  set<Germline<Tshortcut, Affect>*> top_germlines;
  size_t count = 0;

  for (auto it = sort_all_windows.begin(); it != sort_all_windows.end() && count < top && (size_t)it->second >= min_reads; ++it, ++count) {
    top_germlines.insert(getGermline(it->first));
  }

  return top_germlines;
}

template <typename Tshortcut, typename Affect>
bool WindowsStorage<Tshortcut, Affect>::hasLimitForReadsPerWindow() {
  return max_reads_per_window != (size_t)~0;
}

template <typename Tshortcut, typename Affect>
bool WindowsStorage<Tshortcut, Affect>::hasWindow(junction window) {
  auto result = germline_by_window.find(window);
  return (result != germline_by_window.end());
}

template <typename Tshortcut, typename Affect>
string WindowsStorage<Tshortcut, Affect>::getLabel(junction window) {
  bool found = false;
  for (auto it : windows_labels) {
    string sequence_of_interest = it.first;
    if (sequence_of_interest.size() < window.size()) {
      found = window.find(sequence_of_interest) != string::npos
        || window.find(revcomp(sequence_of_interest)) != string::npos;
    } else {
      found = sequence_of_interest.find(window) != string::npos
        || sequence_of_interest.find(revcomp(window)) != string::npos;
    }
    if (found)
      return it.second;
  }
  return "";
}

template <typename Tshortcut, typename Affect>
bool WindowsStorage<Tshortcut, Affect>::isInterestingJunction(junction window) {
  return (getLabel(window).length() != 0);
}

template <typename Tshortcut, typename Affect>
size_t WindowsStorage<Tshortcut, Affect>::size() {
  return seqs_by_window.size();
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::setBinParameters(size_t nb, size_t max_value) {
  nb_bins = nb;
  max_value_bins = max_value;
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::setIdToAll() {
  int id = 0;
  for (auto it = seqs_by_window.begin(); it != seqs_by_window.end(); ++it) {
    id_by_window.insert(make_pair(it->first, id));
    id++;
  }
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::setScorer(VirtualReadScore *scorer) {
  this->scorer = scorer;
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::add(junction window, Sequence sequence, int status, Germline<Tshortcut, Affect> *germline, list<int> extra_statuses) {
  if (!hasWindow(window)) {
    // First time we see that window: init
    status_by_window[window].resize(STATS_SIZE);
    seqs_by_window[window].init(nb_bins, max_value_bins, scorer);
    seqs_by_window[window].setMaxNbReadsStored(getMaximalNbReadsPerWindow());
  }

  seqs_by_window[window].add(sequence);
  status_by_window[window][status]++;

  for (int extra : extra_statuses)
    status_by_window[window][extra]++;

  germline_by_window[window] = germline;
}

template <typename Tshortcut, typename Affect>
pair<int, size_t> WindowsStorage<Tshortcut, Affect>::keepInterestingWindows(size_t min_reads_window) {
  int removes = 0;
  size_t nb_reads = 0;

  for (auto it = seqs_by_window.begin(); it != seqs_by_window.end();) // We do not advance the iterator here because of the deletion
  { 
    junction junc = it->first;
    size_t nb_reads_this_window = getNbReads(junc);
    // Is it not supported by enough reads?
    if (!(nb_reads_this_window >= min_reads_window)
        // Is it not a labelled junction?
        && !isInterestingJunction(junc)) {
      auto toBeDeleted = it;
      it++;
      seqs_by_window.erase(toBeDeleted);
      removes++;
    } else {
      nb_reads += nb_reads_this_window;
      it++;
    }
  }

  sort_all_windows.clear();
  return make_pair(removes, nb_reads);
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::setMaximalNbReadsPerWindow(size_t max_reads) {
  max_reads_per_window = max_reads;
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::sort() {
  sort_all_windows.clear();
  for (auto it = seqs_by_window.begin(); it != seqs_by_window.end(); ++it) {
    sort_all_windows.push_back(make_pair(it->first, it->second.getNbInserted()));
  }

  sort_all_windows.sort(pair_occurrence_sort<junction>);
}

template <typename Tshortcut, typename Affect>
ostream &WindowsStorage<Tshortcut, Affect>::printSortedWindows(ostream &os) {
  int num_seq = 0;

  for (auto it = sort_all_windows.begin(); it != sort_all_windows.end(); ++it) {
    num_seq++;
    windowToStream(os, it->first, num_seq, it->second);
  }
  return os;
}

template <typename Tshortcut, typename Affect>
json WindowsStorage<Tshortcut, Affect>::computeDiversity(int nb_segmented) {

  double index_H_entropy = 0.0;
  double index_1_minus_Ds_diversity = 0.0;

  for (auto it = seqs_by_window.begin(); it != seqs_by_window.end(); ++it) {
    size_t clone_nb_reads = it->second.getNbInserted();

    float ratio = (float) clone_nb_reads / nb_segmented;
    index_H_entropy -= ratio * log(ratio);

    index_1_minus_Ds_diversity += ((double) clone_nb_reads * ((double) clone_nb_reads - 1));
  }

  double nb_seg_nb_seg_m1 = (double) nb_segmented * ((double) nb_segmented - 1);
  float index_Ds_diversity = 1 - index_1_minus_Ds_diversity / nb_seg_nb_seg_m1;

  float index_E_equitability = index_H_entropy / log(nb_segmented);


  cout << "Diversity measures" << endl
       << "  H = " << index_H_entropy << endl        // Shannon's diversity
       << "  E = " << index_E_equitability  << endl  // Shannon's equitability
       << " Ds = " << index_Ds_diversity << endl     // Simpson's diversity
       << endl;

  json jsonDiversity;
  jsonDiversity["index_H_entropy"] = index_H_entropy;
  jsonDiversity["index_E_equitability"] = index_E_equitability;
  jsonDiversity["index_Ds_diversity"] = index_Ds_diversity;

  return jsonDiversity;
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::clearSequences() {
  seqs_by_window.clear();
}

template <typename Tshortcut, typename Affect>
void WindowsStorage<Tshortcut, Affect>::sortedWindowsToOutput(SampleOutput *output, int max_output, bool delete_all) {

  int top = 1;

  for (auto it = sort_all_windows.begin(); it != sort_all_windows.end();) {

    CloneOutput *clone = output->getClone(it->first, germline_by_window[it->first]->code);

    if (status_by_window[it->first][SEG_CHANGED_WINDOW])
      clone->add_warning(W50_WINDOW, "Short or shifted window", LEVEL_WARN, false);

    clone->set("id", it->first);
    clone->set("reads", { it->second });
    clone->set("top", top++);

    if (delete_all) {
      germline_by_window.erase(it->first);
      status_by_window.erase(it->first);
      it = sort_all_windows.erase(it);
    } else {
      it++;
    }
    if (top == max_output + 1)
      break;
  }
}

template <typename Tshortcut, typename Affect>
ostream &WindowsStorage<Tshortcut, Affect>::windowToStream(ostream &os, junction window, int num_seq, size_t size) {
  os << ">" << size << "--window--" << num_seq << " " << getLabel(window) << endl;
  os << window << endl;
  return os;
}
#endif
