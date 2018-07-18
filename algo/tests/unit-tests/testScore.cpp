#include "core/read_score.h"

void testScore() {
  // ReadLengthScore testing
  ReadLengthScore rls;

  Sequence seq1 = {"seq", "seq", "", "", 0};
  TAP_TEST_EQUAL(rls.getScore(seq1), 0., TEST_LENGTH_SCORE,
           "score should be 0, is " << rls.getScore(seq1));

  Sequence seq2 = {"seq", "seq", "ATCGTTTACGTC", "", 0};
  TAP_TEST_EQUAL(rls.getScore(seq2), 12., TEST_LENGTH_SCORE,
           "score should be 12, is " << rls.getScore(seq2));

  Sequence seq3 = {"seq", "seq", "A", "", 0};
  TAP_TEST_EQUAL(rls.getScore(seq3), 1., TEST_LENGTH_SCORE,
           "score should be 1, is " << rls.getScore(seq3));


  // ReadQualityScore testing
  ReadQualityScore rqs;

  Sequence seq4 = {"s", "s", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII", 0};
  TAP_TEST((int) rqs.getScore(seq4) == (int) (41 * 120/ GOOD_QUALITY), TEST_QUALITY_SCORE,
           "score should be " << (int) (41 * 120/ GOOD_QUALITY) << " not " << rqs.getScore(seq4));

  // Changing the quality, put the percentile should not change yet.
  seq4.quality[10] = '-';
  TAP_TEST((int) rqs.getScore(seq4) == (int) (41 * 120/ GOOD_QUALITY), TEST_QUALITY_SCORE,
           "score should be " << (int) (41 * 120/ GOOD_QUALITY) << " not " << rqs.getScore(seq4));


  // Now the percentile value should change and should correspond to '-'
  seq4.quality[22] = '!';
  TAP_TEST((int) rqs.getScore(seq4) == (int) (('-' - ' ') * 120/ GOOD_QUALITY), TEST_QUALITY_SCORE,
           "score should be " << (int) (('-' - ' ') * 120/ GOOD_QUALITY) << " not " << rqs.getScore(seq4));

  // Quality does not exist anymore → the score is the length
  seq4.quality = "";
  TAP_TEST_EQUAL(rqs.getScore(seq4), 120, TEST_QUALITY_SCORE,
           "score should be 120 not " << rqs.getScore(seq4));

}
