#include <iostream>
#include "tests.h"

#include "testTools.cpp"
#include "testKmerAffect.cpp"
#include "testStorage.cpp"
#include "testAffectAnalyser.cpp"
#include "testBugs.cpp"
#include "testCluster.cpp"
#include "testSegment.cpp"
#include "testScore.cpp"
#include "testChooser.cpp"
#include "testRepresentative.cpp"
#include "testSampler.cpp"
#include "testWindowsStorage.cpp"
#include "testReadStorage.cpp"

int main(void) {
  TAP_START(NB_TESTS);
  declare_tests();
 
  testTools();
  testStorage();
  testKmerAffect();
  testAffectAnalyser();
  testBugs();
  testCluster();
  testSegment();
  testScore();
  testChooser();
  testSampler();
  testRepresentative();
  testRevcompRepresentative();
  testWindowStorage();
  testReadStorage();

  TAP_END_TEST_EXIT
}
