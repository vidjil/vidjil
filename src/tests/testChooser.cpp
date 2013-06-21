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

  list<Sequence> sorted = rc.getSorted();

  TAP_TEST(sorted.front().label == "seq4", TEST_READ_CHOOSER_SORTED,
           "First sequence is " << sorted.front().label);
  TAP_TEST(sorted.front().label == rc.getBest().label
           && sorted.front().sequence == rc.getBest().sequence, 
           TEST_READ_CHOOSER_BEST,"");

  sorted.pop_front();
  TAP_TEST(sorted.front().label == "seq2", TEST_READ_CHOOSER_SORTED,
           "Second sequence is " << sorted.front().label);

  sorted.pop_front();
  TAP_TEST(sorted.front().label == "seq1", TEST_READ_CHOOSER_SORTED,
           "Third sequence is " << sorted.front().label);

  sorted.pop_front();
  TAP_TEST(sorted.front().label == "", TEST_READ_CHOOSER_SORTED,
           "First sequence is " << sorted.front().label);

}
