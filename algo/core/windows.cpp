#include <iostream>
#include <string>
#include "tools.h"
#include "../lib/json.hpp"
#include "windows.h"
#include "representative.h"
#include "segment.h"

WindowsStorage::WindowsStorage(map<string, string> &labels)
  :windows_labels(labels),max_reads_per_window(~0),nb_bins(NB_BINS),max_value_bins(MAX_VALUE_BINS) {}

list<pair <junction, size_t> > &WindowsStorage::getSortedList() {
  return sort_all_windows;
}

map<junction, BinReadStorage>::iterator WindowsStorage::begin() {
  return seqs_by_window.begin();
}

map<junction, BinReadStorage>::iterator WindowsStorage::end() {
  return seqs_by_window.end();
}

float WindowsStorage::getAverageLength(junction window) {
  assert(hasWindow(window));
  return seqs_by_window[window].getAverageLength();
}

Germline *WindowsStorage::getGermline(junction window) {
  map<junction, Germline *>::iterator result = germline_by_window.find(window);
  if (result == germline_by_window.end())
    return NULL;
  return result->second;
}

size_t WindowsStorage::getMaximalNbReadsPerWindow() {
  return max_reads_per_window;
}

json WindowsStorage::statusToJson(junction window) {
    json result;
    
    for (unsigned int i=0; i<status_by_window[window].size(); i++){
        if (status_by_window[window][i] !=0){
            ostringstream oss; 
            oss << i;
            result[oss.str()] = status_by_window[window][i];
        }
    }
    
    return result;
}

size_t WindowsStorage::getNbReads(junction window) {
  assert(hasWindow(window));
  return seqs_by_window[window].getNbInserted();
}

list<Sequence> WindowsStorage::getReads(junction window) {
  return seqs_by_window[window].getReads();
}

KmerRepresentativeComputer WindowsStorage::getRepresentativeComputer(junction window,
                                           string seed, size_t min_cover, 
                                           float percent_cover,
                                           size_t nb_sampled) {
  assert(! hasLimitForReadsPerWindow() || nb_sampled <= getMaximalNbReadsPerWindow());
  list<Sequence> auditioned_sequences 
    = getSample(window,nb_sampled);
  KmerRepresentativeComputer repComp(auditioned_sequences, seed);
  repComp.setRevcomp(true);
  repComp.setMinCover((! isInterestingJunction(window)) ? min_cover : 1);
  repComp.setPercentCoverage(percent_cover);
  repComp.setRequiredSequence(window);
  repComp.setCoverageReferenceLength(getAverageLength(window));
  repComp.compute();

  // We should always have a representative, because either the junction is labelled (thus setMinCover(1)), or:
  // - there is at least min('min_reads_clone', 'max_auditioned') sequences in auditioned_sequences
  // - and 'min_cover' = min('min_reads_clone', 'max_auditioned')
  // - and these sequence are at least as long as the seed
  if (!repComp.hasRepresentative())
    throw invalid_argument("No representative for junction " + window);

  return repComp;
}

list<Sequence> WindowsStorage::getSample(junction window, size_t nb_sampled) {
  return seqs_by_window[window].getBestReads(nb_sampled);
}

set<Germline *> WindowsStorage::getTopGermlines(size_t top, size_t min_reads) {
  assert(sort_all_windows.size() == seqs_by_window.size());

  set<Germline *> top_germlines;
  size_t count = 0;

  for (list<pair <junction, size_t> >::const_iterator it = sort_all_windows.begin();
       it != sort_all_windows.end() && count < top && (size_t)it->second >= min_reads;
       ++it, ++count) {
    top_germlines.insert(getGermline(it->first));
  }

  return top_germlines;
}

bool WindowsStorage::hasLimitForReadsPerWindow() {
  return max_reads_per_window != (size_t)~0;
}

bool WindowsStorage::hasWindow(junction window) {
  map<junction, Germline *>::iterator result = germline_by_window.find(window);
  return (result != germline_by_window.end());
}

string WindowsStorage::getLabel(junction window) {

  bool found = false;
  for (auto it: windows_labels) {
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

bool WindowsStorage::isInterestingJunction(junction window) {
  return (getLabel(window).length() != 0) ;
}

size_t WindowsStorage::size() {
  return seqs_by_window.size();
}

void WindowsStorage::setBinParameters(size_t nb, size_t max_value) {
  nb_bins = nb;
  max_value_bins = max_value;
}

void WindowsStorage::setIdToAll() {
    int id = 0;
    for (map <junction, BinReadStorage >::const_iterator it = seqs_by_window.begin();
        it != seqs_by_window.end(); ++it) {
            id_by_window.insert(make_pair(it->first, id));
            id++;
    }
}

void WindowsStorage::add(junction window, Sequence sequence, int status, Germline *germline, list<int> extra_statuses) {
  if (! hasWindow(window)) {
    // First time we see that window: init
    status_by_window[window].resize(STATS_SIZE);
    seqs_by_window[window].init(nb_bins, max_value_bins, &scorer);
    seqs_by_window[window].setMaxNbReadsStored(getMaximalNbReadsPerWindow());
  }

  seqs_by_window[window].add(sequence);
  status_by_window[window][status]++;

  for (int extra: extra_statuses)
    status_by_window[window][extra]++;

  germline_by_window[window] = germline;
}

pair <int, size_t> WindowsStorage::keepInterestingWindows(size_t min_reads_window) {
  int removes = 0 ;
  size_t nb_reads = 0 ;

  for (map <junction, BinReadStorage >::iterator it = seqs_by_window.begin();
       it != seqs_by_window.end(); ) // We do not advance the iterator here because of the deletion
    {
      junction junc = it->first;
      size_t nb_reads_this_window = getNbReads(junc);
      // Is it not supported by enough reads?
      if (!(nb_reads_this_window >= min_reads_window)
          // Is it not a labelled junction?
          && ! isInterestingJunction(junc))
        {
          map <junction, BinReadStorage >::iterator toBeDeleted = it;
          it++;
          seqs_by_window.erase(toBeDeleted);
          removes++ ;
        }
      else {
        nb_reads += nb_reads_this_window;
        it++;
      }
    }

  sort_all_windows.clear();
  return make_pair(removes, nb_reads);
}

void WindowsStorage::setMaximalNbReadsPerWindow(size_t max_reads){
  max_reads_per_window = max_reads;
}
  
void WindowsStorage::sort() {
  sort_all_windows.clear();
  for (map <junction, BinReadStorage >::const_iterator it = seqs_by_window.begin();
       it != seqs_by_window.end(); ++it)
    {
      sort_all_windows.push_back(make_pair(it->first, it->second.getNbInserted()));
    }

  sort_all_windows.sort(pair_occurrence_sort<junction>);
}

ostream &WindowsStorage::printSortedWindows(ostream &os) {
  int num_seq = 0 ;

  for (list<pair <junction, size_t> >::const_iterator it = sort_all_windows.begin();
       it != sort_all_windows.end(); ++it) 
    {
      num_seq++ ;

      windowToStream(os, it->first, num_seq, it->second);
    }
  return os;
}



json WindowsStorage::computeDiversity(int nb_segmented) {

  double index_H_entropy = 0.0 ;
  double index_1_minus_Ds_diversity = 0.0 ;

  double nb_seg_nb_seg_m1 = (double) nb_segmented * ((double) nb_segmented - 1);

  for (auto it = seqs_by_window.begin(); it != seqs_by_window.end(); ++it) {
    size_t clone_nb_reads = it->second.getNbInserted();

    float ratio = (float) clone_nb_reads / nb_segmented ;
    index_H_entropy -= ratio * log(ratio) ;

    index_1_minus_Ds_diversity += ((double) clone_nb_reads * ((double) clone_nb_reads - 1)) / nb_seg_nb_seg_m1 ;
  }

  float index_E_equitability  = index_H_entropy / log(nb_segmented) ;
  float index_Ds_diversity = 1 - index_1_minus_Ds_diversity ;

  cout << "Diversity measures" << endl
       << "  H = " << index_H_entropy << endl        // Shannon's diversity
       << "  E = " << index_E_equitability  << endl  // Shannon's equitability
       << " Ds = " << index_Ds_diversity << endl     // Simpson's diversity
       << endl;

  json jsonDiversity;
  jsonDiversity["index_H_entropy"] = index_H_entropy ;
  jsonDiversity["index_E_equitability"] = index_E_equitability ;
  jsonDiversity["index_Ds_diversity"] = index_Ds_diversity ;

  return jsonDiversity;
}


json WindowsStorage::sortedWindowsToJson(map <junction, json> json_data_segment, int max_json_output) {
  json windowsArray;
  int top = 1;
    
  for (list<pair <junction, size_t> >::const_iterator it = sort_all_windows.begin(); 
       it != sort_all_windows.end(); ++it) 
    {
       
      json windowsList;

      if (json_data_segment.find(it->first) != json_data_segment.end()){
          windowsList = json_data_segment[it->first];
      }else{
          windowsList["sequence"] = 0; //TODO need to compute representative sequence for this case
      }
      
      json reads = {it->second};
      windowsList["id"] = it->first;
      if (status_by_window[it->first][SEG_CHANGED_WINDOW])
        json_add_warning(windowsList, "W50", "Short or shifted window");


      windowsList["reads"] = reads;
      windowsList["top"] = top++;
      windowsList["germline"] = germline_by_window[it->first]->code;
      windowsList["seg_stat"] = this->statusToJson(it->first);
      
      windowsArray.push_back(windowsList);

      if (top == max_json_output + 1)
        break ;
    }

  return windowsArray;
}

ostream &WindowsStorage::windowToStream(ostream &os, junction window, int num_seq, 
                                        size_t size) {
  os << ">" << size << "--window--" << num_seq << " " << getLabel(window) << endl ;
  os << window << endl;
  return os;
}
