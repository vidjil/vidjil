#ifndef WINDOWS_H
#define WINDOWS_H

#define HISTOGRAM_SIZE_AUDITIONED 500

/** 
 * A window is associated to a list of sequences. We deal with a list of
 * windows. We'd like to sort it, to output it, to remove windows not appearing
 * enough (apart from the ones that are labelled).
 */

#include <iostream>
#include <map>
#include <set>
#include <utility>
#include <string>
#include "fasta.h"
#include "json.h"
#include "segment.h"
#include "germline.h"

using namespace std;

typedef string junction ;

class WindowsStorage {
 private:
  map<junction, list<Sequence> > seqs_by_window;
  map<junction, vector<int> > status_by_window;
  map<junction, Germline* > germline_by_window;
  map<string, string> windows_labels;
  list<pair <junction, int> > sort_all_windows;
  map<junction, int> id_by_window;
 public:
  /**
   * Build an empty storage, with the labels that correspond to specific
   * windows that must be kept. The map<string, string> keys are DNA sequences
   * corresponding to the window, while values are the name of the sequence.
   */
  WindowsStorage(map<string, string> &labels);

  /**
   * @return a pointer to the germline of the window
   *         or NULL if the window doesn't exist.
   */
  Germline *getGermline(junction window);
  
  JsonList statusToJson(junction window);
  
  /**
   * @return the list of reads supporting a given window
   */
  list<Sequence> &getReads(junction window);

  /**
   * @param window: the window shared by all the sequences
   * @param seed: the seed used for the sequence similarity search
   * @param min_cover: see compute() in RepresentativeComputer
   * @param percent_cover: see compute() in RepresentativeComputer
   * @param nb_sampled: Number of sequences sampled to get the representatives. 
   *                    Sampling sequences allow to have a more time efficient 
   *                    algorithm.
   * @param nb_buckets: Number of buckets for sampling (see SequenceSampler)
   * @return the representative sequence of a window or NULL_SEQUENCE if we 
   *         cannot find any representative
   */
  Sequence getRepresentative(junction window, string seed, size_t min_cover,
                             float percent_cover, size_t nb_sampled, 
                             size_t nb_buckets=HISTOGRAM_SIZE_AUDITIONED);

  /**
   * @return a sample of nb_sampled sequences sharing the same window. The
   *         returned sequences are among the longest ones but are not sorted.
   */
  list<Sequence> getSample(junction window, size_t nb_sampled, 
                           size_t nb_buckets=HISTOGRAM_SIZE_AUDITIONED);

  /**
   * @return a list of windows together with the number of reads they appear in.
   * @pre sort() must have been called at least once and must have been called
   *      again after calling keepInterestingWindows()
   */
  list<pair <junction, int> > &getSortedList();

  /**
   * The number of windows stored
   */
  size_t size();

  /**
   * @return the id of the window, by his sequence
   */
  int getId(junction window);

  /**
   * Give an id to all the windows, in id_by_window map
   */
  void setIdToAll();

  /**
   * Add a new window with its sequence.
   * @param window: the window to add
   * @param sequence: the corresponding Sequence
   * @param status: the segmentation status
   * @param germline: the germline where this sequence has been segmented
   */
  void add(junction window, Sequence sequence, int status, Germline *germline);


  /**
   * Return the label of a window, if it exists
   */
  string getLabel(junction window);

  /**
   * @pre sort() must have been called.
   * @param top: Only the germlines of the top most abundant windows will
   *             be considered
   * @param min_reads: (optional) minimal number (inclusive) of reads the window
   *                   must be supported by.
   * @return a set of the most abundant germlines.
   */
  set<Germline *> getTopGermlines(size_t top, size_t min_reads=1);

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
                                     int nb_segmented);

  /**
   * Display a window with its in size in a somewhat FASTA format
   */
  ostream &windowToStream(ostream &os, junction window, int num_seq, size_t size);
};

#endif
