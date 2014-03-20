#include "windowExtractor.h"
#include "segment.h"

WindowExtractor::WindowExtractor(): out_segmented(NULL), out_unsegmented(NULL){}
                                    

WindowsStorage *WindowExtractor::extract(OnlineFasta *reads, IKmerStore<KmerAffect> *index,
                                         size_t w, int delta_min, int delta_max, 
                                         map<string, string> &windows_labels) {
  init_stats();

  WindowsStorage *windowsStorage = new WindowsStorage(windows_labels);

  while (reads->hasNext()) {
    reads->next();
    nb_reads++;
       
    KmerSegmenter seg(reads->getSequence(), index, delta_min, delta_max);

    stats_segmented[seg.getSegmentationStatus()]++;
    stats_length[seg.getSegmentationStatus()] += seg.getSequence().sequence.length();
    if (seg.isSegmented()) {
      junction junc = seg.getJunction(w);

      if (junc.size()) {
        stats_segmented[TOTAL_SEG_AND_WINDOW]++ ;
        stats_length[TOTAL_SEG_AND_WINDOW] += seg.getSequence().sequence.length() ;
        windowsStorage->add(junc, reads->getSequence());
      } else {
        stats_segmented[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW]++ ;
        stats_length[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW] += seg.getSequence().sequence.length() ;
      }

      if (out_segmented)
        *out_segmented << seg ; // KmerSegmenter output (V/N/J)
        *out_segmented << seg.getKmerAffectAnalyser()->toString() << endl;
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
  return stats_length[seg]*1./getNbSegmented(seg);
}

size_t WindowExtractor::getNbReads() {
  return nb_reads;
}

size_t WindowExtractor::getNbSegmented(SEGMENTED seg) {
  return stats_segmented[seg];
}

void WindowExtractor::setSegmentedOutput(ostream *out) {
  out_segmented = out;
}

void WindowExtractor::setUnsegmentedOutput(ostream *out) {
  out_unsegmented = out;
}

void WindowExtractor::init_stats() {
  for (int i = 0; i < STATS_SIZE; i++) {
    stats_segmented[i] = 0;
    stats_length[i] = 0;
  }
  nb_reads = 0;
}
