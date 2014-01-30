
/** 
 * A window is associated to a list of sequences. We deal with a list of
 * windows. We'd like to sort it, to output it, to remove windows not appearing
 * enough (apart from the ones that are labelled).
 */

#include <iostream>
#include <map>
#include <utility>
#include <string>
#include "fasta.h"
#include "json.h"

using namespace std;

typedef string junction ;

class WindowsStorage {
 private:
  map<junction, list<Sequence> > seqs_by_window;
  map<string, string> windows_labels;
  list<pair <junction, int> > sort_all_windows;
 public:
  /**
   * Build an empty storage, with the labels that correspond to specific
   * windows that must be kept. The map<string, string> keys are DNA sequences
   * corresponding to the window, while values are the name of the sequence.
   */
  WindowsStorage(map<string, string> &labels);

  /**
   * Return the map storing the elements
   */
  map<junction, list<Sequence> > &getMap();

  /**
   * @return the number of reads supporting a given window
   */
  size_t getNbReads(junction window);

  /**
   * @return the list of reads supporting a given window
   */
  list<Sequence> &getReads(junction window);

  /**
   * @return a list of windows together with the number of reads they appear in.
   * @pre sort() must have been called
   */
  list<pair <junction, int> > &getSortedList();

  /**
   * The number of windows stored
   */
  size_t size();

  /**
   * Add a new window with its list of sequences
   */
  void add(junction window, Sequence sequence);

  /**
   * Only keep windows that are interesting.  Those windows are windows
   * supported by at least min_reads_window reads as well as windows that are
   * labelled.  
   * @return the number of windows removed as well as the number of
   * reads finally kept.
   */
  pair<int, int> keepInterestingWindows(size_t min_reads_window);

  /**
   * sort windows according to the number of reads they appear in
   */
  void sort();

  /**
   * Print the windows from the most abundant to the least abundant
   */ 
  ostream &printSortedWindows(ostream &os);

  JsonArray sortedWindowsToJsonArray(map<junction, JsonList> json_data_segment,
                                     list< pair <float, int> > norm_list,
                                     int nb_segmented);

  /**
   * Display a window with its in size in a somewhat FASTA format
   */
  ostream &windowToStream(ostream &os, junction window, int num_seq, size_t size);
};
