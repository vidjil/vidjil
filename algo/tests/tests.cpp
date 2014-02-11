#include <iostream>
#include "tests.h"

#include "testTools.cpp"
#include "testStorage.cpp"
#include "testAffectAnalyser.cpp"
#include "testBugs.cpp"
#include "testCluster.cpp"
#include "testSegment.cpp"
#include "testScore.cpp"
#include "testChooser.cpp"
#include "testRepresentative.cpp"
#include "testSampler.cpp"

int main(void) {
  TAP_START(NB_TESTS);
  declare_tests();
 
  testTools();
  testStorage();
  testAffectAnalyser();
  testBugs();
  testCluster();
  testSegment();
  testSegmentOverlap();
  testSegmentationCause();
  testScore();
  testChooser();
  testSampler();
  testRepresentative();
  testRevcompRepresentative();
  
  TAP_END_TEST_EXIT
}
