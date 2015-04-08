#include "windowExtractor.h"
#include "segment.h"

// Progress bar
#define PROGRESS_POINT 25000
#define PROGRESS_LINE 40

WindowExtractor::WindowExtractor(): out_segmented(NULL), out_unsegmented(NULL), out_affects(NULL), max_reads_per_window(~0){}
                                    
WindowsStorage *WindowExtractor::extract(OnlineFasta *reads, MultiGermline *multigermline,
					 size_t w,
                                         map<string, string> &windows_labels,
                                         int stop_after, int only_nth_read, bool keep_unsegmented_as_clone,
                                         double nb_expected, int nb_reads_for_evalue) {
  init_stats();

  WindowsStorage *windowsStorage = new WindowsStorage(windows_labels);
  windowsStorage->setMaximalNbReadsPerWindow(max_reads_per_window);
  for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
    {
      Germline *germline = *it ;
      nb_reads_germline[germline->code] = 0;
    }

  int nb_reads_all = 0;
  unsigned long long int bp_total = 0;

  while (reads->hasNext() && (int) nb_reads != stop_after) {
    reads->next();
    nb_reads_all++;

    if (nb_reads_all % only_nth_read)
      continue ;

    nb_reads++;

    if (out_affects) {
      *out_affects << reads->getSequence();
    }
    
    KmerMultiSegmenter kmseg(reads->getSequence(), multigermline, out_affects, nb_expected, nb_reads_for_evalue);
    
    KmerSegmenter *seg = kmseg.the_kseg ;
    int read_length = seg->getSequence().sequence.length();

    stats[seg->getSegmentationStatus()].insert(read_length);
    if (seg->isSegmented()) {

      seg->segmented_germline->stats_reads.insert(read_length);

      junction junc = seg->getJunction(w);

      if (junc.size()) {
        stats[TOTAL_SEG_AND_WINDOW].insert(read_length) ;
        windowsStorage->add(junc, reads->getSequence(), seg->getSegmentationStatus(), seg->segmented_germline);
      } else {
        stats[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW].insert(read_length) ;
      }

      if (out_segmented) {
        *out_segmented << *seg ; // KmerSegmenter output (V/N/J)
      }
      
      nb_reads_germline[seg->system]++;
      
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
    }

    // Last line of detailed affects output
    if (out_affects) {
      *out_affects << "#" << seg->getInfoLine() << endl;
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

  cout << endl ;

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
  return nb_reads_germline[germline];
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

void WindowExtractor::setAffectsOutput(ostream *out) {
  out_affects = out;
}

void WindowExtractor::init_stats() {
  for (int i = 0; i < STATS_SIZE; i++) {
    stats[i].label = segmented_mesg[i];
  }
  nb_reads = 0;
}

void WindowExtractor::out_stats(ostream &out)
{
  for (int i=0; i<STATS_SIZE; i++)
    {
      if (i == TOTAL_SEG_AND_WINDOW)
	out << endl;
      out << stats[i] << endl ;
    }
}
