#include "windowExtractor.h"
#include "segment.h"
#include "tools.h"

WindowExtractor::WindowExtractor(MultiGermline *multigermline): out_segmented(NULL), out_unsegmented(NULL), out_unsegmented_detail(NULL), out_affects(NULL),
                                                                max_reads_per_window(~0), multigermline(multigermline){
    for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
    {
      Germline *germline = *it ;
      stats_reads[germline->code].init(NB_BINS, MAX_VALUE_BINS, NULL, true);
      stats_reads[germline->code].setLabel(germline->code);
      stats_clones[germline->code].init(NB_BINS_CLONES, MAX_VALUE_BINS_CLONES, NULL, true);
    }
}
                                    
WindowsStorage *WindowExtractor::extract(OnlineBioReader *reads,
					 size_t w,
                                         map<string, string> &windows_labels, bool only_labeled_windows,
                                         bool keep_unsegmented_as_clone,
                                         double nb_expected, int nb_reads_for_evalue,
                                         VirtualReadScore *scorer) {
  init_stats();

  WindowsStorage *windowsStorage = new WindowsStorage(windows_labels);
  windowsStorage->setScorer(scorer);
  windowsStorage->setMaximalNbReadsPerWindow(max_reads_per_window);

  unsigned long long int bp_total = 0;

  global_interrupted = false ;
  signal(SIGINT, sigintHandler);

  while (reads->hasNext()) {

    if (global_interrupted)
    {
      cout << WARNING_STRING << "Interrupted after processing " << nb_reads << " reads" << endl ;
      break;
    }

    try {
      reads->next();
    }
    catch (const invalid_argument &e) {
      cout << endl;
      cerr << WARNING_STRING << "Error in getting a new read: " << e.what() << endl;
      cerr << WARNING_STRING << "Vidjil stops the analysis here, after " << nb_reads << " reads." << endl;
      break ;
    }

    nb_reads++;

    if (out_affects) {
      *out_affects << reads->getSequence();
    }
    
    KmerMultiSegmenter kmseg(reads->getSequence(), multigermline, out_affects, nb_expected, nb_reads_for_evalue);
    
    KmerSegmenter *seg = kmseg.the_kseg ;

    // Window length threshold
    junction junc ;
    if (seg->isSegmented()) {
      junc = seg->getJunction(w);
      if (!junc.size()) {
        seg->setSegmentationStatus(UNSEG_TOO_SHORT_FOR_WINDOW);
      }
    }

    int read_length = seg->getSequence().sequence.length();

    // Update stats
    stats[seg->getSegmentationStatus()].insert(read_length);

    if (seg->isSegmented()) {

      // Filter
      if (!only_labeled_windows || windowsStorage->isInterestingJunction(junc)) {

        // Store the window
        if (seg->isJunctionChanged())
          windowsStorage->add(junc, reads->getSequence(), seg->getSegmentationStatus(), seg->segmented_germline, {SEG_CHANGED_WINDOW});
        else
          windowsStorage->add(junc, reads->getSequence(), seg->getSegmentationStatus(), seg->segmented_germline);
      }

      // Update stats
      stats[TOTAL_SEG_AND_WINDOW].insert(read_length) ;
      if (seg->isJunctionChanged())
        stats[SEG_CHANGED_WINDOW].insert(read_length);
      stats_reads[seg->segmented_germline->code].addScore(read_length);

      if (out_segmented) {
        *out_segmented << *seg ; // KmerSegmenter output (V/N/J)
      }
    } else {
      if (keep_unsegmented_as_clone && (reads->getSequence().sequence.length() >= w))
        {
          // Keep the unsegmented read, taking the full sequence as the junction
          windowsStorage->add(reads->getSequence().sequence, reads->getSequence(), seg->getSegmentationStatus(), seg->segmented_germline);
          stats[TOTAL_SEG_AND_WINDOW].insert(read_length) ; // TODO: rather count that in a pseudo-germline such as 'TRG!'
        }

      if (out_unsegmented) {
        *out_unsegmented << *seg ;
      }
      if (out_unsegmented_detail && (seg->getSegmentationStatus() >= STATS_FIRST_UNSEG)) {
        if (unsegmented_detail_full || (seg->getSegmentationStatus() != UNSEG_TOO_FEW_ZERO && seg->getSegmentationStatus() != UNSEG_TOO_SHORT))
        *out_unsegmented_detail[seg->getSegmentationStatus()] << *seg ;
      }
    }

    // Last line of detailed affects output
    if (out_affects) {
      *out_affects << "#>" << seg->label << " " <<  seg->getInfoLine() << endl << endl;
    }

    // Progress bar
    bp_total += read_length;

    if (!(nb_reads % PROGRESS_POINT))
      {
	cout << "." ;

	if (!(nb_reads % (PROGRESS_POINT * PROGRESS_LINE)))
	  cout << setw(10) << nb_reads / 1000 << "k reads " << fixed << setprecision(2) << setw(14) << bp_total / 1E6 << " Mbp" << endl ;

	cout.flush() ;
      }
  }
  signal(SIGINT, SIG_DFL);

  cout << endl ;

  fillStatsClones(windowsStorage);

  return windowsStorage;
}

float WindowExtractor::getAverageSegmentationLength(SEGMENTED seg) {
  return stats[seg].getAverage();
}

size_t WindowExtractor::getMaximalNbReadsPerWindow() {
  return max_reads_per_window;
}

size_t WindowExtractor::getNbReads() {
  return nb_reads;
}

size_t WindowExtractor::getNbSegmented(SEGMENTED seg) {
  return stats[seg].nb;
}

size_t WindowExtractor::getNbReadsGermline(string germline) {
  return stats_reads[germline].getNbScores();
}

void WindowExtractor::setMaximalNbReadsPerWindow(size_t max_reads) {
  max_reads_per_window = max_reads;
}

void WindowExtractor::setSegmentedOutput(ostream *out) {
  out_segmented = out;
}

void WindowExtractor::setUnsegmentedOutput(ostream *out) {
  out_unsegmented = out;
}

void WindowExtractor::setUnsegmentedDetailOutput(ofstream **outs, bool unsegmented_detail_full) {
  out_unsegmented_detail = outs;
  this->unsegmented_detail_full = unsegmented_detail_full;
}

void WindowExtractor::setAffectsOutput(ostream *out) {
  out_affects = out;
}

void WindowExtractor::fillStatsClones(WindowsStorage *storage)
{
  for (map <junction, BinReadStorage >::iterator it = storage->begin();
       it != storage->end();
       it++)
    {
      junction junc = it->first;
      int nb_reads = it->second.getNbInserted();
      Germline *germline = storage->getGermline(junc);

      stats_clones[germline->code].addScore(nb_reads);
    }
}

void WindowExtractor::init_stats() {
  for (int i = 0; i < STATS_SIZE; i++) {
    stats[i].label = segmented_mesg[i];
  }
  nb_reads = 0;
}

void WindowExtractor::out_stats(ostream &out)
{
  out_stats_germlines(out);
  out << endl;
  out_stats_segmentation(out);
}

void WindowExtractor::out_stats_segmentation(ostream &out) {
  for (int i=0; i<STATS_SIZE; i++)
    {
      // stats[NOT_PROCESSED] should equal to 0
      if (i == NOT_PROCESSED && (!stats[i].nb))
        continue;

      // Pretty-print
      if (i == UNSEG_TOO_SHORT)
	out << endl;
      out << stats[i] << endl ;
    }
}

void WindowExtractor::out_stats_germlines(ostream &out) {
  out << "                          " ;
  out << "reads av. len     clones clo/rds" ;
  out << endl ;

  for (map<string,BinReadStorage>::iterator it = stats_reads.begin(); it != stats_reads.end(); ++it)
    {
      stats_reads[it->first].out_average_scores(out);
      stats_clones[it->first].out_average_scores(out, true);
      out << endl ;
    }

}

pair<int, int> WindowExtractor::get_best_length_shifts(size_t read_length,
                                                       size_t max_window_length,
                                                       int central_pos,
                                                       int shift) {
  if (central_pos < 0 || central_pos >= (int) read_length)
    return make_pair(0, 0);

  int constraint_left = 2 * central_pos + 1;
  int constraint_right = (read_length - central_pos) * 2;
  int best_length = min(constraint_left, constraint_right);
  int best_shift = 0;

  if (best_length == (int)max_window_length)
    return make_pair(best_length, 0);

  best_length = best_length / shift * shift;

  list<int> shifts {-1, 1, -2, 2};
  for (int current_shift : shifts) { // -1 will be a left shift
    int shifted_constraint_left = constraint_left + current_shift * shift * 2;
    int shifted_constraint_right = constraint_right - current_shift * shift * 2;

    shifted_constraint_left = shifted_constraint_left / shift * shift;
    shifted_constraint_right = shifted_constraint_right / shift * shift;

    int current_length = min(shifted_constraint_left, shifted_constraint_right);
    if (current_length > best_length && best_length < (int)max_window_length) {
      best_length = current_length;
      best_shift = current_shift;
    }
  }

  return make_pair(min((int)max_window_length, best_length), best_shift * shift);
}
