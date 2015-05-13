#include <core/read_storage.h>
#include <core/read_score.h>

void testBinReadStorage() {
  VirtualReadScore *scorer = new ReadLengthScore();
  BinReadStorage reads;
  reads.init(3, 10, scorer);
  reads.setMaxNbReadsStored(3);
  
  TAP_TEST(reads.scoreToBin(0) == 0, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST(reads.scoreToBin(2) == 0, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST(reads.scoreToBin(10) == 2, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST(reads.scoreToBin(11) == 3, TEST_BRS_SCORE_TO_BIN, "");
  TAP_TEST(reads.scoreToBin(5) == 1, TEST_BRS_SCORE_TO_BIN, "");

  Sequence seq1 = {"label", "l", "GAGAG", "", NULL};
  reads.add(seq1);
  TAP_TEST(reads.smallest_bin_not_empty == 1, TEST_BRS_SBNE, "");
  TAP_TEST(reads.getNbInserted() == 1, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST(reads.getNbStored() == 1, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.getScoreBySeq(seq1) == 5
           && reads.getScoreByScore(5.) == 5
           && reads.getScore(1) ==  5, TEST_BRS_GET_SCORE, "");

  Sequence seq2 = {"label2", "l2", "GA", "", NULL};
  reads.add(seq2);
  TAP_TEST(reads.smallest_bin_not_empty == 0, TEST_BRS_SBNE, "");
  TAP_TEST(reads.getNbInserted() == 2, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST(reads.getNbStored() == 2, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.getScoreBySeq(seq2) == 2
           && reads.getScoreByScore(2.) == 2
           && reads.getScore(0) ==  2, TEST_BRS_GET_SCORE, "");

  TAP_TEST(reads.getScore() == 7, TEST_BRS_GET_SCORE, "");
  TAP_TEST(reads.getAverageScore() == 3.5, TEST_BRS_GET_AVG_SCORE, "");

  Sequence seq3 = {"label3", "l3", "GGAGACAGTA", "", NULL};
  reads.add(seq3);
  TAP_TEST(reads.smallest_bin_not_empty == 0, TEST_BRS_SBNE, "");
  TAP_TEST(reads.getNbInserted() == 3, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST(reads.getNbStored() == 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.getScoreBySeq(seq3) == 10
           && reads.getScoreByScore(10.) == 10
           && reads.getScore(2) ==  10, TEST_BRS_GET_SCORE, "");

  Sequence seq4 = {"label4", "l4", "AGAGACAGTA", "", NULL};
  reads.add(seq4);
  TAP_TEST(reads.smallest_bin_not_empty == 1, TEST_BRS_SBNE, "");
  TAP_TEST(reads.getNbInserted() == 4, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST(reads.getNbStored() == 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.bins[0].size() == 0, TEST_BRS_ADD, "");
  TAP_TEST(reads.bins[1].size() == 1, TEST_BRS_ADD, "");
  TAP_TEST(reads.bins[2].size() == 2, TEST_BRS_ADD, "");
  TAP_TEST(reads.bins[3].size() == 0, TEST_BRS_ADD, "");
  TAP_TEST(reads.getScoreBySeq(seq4) == 20
           && reads.getScoreByScore(10.) == 20
           && reads.getScore(2) ==  20, TEST_BRS_GET_SCORE, "");
  TAP_TEST(reads.getAverageScoreBySeq(seq4) == 10, TEST_BRS_GET_AVG_SCORE, "");

  Sequence seq5 = {"label5", "l5", "AATAAGAGTGAGACAGTA", "", NULL};
  reads.add(seq5);
  TAP_TEST(reads.smallest_bin_not_empty == 2, TEST_BRS_SBNE, "");
  TAP_TEST(reads.getNbInserted() == 5, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST(reads.getNbStored() == 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.bins[0].size() == 0, TEST_BRS_ADD, "");
  TAP_TEST(reads.bins[1].size() == 0, TEST_BRS_ADD, "");
  TAP_TEST(reads.bins[2].size() == 2, TEST_BRS_ADD, "");
  TAP_TEST(reads.bins[3].size() == 1, TEST_BRS_ADD, "");
  TAP_TEST(reads.getScoreBySeq(seq5) == seq5.sequence.length()
           && reads.getScoreByScore(18.) == seq5.sequence.length()
           && reads.getScore(3) ==  seq5.sequence.length(), TEST_BRS_GET_SCORE, "");

  TAP_TEST(reads.getAverageScore() == 9, TEST_BRS_GET_AVG_SCORE, "");

  reads.add(seq2);
  TAP_TEST(reads.smallest_bin_not_empty == 2, TEST_BRS_SBNE, "");
  TAP_TEST(reads.getNbInserted() == 6, TEST_BRS_GET_NB_INSERTED, "");
  TAP_TEST(reads.getNbStored() == 3, TEST_BRS_GET_NB_STORED, "");
  TAP_TEST(reads.getScoreBySeq(seq2) == 4, TEST_BRS_GET_SCORE, "");
  TAP_TEST((int) (reads.getAverageScore()*10) == 78, TEST_BRS_GET_AVG_SCORE, reads.getAverageScore());

  TAP_TEST(reads.getNbScores() == 6, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST(reads.getNbScores(0) == 2, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST(reads.getNbScores(1) == 1, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST(reads.getNbScores(2) == 2, TEST_BRS_GET_NB_SCORES, "");
  TAP_TEST(reads.getNbScores(3) == 1, TEST_BRS_GET_NB_SCORES, "");
  
  list<Sequence> sequences = reads.getReads();
  list<Sequence>::iterator it = sequences.begin();
  TAP_TEST(it->sequence == "GGAGACAGTA", TEST_BRS_GET_READS, "");
  it++;
  TAP_TEST(it->sequence == "AGAGACAGTA", TEST_BRS_GET_READS, "");
  it++;
  TAP_TEST(it->sequence == "AATAAGAGTGAGACAGTA", TEST_BRS_GET_READS, "");
  
  
  delete scorer;
}

void testReadStorage() {
  testBinReadStorage();
}

