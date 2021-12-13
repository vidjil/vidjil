#include <core/windows.h>
#include <core/germline.h>
#include <core/bioreader.hpp>
#include <core/read_score.h>
#include <map>

void testWSAdd() {
  map<string, string> labels;
  WindowsStorage ws(labels);
  Sequence seq = {"label", "l", "GATACATTAGACAGCT", "", 0};
  Germline germline("Test", 't', "data/small_V.fa", "", "data/small_J.fa", "", "", "");
  
  TAP_TEST_EQUAL(ws.size(), 0, TEST_WS_SIZE_NONE, "");

  ws.add("ATTAG", seq, SEG_PLUS, &germline);

  TAP_TEST(ws.getGermline("ATTAG") == &germline,TEST_WS_GET_GERMLINE, "");
  TAP_TEST(ws.getGermline("A") == NULL, TEST_WS_GET_GERMLINE_NONE, "");
  TAP_TEST_EQUAL(ws.hasWindow("ATTAG"), true, TEST_WS_HAS_WINDOW, "");
  TAP_TEST_EQUAL(ws.hasWindow("A"), false, TEST_WS_HAS_WINDOW, "");
  TAP_TEST_EQUAL(ws.size(), 1, TEST_WS_SIZE, "");
  TAP_TEST_EQUAL(ws.getNbReads("ATTAG"), 1, TEST_WS_GET_NB_READS, "");
  TAP_TEST_EQUAL(ws.getLabel("ATTAG"), "", TEST_WS_GET_LABEL_NONE, "");
  
  list<Sequence> sequences = ws.getReads("ATTAG");
  TAP_TEST_EQUAL(sequences.size(), 1, TEST_WS_GET_READS_SINGLE, "");
  TAP_TEST(sequences.front().label_full == "label", TEST_WS_GET_READS_SINGLE, "");
  TAP_TEST(sequences.front().sequence == "GATACATTAGACAGCT", TEST_WS_GET_READS_SINGLE, "");

  // Insert the same sequence 10 times more
  for (int i = 0; i < 9; i++) {
    ws.add("ATTAG", seq, SEG_PLUS, &germline);
  }
  seq.sequence = "TAAGATTAGCCACGGACT";
  seq.label_full = "other";
  ws.add("ATTAG", seq, SEG_PLUS, &germline);

  TAP_TEST_EQUAL(ws.size(), 1, TEST_WS_SIZE, "");
  TAP_TEST_EQUAL(ws.getNbReads("ATTAG"), 11, TEST_WS_GET_NB_READS, "");

  sequences = ws.getReads("ATTAG");
  TAP_TEST_EQUAL(sequences.size(), 11, TEST_WS_GET_READS, "");

  int i = 0;
  list<Sequence>::iterator it = sequences.begin();
  for (; i < 10; it++,i++) {
    TAP_TEST_EQUAL(it->label_full, "label", TEST_WS_GET_READS, "");
    TAP_TEST_EQUAL(it->sequence, "GATACATTAGACAGCT", TEST_WS_GET_READS, "");
  }
  TAP_TEST_EQUAL(it->label_full, "other", TEST_WS_GET_READS, "");
  TAP_TEST_EQUAL(it->sequence, "TAAGATTAGCCACGGACT", TEST_WS_GET_READS, "");

  Germline germline2("Other test", 'o', "data/small_V.fa", "", "data/small_J.fa", "", "", "");
  // Insert a sequence from another germline 2 times
  for (int i = 0; i < 2; i++) {
    ws.add("CATT", seq, SEG_MINUS, &germline2);
  }

  // The former germline hasn't changed
  TAP_TEST(ws.getGermline("ATTAG") == &germline,TEST_WS_GET_GERMLINE, "");
  TAP_TEST(ws.getGermline("CATT") == &germline2,TEST_WS_GET_GERMLINE, "");

  Germline germline3("Another test", 'a', "data/small_V.fa", "", "data/small_J.fa", "", "", "");
  // Insert a sequence from another germline 6 times
  for (int i = 0; i < 6; i++) {
    ws.add("ATAGCAT", seq, SEG_MINUS, &germline3);
  }
  // The former germlines haven't changed
  TAP_TEST(ws.getGermline("ATTAG") == &germline,TEST_WS_GET_GERMLINE, "");
  TAP_TEST(ws.getGermline("CATT") == &germline2,TEST_WS_GET_GERMLINE, "");

  TAP_TEST(ws.getGermline("ATAGCAT") == &germline3, TEST_WS_GET_GERMLINE, "");

  TAP_TEST_EQUAL(ws.size(), 3, TEST_WS_SIZE, "");

  //  Add a clone with 5 sequence on the first germline
  for (int i = 0; i < 5; i++) {
    ws.add("TTTTT", seq, SEG_PLUS, &germline);
  }
  
  ws.sort();
  list<pair<junction, size_t> >sorted = ws.getSortedList();
  list<pair<junction, size_t> >::iterator it2 = sorted.begin();

  TAP_TEST_EQUAL(ws.size(), 4, TEST_WS_SIZE, "");
  TAP_TEST(sorted.size() == ws.size() , TEST_WS_SORT, "");
  TAP_TEST(it2->first == "ATTAG" && it2->second == 11, TEST_WS_SORT, "");
  it2++;
  TAP_TEST(it2->first == "ATAGCAT" && it2->second == 6, TEST_WS_SORT, "");
  it2++;
  TAP_TEST(it2->first == "TTTTT" && it2->second == 5, TEST_WS_SORT, "");
  it2++;
  TAP_TEST(it2->first == "CATT" && it2->second == 2, TEST_WS_SORT, "");
  it2++;
  TAP_TEST(it2 == sorted.end(), TEST_WS_SORT, "");
  
  set<Germline *> germlines = ws.getTopGermlines(1);
  TAP_TEST_EQUAL(germlines.size(), 1, TEST_WS_TOP_GERMLINES_ONE, "size = " << germlines.size());
  TAP_TEST(*(germlines.find(&germline)) == &germline, TEST_WS_TOP_GERMLINES_ONE, "");

  germlines = ws.getTopGermlines(1, 20);
  TAP_TEST_EQUAL(germlines.size(), 0, TEST_WS_TOP_GERMLINES_NONE, "size = " << germlines.size());

  
  germlines = ws.getTopGermlines(3);
  TAP_TEST_EQUAL(germlines.size(), 2, TEST_WS_TOP_GERMLINES_MULTI, "size = " << germlines.size());
  TAP_TEST(*(germlines.find(&germline)) == &germline, TEST_WS_TOP_GERMLINES_MULTI, "");
  TAP_TEST(*(germlines.find(&germline3)) == &germline3, TEST_WS_TOP_GERMLINES_MULTI, "");
}

void testWSAddWithLimit() {
  map<string, string> labels;
  WindowsStorage ws(labels);
  ReadQualityScore rqs;
  ws.setScorer(&rqs);
  ws.setMaximalNbReadsPerWindow(3);
  ws.setBinParameters(1, 20);
  Sequence seq = {"label", "l", "GATACATTAGACAGCT", "", 0};
  Sequence seq_long = {"label", "l", "GATACATTAGACAGCTTATATATATATTTATAT", "", 0};
  Germline germline("Test", 't', "data/small_V.fa", "", "data/small_J.fa", "", "", "");

  ws.add("ATTAG", seq, SEG_PLUS, &germline);
  ws.add("ATTAG", seq, SEG_PLUS, &germline);
  ws.add("ATTAG", seq, SEG_PLUS, &germline);
  ws.add("ATTAG", seq, SEG_PLUS, &germline);
  ws.add("ATTAG", seq, SEG_PLUS, &germline);

  TAP_TEST(ws.getReads("ATTAG").size() == 3, TEST_WS_LIMIT_READS_COUNT, "nb reads: " << ws.getReads("ATTAG").size());
  TAP_TEST_EQUAL(ws.getNbReads("ATTAG"), 5, TEST_WS_LIMIT_READS_COUNT, "");

  ws.add("ATTAG", seq_long, SEG_PLUS, &germline);
  ws.add("ATTAG", seq_long, SEG_PLUS, &germline);
  ws.add("ATTAG", seq_long, SEG_PLUS, &germline);
  ws.add("ATTAG", seq_long, SEG_PLUS, &germline);
  TAP_TEST(ws.getReads("ATTAG").size() == 3, TEST_WS_LIMIT_READS_COUNT, "");
  TAP_TEST_EQUAL(ws.getNbReads("ATTAG"), 9, TEST_WS_LIMIT_READS_COUNT, "");

  list<Sequence> sequences = ws.getReads("ATTAG");
  for (list<Sequence>::iterator it = sequences.begin(); it != sequences.end(); it++) {
    TAP_TEST(*it == seq_long, TEST_WS_LIMIT_READS_CONTENT, "label_full: " << it->label_full << ", label: " << it->label << ", seq: " << it->sequence << ", qual: " << it->quality);
  }
}


void testWindowStorage() {
  testWSAdd();
  testWSAddWithLimit();
}
