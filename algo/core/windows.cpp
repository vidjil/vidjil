#include "tools.h"
#include "json.h"
#include "windows.h"
#include "representative.h"
#include "sequenceSampler.h"

WindowsStorage::WindowsStorage(map<string, string> &labels):windows_labels(labels) {}

map<junction, list<Sequence> > &WindowsStorage::getMap() {
  return seqs_by_window;
}

list<pair <junction, int> > &WindowsStorage::getSortedList() {
  return sort_all_windows;
}

size_t WindowsStorage::getNbReads(junction window) {
  return seqs_by_window[window].size();
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
  if (repComp.hasRepresentative())
    return repComp.getRepresentative();
  return NULL_SEQUENCE;
}

list<Sequence> WindowsStorage::getSample(junction window, size_t nb_sampled,
                                         size_t nb_buckets) {
  list<Sequence> &reads = getReads(window);
  return SequenceSampler(reads).getLongest(nb_sampled, nb_buckets);
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

int WindowsStorage::getId(junction window) {
    return id_by_window[window];
}

void WindowsStorage::add(junction window, Sequence sequence) {
  seqs_by_window[window].push_back(sequence);
}

pair <int, int> WindowsStorage::keepInterestingWindows(size_t min_reads_window) {
  int removes = 0 ;
  int nb_reads = 0 ;

  for (map <junction, list<Sequence> >::iterator it = seqs_by_window.begin(); 
       it != seqs_by_window.end(); ) // We do not advance the iterator here because of the deletion
    {
      junction junc = it->first;
      
      // Is it supported by enough reads?
      if (!(seqs_by_window[junc].size() >= min_reads_window) 
          // Is it a labelled junction?
          && !(windows_labels.find(junc) == windows_labels.end()))
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
  return make_pair(removes, nb_reads);
}

void WindowsStorage::sort() {
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

      os << windowToStream(os, it->first, num_seq, it->second);
    }
  return os;
}

JsonArray WindowsStorage::sortedWindowsToJsonArray(map <junction, JsonList> json_data_segment,
                                                   list< pair <float, int> > norm_list,
                                                   int nb_segmented) {
  JsonArray windowsArray;
  int top = 1;
    
  for (list<pair <junction, int> >::const_iterator it = sort_all_windows.begin(); 
       it != sort_all_windows.end(); ++it) 
    {
	   
      JsonList windowsList;
    
      //JsonArray normalization_ratios = json_normalization(norm_list, it->second, 
      //                                                    nb_segmented);
      JsonArray json_size;
      json_size.add(it->second);

	  if (json_data_segment.find(it->first) != json_data_segment.end()){
          windowsList.concat(json_data_segment[it->first]);
      }else{
          windowsList.add("sequence", 0); //TODO need to compute representative sequence for this case
      }
      windowsList.add("window", it->first);
      windowsList.add("size", json_size);
      //windowsList.add("ratios", normalization_ratios);
      windowsList.add("top", top++);
      windowsList.add("id", this->getId(it->first));

      windowsArray.add(windowsList);
    }

  return windowsArray;
}

ostream &WindowsStorage::windowToStream(ostream &os, junction window, int num_seq, 
                                        size_t size) {
  os << ">" << size << "--window--" << num_seq << " " << windows_labels[window] << endl ;
  os << window << endl;
  return os;
}
