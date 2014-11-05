#include <core/tools.h>
#include <core/fasta.h>
#include "tests.h"

void testOnlineFasta1() {
  OnlineFasta fa("../../data/test1.fa");
  OnlineFasta fq("../../data/test1.fq");
  int nb_seq = 0;

  TAP_TEST(fa.getLineNb() == 1, TEST_O_FASTA_LINE_NB, "");
  TAP_TEST(fq.getLineNb() == 1, TEST_O_FASTA_LINE_NB, "");

  while (fa.hasNext()) {
    TAP_TEST(fq.hasNext(), TEST_O_FASTA_HAS_NEXT, "");
    fa.next();
    fq.next();
    Sequence s1 = fa.getSequence();
    Sequence s2 = fq.getSequence();
    TAP_TEST(s1.label == s2.label && s1.label_full == s2.label_full
             && s1.sequence == s2.sequence, TEST_O_FASTA_GET_SEQUENCE, "fa: " << fa.getSequence() << endl << "fq: " << fq.getSequence());
    nb_seq++;
  }
  TAP_TEST(fq.getLineNb() == 20, TEST_O_FASTA_LINE_NB, "");
  TAP_TEST(! fq.hasNext(), TEST_O_FASTA_HAS_NEXT, "");
  TAP_TEST(nb_seq == 5, TEST_O_FASTA_HAS_NEXT, "");
}

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

void testFastaAdd() {
  Fasta fa1("../../data/test1.fa");
  Fasta fa2("../../data/test1.fa");
  fa2.add("../../data/test1.fa");

  TAP_TEST(fa1.size() * 2 == fa2.size(), TEST_FASTA_ADD, "");
  for (int i=0; i < fa1.size(); i++) {
    TAP_TEST(fa1.label(i) == fa2.label(i)
             && fa1.label(i) == fa2.label(i+fa1.size()), TEST_FASTA_ADD, "");
    TAP_TEST(fa1.label_full(i) == fa2.label_full(i)
             && fa1.label_full(i) == fa2.label_full(i+fa1.size()), 
             TEST_FASTA_ADD, "");
    TAP_TEST(fa1.sequence(i) == fa2.sequence(i)
             && fa1.sequence(i) == fa2.sequence(i+fa1.size()), 
             TEST_FASTA_ADD, "");
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

void testNucToInt() {
  TAP_TEST(nuc_to_int('A') == 0, TEST_NUC_TO_INT, "");
  TAP_TEST(nuc_to_int('C') == 1, TEST_NUC_TO_INT, "");
  TAP_TEST(nuc_to_int('G') == 2, TEST_NUC_TO_INT, "");
  TAP_TEST(nuc_to_int('T') == 3, TEST_NUC_TO_INT, "");
}

void testDNAToInt() {
  TAP_TEST(dna_to_int("A", 1) == 0, TEST_DNA_TO_INT, "");
  TAP_TEST(dna_to_int("AAAAAAA", 7) == 0, TEST_DNA_TO_INT, "");
  TAP_TEST(dna_to_int("ATTAGGA", 7) == 3880, TEST_DNA_TO_INT, "");
  TAP_TEST(dna_to_int("TTTT", 4) == 255, TEST_DNA_TO_INT, "");
}

void testRevcompInt() {
  TAP_TEST(revcomp_int(dna_to_int("AA", 2), 2) == dna_to_int("TT", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("AC", 2), 2) == dna_to_int("GT", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("AG", 2), 2) == dna_to_int("CT", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("AT", 2), 2) == dna_to_int("AT", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("CA", 2), 2) == dna_to_int("TG", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("CC", 2), 2) == dna_to_int("GG", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("CG", 2), 2) == dna_to_int("CG", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("CT", 2), 2) == dna_to_int("AG", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("GA", 2), 2) == dna_to_int("TC", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("GC", 2), 2) == dna_to_int("GC", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("GT", 2), 2) == dna_to_int("AC", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("TA", 2), 2) == dna_to_int("TA", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("TC", 2), 2) == dna_to_int("GA", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("TG", 2), 2) == dna_to_int("CA", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("TT", 2), 2) == dna_to_int("AA", 2),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("AAAAAAA", 7), 7) == dna_to_int("TTTTTTT", 7),
           TEST_REVCOMP_INT, "");
  TAP_TEST(revcomp_int(dna_to_int("ATTAGGA", 7), 7) == dna_to_int("TCCTAAT", 7),
           TEST_REVCOMP_INT, "revcomp: " << revcomp_int(dna_to_int("ATTAGGA", 7), 7) <<", dna_to_int: " << dna_to_int("TCCTAAT", 7));
}

void testExtractBasename() {
  TAP_TEST(extract_basename("/var/toto/titi/tutu/bla.bli.bluc", true) == "bla.bli",
           TEST_EXTRACT_BASENAME, extract_basename("/var/toto/titi/tutu/bla.bli.bluc", true));
  TAP_TEST(extract_basename("/var/toto/titi/tutu/bla.bli.bluc", false) == "bla.bli.bluc",
           TEST_EXTRACT_BASENAME, extract_basename("/var/toto/titi/tutu/bla.bli.bluc", false));
  TAP_TEST(extract_basename("bla.bli.bluc", true) == "bla.bli",
           TEST_EXTRACT_BASENAME, extract_basename("bla.bli.bluc", true));
  TAP_TEST(extract_basename("bla.bli.bluc", false) == "bla.bli.bluc",
           TEST_EXTRACT_BASENAME, extract_basename("bla.bli.bluc", false));
  TAP_TEST(extract_basename("a_filename_without_extension", true) == "a_filename_without_extension",
           TEST_EXTRACT_BASENAME, extract_basename("a_filename_without_extension", true));
  TAP_TEST(extract_basename("/", true) == "",
           TEST_EXTRACT_BASENAME, extract_basename("/", true));
}

void testTools() {
  testOnlineFasta1();
  testFasta1();
  testRevcomp();
  testCreateSequence();
  testNucToInt();
  testDNAToInt();
  testRevcompInt();
  testExtractBasename();
}
