#include <iostream>
#include "tests.h"

#include "testTools.cpp"
#include "testFilter.cpp"
#include "testKmerAffect.cpp"
#include "testGermline.cpp"
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
#include "testAutomaton.cpp"
#include "testMath.cpp"
#include "testProbability.cpp"

int main(void) {
  TAP_START(NB_TESTS);
  declare_tests();
  testTools();
  testFilter();
  testGermline();
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
  testAutomaton();
  testMath();
  testProba();
  TAP_END_TEST_EXIT
}
