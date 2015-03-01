#include "windowExtractor.h"
#include "segment.h"

WindowExtractor::WindowExtractor(): out_segmented(NULL), out_unsegmented(NULL), out_affects(NULL){}
                                    

WindowsStorage *WindowExtractor::extract(OnlineFasta *reads, MultiGermline *multigermline,
					 size_t w,
                                         map<string, string> &windows_labels) {
  init_stats();

  WindowsStorage *windowsStorage = new WindowsStorage(windows_labels);

  for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
    {
      Germline *germline = *it ;
      nb_reads_germline[germline->code] = 0;
    }
  
  while (reads->hasNext()) {
    reads->next();
    nb_reads++;

    if (out_affects) {
      *out_affects << reads->getSequence();
    }
    
    KmerMultiSegmenter kmseg(reads->getSequence(), multigermline, out_affects);
    
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
      
    } else if (out_unsegmented) {
        *out_unsegmented << *seg ;
    }

    // Last line of detailed affects output
    if (out_affects) {
      *out_affects << "#>" << reads->getSequence().label << (seg->isSegmented() ? "" : " not") << " segmented "
                   << segmented_mesg[seg->getSegmentationStatus()] << " on " << seg->segmented_germline->code << endl << endl;
    }
  }
  return windowsStorage;
}

float WindowExtractor::getAverageSegmentationLength(SEGMENTED seg) {
  return stats[seg].getAverage();
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
