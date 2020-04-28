#include "core/bioreader.hpp"
#include "core/representative.h"
#include "core/read_score.h"

void testRepresentative() {
  list<Sequence> reads = BioReader("data/representative.fq").getAll();

  KmerRepresentativeComputer krc(reads, "##############");

  krc.setStabilityLimit(0);
  krc.setRevcomp(false);
  krc.setMinCover(1);
  krc.setPercentCoverage(0.5);
  krc.setCoverageReferenceLength(50);
  krc.setRequiredSequence("CCGGGGGGGGGGTTT");

  ReadQualityScore vrs = ReadQualityScore();
  krc.compute(vrs);
  Sequence representative = krc.getRepresentative();

  // Seq3 is the longest it should be taken when performing 0 extra iteration
  TAP_TEST_EQUAL(representative.label.find("seq3-[37,73]"), 0, TEST_KMER_REPRESENTATIVE,
           "If we take the first representative we should have seq3, and not at the beginning (" << representative.label << " instead)");

  krc.setStabilityLimit(1);
  krc.compute(vrs);
  representative = krc.getRepresentative();
  TAP_TEST_EQUAL(representative.label.find("seq3-[37,73]"), 0, TEST_KMER_REPRESENTATIVE,
           "When allowing one step before stability, we should still have seq3 (" << representative.label << " instead)");

  krc.setStabilityLimit(2);
  krc.compute(vrs);
  representative = krc.getRepresentative();
  TAP_TEST_EQUAL(representative.label.find("seq1-[0,41]"), 0, TEST_KMER_REPRESENTATIVE,
           "When allowing two steps before stability, we should reach seq1 (" << representative.label << " instead)");

  krc.setRevcomp(true);
  krc.setRequiredSequence("ATCGCGCCCT"); // revcomp 
  krc.compute(vrs);
  representative = krc.getRepresentative();
  string quality = krc.getQuality();
  TAP_TEST_EQUAL(representative.label.find("seq2-[33,52]"), 0, TEST_KMER_REPRESENTATIVE_REQUIRED_SEQ,
           "When requiring sequence ATCGCGCCCT, we should have seq2 (" << representative.label << " instead)");

  TAP_TEST(representative.sequence.length() == quality.length() ,TEST_KMER_REPRESENTATIVE_QUALITY,
          "representative sequence length(" << representative.sequence.length() << ") and quality sequence length(" << quality.length() << ") must be equal");
  TAP_TEST(quality == "!!!!!!!>-3------<!!!" ,TEST_KMER_REPRESENTATIVE_QUALITY,
           "representative quality sequence is average between seq2 and seq4 for the required sequence (" << quality << " instead)");


  krc.setRevcomp(false);
  krc.compute(vrs);
  TAP_TEST(! krc.hasRepresentative(), TEST_KMER_REPRESENTATIVE_REQUIRED_SEQ,
           "When requiring sequence AGGGCGCGAT and revcomp=false, we shouldn't find anything (the sequence is revcomp-ed)");
}

void testRevcompRepresentative() {
  list<Sequence> reads = BioReader("data/representative_revcomp.fq").getAll();

  KmerRepresentativeComputer krc(reads, "##############");
  krc.setOptions(false, 3, 0.5);
  krc.setCoverageReferenceLength(50);
  krc.setRequiredSequence("ACATGGTATAACGACGG");
  krc.compute();
  Sequence representative = krc.getRepresentative();

  // Computing reads revcomp
  for (list <Sequence>::iterator it = reads.begin(); it != reads.end(); it++) {
    it->sequence = revcomp(it->sequence);
  }

  KmerRepresentativeComputer krc2(reads, "##############");
  krc2.setOptions(false, 3, 0.5);
  krc2.setCoverageReferenceLength(50);
  krc2.setRequiredSequence("CCGTCGTTATACCATGT");
  krc2.compute();
  Sequence representative2 = krc2.getRepresentative();

  // Check position of [ in label, so that we remove that part, and then we
  // can compare the labels
  size_t pos1 = representative.label.find_first_of('[');
  size_t pos2 = representative2.label.find_first_of('[');

  TAP_TEST_EQUAL(representative.label.substr(0, pos1), representative2.label.substr(0, pos2), TEST_KMER_REPRESENTATIVE_REVCOMP,
           "The two representatives should have the same label");

  TAP_TEST(revcomp(representative.sequence) == representative2.sequence, TEST_KMER_REPRESENTATIVE_REVCOMP,
           "The two representatives should have the same sequence (but revcomp-ed)");

}
