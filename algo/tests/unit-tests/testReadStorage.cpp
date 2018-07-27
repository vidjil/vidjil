#include <core/read_storage.h>
#include <core/read_score.h>

void testBinReadStorage() {
  VirtualReadScore *scorer = new ReadLengthScore();
  BinReadStorage reads;
  reads.init(3, 10, scorer);
  reads.setMaxNbReadsStored(3);
  
  TAP_TEST_EQUAL(reads.scoreToBin(0), 0, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST_EQUAL(reads.scoreToBin(2), 0, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST_EQUAL(reads.scoreToBin(10), 0, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST_EQUAL(reads.scoreToBin(11), 0, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST_EQUAL(reads.scoreToBin(5), 0, TEST_BRS_SCORE_TO_BIN, "");

  Sequence seq1 = {"label", "l", "GAGAG", "", 0};
  reads.add(seq1);
  TAP_TEST_EQUAL(reads.smallest_bin_not_empty, 0, TEST_BRS_SBNE, "");
  TAP_TEST_EQUAL(reads.getNbInserted(), 1, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST_EQUAL(reads.getNbStored(), 1, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.getScoreBySeq(seq1) == 5
           && reads.getScoreByScore(5.) == 5
           && reads.getScore(1) ==  5, TEST_BRS_GET_SCORE, "");

  Sequence seq2 = {"label2", "l2", "GA", "", 0};
  reads.add(seq2);
  TAP_TEST_EQUAL(reads.smallest_bin_not_empty, 0, TEST_BRS_SBNE, "");
  TAP_TEST_EQUAL(reads.getNbInserted(), 2, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST_EQUAL(reads.getNbStored(), 2, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScoreBySeq(seq2), 7, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScoreByScore(2.), 7, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScore(0), 7, TEST_BRS_GET_NB_STORED, "");

  TAP_TEST_EQUAL(reads.getScore(), 7, TEST_BRS_GET_SCORE, "");
  TAP_TEST_EQUAL(reads.getAverageScore(), 3.5, TEST_BRS_GET_AVG_SCORE, "");

  Sequence seq3 = {"label3", "l3", "GGAGACAGTA", "", 0};
  reads.add(seq3);
  TAP_TEST_EQUAL(reads.smallest_bin_not_empty, 0, TEST_BRS_SBNE, "");
  TAP_TEST_EQUAL(reads.getNbInserted(), 3, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST_EQUAL(reads.getNbStored(), 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScoreBySeq(seq3), 17, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScoreByScore(10.), 17, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScore(2), 17, TEST_BRS_GET_SCORE, "");

  Sequence seq4 = {"label4", "l4", "AGAGACAGTA", "", 0};
  reads.add(seq4);
  TAP_TEST_EQUAL(reads.smallest_bin_not_empty, 1, TEST_BRS_SBNE, "");
  TAP_TEST_EQUAL(reads.getNbInserted(), 4, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST_EQUAL(reads.getNbStored(), 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.bins[0].size(), 0, TEST_BRS_ADD, "");
  TAP_TEST_EQUAL(reads.bins[1].size(), 1, TEST_BRS_ADD, "");
  TAP_TEST_EQUAL(reads.bins[2].size(), 2, TEST_BRS_ADD, "");
  TAP_TEST_EQUAL(reads.bins[3].size(), 0, TEST_BRS_ADD, "");
  TAP_TEST(reads.getScoreBySeq(seq4) == 20
           && reads.getScoreByScore(10.) == 20
           && reads.getScore(2) ==  20, TEST_BRS_GET_SCORE, "");
  TAP_TEST_EQUAL(reads.getAverageScoreBySeq(seq4), 10, TEST_BRS_GET_AVG_SCORE, "");

  Sequence seq5 = {"label5", "l5", "AATAAGAGTGAGACAGTA", "", 0};
  reads.add(seq5);
  TAP_TEST_EQUAL(reads.smallest_bin_not_empty, 2, TEST_BRS_SBNE, "");
  TAP_TEST_EQUAL(reads.getNbInserted(), 5, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST_EQUAL(reads.getNbStored(), 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.bins[0].size(), 0, TEST_BRS_ADD, "");
  TAP_TEST_EQUAL(reads.bins[1].size(), 0, TEST_BRS_ADD, "");
  TAP_TEST_EQUAL(reads.bins[2].size(), 2, TEST_BRS_ADD, "");
  TAP_TEST_EQUAL(reads.bins[3].size(), 1, TEST_BRS_ADD, "");
  TAP_TEST(reads.getScoreBySeq(seq5) == seq5.sequence.length()
           && reads.getScoreByScore(18.) == seq5.sequence.length()
           && reads.getScore(3) ==  seq5.sequence.length(), TEST_BRS_GET_SCORE, "");

  TAP_TEST_EQUAL(reads.getAverageScore(), 9, TEST_BRS_GET_AVG_SCORE, "");

  reads.add(seq2);
  TAP_TEST_EQUAL(reads.smallest_bin_not_empty, 2, TEST_BRS_SBNE, "");
  TAP_TEST_EQUAL(reads.getNbInserted(), 6, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST_EQUAL(reads.getNbStored(), 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST_EQUAL(reads.getScoreBySeq(seq2), 4, TEST_BRS_GET_SCORE, "");
  TAP_TEST((int) (reads.getAverageScore()*10) == 78, TEST_BRS_GET_AVG_SCORE, reads.getAverageScore());

  TAP_TEST_EQUAL(reads.getNbScores(), 6, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST_EQUAL(reads.getNbScores(0), 2, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST_EQUAL(reads.getNbScores(1), 1, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST_EQUAL(reads.getNbScores(2), 2, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST_EQUAL(reads.getNbScores(3), 1, TEST_BRS_GET_NB_SCORES, "");
  
  list<Sequence> sequences = reads.getReads();
  list<Sequence>::iterator it = sequences.begin();
  TAP_TEST_EQUAL(it->sequence, "GGAGACAGTA", TEST_BRS_GET_READS, "");
  it++;
  TAP_TEST_EQUAL(it->sequence, "AGAGACAGTA", TEST_BRS_GET_READS, "");
  it++;
  TAP_TEST_EQUAL(it->sequence, "AATAAGAGTGAGACAGTA", TEST_BRS_GET_READS, "");
  TAP_TEST_EQUAL(sequences.size(), 3, TEST_BRS_GET_READS, "");

  
  sequences = reads.getBestReads(1);
  TAP_TEST(sequences.begin()->sequence == "AATAAGAGTGAGACAGTA", TEST_BRS_GET_BEST_READS, "");

  sequences = reads.getBestReads(3);
  TAP_TEST_EQUAL(sequences.size(), 3, TEST_BRS_GET_BEST_READS, "");

  sequences = reads.getBestReads(3, 15);
  TAP_TEST_EQUAL(sequences.size(), 1, TEST_BRS_GET_BEST_READS, "");
  TAP_TEST(sequences.begin()->sequence == "AATAAGAGTGAGACAGTA", TEST_BRS_GET_BEST_READS, "");

  delete scorer;
}

void testReadStorage() {
  testBinReadStorage();
}

