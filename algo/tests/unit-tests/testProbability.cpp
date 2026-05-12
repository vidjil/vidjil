#include "tests.h"
#include <core/proba.h>
#include <chrono>
#if __has_include(<valgrind/valgrind.h>)
#  include<valgrind/valgrind.h>
#else
#define RUNNING_ON_VALGRIND 0
#endif

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


void testProba2()
{
  ProbaPrecomputer p;
  std::cerr << "Pre-computed vs. non-precomputed getProba() runtime execution time test "
               "(" << __FILE__ << ":" << __LINE__ << "):\n";
  const double index_load = 0.4;

  // 1. Without pre-computations for in-range lengths, with allocations cost
  double accumulator = 0.0;
  auto start = std::chrono::high_resolution_clock::now();
  for (int length = 1; length < MAX_PRECOMPUTED_PROBA; length++)
  {
    for (int at_least = 1; at_least <= length; at_least++)
    {
      accumulator += p.getProba(index_load, at_least, length);
    }
  }
  auto end = std::chrono::high_resolution_clock::now();
  uint64_t duration_precomputation = std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count();

  // Accumulator is output to stderr so the call to getProba() doesn't get optimized out
  std::cerr << "- duration_precomputation = " << duration_precomputation
            <<" (accumulator = " << accumulator << ")\n";

  // 2. With pre-computations for in-range lengths
  accumulator = 0.0;

  // 2.1. First prime the caches, branch predictor, memory pages, etc.
  for (int length = 1; length < MAX_PRECOMPUTED_PROBA; length++)
  {
    for (int at_least = 1; at_least <= length; at_least++)
    {
      accumulator += p.getProba(index_load, at_least, length);
    }
  }

  // 2.2. Then actually benchmark
  start = std::chrono::high_resolution_clock::now();
  for (int length = 1; length < MAX_PRECOMPUTED_PROBA; length++)
  {
    for (int at_least = 1; at_least <= length; at_least++)
    {
      accumulator += p.getProba(index_load, at_least, length);
    }
  }
  end = std::chrono::high_resolution_clock::now();
  uint64_t duration_precomputed = std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count();

  // Accumulator is output to stderr so the call to getProba() doesn't get optimized out
  std::cerr << "- duration_precomputed = " << duration_precomputed
            <<" (accumulator = " << accumulator << ")\n";


  // 3. Without pre-computations for out-of-range lengths (skipping getProba() preamble)
  accumulator = 0.0;

  // 3.1. First prime the caches, branch predictor, memory pages, etc.
  for (int length = 1; length < MAX_PRECOMPUTED_PROBA; length++)
  {
    for (int at_least = 1; at_least <= length; at_least++)
    {
      double probability_not_having_system = 1.0;
      double probability_having_system = pow(index_load, length);

      long double Cnk = 1;
      for (int i = length; i >= at_least; i--)
      {
        accumulator += p.probabilityPreviousIteration(i, length, Cnk, probability_having_system,
                                                      probability_not_having_system, index_load);
      }
    }
  }

  // 3.2. Then actually benchmark
  start = std::chrono::high_resolution_clock::now();
  for (int length = 1; length < MAX_PRECOMPUTED_PROBA; length++)
  {
    for (int at_least = 1; at_least <= length; at_least++)
    {
      double probability_not_having_system = 1.0;
      double probability_having_system = pow(index_load, length);

      long double Cnk = 1;
      for (int i = length; i >= at_least; i--)
      {
        accumulator += p.probabilityPreviousIteration(i, length, Cnk, probability_having_system,
                                                      probability_not_having_system, index_load);
      }
    }
  }
  end = std::chrono::high_resolution_clock::now();
  uint64_t duration_not_precomputed = std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count();
  // Accumulator is output to stderr so the call to probabilityPreviousIteration() doesn't get
  // optimized out
  std::cerr << "- duration_not_precomputed = " << duration_not_precomputed
            << " (accumulator = " << accumulator << ")\n";

  if(! RUNNING_ON_VALGRIND) {
    TAP_TEST(duration_precomputed*50 < duration_not_precomputed, TEST_PROBA_PRECOMPUTER, "Make sure that precomputation is much faster than no precomputation");
  }
}

void testProba() {
  testProba1();
  testProba2();
}

