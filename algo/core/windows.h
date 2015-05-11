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
#include "read_storage.h"
#include "read_score.h"
#include "representative.h"
#include "stats.h"

#define NB_BINS 15
#define MAX_VALUE_BINS 500

using namespace std;

typedef string junction ;

class WindowsStorage {
 private:
  map<junction, BinReadStorage > seqs_by_window;
  map<junction, vector<int> > status_by_window;
  map<junction, Germline* > germline_by_window;
  map<string, string> windows_labels;
  list<pair <junction, size_t> > sort_all_windows;
  map<junction, int> id_by_window;
  size_t max_reads_per_window;
  ReadLengthScore scorer;

  /* Parameters for the read storage */
  size_t nb_bins;
  size_t max_value_bins;
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
   * @return the average read length of the reads segmented with the given window
   */
  float getAverageLength(junction window);

  /**
   * @return the maximal number of reads that can be stored for a window.
   */
  size_t getMaximalNbReadsPerWindow();

  /**
   * @pre hasWindow(window)
   * @return the total number of reads supporting a window.
   */
  size_t getNbReads(junction window);
  
  /**
   * @return the list of reads supporting a given window
   */
  list<Sequence> getReads(junction window);

  /**
   * @param window: the window shared by all the sequences
   * @param seed: the seed used for the sequence similarity search
   * @param min_cover: see compute() in RepresentativeComputer
   * @param percent_cover: see compute() in RepresentativeComputer
   * @param nb_sampled: Number of sequences sampled to get the representatives. 
   *                    Sampling sequences allow to have a more time efficient 
   *                    algorithm.
   * @param nb_buckets: Number of buckets for sampling (see SequenceSampler)
   * @pre nb_sampled <= getMaximalNbReadsPerWindow() if hasLimitForReadsPerWindow()
   * @return the representative computer
   */

  KmerRepresentativeComputer getRepresentativeComputer(junction window, string seed, size_t min_cover,
                             float percent_cover, size_t nb_sampled, 
                             size_t nb_buckets=HISTOGRAM_SIZE_AUDITIONED);

  /**
   * @return a sample of nb_sampled sequences sharing the same window. The
   *         returned sequences are among the longest ones but are not sorted.
   */
  list<Sequence> getSample(junction window, size_t nb_sampled, 
                           size_t nb_buckets=HISTOGRAM_SIZE_AUDITIONED);


  /*
   * Fill the stats_clone member of the different Germlines
   */
  void fillStatsClones();

  /**
   * @return true iff a limit has been set for the maximal number of reads per
   * window
   */
  bool hasLimitForReadsPerWindow();

  /**
   * @return true iff the window has been reported.
   */
  bool hasWindow(junction window);

  /**
   * @return a list of windows together with the number of reads they appear in.
   * @pre sort() must have been called at least once and must have been called
   *      again after calling keepInterestingWindows()
   */
  list<pair <junction, size_t> > &getSortedList();

  /**
   * The number of windows stored
   */
  size_t size();

  /**
   * @return the id of the window, by his sequence
   */
  int getId(junction window);

  /**
   * Sets the parameters of the bins used for storing the reads.
   * @param nb: Number of bins (>= 0)
   * @param max_value: maximal value to be stored (>= 0).
   *        Any value greater than max_value will be put
   *        in an additional bin.
   */
  void setBinParameters(size_t nb, size_t max_value);

  /**
   * Give an id to all the windows, in id_by_window map
   */
  void setIdToAll();

  /**
   * For each window the maximal number of reads actually stored is
   * max_reads. This applies only to future reads added. Not to reads that
   * have been previously added.  In other words if for some window w,
   * getReads(w).size() > max_reads, no reads will be removed. However no
   * reads will be added for that window.  getNbReads() still returns the real
   * number of reads for a given window, not the number of reads stored for a
   * window.
   * When the limit is reached the better reads are preferred over the less good
   * therefore reads may be replaced so that the list contains the best ones.
   * @param max_reads: Maximal number of reads stored for a window. 
   *                   ~0 for no limit.
   */
  void setMaximalNbReadsPerWindow(size_t max_reads);

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
  pair<int, size_t> keepInterestingWindows(size_t min_reads_window);

  /**
   * sort windows according to the number of reads they appear in
   */
  void sort();

  /**
   * Print the windows from the most abundant to the least abundant
   */ 
  ostream &printSortedWindows(ostream &os);

  JsonArray sortedWindowsToJsonArray(map<junction, JsonList> json_data_segment);

  /**
   * Display a window with its in size in a somewhat FASTA format
   */
  ostream &windowToStream(ostream &os, junction window, int num_seq, size_t size);
};

#endif
