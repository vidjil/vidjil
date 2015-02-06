#include <iostream>
#include <string>
#include "tools.h"
#include "json.h"
#include "windows.h"
#include "representative.h"
#include "sequenceSampler.h"
#include "segment.h"
#include "json.h"

WindowsStorage::WindowsStorage(map<string, string> &labels):windows_labels(labels) {}

list<pair <junction, int> > &WindowsStorage::getSortedList() {
  return sort_all_windows;
}

string WindowsStorage::getLabel(junction window) {
  
  if (windows_labels.find(window) == windows_labels.end())
    return "" ;
  
  return windows_labels[window];   
}

Germline *WindowsStorage::getGermline(junction window) {
  return germline_by_window[window];   
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

list<Sequence> &WindowsStorage::getReads(junction window) {
  return seqs_by_window[window];
}

Sequence WindowsStorage::getRepresentative(junction window, 
                                           string seed, size_t min_cover, 
                                           float percent_cover,
                                           size_t nb_sampled, 
                                           size_t nb_buckets) {
  list<Sequence> auditioned_sequences 
    = getSample(window,nb_sampled, nb_buckets);
  KmerRepresentativeComputer repComp(auditioned_sequences, seed);
  repComp.setRevcomp(true);
  repComp.setMinCover(min_cover);
  repComp.setPercentCoverage(percent_cover);
  repComp.setRequiredSequence(window);
  repComp.compute();

  // We should always have a representative, because
  // - there is at least min('min_reads_clone', 'max_auditioned') sequences in auditioned_sequences
  // - and 'min_cover' = min('min_reads_clone', 'max_auditioned')
  if (!repComp.hasRepresentative())
    throw invalid_argument("No representative for junction " + window);

  return repComp.getRepresentative();
}

list<Sequence> WindowsStorage::getSample(junction window, size_t nb_sampled,
                                         size_t nb_buckets) {
  list<Sequence> &reads = getReads(window);
  return SequenceSampler(reads).getLongest(nb_sampled, nb_buckets);
}

set<Germline *> WindowsStorage::getTopGermlines(size_t top, size_t min_reads) {
  assert(sort_all_windows.size() == seqs_by_window.size());

  set<Germline *> top_germlines;
  size_t count = 0;

  for (list<pair <junction, int> >::const_iterator it = sort_all_windows.begin();
       it != sort_all_windows.end() && count < top && (size_t)it->second >= min_reads;
       ++it, ++count) {
    top_germlines.insert(getGermline(it->first));
  }

  return top_germlines;
}

size_t WindowsStorage::size() {
  return seqs_by_window.size();
}

void WindowsStorage::setIdToAll() {
    int id = 0;
    for (map <junction, list<Sequence> >::const_iterator it = seqs_by_window.begin();
        it != seqs_by_window.end(); ++it) {
            id_by_window.insert(make_pair(it->first, id));
            id++;
    }
}

void WindowsStorage::add(junction window, Sequence sequence, int status, Germline *germline) {
  seqs_by_window[window].push_back(sequence);
  if (status_by_window.find(window) == status_by_window.end() ) {
      status_by_window[window].resize(STATS_SIZE);
  }
  status_by_window[window][status]++;

  germline_by_window[window] = germline;
}

pair <int, int> WindowsStorage::keepInterestingWindows(size_t min_reads_window) {
  int removes = 0 ;
  int nb_reads = 0 ;

  for (map <junction, list<Sequence> >::iterator it = seqs_by_window.begin(); 
       it != seqs_by_window.end(); ) // We do not advance the iterator here because of the deletion
    {
      junction junc = it->first;
      
      // Is it not supported by enough reads?
      if (!(seqs_by_window[junc].size() >= min_reads_window) 
          // Is it not a labelled junction?
          && (windows_labels.find(junc) == windows_labels.end()))
        {
          map <junction, list<Sequence> >::iterator toBeDeleted = it;
          it++;
          seqs_by_window.erase(toBeDeleted);
          removes++ ;
        }
      else {
        nb_reads += seqs_by_window[junc].size();
        it++;
      }
    }

  sort_all_windows.clear();
  return make_pair(removes, nb_reads);
}

void WindowsStorage::sort() {
  sort_all_windows.clear();
  for (map <junction, list<Sequence> >::const_iterator it = seqs_by_window.begin();
       it != seqs_by_window.end(); ++it)
    {
      sort_all_windows.push_back(make_pair(it->first, it->second.size()));
    }

  sort_all_windows.sort(pair_occurrence_sort<junction>);
}

ostream &WindowsStorage::printSortedWindows(ostream &os) {
  int num_seq = 0 ;

  for (list<pair <junction, int> >::const_iterator it = sort_all_windows.begin(); 
       it != sort_all_windows.end(); ++it) 
    {
      num_seq++ ;

      windowToStream(os, it->first, num_seq, it->second);
    }
  return os;
}

JsonArray WindowsStorage::sortedWindowsToJsonArray(map <junction, JsonList> json_data_segment,
                                                   int nb_segmented) {
  JsonArray windowsArray;
  int top = 1;
    
  for (list<pair <junction, int> >::const_iterator it = sort_all_windows.begin(); 
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
