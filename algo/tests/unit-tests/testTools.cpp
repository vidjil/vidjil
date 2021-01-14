#include <core/tools.h>
#include <core/fasta.h>
#include "tests.h"
#include <stdexcept>
#include <vector>
#include <tuple>

void testOnlineBioReader1() {
  OnlineBioReader *fa = OnlineBioReaderFactory::create("data/test1.fa");
  OnlineBioReader *fq = OnlineBioReaderFactory::create("data/test1.fq");
  int nb_seq = 0;

  while (fa->hasNext()) {
    TAP_TEST(fq->hasNext(), TEST_O_FASTA_HAS_NEXT, "");
    fa->next();
    fq->next();
    Sequence s1 = fa->getSequence();
    Sequence s2 = fq->getSequence();
    TAP_TEST(s1.label == s2.label && s1.label_full == s2.label_full
             && s1.sequence == s2.sequence, TEST_O_FASTA_GET_SEQUENCE, "fa: " << fa->getSequence() << endl << "fq: " << fq->getSequence());
    nb_seq++;
  }
  TAP_TEST(! fq->hasNext(), TEST_O_FASTA_HAS_NEXT, "");
  TAP_TEST_EQUAL(nb_seq, 5, TEST_O_FASTA_HAS_NEXT, "");

  delete fa;
  delete fq;
}

void testOnlineBioReaderMaxNth() {
  OnlineBioReader *fa = OnlineBioReaderFactory::create("data/test1.fa", 0, "|", 2, 2);

  // First sequence is 'seq2', because only_nth_sequence = 2
  TAP_TEST(fa->hasNext(), TEST_O_FASTA_HAS_NEXT, "");
  fa->next();
  Sequence s2 = fa->getSequence();
  TAP_TEST_EQUAL(s2.label, "seq2", TEST_O_FASTA_GET_SEQUENCE, "");

  // Second sequence is 'seq4', because only_nth_sequence = 2
  TAP_TEST(fa->hasNext(), TEST_O_FASTA_HAS_NEXT, "");
  fa->next();
  Sequence s4 = fa->getSequence();
  TAP_TEST_EQUAL(s4.label, "seq4", TEST_O_FASTA_GET_SEQUENCE, "");

  // No more sequences, because nb_sequences_max = 2
  TAP_TEST(!fa->hasNext(), TEST_O_FASTA_HAS_NEXT, "Expected (pseudo) end of file");

  delete fa;
}



void testFastaNbSequences() {
  TAP_TEST_EQUAL(nb_sequences_in_file("../../germline/homo-sapiens/IGHV.fa"), 547, TEST_FASTA_NB_SEQUENCES, "ccc");

  int a1 = approx_nb_sequences_in_file("../../germline/homo-sapiens/IGHV.fa");
  TAP_TEST(a1 >= 540 && a1 <= 560, TEST_FASTA_NB_SEQUENCES, "");

  int a2 = nb_sequences_in_file("data/Stanford_S22.fasta", true);
  TAP_TEST(a2 >= 13100 && a2 <= 13200, TEST_FASTA_NB_SEQUENCES, "");
}


void testFasta1() {
  BioReader fa("data/test1.fa");
  BioReader fq("data/test1.fq");
  BioReader bam("data/test1.bam");

  TAP_TEST(fa.size() == fq.size(), TEST_FASTA_SIZE, "");
  TAP_TEST(fa.size() == bam.size(), TEST_BAM_SIZE, fa.size() << " " << bam.size());
  for (int i=0; i < fa.size(); i++) {
    TAP_TEST(fa.label(i) == fq.label(i), TEST_FASTA_LABEL, "");
    TAP_TEST(fa.label_full(i) == fq.label_full(i), TEST_FASTA_LABEL_FULL, "");
    TAP_TEST(fa.sequence(i) == fq.sequence(i), TEST_FASTA_SEQUENCE, "");
    TAP_TEST(fa.label(i) == bam.label(i), TEST_BAM_LABEL, "");
    TAP_TEST(fa.label_full(i) == bam.label_full(i), TEST_BAM_LABEL_FULL, fa.label_full(i) << " " << bam.label_full(i));
    TAP_TEST(fa.sequence(i) == bam.sequence(i), TEST_BAM_SEQUENCE, fa.sequence(i) << " " << bam.sequence(i));
  }
  TAP_TEST_EQUAL(fa.label(2), "seq3", TEST_FASTA_LABEL, "");
  TAP_TEST_EQUAL(fa.sequence(2), "A", TEST_FASTA_SEQUENCE, "");
  TAP_TEST_EQUAL(fa.label(4), "", TEST_FASTA_LABEL, "");
  TAP_TEST_EQUAL(fa.sequence(4), "AATN", TEST_FASTA_SEQUENCE, "");
}

void testFastaAdd() {
  BioReader fa1("data/test1.fa");
  BioReader fa2("data/test1.fa");
  fa2.add("data/test1.fa");

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

void testFastaAddThrows() {
  bool caught = false;
  try {
    BioReader fa1("mlkdkklflskjfskldfj.fa");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Error in opening file") != string::npos, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");

  BioReader fa1("data/test1.fa");

  caught = false;
  try {
    fa1.add("ljk:lkjsdfsdlfjsdlfkjs.fa");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Error in opening file") != string::npos, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");

  caught = false;
  try {
    fa1.add("Makefile");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("The file seems to be malformed") != string::npos, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");

  caught = false;
  try {
    OnlineBioReader *fa = OnlineBioReaderFactory::create("lkjdflkdfjglkdfjg.fa");
    delete fa;
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Error in opening file") != string::npos, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");

  caught = false;
  try {
    BioReader fa1("data/malformed1.fq");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Expected line starting with +") != string::npos, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");
  caught = false;
  try {
    BioReader fa1("data/malformed2.fq");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Unexpected EOF") == 0, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");
  caught = false;
  try {
    BioReader fa1("data/malformed3.fq");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Quality and sequence don't have the same length") == 0, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");
  caught = false;
  try {
    BioReader fa1("data/malformed4.fq");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Unexpected EOF") == 0, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");
  caught = false;
  try {
    BioReader fa1("data/malformed5.fq");
  } catch (invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Unexpected EOF") == 0, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");
  caught = false;
  OnlineBioReader *fa_read = NULL;
  try {
    // Can't test empty file with BioReader since we
    // don't complain for empty files explicitly in BioReader constructor.
    fa_read = OnlineBioReaderFactory::create("data/malformed6.fq");
    fa_read->next();
  } catch (invalid_argument &e) {
    if (fa_read)
        delete fa_read;
    TAP_TEST(string(e.what()).find("Unexpected EOF") == 0, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");

  caught = false;
  try {
    BioReader fa1("data/malformed7.fq");
  } catch(invalid_argument &e) {
    TAP_TEST(string(e.what()).find("Unexpected EOF") == 0, TEST_FASTA_INVALID_FILE, "");
    caught = true;
  }
  TAP_TEST_EQUAL(caught, true, TEST_FASTA_INVALID_FILE, "");
}

void testFastaLabelAndMark() {

  BioReader fa("data/testMarks.fa", 1, "=", 9);

  TAP_TEST_EQUAL(fa.read(0).label, "tic", TEST_FASTA_LABEL, "");
  TAP_TEST_EQUAL(fa.read(0).marked_pos, 9, TEST_FASTA_MARK, "");

  TAP_TEST_EQUAL(fa.read(1).marked_pos, 7, TEST_FASTA_MARK, "");

  TAP_TEST_EQUAL(fa.read(2).marked_pos, 0, TEST_FASTA_MARK, "");
}

void testSequenceOutputOperator() {
  ostringstream oss;
  Sequence seq = {"a b c", "a", "GATTACA", "AIIIIIH", 0};
  oss << seq;

  TAP_TEST_EQUAL(oss.str(), "@a\nGATTACA\n+\nAIIIIIH\n", TEST_SEQUENCE_OUT, oss.str());

  ostringstream oss2;
  seq.quality = "";
  oss2 << seq;

  TAP_TEST_EQUAL(oss2.str(), ">a\nGATTACA\n", TEST_SEQUENCE_OUT, oss.str());
}

void testFastaOutputOperator(){
  ostringstream oss;
  BioReader fa("data/test1.fa");
  oss << fa;
  TAP_TEST_EQUAL(oss.str(), ">seq1\nACAAC\n>seq2\nCGACCCCCAA\n>seq3\nA\n>seq4\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n>\nAATN\n", TEST_FASTA_OUT, oss.str());
}

void testRevcomp() {
  TAP_TEST_EQUAL(complement("AATCAGactgactagATCGAn"), "TTAGTCTGACTGATCTAGCTN", TEST_REVCOMP, "");
  TAP_TEST_EQUAL(revcomp("AATCAGactgactagATCGAn"), "NTCGATCTAGTCAGTCTGATT", TEST_REVCOMP, "");
  TAP_TEST_EQUAL(revcomp(""), "", TEST_REVCOMP, "");
  TAP_TEST_EQUAL(revcomp("aaaaaa"), "TTTTTT", TEST_REVCOMP, "");
}

void testCreateSequence() {
  Sequence seq1 = create_sequence("label", "l", "AAAAAAAAAA", "!!!!!!!!!!");
  Sequence seq2 = create_sequence("", "", "", "");

  TAP_TEST_EQUAL(seq1.label_full, "label", TEST_CREATE_SEQUENCE_LABEL_FULL, "");
  TAP_TEST_EQUAL(seq2.label_full, "", TEST_CREATE_SEQUENCE_LABEL_FULL, "");

  TAP_TEST_EQUAL(seq1.label, "l", TEST_CREATE_SEQUENCE_LABEL, "");
  TAP_TEST_EQUAL(seq2.label, "", TEST_CREATE_SEQUENCE_LABEL, "");

  TAP_TEST_EQUAL(seq1.sequence, "AAAAAAAAAA", TEST_CREATE_SEQUENCE_SEQUENCE, "");
  TAP_TEST_EQUAL(seq2.sequence, "", TEST_CREATE_SEQUENCE_SEQUENCE, "");

  TAP_TEST_EQUAL(seq1.quality, "!!!!!!!!!!", TEST_CREATE_SEQUENCE_QUALITY, "");
  TAP_TEST_EQUAL(seq2.quality, "", TEST_CREATE_SEQUENCE_QUALITY, "");
}

void testNucToInt() {
  TAP_TEST_EQUAL(nuc_to_int('A'), 0, TEST_NUC_TO_INT, "");
  TAP_TEST_EQUAL(nuc_to_int('C'), 1, TEST_NUC_TO_INT, "");
  TAP_TEST_EQUAL(nuc_to_int('G'), 2, TEST_NUC_TO_INT, "");
  TAP_TEST_EQUAL(nuc_to_int('T'), 3, TEST_NUC_TO_INT, "");

  TAP_TEST_EQUAL(nuc_to_int('a'), 0, TEST_NUC_TO_INT, "");
  TAP_TEST_EQUAL(nuc_to_int('c'), 1, TEST_NUC_TO_INT, "");
  TAP_TEST_EQUAL(nuc_to_int('g'), 2, TEST_NUC_TO_INT, "");
  TAP_TEST_EQUAL(nuc_to_int('t'), 3, TEST_NUC_TO_INT, "");

}

void testDNAToInt() {
  TAP_TEST_EQUAL(dna_to_int("A", 1), 0, TEST_DNA_TO_INT, "");
  TAP_TEST_EQUAL(dna_to_int("AAAAAAA", 7), 0, TEST_DNA_TO_INT, "");
  TAP_TEST_EQUAL(dna_to_int("ATTAGGA", 7), 3880, TEST_DNA_TO_INT, "");
  TAP_TEST_EQUAL(dna_to_int("TTTT", 4), 255, TEST_DNA_TO_INT, "");
}

void testDNAToHash() {
  TAP_TEST_EQUAL(dna_to_hash("ACGT", 4), 6383640340, TEST_DNA_TO_HASH, "");
}

void testNucToAA() {
  cout << GENETIC_CODE << endl;
  TAP_TEST (nuc_to_aa("acaaggagcaattggaatttgagactgcaaaatctaattaaaaatgattctgggttctattactgtgccacctgggacagg") == "TRSNWNLRLQNLIKNDSGFYYCATWDR", TEST_NUC_TO_AA, "");
  TAP_TEST (nuc_to_aa("ACGTacgtACGTacgt") == "TYVRT#", TEST_NUC_TO_AA, "");
  TAP_TEST (nuc_to_aa("atgTAAtagTGA") == "M***", TEST_NUC_TO_AA, "");
  TAP_TEST (nuc_to_aa("cccCATgaaTT") == "PHE#", TEST_NUC_TO_AA, "");
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

void testExtendedNucleotides() {
  TAP_TEST_EQUAL(is_extended_nucleotide('A'), false, TEST_EXTENDED_NUCL, "");
  TAP_TEST_EQUAL(is_extended_nucleotide('a'), false, TEST_EXTENDED_NUCL, "");
  TAP_TEST_EQUAL(is_extended_nucleotide('N'), true,  TEST_EXTENDED_NUCL, "");
  TAP_TEST_EQUAL(is_extended_nucleotide(' '), true,  TEST_EXTENDED_NUCL, "");

  TAP_TEST_EQUAL(has_extended_nucleotides(""), false, TEST_EXTENDED_NUCL, "");
  TAP_TEST_EQUAL(has_extended_nucleotides("ACGTacgt"), false, TEST_EXTENDED_NUCL, "");
  TAP_TEST_EQUAL(has_extended_nucleotides("ACGTnacgt"), true, TEST_EXTENDED_NUCL, "");
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

void testGenerateAllSeeds() {
  std::vector<string> solution1 = {"ATAAT"};

  TAP_TEST(generate_all_seeds(solution1[0], "#####") == solution1,
           TEST_GENERATE_ALL_SEEDS, "");


  std::vector<string> solution2 = {"ATAAT", "ATCAT", "ATGAT", "ATTAT"};
  std::vector<string> try2 = generate_all_seeds("ATAAT", "##-##");

  TAP_TEST(try2 == solution2,
           TEST_GENERATE_ALL_SEEDS, "");

  std::vector<string> solution3 = {"ATAAT", "ATCAT", "ATGAT", "ATTAT",
                                   "ATACT", "ATCCT", "ATGCT", "ATTCT",
                                   "ATAGT", "ATCGT", "ATGGT", "ATTGT",
                                   "ATATT", "ATCTT", "ATGTT", "ATTTT"};
  TAP_TEST(generate_all_seeds("ATAAT", "##--#") == solution3,
           TEST_GENERATE_ALL_SEEDS, "");


  std::vector<string> solution4 = {"AA", "CA", "GA", "TA",
                                   "AC", "CC", "GC", "TC",
                                   "AG", "CG", "GG", "TG",
                                   "AT", "CT", "GT", "TT"};
  TAP_TEST(generate_all_seeds("AA", "--") == solution4,
           TEST_GENERATE_ALL_SEEDS, "");
}

void testNChooseK() {
  TAP_TEST_EQUAL(nChoosek(1, 10), 0, TEST_N_CHOOSE_K, "");
  TAP_TEST_EQUAL(nChoosek(1, 1), 1, TEST_N_CHOOSE_K, "");
  TAP_TEST_EQUAL(nChoosek(5, 2), 10, TEST_N_CHOOSE_K, "");
  TAP_TEST_EQUAL(nChoosek(8, 4), 70, TEST_N_CHOOSE_K, "");
}

void testIsStopCodon() {
  TAP_TEST(hasInFrameStopCodon("CATCATCATTAGCATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("CATCATCATTAACATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("CATCATCATTGACATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("TAGCATCATCATCATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("TAACATCATCATCATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("TGACATCATCATCATCG", 0), TEST_IS_STOP_CODON, "");

  TAP_TEST(! hasInFrameStopCodon("ACATCATCATTAGCATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(! hasInFrameStopCodon("ACATCATCATTAACATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(! hasInFrameStopCodon("ACATCATCATTGACATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(! hasInFrameStopCodon("ATAGCATCATCATCATCG", 0), TEST_IS_STOP_CODON, "");
  TAP_TEST(! hasInFrameStopCodon("ATAACATCATCATCATCG", 0), TEST_IS_STOP_CODON, "");

  TAP_TEST(hasInFrameStopCodon("ACATCATCATTAGCATCG", 1), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("ACATCATCATTAACATCG", 1), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("ACATCATCATTGACATCG", 1), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("ATAGCATCATCATCATCG", 1), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("ATAACATCATCATCATCG", 1), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("ATGACATCATCATCATCG", 1), TEST_IS_STOP_CODON, "");

  TAP_TEST(hasInFrameStopCodon("AACATCATCATTAGCATCG", 2), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("AACATCATCATTAACATCG", 2), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("AACATCATCATTGACATCG", 2), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("AATAGCATCATCATCATCG", 2), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("AATAACATCATCATCATCG", 2), TEST_IS_STOP_CODON, "");
  TAP_TEST(hasInFrameStopCodon("AATGACATCATCATCATCG", 2), TEST_IS_STOP_CODON, "");

}

void testTrimSequence() {
  size_t start, length;
  string trimmed;
  list<pair<string, string> > sequences =
    { {"NNNNNAATAGTAGACTANNNNN", "AATAGTAGACTA"},
      {"ANANANATAGAGTAGATGATANANANANA", "ATAGAGTAGATGATA"} ,
      {"ANAANATAGAGTAGATGATANAANA", "ATAGAGTAGATGATA"},
      {"ATAGAGTAGATGATANAANA", "ATAGAGTAGATGATA"},
      {"ANAANATAGAGTAGATGATA", "ATAGAGTAGATGATA"},
      {"NATAGAGTAGATGATA", "ATAGAGTAGATGATA"},
      {"CCNCCNATAGAGTAGATGATANCCNCC", "ATAGAGTAGATGATA"},
      {"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNATAGAGTAGATGATA",
       "ATAGAGTAGATGATA"},
      {"ATAGAGTAGATGATANNNNNNNNNNNNNNNNNNNNNNNNNNNNN",
       "ATAGAGTAGATGATA"},
      {"ATAGAGTAGATGATA", "ATAGAGTAGATGATA"},
      {"ACCTGAGGAGACGGTGACCAGGGTTCCCTGGCCCCAGTTGATAACCACTCCAAAAATCGTAATAGTATTCTCAGCNCCGTGGCTCGGCTCTCAGGCTGTTCNNNNNNNGATACAGTGANNNNTTGGCGTNNNNNNNGGAGATGGTGAATCNNNNNNNCACTGAGTCNNNNNAGTATATNNNNNNNCTACTACNNNNANNGGATGAGNNNNNNNCCAGCCCNNNNNNNGGAGCCTNNNNNNNCCAGTTCNNNNNNNAGCTACTNNNNNNNAATCCAGNNNNNNNACAGGAGNNNNNNNGGG",
       "ACCTGAGGAGACGGTGACCAGGGTTCCCTGGCCCCAGTTGATAACCACTCCAAAAATCGTAATAGTATTCTCAGCNCCGTGGCTCGGCTCTCAGGCTGTTC"},
      {"CCCNNNNNNNCTCCTGTNNNNNNNCTGGATTNNNNNNNAGTAGCTNNNNNNNGAACTGGNNNNNNNAGGCTCCNNNNNNNGGGCTGGNNNNNNNCTCATCCNNTNNNNGTAGTAGNNNNNNNATATACTNNNNNGACTCAGTGNNNNNNNGATTCACCATCTCCNNNNNNNACGCCAANNNNTCACTGTATCNNNNNNNGAACAGCCTGAGAGCCGAGCCACGGNGCTGAGAATACTATTACGATTTTTGGAGTGGTTATCAACTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT",
       "GAACAGCCTGAGAGCCGAGCCACGGNGCTGAGAATACTATTACGATTTTTGGAGTGGTTATCAACTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT"},
      // T^10 NNNN -> 14nt // NNNN A^10 -> 14nt // 4/14 < 30%
      {"TTTTTTTTTTNNNNCCCCCCCCCCNNNNAAAAAAAAAA", "TTTTTTTTTTNNNNCCCCCCCCCCNNNNAAAAAAAAAA"},
      // T^9 NNNN -> 13nt // NNNN A^9 -> 13nt // 4/13 > 30%
      {"TTTTTTTTTNNNNCCCCCCCCCCNNNNAAAAAAAAA", "CCCCCCCCCC"},
      // Mixed 13nt/14nt left/right
      {"TTTTTTTTTNNNNCCCCCCCCCCNNNNAAAAAAAAAA", "CCCCCCCCCCNNNNAAAAAAAAAA"},
      {"TTTTTTTTTTNNNNCCCCCCCCCCNNNNAAAAAAAAA", "TTTTTTTTTTNNNNCCCCCCCCCC"},
      // Central region is C^9 instead of C^10
      {"TTTTTTTTTNNNNCCCCCCCCCNNNNAAAAAAAAAA", "AAAAAAAAAA"},
      {"TTTTTTTTTTNNNNCCCCCCCCCNNNNAAAAAAAAA", "TTTTTTTTTT"},
      {"NNNNNNNNNNNNNN", ""},
      {"N", ""},
      {"", ""},
      {"NNNNNNNNNNNNNNNNANNNNNNNNNNNNN", "A"},
      {"ANNNNNNN", "A"},
      {"NNNNNNNA", "A"},
      {"ATGCATGCATGC", "ATGCATGCATGC"}
    };

    for (auto seq_pair: sequences) {
      start = 0;
      length = seq_pair.first.length();
      trimSequence(seq_pair.first, start, length);
      trimmed = seq_pair.first.substr(start, length);
      TAP_TEST(trimmed == seq_pair.second, TEST_TRIM_SEQUENCE,
               "got " << trimmed << " instead of " << seq_pair.second << " (original sequence: " << seq_pair.first
      << ")");
    }

    // Test the last parameters

    //                       0        0  1          2  2 
    //                       0        9  2          3  6
    string representative = "TTTTTTTTTNNNNCCCCCCCCCCNNNNAAAAAAAAA";

    list <std::tuple<size_t, size_t, string> > required_params = 
      { std::make_tuple(13, 10, "CCCCCCCCCC"),
        std::make_tuple(13, 11, "CCCCCCCCCCN"),
        std::make_tuple(12, 10, "NCCCCCCCCC"),
        std::make_tuple(12, 11, "NCCCCCCCCCC"),
        std::make_tuple(12, 12, "NCCCCCCCCCCN"),
        std::make_tuple(11, 14, "NNCCCCCCCCCCNN")};

    for (auto ex: required_params) {
      start = 0;
      length = representative.length();
      trimSequence(representative, start, length, std::get<0>(ex), std::get<1>(ex));
      trimmed = representative.substr(start, length);
      TAP_TEST_EQUAL(trimmed, std::get<2>(ex), TEST_TRIM_SEQUENCE, " required_start = " << std::get<0>(ex) << ", required_length = " << std::get<1>(ex));
    }

    representative = "NNNNNCNGAGGAGGGCGGGAACAGAGTGACCGAGGGGGCAGCCTTGGGCTGACCTAGGACGGTCAGCTTGGTCCCTCNGNNGAATATTCGAGTACCAAAGATGTCNNNTNNTTGNCANTGNNNN";
    string window = "GGTCAGCTTGGTCCCTCNGNNGAATATTCGAGTACCAAAGATGTCNNNTN";
    start = 5;
    length = 115;
    trimSequence(representative, start, length, 60, 50);
    trimmed = representative.substr(start, length);
    TAP_TEST(trimmed.find(window) != string::npos, TEST_TRIM_SEQUENCE, "Trimmed representative is " << trimmed << " start = " << start << ", length = " << length );

    representative = ::revcomp(representative);
    window = ::revcomp(window);
    start = 9;
    length = 115;
    trimSequence(representative, start, length, 14, 50);
    trimmed = representative.substr(start, length);
    TAP_TEST(trimmed.find(window) != string::npos, TEST_TRIM_SEQUENCE, "Trimmed representative is " << trimmed << " start = " << start << ", length = " << length );
}

/* 
	Check the integrity of the extractGeneName function. 
	The whole name is truncated before the star.
	If there isn't any star in the name, the label
	is returned as it is.	
*/
void testExtractGeneName(){
	string example_1 = "IGHV-01*01";
	string example_2 = "FAMOUS-GENE-01*2999";
	string example_3 = "IGHV-30";

	TAP_TEST(extractGeneName(example_1) == "IGHV-01", TEST_EXTRACT_GENE_NAME,
	"Fail to extract gene name from:" << example_1 << " result:" << extractGeneName(example_1));
	TAP_TEST(extractGeneName(example_2) == "FAMOUS-GENE-01", TEST_EXTRACT_GENE_NAME,
	"Fail to extract gene name from:" << example_2 << " result:" << extractGeneName(example_2));
	TAP_TEST(extractGeneName(example_3) == "IGHV-30", TEST_EXTRACT_GENE_NAME,
	"Fail to extract gene name from:" << example_3 << " result:" << extractGeneName(example_3));
}

void testConversions(){  
  TAP_TEST_EQUAL(string_of_int(12), "12", TEST_CONVERSIONS, "");
  TAP_TEST_EQUAL(string_of_int(12, 4), "0012", TEST_CONVERSIONS, "");
  TAP_TEST_EQUAL(fixed_string_of_float(12.345, 1), "12.3", TEST_CONVERSIONS, "");
}

void testTools() {
  testOnlineBioReader1();
  testOnlineBioReaderMaxNth();
  testFastaNbSequences();
  testFasta1();
  testFastaAdd();
  testFastaAddThrows();
  testFastaLabelAndMark();
  testSequenceOutputOperator();
  testFastaOutputOperator();
  testRevcomp();
  testCreateSequence();
  testNucToInt();
  testDNAToInt();
  testDNAToHash();
  testNucToAA();
  testRevcompInt();
  testExtendedNucleotides();
  testExtractBasename();
  testNChooseK();
  testGenerateAllSeeds();
  testTrimSequence();
  testIsStopCodon();
	testExtractGeneName();
  testConversions();
}
