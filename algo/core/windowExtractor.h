#ifndef WINDOW_EXTRACTOR_H
#define WINDOW_EXTRACTOR_H

#include <iostream>
#include <string>
#include <map>
#include "segment.h"
#include "germline.h"
#include "kmerstore.h"
#include "kmeraffect.h"
#include "windows.h"
#include "read_storage.h"

#define NB_BINS_CLONES 10
#define MAX_VALUE_BINS_CLONES 1000

using namespace std;

/**
 * This takes an OnlineFasta reader as input and extract windows from the
 * sequences given in the input.
 */
class WindowExtractor {
 private:
  size_t nb_reads;
  map<string, BinReadStorage> stats_reads;
  map<string, BinReadStorage> stats_clones;

  ostream *out_segmented;
  ostream *out_unsegmented;
  ostream *out_affects;

  Stats stats[STATS_SIZE];
  size_t max_reads_per_window;

  MultiGermline *multigermline;
 public:

  WindowExtractor(MultiGermline *multigermline);

  /**
   * Extract windows from the collection of input reads.
   * If (un)segmented sequences must be output, the functions 
   * set(Un)SegmentedOutput() must be called before.
   * @param reads: the collection of input reads
   * @param w: length of the window
   * @param windows_labels: Windows that must be kept and registered as such.
   * @param only_labeled_windows: remember only windows from windows_labels
   * @param nb_expected: maximal e-value of the segmentation
   * @param nb_reads_for_evalue: number of reads, used for e-value computation. Can be approximate or faked.
   * @return a pointer to a WindowsStorage that will contain all the windows.
   *         It is a pointer so that the WindowsStorage is not duplicated.
   * @post Statistics on segmentation will be provided through the getSegmentationStats() methods
   *       and getAverageSegmentationLength().
   */
  WindowsStorage *extract(OnlineFasta *reads,
                          size_t w,
                          map<string, string> &windows_labels, bool only_labeled_windows=false,
                          int stop_after=-1, int only_nth_reads=1, bool keep_unsegmented_as_clone=false,
                          double nb_expected = THRESHOLD_NB_EXPECTED, int nb_reads_for_evalue = 1);

  /**
   * @return the average length of sequences whose segmentation has been classified as seg
   * @param seg: one of the segmentation available in the enum SEGMENTED 
   * @pre extract() must have been launched.
   */
  float getAverageSegmentationLength(SEGMENTED seg);

  /**
   * cf. WindowsStorage::getMaximalNbReadsPerWindow()
   */
  size_t getMaximalNbReadsPerWindow();

  /**
   * @return Total number of processed reads by the previous call to extract()
   */
  size_t getNbReads();

  /**
   * @return the number of sequences whose segmentation has been classified as seg
   * @param seg: one of the segmentation available in the enum SEGMENTED 
   * @pre extract() must have been launched.
   */
  size_t getNbSegmented(SEGMENTED seg);

   /**
   * @return the number of reads segmented from germline
   * @param germline_code: one of the germline code in multigermline
   * @pre extract() must have been launched.
   */
  size_t getNbReadsGermline(string germline_code);

  /**
   * cf. WindowsStorage::setMaximalNbReadsPerWindow()
   */
  void setMaximalNbReadsPerWindow(size_t max_reads);

  /**
   * Defines the output stream where the segmented sequences will be output.
   * Otherwise no output will be given.
   * @param out: The output stream
   */
  void setSegmentedOutput(ostream *out);

  /**
   * Defines the output stream where the unsegmented sequences will be output.
   * Otherwise no output will be given.
   * @param out: The output stream
   */
  void setUnsegmentedOutput(ostream *out);

  /**
   * Defines the output stream where the detailed affects will be output.
   * Otherwise no output will be given.
   * @param out: The output stream
   */
  void setAffectsOutput(ostream *out);

  /**
   * Output the segmentation and germlines stats
   * @param out: The output stream
   */
  void out_stats(ostream &out);

  /**
   * Output segmentation stats
   */
  void out_stats_segmentation(ostream &out);

  /**
   * Output germlines statistics (read lengths per germline,
   * and number of reads per clones).
   */
  void out_stats_germlines(ostream &out);
 private:
  /**
   * Initialize the statistics (put 0 everywhere).
   */
  void init_stats();

  /*
   * Fill the stats_clone member of the different Germlines
   */
  void fillStatsClones(WindowsStorage *storage);
};

#endif
