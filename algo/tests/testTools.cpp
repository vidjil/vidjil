#include <core/tools.h>
#include <core/fasta.h>
#include "tests.h"

void testFasta1() {
  Fasta fa("../../data/test1.fa");
  Fasta fq("../../data/test1.fq");

  TAP_TEST(fa.size() == fq.size(), TEST_FASTA_SIZE, "");
  for (int i=0; i < fa.size(); i++) {
    TAP_TEST(fa.label(i) == fq.label(i), TEST_FASTA_LABEL, "");
    TAP_TEST(fa.label_full(i) == fq.label_full(i), TEST_FASTA_LABEL_FULL, "");
    TAP_TEST(fa.sequence(i) == fq.sequence(i), TEST_FASTA_SEQUENCE, "");
  }
}

void testRevcomp() {
  TAP_TEST(complement("AATCAGactgactagATCGAn") == "TTAGTCTGACTGATCTAGCTN", TEST_REVCOMP, "");
  TAP_TEST(revcomp("AATCAGactgactagATCGAn") == "NTCGATCTAGTCAGTCTGATT", TEST_REVCOMP, "");
  TAP_TEST(revcomp("") == "", TEST_REVCOMP, "");
  TAP_TEST(revcomp("aaaaaa") == "TTTTTT", TEST_REVCOMP, "");
}

void testCreateSequence() {
  Sequence seq1 = create_sequence("label", "l", "AAAAAAAAAA", "!!!!!!!!!!");
  Sequence seq2 = create_sequence("", "", "", "");

  TAP_TEST(seq1.label_full == "label", TEST_CREATE_SEQUENCE_LABEL_FULL, "");
  TAP_TEST(seq2.label_full == "", TEST_CREATE_SEQUENCE_LABEL_FULL, "");

  TAP_TEST(seq1.label == "l", TEST_CREATE_SEQUENCE_LABEL, "");
  TAP_TEST(seq2.label == "", TEST_CREATE_SEQUENCE_LABEL, "");

  TAP_TEST(seq1.sequence == "AAAAAAAAAA", TEST_CREATE_SEQUENCE_SEQUENCE, "");
  TAP_TEST(seq2.sequence == "", TEST_CREATE_SEQUENCE_SEQUENCE, "");

  TAP_TEST(seq1.quality == "!!!!!!!!!!", TEST_CREATE_SEQUENCE_QUALITY, "");
  TAP_TEST(seq2.quality == "", TEST_CREATE_SEQUENCE_QUALITY, "");
}

void testTools() {
  testFasta1();
  testRevcomp();
  testCreateSequence();
}
