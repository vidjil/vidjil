#include "core/automaton.h"
#include "core/filter.h"
#include "core/germline.h"
#include "core/tools.h"

/*
  Create an artificial BioReader to experiment tests.
  This BioReader behave as a regular BioReader.
  The only noticeable characteristic is the presence of
  a sequence where its shorten name doesn't contain a star.
  (sequence n°10)
*/
BioReader getDebugBioReader1(){
  BioReader result;
  Sequence sequences[13];
  sequences[0] = {"seq1-full_name", "seq-01*01", "AGCTGC","", NULL, 0};
  sequences[1] = {"seq1-full_name", "seq-01*02", "AGCTGA", "", NULL, 0};
  sequences[2] = {"seq1-full_name", "seq-01*03", "AGCTGT", "", NULL, 0};
  sequences[3] = {"seq2_full_name", "seq-02*01", "TCAA", "", NULL, 0};
  sequences[4] = {"seq2_full_name", "seq-02*02", "TCCA", "", NULL, 0};
  sequences[5] = {"seq3_full_name", "seq-03*01", "GGGG", "", NULL, 0};
  sequences[6] = {"seq4_full_name", "seq-04*01", "CCAATG", "", NULL, 0};
  sequences[7] = {"seq4_full_name", "seq-04*02", "CCAATT", "", NULL, 0};
  sequences[8] = {"seq4_full_name", "seq-04*03", "CCAATA", "", NULL, 0};
  sequences[9] = {"seq4_full_name", "seq-04*04", "CCAATC", "", NULL, 0};
  sequences[10] = {"seq5_full_name", "seq-05", "TTTT", "", NULL, 0};
  sequences[11] = {"seq6_full_name", "seq-06*01", "AAAT", "", NULL, 0};
  sequences[12] = {"seq6_full_name", "seq-06*02", "AAAA", "", NULL, 0};
  for(int i = 0;i < 13; ++i){
    result.add(sequences[i]);
  }
  return result;
}

/*
  Create an artificial BioReader to experiment tests.
  This BioReader behave as a regular BioReader.
  Its characteristic is to have the first group of gene
  containing only one sequence.
  (sequence n°0)
*/
BioReader getDebugBioReader2(){
  BioReader result;
  Sequence sequences[11];
  sequences[0] = {"seq1-full_name", "seq-01*01", "AGCTGC","", NULL, 0};
  sequences[1] = {"seq2_full_name", "seq-02*01", "TCAA", "", NULL, 0};
  sequences[2] = {"seq2_full_name", "seq-02*02", "TCCA", "", NULL, 0};
  sequences[3] = {"seq3_full_name", "seq-03*01", "GGGG", "", NULL, 0};
  sequences[4] = {"seq4_full_name", "seq-04*01", "CCAATG", "", NULL, 0};
  sequences[5] = {"seq4_full_name", "seq-04*02", "CCAATT", "", NULL, 0};
  sequences[6] = {"seq4_full_name", "seq-04*03", "CCAATA", "", NULL, 0};
  sequences[7] = {"seq4_full_name", "seq-04*04", "CCAATC", "", NULL, 0};
  sequences[8] = {"seq5_full_name", "seq-05*01", "TTTT", "", NULL, 0};
  sequences[9] = {"seq6_full_name", "seq-06*01", "AAAT", "", NULL, 0};
  sequences[10] = {"seq6_full_name", "seq-06*02", "AAAA", "", NULL, 0};
  for(int i = 0;i < 11; ++i){
    result.add(sequences[i]);
  }
  return result;
}

/*
  Create an artifical BioReader to experiment tests.
  This BioReader behave as a regular BioReader.
  Its characteristic is to have only one sequences in the
  last groupe of genes.
*/
BioReader getDebugBioReader3(){
  BioReader result;
  Sequence sequences[12];
  sequences[0] = {"seq1-full_name", "seq-01*01", "AGCTGC","", NULL, 0};
  sequences[1] = {"seq1-full_name", "seq-01*02", "AGCTGA", "", NULL, 0};
  sequences[2] = {"seq1-full_name", "seq-01*03", "AGCTGT", "", NULL, 0};
  sequences[3] = {"seq2_full_name", "seq-02*01", "TCAA", "", NULL, 0};
  sequences[4] = {"seq2_full_name", "seq-02*02", "TCCA", "", NULL, 0};
  sequences[5] = {"seq3_full_name", "seq-03*01", "GGGG", "", NULL, 0};
  sequences[6] = {"seq4_full_name", "seq-04*01", "CCAATG", "", NULL, 0};
  sequences[7] = {"seq4_full_name", "seq-04*02", "CCAATT", "", NULL, 0};
  sequences[8] = {"seq4_full_name", "seq-04*03", "CCAATA", "", NULL, 0};
  sequences[9] = {"seq4_full_name", "seq-04*04", "CCAATC", "", NULL, 0};
  sequences[10] = {"seq5_full_name", "seq-05*01", "TTTT", "", NULL, 0};
  sequences[11] = {"seq6_full_name", "seq-06*01", "AAAT", "", NULL, 0};
  for(int i = 0;i < 12; ++i){
    result.add(sequences[i]);
  }
  return result;
}

/*
  Create a vector of int corresponding to the
  sequences indexes in the BioReader build in
  the getDebugBioReader1 function.
  Read documentation in segment.cpp to learn
  more on the index elements and their structure.
*/
vector<int> getDebugIndexes1(){
  vector<int> indexes;
  indexes.push_back(0);
  indexes.push_back(3);
  indexes.push_back(5);
  indexes.push_back(6);
  indexes.push_back(10);
  indexes.push_back(11);
  indexes.push_back(13);
  return indexes;
}

/*
  Create a vector of int corresponding to the
  sequences indexes in the BioReader build in
  the getDebugBioReader2 function.
  Read documentation in segment.cpp to learn
  more on the index elements and their structure.
*/
vector<int> getDebugIndexes2(){
  vector<int> indexes;
  indexes.push_back(0);
  indexes.push_back(1);
  indexes.push_back(3);
  indexes.push_back(4);
  indexes.push_back(8);
  indexes.push_back(9);
  indexes.push_back(11);
  return indexes;
}

/*
  Create a vector of int corresponding to the
  sequences indexes in the BioReader build in
  the getDebugBioReader3 function.
  Read documentation in segment.cpp to learn
  more on the index elements and their structure.
*/
vector<int> getDebugIndexes3(){
  vector<int> indexes;
  indexes.push_back(0);
  indexes.push_back(3);
  indexes.push_back(5);
  indexes.push_back(6);
  indexes.push_back(10);
  indexes.push_back(11);
  indexes.push_back(12);
  return indexes;
}

/*
  Check the integrity of the automatonBuilderFilteringBioReader
  function. This test is separe in two parts. The first one
  will check if the vector of indexes received is accurate
  while the second part will check that every KmerAffect inside
  the revceivedAutomaton wear the good label.
*/
void testAutomatonBuilderFilteringBioReader(){
  pair<vector<int>*, AbstractACAutomaton<KmerAffect>*> *pair1, *pair2, *pair3;
  KmerAffect tmpKmer;
  seqtype tmpSeq;
  BioReader testedBioReader1;
  BioReader testedBioReader2;
  BioReader testedBioReader3;
  vector<int> expectedIndexes1;
  vector<int> expectedIndexes2;
  vector<int> expectedIndexes3;
  seqtype seq;
  KmerAffect k;
  char asciiChar;
  unsigned int asciiNum;

  const string TEST_SIZE_ERROR =
                            "The expected vector doesn't have the good size";
  const string TEST_CONTENT_ERROR =
                            "The expected vector doesn't have the good content";
  const string TEST_LABEL_ERROR =
                            "The KmerAffect doesn't have the good label";

  testedBioReader1 = getDebugBioReader1();
  testedBioReader2 = getDebugBioReader2();
  testedBioReader3 = getDebugBioReader3();
  expectedIndexes1 = getDebugIndexes1();
  expectedIndexes2 = getDebugIndexes2();
  expectedIndexes3 = getDebugIndexes3();

  pair1 = buildACAutomatonToFilterBioReader(testedBioReader1, "####");
  pair2 = buildACAutomatonToFilterBioReader(testedBioReader2, "####");
  pair3 = buildACAutomatonToFilterBioReader(testedBioReader3, "####");

  /* test indexes size */
    TAP_TEST_EQUAL(pair1->first->size(), expectedIndexes1.size(),
      TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_SIZE_ERROR);
    TAP_TEST_EQUAL(pair2->first->size(), expectedIndexes2.size(),
      TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_SIZE_ERROR);
    TAP_TEST_EQUAL(pair3->first->size(), expectedIndexes3.size(),
      TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_SIZE_ERROR);

  /* test indexes content */
  for(unsigned int i = 0; i < pair1->first->size(); ++i){
    TAP_TEST_EQUAL(pair1->first->at(i), expectedIndexes1[i],
    TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
    TEST_CONTENT_ERROR);
  }
  for(unsigned int i = 0; i < pair2->first->size(); ++i){
    TAP_TEST_EQUAL(pair2->first->at(i), expectedIndexes2[i],
    TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
    TEST_CONTENT_ERROR);
  }
  for(unsigned int i = 0; i < pair3->first->size(); ++i){
    TAP_TEST_EQUAL(pair3->first->at(i), expectedIndexes3[i],
    TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
    TEST_CONTENT_ERROR);
  }

  /* test automaton KmerAffect label */
  for(unsigned int i = 0;i < expectedIndexes1.size() - 1; ++i){
    for(int j = expectedIndexes1[i]; j < expectedIndexes1[i + 1]; ++j){
      seq = testedBioReader1.sequence(j);
      k = pair1->second->get(seq);
      asciiChar = k.getLabel().at(0);
      asciiNum = int(asciiChar);
      TAP_TEST_EQUAL(asciiNum, i + 1, TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_LABEL_ERROR);
    }
  }
  for(unsigned int i = 0;i < expectedIndexes2.size() - 1; ++i){
    for(int j = expectedIndexes2[i]; j < expectedIndexes2[i + 1]; ++j){
      seq = testedBioReader2.sequence(j);
      k = pair2->second->get(seq);
      asciiChar = k.getLabel().at(0);
      asciiNum = int(asciiChar);
      TAP_TEST_EQUAL(asciiNum, i + 1, TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_LABEL_ERROR);
    }
  }
  for(unsigned int i = 0;i < expectedIndexes3.size() - 1; ++i){
    for(int j = expectedIndexes3[i]; j < expectedIndexes3[i + 1]; ++j){
      seq = testedBioReader3.sequence(j);
      k = pair3->second->get(seq);
      asciiChar = k.getLabel().at(0);
      asciiNum = int(asciiChar);
      TAP_TEST_EQUAL(asciiNum, i + 1, TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_LABEL_ERROR);
    }
  }
  delete pair1->first; delete pair1->second; delete pair1;
  delete pair2->first; delete pair2->second; delete pair2;
  delete pair3->first; delete pair3->second; delete pair3;
}

void testFilterBioReaderWithACAutomaton(){
  pair<vector<int>*, AbstractACAutomaton<KmerAffect>*> *pair1, *pair2, *pair3;
  KmerAffect tmpKmer;
  seqtype sequence1, sequence2, sequence3;
  BioReader testedBioReader1, testedBioReader2, testedBioReader3;
  BioReader filteredBioReader1, filteredBioReader2, filteredBioReader3;

  const string SIZE_ERROR =
      "The BioReader size must be less or equal than the original's size";

  const string GENES_ERROR =
      "The BioReader doesn't contain the correct genes";

  const string MIN_ERROR =
      "The BioReader contains less sequences than the constant BIOREADER_MIN";

  sequence1 = "AAAAATTCCAATCCAATTTTTT";
  sequence2 = "AGCTGCAGCTGCGGGGAGCTGCAAAA";
  sequence3 = "AAATTTTTAAATTCCATGTGCAAATAAAAAGCTGT";
  testedBioReader1 = getDebugBioReader1();
  testedBioReader2 = getDebugBioReader2();
  testedBioReader3 = getDebugBioReader3();
  pair1 = buildACAutomatonToFilterBioReader(testedBioReader1, "####");
  pair2 = buildACAutomatonToFilterBioReader(testedBioReader2, "####");
  pair3 = buildACAutomatonToFilterBioReader(testedBioReader3, "####");


  filteredBioReader1 = filterBioReaderWithACAutomaton
                      (pair1, testedBioReader1, sequence1);
  filteredBioReader2 = filterBioReaderWithACAutomaton
                      (pair2, testedBioReader2, sequence2);
  filteredBioReader3 = filterBioReaderWithACAutomaton
                      (pair3, testedBioReader3, sequence3);

  //check filteredBioReader size
  TAP_TEST(filteredBioReader1.size() <= testedBioReader1.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);
  TAP_TEST(filteredBioReader2.size() <= testedBioReader2.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);
  TAP_TEST(filteredBioReader3.size() <= testedBioReader3.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);

  //check filtered BioReaders content
  vector<int>* v1 = pair1->first;
  map<KmerAffect, int> m1 = pair1->second->getMultiResults(sequence1);
  list<Sequence> l1 = filteredBioReader1.getAll();
  for(auto const m : m1){
    KmerAffect tmpKmer = m.first;
    if(tmpKmer.isNull() || tmpKmer.isUnknown() || tmpKmer.isAmbiguous()){
      continue;
    }
    unsigned int asciiNumber = int(tmpKmer.getLabel().at(0));
    for(int i = v1->at(asciiNumber-1); i < v1->at(asciiNumber); ++i){
      TAP_TEST(find(l1.begin(), l1.end(), testedBioReader1.read(i)) != l1.end(),
              TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENES_ERROR);
    }
  }
  vector<int>* v2 = pair2->first;
  map<KmerAffect, int> m2 = pair2->second->getMultiResults(sequence2);
  list<Sequence> l2 = filteredBioReader2.getAll();
  for(auto const m : m2){
    KmerAffect tmpKmer = m.first;
    if(tmpKmer.isNull() || tmpKmer.isUnknown() || tmpKmer.isAmbiguous()){
      continue;
    }
    unsigned int asciiNumber = int(tmpKmer.getLabel().at(0));
    for(int i = v2->at(asciiNumber-1); i < v2->at(asciiNumber); ++i){
      TAP_TEST(find(l2.begin(), l2.end(), testedBioReader2.read(i)) != l2.end(),
              TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENES_ERROR);
    }
  }
  vector<int>* v3 = pair3->first;
  map<KmerAffect, int> m3 = pair3->second->getMultiResults(sequence3);
  list<Sequence> l3 = filteredBioReader3.getAll();
  for(auto const m : m3){
    KmerAffect tmpKmer = m.first;
    if(tmpKmer.isNull() || tmpKmer.isUnknown() || tmpKmer.isAmbiguous()){
      continue;
    }
    unsigned int asciiNumber = int(tmpKmer.getLabel().at(0));
    for(int i = v3->at(asciiNumber-1); i < v3->at(asciiNumber); ++i){
      TAP_TEST(find(l3.begin(), l3.end(), testedBioReader3.read(i)) != l3.end(),
              TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENES_ERROR);
    }
  }

  delete pair1->first, delete pair1->second; delete pair1;
  delete pair2->first; delete pair2->second; delete pair2;
  delete pair3->first; delete pair3->second; delete pair3;
}

void testGetNSignicativeKmers(){
  BioReader filtered;
  BioReader seqV("../../germline/homo-sapiens/IGHV.fa", 2);
  BioReader seqD("../../germline/homo-sapiens/IGHD.fa", 2);
  BioReader seqJ("../../germline/homo-sapiens/IGHJ.fa", 2);

  OnlineFasta data("data/Stanford_S22.fasta", 1, " ");
  data.next();
  data.next();

  Germline germline("IGH", 'G', seqV, seqD, seqJ, "########");
  germline.new_index(KMER_INDEX);
  germline.finish();

  string SIZE_ERROR = "Filtered size must be less than original one";
  string GENE_NOT_FOUND = "Filtering sequence not found after filter";

  for(int i = 0; i < germline.rep_5.size(); ++i){
    Sequence seq = germline.rep_5.read(i);
    filtered = filterBioReaderWithACAutomaton(germline.pair_automaton, germline.rep_5, seq.sequence, 1);
    int j = 0;
    while(j < filtered.size()){
      if(extractGeneName(filtered.label(j)) == extractGeneName(seq.label)){
        break;
      }
      ++j;
    }
    TAP_TEST(j < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENE_NOT_FOUND);
    TAP_TEST(filtered.size() < germline.rep_5.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);
  }
}
/*
  sequences[0] = {"seq1-full_name", "seq-01*01", "AGCTGC","", NULL, 0};
  sequences[1] = {"seq1-full_name", "seq-01*02", "AGCTGA", "", NULL, 0};
  sequences[2] = {"seq1-full_name", "seq-01*03", "AGCTGT", "", NULL, 0};
  sequences[3] = {"seq2_full_name", "seq-02*01", "TCAA", "", NULL, 0};
  sequences[4] = {"seq2_full_name", "seq-02*02", "TCCA", "", NULL, 0};
  sequences[5] = {"seq3_full_name", "seq-03*01", "GGGG", "", NULL, 0};
  sequences[6] = {"seq4_full_name", "seq-04*01", "CCAATG", "", NULL, 0};
  sequences[7] = {"seq4_full_name", "seq-04*02", "CCAATT", "", NULL, 0};
  sequences[8] = {"seq4_full_name", "seq-04*03", "CCAATA", "", NULL, 0};
  sequences[9] = {"seq4_full_name", "seq-04*04", "CCAATC", "", NULL, 0};
  sequences[10] = {"seq5_full_name", "seq-05*01", "TTTT", "", NULL, 0};
  sequences[11] = {"seq6_full_name", "seq-06*01", "AAAT", "", NULL, 0};
*/
void testExAequoKmersWhenSignificantParameter(){
  BioReader testedBioReader, filtered;
  seqtype seq;
  pair<vector<int>*, AbstractACAutomaton<KmerAffect>*>* p;
  string BIOREADER_EXAEQUO = "BioReader doesn't have ex-aequo";
  Sequence sequences[13];
  sequences[0] = {"seq1-full_name", "seq-01*01", "AGCTAGCTA","", NULL, 0};
  sequences[1] = {"seq1-full_name", "seq-01*02", "AGCTAGCTT", "", NULL, 0};
  sequences[2] = {"seq1-full_name", "seq-01*03", "AGCTAGCTC", "", NULL, 0};
  sequences[3] = {"seq2_full_name", "seq-02*01", "TCAATCAA", "", NULL, 0};
  sequences[4] = {"seq2_full_name", "seq-02*02", "TCCATCAA", "", NULL, 0};
  sequences[5] = {"seq3_full_name", "seq-03*01", "GGGGGGGG", "", NULL, 0};
  sequences[6] = {"seq4_full_name", "seq-04*01", "CCAATGCC", "", NULL, 0};
  sequences[7] = {"seq4_full_name", "seq-04*02", "CCAATTCC", "", NULL, 0};
  sequences[8] = {"seq4_full_name", "seq-04*03", "CCAATACC", "", NULL, 0};
  sequences[9] = {"seq4_full_name", "seq-04*04", "CCAATCCC", "", NULL, 0};
  sequences[10] = {"seq5_full_name", "seq-05*01", "TTTTTTTT", "", NULL, 0};
  sequences[11] = {"seq6_full_name", "seq-06*01", "AAATAAAT", "", NULL, 0};
  sequences[12] = {"seq7_full_name", "seq-07*01", "CCCCCCCC", "", NULL, 0};
  for(int i = 0;i < 13; ++i){
    testedBioReader.add(sequences[i]);
  }
  /* K-mers belonging to 3 and 6 appears 29 both */
  seq = "AAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAAT";
  seq += "GGGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTGGGGGGGGGGGGGGGGGGGGTTTTTTTTTTTTTTTT";
  p = buildACAutomatonToFilterBioReader(testedBioReader, "####");
  filtered = filterBioReaderWithACAutomaton(p, testedBioReader, seq, 2);
  int i = 0;
  while(i < filtered.size() && extractGeneName(filtered.label(i)) != extractGeneName(testedBioReader.label(5))){
    ++i;
  }
  int j = 0;
  while(j < filtered.size() && extractGeneName(filtered.label(j)) != extractGeneName(testedBioReader.label(10))){
    ++j;
  }
  TAP_TEST(i < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  TAP_TEST(j < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  seq += "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
  p = buildACAutomatonToFilterBioReader(testedBioReader, "####");
  filtered = filterBioReaderWithACAutomaton(p, testedBioReader, seq, 2);
  int k = 0;
  while(k < filtered.size() && extractGeneName(filtered.label(k)) != extractGeneName(testedBioReader.label(12))){
    ++k;
  }
  TAP_TEST(k < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, "BioReader doesn't have ex-aequo");
}

void testBehaviourWhenHugeBioReader(){
  BioReader hugeBioReader;
  hugeBioReader.add("../../germline/homo-sapiens/IGHV.fa");
  hugeBioReader.add("../../germline/homo-sapiens/IGLV.fa");
  pair<vector<int>*,AbstractACAutomaton<KmerAffect>*>* p;
  p = buildACAutomatonToFilterBioReader(hugeBioReader, "#########");
  TAP_TEST(!p, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON,
    "Automaton should not be constructed on a BioReader containing more than 127 sequences.");
}

void testFilter(){
  testAutomatonBuilderFilteringBioReader();
  testFilterBioReaderWithACAutomaton();
  testBehaviourWhenHugeBioReader();
  testGetNSignicativeKmers();
  testExAequoKmersWhenSignificantParameter();
}
