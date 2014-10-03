#include "windowExtractor.h"
#include "segment.h"

WindowExtractor::WindowExtractor(): out_segmented(NULL), out_unsegmented(NULL){}
                                    

WindowsStorage *WindowExtractor::extract(OnlineFasta *reads, MultiGermline *multigermline,
					 size_t w,
                                         map<string, string> &windows_labels) {
  init_stats();

  WindowsStorage *windowsStorage = new WindowsStorage(windows_labels);

  while (reads->hasNext()) {
    reads->next();
    nb_reads++;
    
    KmerSegmenter seg(reads->getSequence(), multigermline);
    int read_length = seg.getSequence().sequence.length();

    stats[seg.getSegmentationStatus()].insert(read_length);
    if (seg.isSegmented()) {
      junction junc = seg.getJunction(w);

      if (junc.size()) {
        stats[TOTAL_SEG_AND_WINDOW].insert(read_length) ;
        windowsStorage->add(junc, reads->getSequence(), seg.getSegmentationStatus(), seg.segmented_germline);
      } else {
        stats[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW].insert(read_length) ;
      }

      if (out_segmented) {
        *out_segmented << seg ; // KmerSegmenter output (V/N/J)

        if (out_unsegmented)
	  *out_segmented << seg.getKmerAffectAnalyser()->toString() << endl;
      }
      
    } else if (out_unsegmented) {
      *out_unsegmented << reads->getSequence();
      *out_unsegmented << "#" << segmented_mesg[seg.getSegmentationStatus()] << endl;
      if (seg.getSegmentationStatus() != UNSEG_TOO_SHORT) {
        *out_unsegmented << seg.getKmerAffectAnalyser()->toString() << endl;
      }
    }
  }
  return windowsStorage;
}

float WindowExtractor::getAverageSegmentationLength(SEGMENTED seg) {
  return stats[seg].getAverageLength();
}

size_t WindowExtractor::getNbReads() {
  return nb_reads;
}

size_t WindowExtractor::getNbSegmented(SEGMENTED seg) {
  return stats[seg].nb;
}

void WindowExtractor::setSegmentedOutput(ostream *out) {
  out_segmented = out;
}

void WindowExtractor::setUnsegmentedOutput(ostream *out) {
  out_unsegmented = out;
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
      out << stats[i] ;
    }
}
