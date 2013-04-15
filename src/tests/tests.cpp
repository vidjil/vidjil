#include <iostream>
#include "tests.h"

#include "testTools.cpp"
#include "testStorage.cpp"
#include "testAffectAnalyser.cpp"
#include "testBugs.cpp"
#include "testCluster.cpp"


int main(void) {
  TAP_START(NB_TESTS);
  declare_tests();

  testTools();
  testStorage();
  testAffectAnalyser();
  testBugs();
  testCluster();
  
  TAP_END_TEST_EXIT
}
