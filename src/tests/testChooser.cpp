#include "core/read_chooser.h"
#include "core/read_score.h"
#include "core/fasta.h"

void testChooser() {
  Fasta fa("../../data/test1.fa");
  list<Sequence> reads;

  for (int i=0; i < fa.size(); i++) {
    reads.push_back(fa.read(i));
  }

  ReadLengthScore rls;
  ReadChooser rc(reads, rls);

  TAP_TEST(rc.getithBest(1).label == "seq4", TEST_READ_CHOOSER_SORTED,
           "First sequence is " << rc.getithBest(1).label);
  TAP_TEST(rc.getithBest(1).label == rc.getBest().label
           && rc.getithBest(1).sequence == rc.getBest().sequence, 
           TEST_READ_CHOOSER_BEST,"");

  TAP_TEST(rc.getithBest(2).label == "seq2", TEST_READ_CHOOSER_SORTED,
           "Second sequence is " << rc.getithBest(1).label);

  TAP_TEST(rc.getithBest(3).label == "seq1", TEST_READ_CHOOSER_SORTED,
           "Third sequence is " << rc.getithBest(1).label);

  TAP_TEST(rc.getithBest(4).label == "", TEST_READ_CHOOSER_SORTED,
           "First sequence is " << rc.getithBest(1).label);

}
