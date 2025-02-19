#ifndef WINDOW_EXTRACTOR_HPP
#define WINDOW_EXTRACTOR_HPP
#include "windowExtractor.h"
#include "segment.hpp"
#include "tools.h"

template <typename Affect>
WindowExtractor<Affect>::WindowExtractor(MultiGermline<Affect> *multigermline)
  : out_segmented(NULL), out_unsegmented(NULL), out_unsegmented_detail(NULL), out_affects(NULL),
    max_reads_per_window(~0), multigermline(multigermline) {
  std::string code;
  for (auto &germline: multigermline->getGermlines()) {
    code = germline->getCode();
    stats_reads[code].init(NB_BINS, MAX_VALUE_BINS, NULL, true);
    stats_reads[code].setLabel(code);
    stats_clones[code].init(NB_BINS_CLONES, MAX_VALUE_BINS_CLONES, NULL, true);
  }
  code = PSEUDO_UNEXPECTED;
  stats_reads[code].init(NB_BINS, MAX_VALUE_BINS, NULL, true);
  stats_reads[code].setLabel(code);
  stats_clones[code].init(NB_BINS_CLONES, MAX_VALUE_BINS_CLONES, NULL, true);
}

template <typename Affect>
WindowsStorage<Affect>* WindowExtractor<Affect>::extract(OnlineBioReader *reads,
                                                                               size_t w,
                                                                               map<string, string> &windows_labels, bool only_labeled_windows,
                                                                               bool keep_unsegmented_as_clone,
                                                                               double nb_expected, int nb_reads_for_evalue,
                                                                               VirtualReadScore *scorer,
                                                                               SampleOutput *output) {
  init_stats();

  WindowsStorage<Affect> *windowsStorage = new WindowsStorage<Affect>(windows_labels);
  windowsStorage->setScorer(scorer);
  windowsStorage->setMaximalNbReadsPerWindow(max_reads_per_window);

  unsigned long long int bp_total = 0;

  global_interrupted = false;
  signal(SIGINT, sigintHandler);

  while (reads->hasNext()) {
    if (global_interrupted) {
      string msg = "Interrupted after processing " + string_of_int(nb_reads) + " reads";
      if (output) output->add_warning(W09_INTERRUPTED, msg, LEVEL_WARN);
      break;
    }

    try {
      reads->next();
    } catch (const invalid_argument &e) {
      cout << endl;
      cerr << WARNING_STRING << "Error in getting a new read: " << e.what() << endl;
      cerr << WARNING_STRING << "Vidjil stops the analysis here, after " << nb_reads << " reads." << endl;
      break;
    }

    nb_reads++;

    if (out_affects) {
      Sequence seq = reads->getSequence();
      *out_affects << ">" << seq.label << endl
                   << setw(23) << " " << seq.sequence << endl;
    }

    KmerSegmenter<Affect> *seg = new KmerSegmenter<Affect>(reads->getSequence(), multigermline->getIndex(),
                                                                                 multigermline->getGermlines().front()->getSegmentationMethod(),
                                                                                 multigermline, nullptr,
                                                                                 out_affects, nb_expected,
                                                                                 multigermline->getGermlines().size()*nb_reads_for_evalue);

    // Window length threshold
    junction junc;
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
      stats[TOTAL_SEG_AND_WINDOW].insert(read_length);
      if (seg->isJunctionChanged())
        stats[SEG_CHANGED_WINDOW].insert(read_length);
      stats_reads[seg->segmented_germline->getCode()].addScore(read_length);

      if (out_segmented) {
        *out_segmented << fastq << *seg; // KmerSegmenter output (V/N/J)
      }
    } else {
      if (keep_unsegmented_as_clone && (reads->getSequence().sequence.length() >= w)) {
        // Keep the unsegmented read, taking the full sequence as the junction
        windowsStorage->add(reads->getSequence().sequence, reads->getSequence(), seg->getSegmentationStatus(), seg->segmented_germline);
        stats[TOTAL_SEG_AND_WINDOW].insert(read_length); // TODO: rather count that in a pseudo-germline such as 'TRG!'
      }

      if (out_unsegmented) {
        *out_unsegmented << fastq << *seg;
      }
      if (out_unsegmented_detail && (seg->getSegmentationStatus() >= STATS_FIRST_UNSEG)) {
        if (unsegmented_detail_full || (seg->getSegmentationStatus() != UNSEG_TOO_FEW_ZERO && seg->getSegmentationStatus() != UNSEG_TOO_SHORT))
          *out_unsegmented_detail[seg->getSegmentationStatus()] << fastq << *seg;
      }
    }

    // Last line of detailed affects output
    if (out_affects) {
      *out_affects << "#>" << seg->label << " " << seg->getInfoLine() << endl << endl;
    }

    // Progress bar
    bp_total += read_length;

    if (!(nb_reads % PROGRESS_POINT)) {
      cout << ".";

      if (!(nb_reads % (PROGRESS_POINT * PROGRESS_LINE)))
        cout << right
             << setw(10) << nb_reads / 1000 << "k reads "
             << fixed << setprecision(2) << setw(14) << bp_total / 1E6 << " Mbp" << endl ;

      cout.flush();
    }
    delete seg;
  }
  signal(SIGINT, SIG_DFL);

  cout << endl;

  fillStatsClones(windowsStorage);

  return windowsStorage;
}

template <typename Affect>
float WindowExtractor<Affect>::getAverageSegmentationLength(SEGMENTED seg) {
  return stats[seg].getAverage();
}

template <typename Affect>
size_t WindowExtractor<Affect>::getMaximalNbReadsPerWindow() {
  return max_reads_per_window;
}

template <typename Affect>
size_t WindowExtractor<Affect>::getNbReads() {
  return nb_reads;
}

template <typename Affect>
size_t WindowExtractor<Affect>::getNbSegmented(SEGMENTED seg) {
  return stats[seg].nb;
}

template <typename Affect>
size_t WindowExtractor<Affect>::getNbReadsGermline(string germline) {
  return stats_reads[germline].getNbScores();
}

template <typename Affect>
size_t WindowExtractor<Affect>::getNbClonesGermline(string germline) {
  return stats_clones[germline].getNbScores();
}

template <typename Affect>
void WindowExtractor<Affect>::setMaximalNbReadsPerWindow(size_t max_reads) {
  max_reads_per_window = max_reads;
}

template <typename Affect>
void WindowExtractor<Affect>::setSegmentedOutput(ostream *out) {
  out_segmented = out;
}

template <typename Affect>
void WindowExtractor<Affect>::setUnsegmentedOutput(ostream *out) {
  out_unsegmented = out;
}

template <typename Affect>
void WindowExtractor<Affect>::setUnsegmentedDetailOutput(ostream **outs, bool unsegmented_detail_full) {
  out_unsegmented_detail = outs;
  this->unsegmented_detail_full = unsegmented_detail_full;
}

template <typename Affect>
void WindowExtractor<Affect>::setAffectsOutput(ostream *out) {
  out_affects = out;
}

template <typename Affect>
void WindowExtractor<Affect>::fillStatsClones(WindowsStorage<Affect> *storage) {
  for (auto it = storage->begin(); it != storage->end(); ++it) {
    junction junc = it->first;
    int nb_reads = it->second.getNbInserted();
    Germline<Affect> *germline = storage->getGermline(junc);

    stats_clones[germline->getCode()].addScore(nb_reads);
  }
}

template <typename Affect>
void WindowExtractor<Affect>::init_stats() {
  for (int i = 0; i < STATS_SIZE; i++) {
    stats[i].label = segmented_mesg[i];
  }
  nb_reads = 0;
}

template <typename Affect>
void WindowExtractor<Affect>::out_stats(ostream &out) {
  out_stats_germlines(out);
  out << endl;
  out_stats_segmentation(out);
}

template <typename Affect>
void WindowExtractor<Affect>::out_stats_segmentation(ostream &out) {
  for (int i = 0; i < STATS_SIZE; i++) {
    // stats[NOT_PROCESSED] should equal to 0
    if (i == NOT_PROCESSED && (!stats[i].nb))
      continue;

    // Pretty-print
    if (i == UNSEG_TOO_SHORT)
      out << endl;
    out << stats[i] << endl;
  }
}

template <typename Affect>
void WindowExtractor<Affect>::out_stats_germlines(ostream &out) {
  out << "                          ";
  out << "reads av. len     clones clo/rds";
  out << endl;

  for (auto it = stats_reads.begin(); it != stats_reads.end(); ++it) {
    stats_reads[it->first].out_average_scores(out);
    stats_clones[it->first].out_average_scores(out, true);
    out << endl;
  }
}

template <typename Affect>
pair<int, int> WindowExtractor<Affect>::get_best_length_shifts(size_t read_length,
                                                                          size_t max_window_length,
                                                                          int central_pos,
                                                                          int shift) {
  if (central_pos < 0 || central_pos >= (int) read_length)
    return make_pair(0, 0);

  int constraint_left = 2 * central_pos + 1;
  int constraint_right = (read_length - central_pos) * 2;
  int best_length = min(constraint_left, constraint_right);
  int best_shift = 0;

  if (best_length == (int) max_window_length)
    return make_pair(best_length, 0);

  best_length = best_length / shift * shift;

  list<int> shifts {-1, 1, -2, 2};
  for (int current_shift : shifts) { // -1 will be a left shift
    int shifted_constraint_left = constraint_left + current_shift * shift * 2;
    int shifted_constraint_right = constraint_right - current_shift * shift * 2;

    shifted_constraint_left = shifted_constraint_left / shift * shift;
    shifted_constraint_right = shifted_constraint_right / shift * shift;

    int current_length = min(shifted_constraint_left, shifted_constraint_right);
    if (current_length > best_length && best_length < (int) max_window_length) {
      best_length = current_length;
      best_shift = current_shift;
    }
  }

  return make_pair(min((int) max_window_length, best_length), best_shift * shift);
}
#endif
