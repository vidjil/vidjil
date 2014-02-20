#include <core/sequenceSampler.h>
#include <core/tools.h>

void testLongest() {
  list<Sequence> seqs;

  seqs.push_back(create_sequence("seq1", "seq1", "AAAAAAAAA", ""));
  seqs.push_back(create_sequence("seq2", "seq2", "AAAAA", ""));
  seqs.push_back(create_sequence("seq3", "seq3", "AAAAAAAA", ""));
  seqs.push_back(create_sequence("seq4", "seq4", "AAAAAAAAAA", ""));
  seqs.push_back(create_sequence("seq5", "seq5", "AAAAAA", ""));
  seqs.push_back(create_sequence("seq6", "seq6", "AAAAAAA", ""));

  SequenceSampler s(seqs);

  list<Sequence> l1 = s.getLongest(6, 11);
  size_t *distrib = s.getLengthDistribution();

  TAP_TEST(distrib[0] == 0
           && distrib[1] == 0 && distrib[2] == 0 && distrib[3] == 0 && distrib[4] == 0
           && distrib[5] == 1 && distrib[6] == 1 && distrib[7] == 1 && distrib[8] == 1
           && distrib[9] == 1 && distrib[10] == 1,
           TEST_SAMPLER_LENGTH, "");

  char id = '1';
  TAP_TEST(l1.size() == 6, TEST_SAMPLER_LONGEST, "");
  for (list<Sequence>::const_iterator it = l1.begin(); it != l1.end(); it++) {
    TAP_TEST(it->label[3] == id, TEST_SAMPLER_LONGEST, "");
    id++;
  }

  // With only 10 buckets, the two longest sequences share the same bucket.
  // Due to their insertion order, the shorter will be sampled first
  l1 = s.getLongest(2, 10);
  distrib = s.getLengthDistribution();

  TAP_TEST(distrib[0] == 0
           && distrib[1] == 0 && distrib[2] == 0 && distrib[3] == 0 && distrib[4] == 0
           && distrib[5] == 1 && distrib[6] == 1 && distrib[7] == 1 && distrib[8] == 1
           && distrib[9] == 2, TEST_SAMPLER_LENGTH, "");

  TAP_TEST(l1.size() == 2, TEST_SAMPLER_LONGEST, "");
  TAP_TEST(l1.front().sequence.size() == 9, TEST_SAMPLER_LONGEST, "");
  Sequence next = *(++l1.begin());
  TAP_TEST(next.sequence.size() == 10, TEST_SAMPLER_LONGEST, "label = " << next.label);
}

// Generate 10 sequences, and launch 10 times getRandom(1).
// We should not have the same sequence 10 times (p < 10^{-10})
void testRandom() {
  list<Sequence> seqs;
  string seg_name = "seq";
  char id = '0';
  string sequence = "AA";

  for (int i = 0; i < 10; i++) {
    seqs.push_back(create_sequence("seq"+id, "seq"+id, sequence, ""));
    sequence += "A";
    id++;
  }

  SequenceSampler sampler(seqs);
  string first_random = sampler.getRandom(1).front().label;
  bool all_equal = true;
  for (int i = 0; i < 9 && all_equal; i++) {
    if (first_random != sampler.getRandom(1).front().label)
      all_equal = false;
  }

  TAP_TEST(all_equal == false, TEST_SAMPLER_RANDOM, "On the 10 trials, we drawn 10 times the same sequence");
}

void testSampler() {
  testLongest();
  testRandom();
}
