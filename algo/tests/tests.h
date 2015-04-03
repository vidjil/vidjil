#ifndef TESTS_H
#define TESTS_H

enum {
  /* Tools tests */
  TEST_REVCOMP,
  TEST_O_FASTA_HAS_NEXT,
  TEST_O_FASTA_GET_SEQUENCE,
  TEST_O_FASTA_LINE_NB,
  TEST_FASTA_SIZE,
  TEST_FASTA_LABEL,
  TEST_FASTA_LABEL_FULL,
  TEST_FASTA_SEQUENCE,
  TEST_FASTA_ADD,
  TEST_FASTA_INVALID_FILE,
  TEST_FASTA_OUT,
  TEST_CREATE_SEQUENCE_LABEL_FULL,
  TEST_CREATE_SEQUENCE_LABEL,
  TEST_CREATE_SEQUENCE_SEQUENCE,
  TEST_CREATE_SEQUENCE_QUALITY,
  TEST_SEQUENCE_OUT,
  TEST_NUC_TO_INT,
  TEST_DNA_TO_INT,
  TEST_REVCOMP_INT,
  TEST_EXTENDED_NUCL,
  TEST_EXTRACT_BASENAME,
  TEST_N_CHOOSE_K,

  /* Storage tests */
  TEST_ARRAY_KMERSTORE,
  TEST_MAP_KMERSTORE,
  TEST_ARRAY_KMERSTORE_RC,
  TEST_MAP_KMERSTORE_RC,
  TEST_KMERSTORE_GET_K,
  TEST_KMERSTORE_GET_S,
  TEST_KMERSTORE_GET_SEED,
  TEST_KMERSTORE_INSERT_ONE_SEQ,
  TEST_GET_INDEX_LOAD,

  /* KmerAffect */
  TEST_AFFECT_STRAND,
  TEST_AFFECT_CHAR,
  TEST_AFFECT_COMPARISON,
  TEST_AFFECT_TO_STRING,
  TEST_AFFECT_OUT,
  TEST_KMERAFFECT_CONSTRUCTOR,
  TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE,
  TEST_KMERAFFECT_AFFECTATION,
  TEST_KMERAFFECT_ADD,
  TEST_KMERAFFECT_UNKNOWN,
  TEST_KMERAFFECT_AMBIGUOUS,
  TEST_KMERAFFECT_STRAND,
  TEST_KMERAFFECT_LABEL,
  TEST_KMERAFFECT_COMPARISON,
  TEST_KMERAFFECT_OUT,

  /* Affect analyzer */
  TEST_AA_COUNT,
  TEST_AA_GET_AFFECT,
  TEST_AA_GET_DISTINCT_AFFECT,
  TEST_AA_FIRST,
  TEST_AA_LAST,
  TEST_AA_PREDICATES,
  TEST_AA_GET_ALL_AO_NONE,
  TEST_AA_GET_ALL_AO_NO_CONSECUTIVE,
  TEST_AA_REVCOMP_LABEL,
  TEST_AA_REVCOMP_STRAND,
  TEST_AA_GET_MAXIMUM_MAX_FOUND,
  TEST_AA_GET_MAXIMUM_POSITIONS,
  TEST_AA_GET_MAXIMUM_COUNTS,
  TEST_AA_GET_MAXIMUM_VALUE,
  TEST_AA_GET_SEQUENCE,
  TEST_COUNT_AA_GET_OVERLAP,
  TEST_COUNT_AA_COUNT,
  TEST_COUNT_AA_COUNT_BEFORE,
  TEST_COUNT_AA_COUNT_AFTER,
  TEST_COUNT_AA_FIRST_MAX,
  TEST_COUNT_AA_LAST_MAX,
  TEST_COUNT_AA_MAX,
  TEST_COUNT_AA_MAX12,

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
  TEST_KMER_REPRESENTATIVE_REQUIRED_SEQ,
  TEST_KMER_REPRESENTATIVE_REVCOMP,

  /* Kmer segmentation */
  TEST_KMER_IS_SEGMENTED,
  TEST_KMER_SEGMENTATION_CAUSE,
  TEST_SET_SEGMENTATION_CAUSE,
  TEST_KMER_JUNCTION,
  TEST_KMER_DATA,
  TEST_KMER_LEFT,
  TEST_KMER_RIGHT,
  TEST_PROBABILITY_SEGMENTATION,

  /* WindowExtractor */
  TEST_EXTRACTOR_NB_READS,
  TEST_EXTRACTOR_NB_SEGMENTED,
  TEST_EXTRACTOR_AVG_LENGTH,
  TEST_EXTRACTOR_OUT_SEG,
  TEST_EXTRACTOR_OUT_UNSEG,

  /* WindowsStorage */
  TEST_WS_GET_GERMLINE,
  TEST_WS_GET_GERMLINE_NONE,
  TEST_WS_GET_NB_READS,
  TEST_WS_HAS_WINDOW,
  TEST_WS_SIZE,
  TEST_WS_SIZE_NONE,
  TEST_WS_GET_LABEL_NONE,
  TEST_WS_GET_READS_SINGLE,
  TEST_WS_GET_READS,
  TEST_WS_SORT,
  TEST_WS_TOP_GERMLINES_ONE,
  TEST_WS_TOP_GERMLINES_NONE,
  TEST_WS_TOP_GERMLINES_MULTI,
  TEST_WS_LIMIT_READS_COUNT,
  TEST_WS_LIMIT_READS_CONTENT,

  /* ReadStorage */
  TEST_BRS_SCORE_TO_BIN,
  TEST_BRS_SBNE,
  TEST_BRS_GET_NB_INSERTED,
  TEST_BRS_GET_NB_STORED,
  TEST_BRS_ADD,
  TEST_BRS_GET_READS,

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
  RECORD_TAP_TEST(TEST_O_FASTA_HAS_NEXT, "OnlineFasta hasNext()");
  RECORD_TAP_TEST(TEST_O_FASTA_GET_SEQUENCE, "OnlineFasta next()");
  RECORD_TAP_TEST(TEST_O_FASTA_LINE_NB, "OnlineFasta getLineNb()");
  RECORD_TAP_TEST(TEST_FASTA_SIZE, "Fasta/Fastq size");
  RECORD_TAP_TEST(TEST_FASTA_LABEL, "Fasta/Fastq label");
  RECORD_TAP_TEST(TEST_FASTA_LABEL_FULL, "Fasta/Fastq full label");
  RECORD_TAP_TEST(TEST_FASTA_SEQUENCE, "Fasta/Fastq sequence");
  RECORD_TAP_TEST(TEST_FASTA_ADD, "Fasta add() method");
  RECORD_TAP_TEST(TEST_FASTA_INVALID_FILE, "Fasta with invalid file");
  RECORD_TAP_TEST(TEST_FASTA_OUT, "Test operator<< with Fasta");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_LABEL_FULL, "create_sequence: label_full field");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_LABEL, "create_sequence: label field");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_SEQUENCE, "create_sequence: sequence field");
  RECORD_TAP_TEST(TEST_CREATE_SEQUENCE_QUALITY, "create_sequence: quality field");
  RECORD_TAP_TEST(TEST_SEQUENCE_OUT, "Test operator<< for Sequence");
  RECORD_TAP_TEST(TEST_NUC_TO_INT, "nuc_to_int()");
  RECORD_TAP_TEST(TEST_DNA_TO_INT, "dna_to_int()");
  RECORD_TAP_TEST(TEST_REVCOMP_INT, "revcomp_int()");
  RECORD_TAP_TEST(TEST_EXTRACT_BASENAME, "extractBasename()");
  RECORD_TAP_TEST(TEST_N_CHOOSE_K, "test nChooseK()");

  RECORD_TAP_TEST(TEST_ARRAY_KMERSTORE, "Testing ArrayKmerStore");
  RECORD_TAP_TEST(TEST_KMERSTORE_INSERT_ONE_SEQ, "Testing IKmerStore::insert() on one sequence");
  RECORD_TAP_TEST(TEST_MAP_KMERSTORE, "Testing MapKmerStore");
  RECORD_TAP_TEST(TEST_ARRAY_KMERSTORE_RC, "Testing ArrayKmerStore with revcomp");
  RECORD_TAP_TEST(TEST_MAP_KMERSTORE_RC, "Testing MapKmerStore with revcomp");
  RECORD_TAP_TEST(TEST_KMERSTORE_GET_K, "Testing getK() in KmerStore");
  RECORD_TAP_TEST(TEST_KMERSTORE_GET_S, "Testing getK() in KmerStore");
  RECORD_TAP_TEST(TEST_KMERSTORE_GET_SEED, "Testing getK() in KmerStore");
  RECORD_TAP_TEST(TEST_GET_INDEX_LOAD, "Testing getIndexLoad() in KmerStore");

  RECORD_TAP_TEST(TEST_AFFECT_STRAND, "affect_strand()");
  RECORD_TAP_TEST(TEST_AFFECT_CHAR, "affect_char()");
  RECORD_TAP_TEST(TEST_AFFECT_COMPARISON, "Comparison operators for affect_t");
  RECORD_TAP_TEST(TEST_AFFECT_TO_STRING, "toString() for affect_t");
  RECORD_TAP_TEST(TEST_AFFECT_OUT, "operator<< for affect_t");
  RECORD_TAP_TEST(TEST_KMERAFFECT_CONSTRUCTOR, "KmerAffect constructor");
  RECORD_TAP_TEST(TEST_KMERAFFECT_CONSTRUCTOR_COPY_REVERSE, "KmerAffect constructor, with copy and reverse");
  RECORD_TAP_TEST(TEST_KMERAFFECT_AFFECTATION, "KmerAffect operator=");
  RECORD_TAP_TEST(TEST_KMERAFFECT_ADD, "KmerAffect operator +=");
  RECORD_TAP_TEST(TEST_KMERAFFECT_UNKNOWN, "KmerAffect::isUnknown()");
  RECORD_TAP_TEST(TEST_KMERAFFECT_AMBIGUOUS, "KmerAffect::isAmbiguous()");
  RECORD_TAP_TEST(TEST_KMERAFFECT_STRAND, "KmerAffect::getStrand()");
  RECORD_TAP_TEST(TEST_KMERAFFECT_LABEL, "KmerAffect::getLabel()");
  RECORD_TAP_TEST(TEST_KMERAFFECT_COMPARISON, "KmerAffect comparison operators");
  RECORD_TAP_TEST(TEST_KMERAFFECT_OUT, "KmerAffect operator<<");


  RECORD_TAP_TEST(TEST_AA_COUNT, "AffectAnalyser.count()");
  RECORD_TAP_TEST(TEST_AA_GET_AFFECT, "AffectAnalyser.getAffectation()");
  RECORD_TAP_TEST(TEST_AA_GET_DISTINCT_AFFECT, "AffectAnalyser.getDistinctAffectations()");
  RECORD_TAP_TEST(TEST_AA_FIRST, "AffectAnalyser.first()");
  RECORD_TAP_TEST(TEST_AA_LAST, "AffectAnalyser.last()");
  RECORD_TAP_TEST(TEST_AA_PREDICATES, "AffectAnalyser: isUnknown() isAmbiguous()");
  RECORD_TAP_TEST(TEST_AA_GET_ALL_AO_NONE, "AffectAnalyser: getAllAffectations() with AO_NONE");
  RECORD_TAP_TEST(TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "AffectAnalyser: getAllAffectations() with AO_NO_CONSECUTIVE");
  RECORD_TAP_TEST(TEST_AA_REVCOMP_LABEL, "AffectAnalyser: check that label is the same on revcomp sequence");
  RECORD_TAP_TEST(TEST_AA_REVCOMP_STRAND, "AffectAnalyser: check that strand is opposite on revcomp sequence");
  RECORD_TAP_TEST(TEST_AA_GET_MAXIMUM_MAX_FOUND, "KmerAffectAnalyser: getMaximum() function, max_found value");
  RECORD_TAP_TEST(TEST_AA_GET_MAXIMUM_POSITIONS, "KmerAffectAnalyser: getMaximum() function, positions of maximum");
  RECORD_TAP_TEST(TEST_AA_GET_MAXIMUM_COUNTS, "KmerAffectAnalyser: getMaximum() function, counts of affectations");
  RECORD_TAP_TEST(TEST_AA_GET_MAXIMUM_VALUE, "KmerAffectAnalyser: getMaximum() function, maximum value");
  RECORD_TAP_TEST(TEST_AA_GET_SEQUENCE, "KmerAffectAnalyser: getSequence() function");
  RECORD_TAP_TEST(TEST_COUNT_AA_GET_OVERLAP, "CountKmerAffectAnalyser::getAllowedOverlap");
  RECORD_TAP_TEST(TEST_COUNT_AA_COUNT, "CountKmerAffectAnalyser::count");
  RECORD_TAP_TEST(TEST_COUNT_AA_COUNT_BEFORE, "CountKmerAffectAnalyser::countBefore");
  RECORD_TAP_TEST(TEST_COUNT_AA_COUNT_AFTER, "CountKmerAffectAnalyser::countAfter");
  RECORD_TAP_TEST(TEST_COUNT_AA_FIRST_MAX, "CountKmerAffectAnalyser::firstMax");
  RECORD_TAP_TEST(TEST_COUNT_AA_LAST_MAX, "CountKmerAffectAnalyser::lastMax");
  RECORD_TAP_TEST(TEST_COUNT_AA_MAX, "CountKmerAffectAnalyser::max");
  RECORD_TAP_TEST(TEST_COUNT_AA_MAX12, "CountKmerAffectAnalyser::max12");

  RECORD_TAP_TEST(TEST_CLUSTER, "Test automatic clusterisation");

  RECORD_TAP_TEST(TEST_LENGTH_SCORE, "Test ReadLengthScore getScore()");

  RECORD_TAP_TEST(TEST_READ_CHOOSER_BEST, "Test getBest() in ReadChooser");
  RECORD_TAP_TEST(TEST_READ_CHOOSER_SORTED, "Test getSorted() in ReadChooser");

  RECORD_TAP_TEST(TEST_SAMPLER_LENGTH, "Test getLengthDistribution() in SequenceSampler");
  RECORD_TAP_TEST(TEST_SAMPLER_LONGEST, "Test getLongest() in SequenceSampler");
  RECORD_TAP_TEST(TEST_SAMPLER_RANDOM, "Test getRandom() in SequenceSampler");

  RECORD_TAP_TEST(TEST_KMER_IS_SEGMENTED, "Test isSegmented() in KmerSegmenter");
  RECORD_TAP_TEST(TEST_KMER_SEGMENTATION_CAUSE, "Test getSegmentationStatus() in KmerSegmenter");
  RECORD_TAP_TEST(TEST_SET_SEGMENTATION_CAUSE, "Test setSegmentationStatus() in KmerSegmenter");
  RECORD_TAP_TEST(TEST_KMER_JUNCTION, "Test getJunction() in KmerSegmenter");
  RECORD_TAP_TEST(TEST_KMER_DATA, "Test that data is consistent with what we expect for KmerSegmenter");
  RECORD_TAP_TEST(TEST_KMER_LEFT, "Test V end (resp. J start) with KmerSegmenter on fwd (resp bwd) strand");
  RECORD_TAP_TEST(TEST_KMER_RIGHT, "Test J start (resp. V end) with KmerSegmenter on fwd (resp bwd) strand");
  RECORD_TAP_TEST(TEST_PROBABILITY_SEGMENTATION, "Test getProbabilityAtLeastOrAbove()");

  RECORD_TAP_TEST(TEST_EXTRACTOR_NB_READS, "Test getNbReads() in WindowExtractor");
  RECORD_TAP_TEST(TEST_EXTRACTOR_NB_SEGMENTED, "Test getNbSegmented() in WindowsExtractor");
  RECORD_TAP_TEST(TEST_EXTRACTOR_AVG_LENGTH, "Test getAverageSegmentationLength() in WindowsExtractor");
  RECORD_TAP_TEST(TEST_EXTRACTOR_OUT_SEG, "Test segmentation output for WindowsExtractor");
  RECORD_TAP_TEST(TEST_EXTRACTOR_OUT_UNSEG, "Test unsegmentation output for WindowsExtractor");

  RECORD_TAP_TEST(TEST_WS_GET_GERMLINE, "Test WindowsStorage::getGermline");
  RECORD_TAP_TEST(TEST_WS_HAS_WINDOW, "Test WindowsStorage::hasWindow");
  RECORD_TAP_TEST(TEST_WS_GET_GERMLINE_NONE, "Test WindowsStorage::getGermline() with undefined window");
  RECORD_TAP_TEST(TEST_WS_GET_NB_READS, "Test WindowsStorage::getNbReads");
  RECORD_TAP_TEST(TEST_WS_SIZE, "Test WindowsStorage::size()");
  RECORD_TAP_TEST(TEST_WS_SIZE_NONE, "Test WindowsStorage::size() when empty");
  RECORD_TAP_TEST(TEST_WS_GET_LABEL_NONE, "Test WindowsStorage::getLabel() with no label");
  RECORD_TAP_TEST(TEST_WS_GET_READS_SINGLE, "Test WindowsStorage::getReads() with single result");
  RECORD_TAP_TEST(TEST_WS_GET_READS, "Test WindowsStorage::getReads() with several results");
  RECORD_TAP_TEST(TEST_WS_SORT, "Test WindowsStorage is correctly sorted");
  RECORD_TAP_TEST(TEST_WS_TOP_GERMLINES_ONE, "Test WindowsStorage::getTopGermlines() with the most abundant germline");
  RECORD_TAP_TEST(TEST_WS_TOP_GERMLINES_NONE, "Test WindowsStorage::getTopGermlines() with no germline fulfilling the requirements");
  RECORD_TAP_TEST(TEST_WS_TOP_GERMLINES_MULTI, "Test WindowsStorage::getTopGermlines() with several germlines");
  RECORD_TAP_TEST(TEST_WS_LIMIT_READS_COUNT, "Test that with setMaximalNbReadsPerWindow, the count is correct");
  RECORD_TAP_TEST(TEST_WS_LIMIT_READS_CONTENT, "Test that with setMaximalNbReadsPerWindow, the sequences are correct");

  RECORD_TAP_TEST(TEST_BRS_SCORE_TO_BIN, "Test the scoreToBin() method in ReadStorage");
  RECORD_TAP_TEST(TEST_BRS_SBNE, "Test the smallest_bin_not_empty variables in ReadStorage");
  RECORD_TAP_TEST(TEST_BRS_GET_NB_INSERTED, "Test the getNbInserted() method in ReadStorage");
  RECORD_TAP_TEST(TEST_BRS_GET_NB_STORED, "Test the getNbStored() method in ReadStorage");
  RECORD_TAP_TEST(TEST_BRS_ADD, "Test the add() method in ReadStorage");
  RECORD_TAP_TEST(TEST_BRS_GET_READS, "Test the getReads() method in ReadStorage");

  RECORD_TAP_TEST(TEST_KMER_REPRESENTATIVE, "Test KmerRepresentativeComputer computations");
  RECORD_TAP_TEST(TEST_KMER_REPRESENTATIVE_REQUIRED_SEQ, "Test KmerRepresentativeComputer computations with a required sequence");
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
