#include <iostream>
#include <string>
#include "tools.h"
#include "json.h"
#include "windows.h"
#include "representative.h"
#include "sequenceSampler.h"
#include "segment.h"
#include "json.h"

WindowsStorage::WindowsStorage(map<string, string> &labels)
  :windows_labels(labels),max_reads_per_window(~0),nb_bins(NB_BINS),max_value_bins(MAX_VALUE_BINS) {}

list<pair <junction, size_t> > &WindowsStorage::getSortedList() {
  return sort_all_windows;
}

string WindowsStorage::getLabel(junction window) {
  
  if (windows_labels.find(window) == windows_labels.end())
    return "" ;
  
  return windows_labels[window];   
}

float WindowsStorage::getAverageLength(junction window) {
  assert(hasWindow(window));
  return seqs_by_window[window].getAverageScore();
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

JsonList WindowsStorage::statusToJson(junction window) {
    JsonList result;
    
    for (unsigned int i=0; i<status_by_window[window].size(); i++){
        if (status_by_window[window][i] !=0){
            ostringstream oss; 
            oss << i;
            result.add(oss.str(), status_by_window[window][i]);
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
                                           size_t nb_sampled, 
                                           size_t nb_buckets) {
  assert(! hasLimitForReadsPerWindow() || nb_sampled <= getMaximalNbReadsPerWindow());
  list<Sequence> auditioned_sequences 
    = getSample(window,nb_sampled, nb_buckets);
  KmerRepresentativeComputer repComp(auditioned_sequences, seed);
  repComp.setRevcomp(true);
  repComp.setMinCover(min_cover);
  repComp.setPercentCoverage(percent_cover);
  repComp.setRequiredSequence(window);
  repComp.setCoverageReferenceLength(getAverageLength(window));
  repComp.compute();

  // We should always have a representative, because
  // - there is at least min('min_reads_clone', 'max_auditioned') sequences in auditioned_sequences
  // - and 'min_cover' = min('min_reads_clone', 'max_auditioned')
  // - and these sequence are at least as long as the seed
  if (!repComp.hasRepresentative())
    throw invalid_argument("No representative for junction " + window);

  return repComp;
}

list<Sequence> WindowsStorage::getSample(junction window, size_t nb_sampled,
                                         size_t nb_buckets) {
  list<Sequence> reads = getReads(window);
  if (reads.size() <= nb_sampled)
    return reads;
  return SequenceSampler(reads).getLongest(nb_sampled, nb_buckets);
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

void WindowsStorage::add(junction window, Sequence sequence, int status, Germline *germline) {
  if (! hasWindow(window)) {
    // First time we see that window: init
    status_by_window[window].resize(STATS_SIZE);
    seqs_by_window[window].init(nb_bins, max_value_bins, &scorer);
    seqs_by_window[window].setMaxNbReadsStored(getMaximalNbReadsPerWindow());
  }

  seqs_by_window[window].add(sequence);
  status_by_window[window][status]++;

  germline_by_window[window] = germline;
}

void WindowsStorage::fillStatsClones()
{
  for (map <junction, BinReadStorage >::iterator it = seqs_by_window.begin();
       it != seqs_by_window.end();
       it++)
    {
      junction junc = it->first;
      int nb_reads = it->second.getNbInserted();
      Germline *germline = germline_by_window[junc];

      germline->stats_clones.insert(nb_reads);
    }
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
          && (windows_labels.find(junc) == windows_labels.end()))
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

JsonArray WindowsStorage::sortedWindowsToJsonArray(map <junction, JsonList> json_data_segment) {
  JsonArray windowsArray;
  int top = 1;
    
  for (list<pair <junction, size_t> >::const_iterator it = sort_all_windows.begin();
       it != sort_all_windows.end(); ++it) 
    {
	   
      JsonList windowsList;
      JsonArray json_reads;
      JsonArray json_seg;
      json_reads.add(it->second);

	  if (json_data_segment.find(it->first) != json_data_segment.end()){
          windowsList.concat(json_data_segment[it->first]);
      }else{
          windowsList.add("sequence", 0); //TODO need to compute representative sequence for this case
      }
      windowsList.add("id", it->first);
      windowsList.add("reads", json_reads);
      windowsList.add("top", top++);
      //windowsList.add("id", this->getId(it->first));
      JsonList seg_stat = this->statusToJson(it->first);
      json_seg.add(seg_stat);
      windowsList.add("germline", germline_by_window[it->first]->code);
      windowsList.add("seg_stat", json_seg);
      windowsArray.add(windowsList);
    }

  return windowsArray;
}

ostream &WindowsStorage::windowToStream(ostream &os, junction window, int num_seq, 
                                        size_t size) {
  os << ">" << size << "--window--" << num_seq << " " << getLabel(window) << endl ;
  os << window << endl;
  return os;
}
