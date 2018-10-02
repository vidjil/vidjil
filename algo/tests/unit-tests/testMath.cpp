#include <core/math.hpp>

void testComputeNbKmers() {
  // When all k-mers match, probability of error is 0, thus we return the same
  // number of occurrences as in input
  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 100, 109, 99), 100, TEST_MATH_LIMIT_KMERS,"");
  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 100, 109, 90), 100, TEST_MATH_LIMIT_KMERS,"");
  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 100, 109, 95), 100, TEST_MATH_LIMIT_KMERS,"");
  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 100, 109, 999), 100, TEST_MATH_LIMIT_KMERS,"");


  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 10, 109, 999), 0, TEST_MATH_LIMIT_KMERS,"");
  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 1, 109, 999), 0, TEST_MATH_LIMIT_KMERS,"");
  TAP_TEST_EQUAL(compute_nb_kmers_limit(10, 20, 109, 999), 7, TEST_MATH_LIMIT_KMERS,"");

}

void testMath() {
  testComputeNbKmers();
}
