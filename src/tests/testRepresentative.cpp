#include "core/fasta.h"
#include "core/representative.h"

void testRepresentative() {
  list<Sequence> reads = Fasta("../../data/representative.fa").getAll();

  KmerRepresentativeComputer krc(reads, 14);

  krc.setStabilityLimit(0);
  krc.compute(false, 1, 0.5);
  Sequence representative = krc.getRepresentative();

  TAP_TEST(representative.label.find("seq3") == 0, TEST_KMER_REPRESENTATIVE,
           "If we take the first representative we should have seq3 (" << representative.label << " instead)");

  krc.setStabilityLimit(1);
  krc.compute(false, 1, 0.5);
  representative = krc.getRepresentative();
  TAP_TEST(representative.label.find("seq3") == 0, TEST_KMER_REPRESENTATIVE,
           "When allowing one step before stability, we should still have seq3 (" << representative.label << " instead)");

  krc.setStabilityLimit(2);
  krc.compute(false, 1, 0.5);
  representative = krc.getRepresentative();
  TAP_TEST(representative.label.find("seq1") == 0, TEST_KMER_REPRESENTATIVE,
           "When allowing two steps before stability, we should reach seq1 (" << representative.label << " instead)");
  
  krc.compute(false, 4, 0.5);
  TAP_TEST(! krc.hasRepresentative(), TEST_KMER_REPRESENTATIVE,
           "When requiring 4 reads to support the representative, we should not find any solution.");
}
