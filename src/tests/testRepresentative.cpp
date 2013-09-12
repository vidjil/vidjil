#include "core/fasta.h"
#include "core/representative.h"

void testRepresentative() {
  list<Sequence> reads = Fasta("../../data/representative.fa").getAll();

  KmerRepresentativeComputer krc(reads, 14);

  krc.setStabilityLimit(0);
  krc.compute(false, 1, 0.5);
  Sequence representative = krc.getRepresentative();

  // Seq3 is the longest it should be taken when performing 0 extra iteration
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

void testRevcompRepresentative() {
  list<Sequence> reads = Fasta("../../data/representative_revcomp.fa").getAll();

  KmerRepresentativeComputer krc(reads, 14);
  krc.compute(false, 3, 0.5);
  Sequence representative = krc.getRepresentative();

  // Computing reads revcomp
  for (list <Sequence>::iterator it = reads.begin(); it != reads.end(); it++) {
    it->sequence = revcomp(it->sequence);
  }

  KmerRepresentativeComputer krc2(reads, 14);
  krc2.compute(false, 3, 0.5);
  Sequence representative2 = krc2.getRepresentative();

  // Check position of [ in label, so that we remove that part, and then we
  // can compare the labels
  size_t pos1 = representative.label.find_first_of('[');
  size_t pos2 = representative2.label.find_first_of('[');

  TAP_TEST(representative.label.substr(0, pos1) == representative2.label.substr(0, pos2), TEST_KMER_REPRESENTATIVE_REVCOMP,
           "The two representatives should have the same label");

  TAP_TEST(revcomp(representative.sequence) == representative2.sequence, TEST_KMER_REPRESENTATIVE_REVCOMP,
           "The two representatives should have the same sequence (but revcomp-ed)");

}
