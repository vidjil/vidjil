#ifndef TESTS_H
#define TESTS_H

enum {
  /* Tools tests */
  TEST_REVCOMP,
  TEST_FASTA_SIZE,
  TEST_FASTA_LABEL,
  TEST_FASTA_LABEL_FULL,
  TEST_FASTA_SEQUENCE,
  TEST_CREATE_SEQUENCE_LABEL_FULL,
  TEST_CREATE_SEQUENCE_LABEL,
  TEST_CREATE_SEQUENCE_SEQUENCE,
  TEST_CREATE_SEQUENCE_QUALITY,

  /* Storage tests */
  TEST_ARRAY_KMERSTORE,
  TEST_MAP_KMERSTORE,
  TEST_ARRAY_KMERSTORE_RC,
  TEST_MAP_KMERSTORE_RC,

  /* Affect analyzer */
  TEST_AA_COUNT,
  TEST_AA_GET_AFFECT,
  TEST_AA_GET_DISTINCT_AFFECT,
  TEST_AA_FIRST,
  TEST_AA_LAST,
  TEST_AA_PREDICATES,

  /* Cluster */
  TEST_CLUSTER,

  /* Score */
  TEST_LENGTH_SCORE,

  /* Chooser */
  TEST_READ_CHOOSER_BEST,
  TEST_READ_CHOOSER_SORTED,

  /* Sampler */
  TEST_SAMPLER_LENGTH,
  TEST_SAMPLER_LONGEST,
  TEST_SAMPLER_RANDOM,

  /* Representative */
  TEST_KMER_REPRESENTATIVE,
  TEST_KMER_REPRESENTATIVE_REVCOMP,

  /* Bugs */
  TEST_BUG_SEGMENTATION,
  TEST_SEGMENT_POSITION,
  /* Revcomp */
  TEST_SEGMENT_REVCOMP,
  TEST_KMER_SEGMENT_OVERLAP,
  TEST_FINE_SEGMENT_OVERLAP,

  NB_TESTS
};

#include "testing.h"

inline void declare_tests() {
  RECORD_TAP_TEST(TEST_REVCOMP, "revcomp");
  RECORD_TAP_TEST(TEST_FASTA_SIZE, "Fasta/Fastq size");
  RECORD_TAP_TEST(TEST_FASTA_LABEL, "Fasta/Fastq label");
  RECORD_TAP_TEST(TEST_FASTA_LABEL_FULL, "Fasta/Fastq full label");
  RECORD_TAP_TEST(TEST_FASTA_SEQUENCE, "Fasta/Fastq sequence");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_LABEL_FULL, "create_sequence: label_full field");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_LABEL, "create_sequence: label field");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_SEQUENCE, "create_sequence: sequence field");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_QUALITY, "create_sequence: quality field");

  RECORD_TAP_TEST(TEST_ARRAY_KMERSTORE, "Testing ArrayKmerStore");
  RECORD_TAP_TEST(TEST_MAP_KMERSTORE, "Testing MapKmerStore");
  RECORD_TAP_TEST(TEST_ARRAY_KMERSTORE_RC, "Testing ArrayKmerStore with revcomp");
  RECORD_TAP_TEST(TEST_MAP_KMERSTORE_RC, "Testing MapKmerStore with revcomp");

  RECORD_TAP_TEST(TEST_AA_COUNT, "AffectAnalyser.count()");
  RECORD_TAP_TEST(TEST_AA_GET_AFFECT, "AffectAnalyser.getAffectation()");
  RECORD_TAP_TEST(TEST_AA_GET_DISTINCT_AFFECT, "AffectAnalyser.getDistinctAffectations()");
  RECORD_TAP_TEST(TEST_AA_FIRST, "AffectAnalyser.first()");
  RECORD_TAP_TEST(TEST_AA_LAST, "AffectAnalyser.last()");
  RECORD_TAP_TEST(TEST_AA_PREDICATES, "AffectAnalyser: isUnknown() isAmbiguous()");

  RECORD_TAP_TEST(TEST_CLUSTER, "Test automatic clusterisation");

  RECORD_TAP_TEST(TEST_LENGTH_SCORE, "Test ReadLengthScore getScore()");

  RECORD_TAP_TEST(TEST_READ_CHOOSER_BEST, "Test getBest() in ReadChooser");
  RECORD_TAP_TEST(TEST_READ_CHOOSER_SORTED, "Test getSorted() in ReadChooser");

  RECORD_TAP_TEST(TEST_SAMPLER_LENGTH, "Test getLengthDistribution() in SequenceSampler");
  RECORD_TAP_TEST(TEST_SAMPLER_LONGEST, "Test getLongest() in SequenceSampler");
  RECORD_TAP_TEST(TEST_SAMPLER_RANDOM, "Test getRandom() in SequenceSampler");

  RECORD_TAP_TEST(TEST_KMER_REPRESENTATIVE, "Test KmerRepresentativeComputer computations");
  RECORD_TAP_TEST(TEST_KMER_REPRESENTATIVE_REVCOMP, "Test KmerRepresentativeComputer computations on a dataset and its revcomp");
  RECORD_TAP_TEST(TEST_BUG_SEGMENTATION, "Test segmentation bug");
  RECORD_TAP_TEST(TEST_SEGMENT_POSITION, "Test V,D,J position");
  RECORD_TAP_TEST(TEST_KMER_SEGMENT_OVERLAP, "Test kmer segmentation with an overlap");
  RECORD_TAP_TEST(TEST_FINE_SEGMENT_OVERLAP, "Test fine segmentation with an overlap");
  RECORD_TAP_TEST(TEST_SEGMENT_REVCOMP, "Test segmentation on a sequence and its revcomp");
}

TAP_DECLARATIONS


const string seq[] = {"CCCCCCCCCCCCCCCCCCCC", "C lots of",
                      "GGGGGGGGGGGGGGGGGGGG", "G lots of",
                      "AAAAAAAAAAAAAAAAAAAA", "A lots of",
                      "TTTTTTTTTTTTTTTTTTTT", "T lots of",
                      "TTTTATTTTATTTTATTTTA", "U : TTTA lots of",
                      "AAAACAAAACAAAACAAAAC", "V : AAAC lots of"};
const int nb_seq = 6;


template<typename Index>
inline Index *createIndex(int k, bool revcomp) {
  Index *index = new Index(k, revcomp);
  for (int i=0; i < nb_seq; i++)
    index->insert(seq[2*i], seq[2*i+1]);
  return index;
}

#endif
