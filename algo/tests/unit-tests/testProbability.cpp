#include "tests.h"
#include <core/proba.h>
#include <chrono>

void testProba1() {
  ProbaPrecomputer p;

  // Very simple tests (and test precomputation)
  TAP_TEST_APPROX(p.getProba(0.5, 1, 1), 0.5, 0.01, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_APPROX(p.getProba(0.3, 2, 3), 0.216, 0.001, TEST_PROBA_PRECOMPUTER, ""); // See https://www.wolframalpha.com/input/?i=prob+x%3E%3D2+for+x+binomial+with+n%3D3+and+p%3D0.3

  // Test precomputation
  TAP_TEST_EQUAL(p.precomputed_proba[0.5].size(), MAX_PRECOMPUTED_PROBA, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba_with_system[0.5].size(), MAX_PRECOMPUTED_PROBA, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba_without_system[0.5].size(), MAX_PRECOMPUTED_PROBA, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba[0.3].size(), MAX_PRECOMPUTED_PROBA, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba_with_system[0.3].size(), MAX_PRECOMPUTED_PROBA, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba_without_system[0.3].size(), MAX_PRECOMPUTED_PROBA, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba.count(0.4), 0, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba_with_system.count(0.4), 0, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba_without_system.count(0.4), 0, TEST_PROBA_PRECOMPUTER, "");

  TAP_TEST_EQUAL(p.precomputed_proba[0.5][1].size(), 2, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba[0.5][100].size(), 0, TEST_PROBA_PRECOMPUTER, "");
  
  TAP_TEST_APPROX(p.getProba(0.5, 1, 100), 1-pow(0.5,100), 1e-15, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_EQUAL(p.precomputed_proba[0.5][100].size(), 101, TEST_PROBA_PRECOMPUTER, "");

  TAP_TEST_EQUAL(p.precomputed_proba.count(0.4), 0, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_APPROX(p.getProba(0.4, 99, 100), 2.43e-38, 1e-38, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_EQUAL(p.precomputed_proba[0.4][100].size(), 101, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_APPROX(p.getProba(0.4, 99, 100), 2.43e-38, 1e-38, TEST_PROBA_PRECOMPUTER, "");
  TAP_TEST_APPROX(p.getProba(0.4, 90, 100), 1.730e-25, 1e-28, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 70, 100), 1.25e-9, 1e-11, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 50, 100), 0.027, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 30, 100), 0.985, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 10, 100), 1, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 1, 100), 1, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 

  // Test not pre-computed (too large for MAX_PRECOMPUTED_PROBA)
  TAP_TEST(MAX_PRECOMPUTED_PROBA < 1000, TEST_PROBA_PRECOMPUTER, "If I'm failing change me AND the following test");
  TAP_TEST_APPROX(p.getProba(0.4, 412, 1000), 0.229, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 912, 1000), 4e-255, 1e-100, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 800, 1000), 1.5e-147, 1e-148, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 600, 1000), 2.8e-37, 1e-38, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 370, 1000), .976, 0.001, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 300, 1000), 1, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 100, 1000), 1, 1e-3, TEST_PROBA_PRECOMPUTER, ""); 
  TAP_TEST_APPROX(p.getProba(0.4, 10, 1000), 1, 1e-3, TEST_PROBA_PRECOMPUTER, "");
}

void testProba() {
  testProba1();
}

