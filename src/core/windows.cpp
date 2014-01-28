#include "tools.h"
#include "json.h"
#include "windows.h"

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

size_t WindowsStorage::size() {
  return seqs_by_window.size();
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
    
      JsonArray normalization_ratios;
      normalization_ratios.add( json_normalization(norm_list, it->second, 
                                                   nb_segmented) );
    
      JsonArray json_size;
      json_size.add(it->second);

      windowsList.add("seg", json_data_segment[it->first]);
      windowsList.add("window", it->first);
      windowsList.add("size", json_size);
      windowsList.add("ratios", normalization_ratios);
      windowsList.add("top", top++);
	 
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
