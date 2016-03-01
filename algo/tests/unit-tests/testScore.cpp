#include "core/read_score.h"

void testScore() {
  // ReadLengthScore testing
  ReadLengthScore rls;
  
  TAP_TEST(rls.getScore("") == 0., TEST_LENGTH_SCORE,
           "score should be 0, is " << rls.getScore(""));

  TAP_TEST(rls.getScore("ATCGTTTACGTC") == 12., TEST_LENGTH_SCORE,
           "score should be 12, is " << rls.getScore("ATCGTTTACGTC"));

  TAP_TEST(rls.getScore("A") == 1., TEST_LENGTH_SCORE,
           "score should be 1, is " << rls.getScore("A"));

}
