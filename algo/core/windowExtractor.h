#ifndef WINDOW_EXTRACTOR_H
#define WINDOW_EXTRACTOR_H

#include <iostream>
#include "segment.h"
#include "germline.h"
#include "kmerstore.h"
#include "kmeraffect.h"
#include "windows.h"

using namespace std;

/**
 * This takes an OnlineFasta reader as input and extract windows from the
 * sequences given in the input.
 */
class WindowExtractor {
 private:
  size_t stats_segmented[STATS_SIZE];
  size_t stats_length[STATS_SIZE];
  size_t nb_reads;

  ostream *out_segmented;
  ostream *out_unsegmented;

 public:

  WindowExtractor();

  /**
   * Extract windows from the collection of input reads.
   * If (un)segmented sequences must be output, the functions 
   * set(Un)SegmentedOutput() must be called before.
   * @param reads: the collection of input reads
   * @param multigermline: the multigermline
   * @param w: length of the window
   * @param windows_labels: Windows that must be kept and registered as such.
   * @return a pointer to a WindowsStorage that will contain all the windows.
   *         It is a pointer so that the WindowsStorage is not duplicated.
   * @post Statistics on segmentation will be provided through the getSegmentationStats() methods
   *       and getAverageSegmentationLength().
   */
  WindowsStorage *extract(OnlineFasta *reads, MultiGermline *multigermline,
                          size_t w,
                          map<string, string> &windows_labels);

  /**
   * @return the average length of sequences whose segmentation has been classified as seg
   * @param seg: one of the segmentation available in the enum SEGMENTED 
   * @pre extract() must have been launched.
   */
  float getAverageSegmentationLength(SEGMENTED seg);

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

 private:
  /**
   * Initialize the statistics (put 0 everywhere).
   */
  void init_stats();
};

#endif
