#include "core/automaton.h"
#include "core/filter.h"
#include "core/germline.h"
#include "core/tools.h"
#include <algorithm>

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
  vector<int> *v1, *v2, *v3;
  AbstractACAutomaton<KmerAffect> *a1, *a2, *a3;
  KmerAffect tmpKmer;
  seqtype tmpSeq;
  BioReader testedBioReader1;
  BioReader testedBioReader2;
  BioReader testedBioReader3;
  vector<int> expectedIndexes1;
  vector<int> expectedIndexes2;
  vector<int> expectedIndexes3;
  FilterWithACAutomaton *f1, *f2, *f3;
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

  f1 = new FilterWithACAutomaton(testedBioReader1,"####");
  f2 = new FilterWithACAutomaton(testedBioReader2,"####");
  f3 = new FilterWithACAutomaton(testedBioReader3,"####");

  v1 = f1->getIndexes();
  v2 = f2->getIndexes();
  v3 = f3->getIndexes();
  a1 = f1->getAutomaton();
  a2 = f2->getAutomaton();
  a3 = f3->getAutomaton();

  /* test indexes size */
    TAP_TEST_EQUAL(v1->size(), expectedIndexes1.size(),
      TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_SIZE_ERROR);
    TAP_TEST_EQUAL(v2->size(), expectedIndexes2.size(),
      TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_SIZE_ERROR);
    TAP_TEST_EQUAL(v3->size(), expectedIndexes3.size(),
      TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_SIZE_ERROR);

  /* test indexes content */
  for(unsigned int i = 0; i < v1->size(); ++i){
    TAP_TEST_EQUAL(v1->at(i), expectedIndexes1[i],
    TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
    TEST_CONTENT_ERROR);
  }
  for(unsigned int i = 0; i < v2->size(); ++i){
    TAP_TEST_EQUAL(v2->at(i), expectedIndexes2[i],
    TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
    TEST_CONTENT_ERROR);
  }
  for(unsigned int i = 0; i < v3->size(); ++i){
    TAP_TEST_EQUAL(v3->at(i), expectedIndexes3[i],
    TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
    TEST_CONTENT_ERROR);
  }

  /* test automaton KmerAffect label */
  for(unsigned int i = 0, l = SPECIFIC_KMERS_NUMBER;i < expectedIndexes1.size() - 1; ++i, ++l){
    for(int j = expectedIndexes1[i]; j < expectedIndexes1[i + 1]; ++j){
      seq = testedBioReader1.sequence(j);
      k = a1->get(seq);
      asciiChar = k.getLabel().at(0);
      asciiNum = int(asciiChar);
      TAP_TEST_EQUAL(asciiNum, l, TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_LABEL_ERROR);
    }
  }
  for(unsigned int i = 0, l = SPECIFIC_KMERS_NUMBER;i < expectedIndexes2.size() - 1; ++i, ++l){
    for(int j = expectedIndexes2[i]; j < expectedIndexes2[i + 1]; ++j){
      seq = testedBioReader2.sequence(j);
      k = a2->get(seq);
      asciiChar = k.getLabel().at(0);
      asciiNum = int(asciiChar);
      TAP_TEST_EQUAL(asciiNum, l, TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_LABEL_ERROR);
    }
  }
  for(unsigned int i = 0, l = SPECIFIC_KMERS_NUMBER; i < expectedIndexes3.size() - 1; ++i, ++l){
    for(int j = expectedIndexes3[i]; j < expectedIndexes3[i + 1]; ++j){
      seq = testedBioReader3.sequence(j);
      k = a3->get(seq);
      asciiChar = k.getLabel().at(0);
      asciiNum = int(asciiChar);
      TAP_TEST_EQUAL(asciiNum, l, TEST_AUTOMATON_BUILDER_TO_FILTER_BIOREADER,
      TEST_LABEL_ERROR);
    }
  }
  delete f1; delete f2; delete f3;
}

void testFilterBioReaderWithACAutomaton(){
  vector<int> *v1, *v2, *v3;
  AbstractACAutomaton<KmerAffect> *a1, *a2, *a3;
  KmerAffect tmpKmer;
  seqtype sequence1, sequence2, sequence3;
  BioReader testedBioReader1, testedBioReader2, testedBioReader3;
  BioReader filteredBioReader1, filteredBioReader2, filteredBioReader3;
  FilterWithACAutomaton *f1, *f2, *f3;

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
  f1 = new FilterWithACAutomaton(testedBioReader1, "####");
  f2 = new FilterWithACAutomaton(testedBioReader2, "####");
  f3 = new FilterWithACAutomaton(testedBioReader3, "####");
  v1 = f1->getIndexes();
  v2 = f2->getIndexes();
  v3 = f3->getIndexes();
  a1 = f1->getAutomaton();
  a2 = f2->getAutomaton();
  a3 = f3->getAutomaton();

  filteredBioReader1 = f1->filterBioReaderWithACAutomaton(sequence1);
  filteredBioReader2 = f2->filterBioReaderWithACAutomaton(sequence2);
  filteredBioReader3 = f3->filterBioReaderWithACAutomaton(sequence3);

  //check filteredBioReader size
  TAP_TEST(filteredBioReader1.size() <= testedBioReader1.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);
  TAP_TEST(filteredBioReader2.size() <= testedBioReader2.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);
  TAP_TEST(filteredBioReader3.size() <= testedBioReader3.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);

  //check filtered BioReaders content
  map<KmerAffect, int> m1 = a1->getMultiResults(sequence1);
  list<Sequence> l1 = filteredBioReader1.getAll();
  for(auto const m : m1){
    KmerAffect tmpKmer = m.first;
    if(!tmpKmer.isGeneric()){
      continue;
    }
    unsigned int asciiNumber = int(tmpKmer.getLabel().at(0));
    for(int i = v1->at(asciiNumber-SPECIFIC_KMERS_NUMBER); i < v1->at(asciiNumber-SPECIFIC_KMERS_NUMBER + 1); ++i){
      TAP_TEST(find(l1.begin(), l1.end(), testedBioReader1.read(i)) != l1.end(),
              TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENES_ERROR);
    }
  }
  map<KmerAffect, int> m2 = a2->getMultiResults(sequence2);
  list<Sequence> l2 = filteredBioReader2.getAll();
  for(auto const m : m2){
    KmerAffect tmpKmer = m.first;
    if(!tmpKmer.isGeneric()){
      continue;
    }
    unsigned int asciiNumber = int(tmpKmer.getLabel().at(0));
    for(int i = v2->at(asciiNumber-SPECIFIC_KMERS_NUMBER); i < v2->at(asciiNumber-SPECIFIC_KMERS_NUMBER + 1); ++i){
      TAP_TEST(find(l2.begin(), l2.end(), testedBioReader2.read(i)) != l2.end(),
              TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENES_ERROR);
    }
  }
  map<KmerAffect, int> m3 = a3->getMultiResults(sequence3);
  list<Sequence> l3 = filteredBioReader3.getAll();
  for(auto const m : m3){
    KmerAffect tmpKmer = m.first;
    if(!tmpKmer.isGeneric()){
      continue;
    }
    unsigned int asciiNumber = int(tmpKmer.getLabel().at(0));
    for(int i = v3->at(asciiNumber-SPECIFIC_KMERS_NUMBER); i < v3->at(asciiNumber-SPECIFIC_KMERS_NUMBER + 1); ++i){
      TAP_TEST(find(l3.begin(), l3.end(), testedBioReader3.read(i)) != l3.end(),
              TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENES_ERROR);
    }
  }
  delete f1; delete f2; delete f3;
}

void testGetNSignicativeKmers(){
  BioReader filtered;
  BioReader seqV("../../germline/homo-sapiens/IGHV.fa", 2);

  string SIZE_ERROR = "Filtered size must be less than original one";
  string GENE_NOT_FOUND = "Filtering sequence not found after filter";

  for(int i = 0; i < seqV.size(); ++i){
    Sequence seq = seqV.read(i);
    FilterWithACAutomaton *f = new FilterWithACAutomaton(seqV, "########");
    filtered = f->filterBioReaderWithACAutomaton(seq.sequence, 1);
    delete f;
    int j = 0;
    while(j < filtered.size()){
      if(extractGeneName(filtered.label(j)) == extractGeneName(seq.label)){
        break;
      }
      ++j;
    }
    TAP_TEST(j < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, GENE_NOT_FOUND);
    TAP_TEST(filtered.size() < seqV.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_ERROR);
  }
}

/*
Check if the filter method use the ex-aequo K-mers if a significant
parameter is provided.
For example if the parameter is N = 5 and the method get the following
K-mers occurences: 10, 10, 5, 5, 4, 3, 2 we want to filter using the K-mers with
the occurences 10, 10, 5, 5 and 4.
However if the K-mers occurences are 10, 10, 5, 5, 4, 4, 2 we want to filter using
the K-mers with occurences 10, 10, 5, 5, 4, and 4 (The last one is ex-aequo so
we take both).
*/
void testExAequoKmersWhenSignificantParameter(){
  BioReader testedBioReader, filtered;
  FilterWithACAutomaton *f;
  seqtype seq;
  string BIOREADER_EXAEQUO = "BioReader doesn't have ex-aequo";
  string SIZE_BIOREADER = "BioReader doesn't contain the good amount of sequences";
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
  seq = "AAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAATAAAT";
  seq += "GGGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTGGGGGGGGGGGGGGGGGGGGTTTTTTTTTTTTTTTT";
  f = new FilterWithACAutomaton(testedBioReader, "####");
  /* Filter using the 2 most significant K-mers, the first one is belonging to
     sequence n°11 (with more than 60 occurences) and second one is sequence n°5
     and n°10 appearing 29 times both. */
  filtered = f->filterBioReaderWithACAutomaton(seq, 2);
  /* Check that filtered BioReader contains sequence n°5 and sequence n°10 which are ex-aequo. */
  int i = 0;
  while(i < filtered.size() && extractGeneName(filtered.label(i)) != extractGeneName(testedBioReader.label(5))){
    ++i;
  }
  int j = 0;
  while(j < filtered.size() && extractGeneName(filtered.label(j)) != extractGeneName(testedBioReader.label(10))){
    ++j;
  }
  /* Check that filtered BioReader contains sequence n°11 which is the most present in the sequence. */
  int k = 0;
  while(k < filtered.size() && extractGeneName(filtered.label(k)) != extractGeneName(testedBioReader.label(11))){
    ++k;
  }

  /* Even though the filtered function got 2 as a parameter, since there are two ex-aequo the size is 3 */
  TAP_TEST_EQUAL(filtered.size(), 3, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_BIOREADER);
  TAP_TEST(i < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  TAP_TEST(j < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  TAP_TEST(k < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  /* Add a third ex-aequo: k-mer belonging to sequence n°12 appearing 29 times */
  seq += "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
  delete f;
  f = new FilterWithACAutomaton(testedBioReader, "####");
  filtered = f->filterBioReaderWithACAutomaton(seq, 2);
  k = 0;
  while(k < filtered.size() && extractGeneName(filtered.label(k)) != extractGeneName(testedBioReader.label(12))){
    ++k;
  }
  int l = 0;
  while(l < filtered.size() && extractGeneName(filtered.label(l)) != extractGeneName(testedBioReader.label(12))){
    ++l;
  }
  /* Even though the filtered function got 2 as a parameter, since there are three ex-aequo the size is 4 */
  TAP_TEST_EQUAL(filtered.size(), 4, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, SIZE_BIOREADER);
  TAP_TEST(i < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  TAP_TEST(j < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  TAP_TEST(k < filtered.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, BIOREADER_EXAEQUO);
  delete f;
}

void testBehaviourWhenHugeBioReader(){
  BioReader hugeBioReader;
  FilterWithACAutomaton *f;
  hugeBioReader.add("../../germline/homo-sapiens/IGHV.fa");
  hugeBioReader.add("../../germline/homo-sapiens/IGLV.fa");
  AbstractACAutomaton<KmerAffect>* automaton;
  f = new FilterWithACAutomaton(hugeBioReader, "#########");
  automaton = f->getAutomaton();
  TAP_TEST(!automaton, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON,
    "Automaton should not be constructed on a BioReader containing more than 127 sequences.");
  delete f;
}

/* Test the good behaviour of Filter's transferBioReaderSequences function. */
void testTransferBioReaderSequences(){
  affect_t affect;
  KmerAffect *kmer;
  BioReader res, testedBioReader1;
  FilterWithACAutomaton *f;
  bool caught = false;
  const string ERROR_NO_EXCEPTION_THROWN = "The function must throw an exception when invalid K-mer is transmitted.";
  const string ERROR_NON_EMPTY_BIOREADER = "The BioReader shouldn't contain any sequences.";
  const string ERROR_INCORRECT_BIOREADER = "The BioReader doesn't have the correct number of sequences.";
  testedBioReader1 = getDebugBioReader1();
  f = new FilterWithACAutomaton(testedBioReader1, "####");
  affect.length = 1;

  /* When k-mer's label has a n°ascii over 127, the transfer should not operate. */
  affect.c = char(128);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
  }catch(...){
    caught = true;
  }
  TAP_TEST(caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NO_EXCEPTION_THROWN);
  TAP_TEST_EQUAL(res.size(), 0, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  delete kmer;

  /* When k-mer's label has a n°ascii above the number of genes contained in the BioReader, the transfer should not operate. */
  affect.c = char(8);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NO_EXCEPTION_THROWN);
  TAP_TEST_EQUAL(res.size(), 0, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  delete kmer;

  /* When k-mer's label has the n°ascii 0, the transfer should not operate since it's an ambiguous k-mer. */
  affect.c = AFFECT_AMBIGUOUS_CHAR;
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  delete kmer;
  TAP_TEST(caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 0, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);

  /* When k-mer's label has a n°ascii 1, the transfer should not operate since it's an unknown k-mer. */
  affect.c = AFFECT_UNKNOWN_CHAR;
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 0, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  delete kmer;

  /* With an ascii n°2, the functions should take only the 3 first sequences. */
  affect.c = char(2);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(!caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 3, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_INCORRECT_BIOREADER);
  delete kmer;

  /* With an ascii n°3, the functions should contain the 3 previous sequences and 2 more. */
  affect.c = char(3);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(!caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 5, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_INCORRECT_BIOREADER);
  delete kmer;

  /* With an ascii n°4, the functions should contain the 5 previous sequences and 1 more. */
  affect.c = char(4);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(!caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 6, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_INCORRECT_BIOREADER);
  delete kmer;

  /* With an ascii n°5, the functions should contain the 6 previous sequences and 4 more. */
  affect.c = char(5);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(!caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 10, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_INCORRECT_BIOREADER);
  delete kmer;

  /* With an ascii n°6, the functions should contain the 10 previous sequences and 1 more. */
  affect.c = char(6);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(!caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), 11, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_INCORRECT_BIOREADER);
  delete kmer;

  /* With an ascii n°7, the functions should contain the 11 previous sequences and 2 more, wich is the same as the original BioReader. */
  affect.c = char(7);
  kmer = new KmerAffect(affect);
  try{
    f->transferBioReaderSequences(testedBioReader1, res, *kmer);
    caught = false;
  }catch(...){
    caught = true;
  }
  TAP_TEST(!caught, TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_NON_EMPTY_BIOREADER);
  TAP_TEST_EQUAL(res.size(), testedBioReader1.size(), TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, ERROR_INCORRECT_BIOREADER);
  delete kmer;
  delete f;
}

/* If the sequence used in Filter class doesn't match any of the sequences 
stored in the original BioReader, we expect to get the original BioReader. */
void testOriginalBioReaderIsReturned(){
  BioReader testedBioReader1, result;
  FilterWithACAutomaton *f;
  seqtype seq[3]; 
  testedBioReader1 = getDebugBioReader1();
  f = new FilterWithACAutomaton(testedBioReader1, "####");
  seq[0] = "CCCCCCCCCCCCCCCCCCC"; 
  seq[1] = "AGGGAGGGAGGGAGGGAGGGT"; 
  seq[2] = "GCGCGCGCGCGCGCGCGCGCGC";
  for(int i = 0; i < 3; ++i){
    result = f->filterBioReaderWithACAutomaton(seq[i]);
    TAP_TEST_EQUAL(result.size(), testedBioReader1.size(),
    TEST_FILTER_BIOREADER_WITH_AC_AUTOMATON, "Returned BioReader should be the orignal one.");
  }
  delete f;
}

void testFilter(){
  testAutomatonBuilderFilteringBioReader();
  testFilterBioReaderWithACAutomaton();
  testBehaviourWhenHugeBioReader();
  testGetNSignicativeKmers();
  testExAequoKmersWhenSignificantParameter();
  testTransferBioReaderSequences();
  testOriginalBioReaderIsReturned();
}
