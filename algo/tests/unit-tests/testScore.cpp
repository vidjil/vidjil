#include "core/read_score.h"

void testScore() {
  // ReadLengthScore testing
  ReadLengthScore rls;

  Sequence seq1 = {"seq", "seq", "", "", NULL, 0};
  TAP_TEST(rls.getScore(seq1) == 0., TEST_LENGTH_SCORE,
           "score should be 0, is " << rls.getScore(seq1));

  Sequence seq2 = {"seq", "seq", "ATCGTTTACGTC", "", NULL, 0};
  TAP_TEST(rls.getScore(seq2) == 12., TEST_LENGTH_SCORE,
           "score should be 12, is " << rls.getScore(seq2));

  Sequence seq3 = {"seq", "seq", "A", "", NULL, 0};
  TAP_TEST(rls.getScore(seq3) == 1., TEST_LENGTH_SCORE,
           "score should be 1, is " << rls.getScore(seq3));

}
