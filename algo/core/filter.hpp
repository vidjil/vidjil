#ifndef FILTER_H
#define FILTER_H
#include <iostream>
#include "bioreader.hpp"
#include "automaton.hpp"
#include "math.hpp"

template <typename S>
class FilterWithACAutomaton {

  private:
    vector<int>* indexes;
    AbstractACAutomaton<S, KmerAffect>* automaton;

  public:
    BioReader &originalBioReader;

    /* The number of times filterBioReaderWithACAutomaton is called. */
    int filtered_sequences_calls;

    /* The size of the BioReader returned after filtering.*/

    int filtered_sequences_nb;
    FilterWithACAutomaton(BioReader &origin, string seed);

    ~FilterWithACAutomaton();

    /**
    This function will filter a BioReader
    @param idxAho:  A pointer to a pair containing an int vector pointer and
                    an AbstractACAutomaton pointer parametrized by KmerAffect.
                    The int vector represents indexes of a BioReader and the
                    automaton is build with single char labels put in KmerAffect.
                    To know more about them, read doc of
                    buildACAutomatonToFilterBioReader function.

    @param origin : The BioReader object we want to filter.
    @param seq :    The sequence that will be aligned against the genes.
    @param kmer_threshold : The threshold to K-mers used during the filtering.
                    Since it's an optional arguments, if not specified it will
                    filter on every K-mers returned by getMultiResults. Otherwise
                    it will filter on the "kmer_threshold" number of K-mers. For
                    Example if kmer_threshold = 10, it will filter on the 10 most
                    significant K-mers returned by getMultiResults.
    @param pvalue: The pvalue to be used for determining the minimal number of kmers.
                   This pvalu must actually be given as an integer (90, for .9, 999 for .999…)
    */
  BioReader filterBioReaderWithACAutomaton(
      seqtype &seq, int kmer_threshold = NO_LIMIT_VALUE, int pvalue=999);
  /*
    This function takes a BioReader as a parameter and returns
    a couple containing an int vector pointer and an automaton
    object pointer specifying the automaton used..
    For now the automaton used is Aho-Corasick but to prevent future
    errors the returned type is an AbstractACAutomaton. The index
    vector contains the indexes of the genes families.
    For example if the BioReader has the following genes:
    IGHV-01*01  (index 0) (New Family !)
    IGHV-02*01  (index 1) (New Family !)
    IGHV-02*02  (index 2)
    IGHV-03*01  (index 3) (New Family !)
    IGHV-03*02  (index 4)
    IGHV-03*03  (index 5)
    IGHV-03*04  (index 6)
    IGHV-04*04  (index 7) (New Family !)
    IGHV-05*01  (index 8) (New Family !)
    IGHV-05*02  (index 9)
    The following vector<int> is returned :
    [0, 1, 3, 7, 8, 9]
    Note :  The first case always contains the number '0' and the last one
            contains the number of genes in the BioReader (minus 1).
    Regarding the automaton, it is built using KmerAffect. We take these
    Kmer because they can handle informations on a character. We set a
    different character to a Kmer for each group of genes.
    For example we will build the automaton using the KmerAffect like this:
    KmerAffect_0's label = 'a'  (New Family !)
    KmerAffect_1's label = 'b'  (New Family !)
    KmerAffect_2's label = 'b'
    KmerAffect_3's label = 'c'  (New Family !)
    KmerAffect_4's label = 'c'
    KmerAffect_5's label = 'c'
    KmerAffect_6's label = 'c'
    KmerAffect_7's label = 'd'  (New Family !)
    KmerAffect_8's label = 'e'  (New Family !)
    There is no KmerAffect_9's because as said previously, the last number
    in the vector<index> represent the total number of genes, and not a
    family itself.
    In the previous example KmerAffectX's label start from 'a' (n°97 in ascii
    chart), but in reality to store more informations, the label start from
    the ascii character NUL (n°0 in ascii chart) and increase for each new
    family of genes met.
    Note :  There is no ascii character for '_', '?' and '*' since they
    respectively represent an "AFFECT_UNKNOWN_SYMBOL", an "AFFECT_AMBIGUOUS_SYMPBOL"
    and an "AFFECT_NOT_UNKNOWN_SYMBOL".
    The param "seed" is used while inserting sequences in the automaton. By default
    the seed has a size of 10.
  */
  void buildACAutomatonToFilterBioReader(string seed);

  /**
  * Return the vector of indexes used while building the automaton.
  */
  vector<int>* getIndexes() const;

  /**
  * Return the automaton stored.
  */
  AbstractACAutomaton<S, KmerAffect>* getAutomaton() const;


  /**
  * Transfer sequences from a BioReader to another.
  * @param src The BioReader from where the transfer will operate.
  * @param dst The BioReader that will receive the new sequences.
  * @param k The K-mer that indicate which sequences will be transfered.
  * The label stored in the K-mer is used to select sequences. For more informations
  * about how the label is used, see buildACAutomatonToFilterBioReader's doc.
  */
  void transferBioReaderSequences(const BioReader &src, BioReader &dst, const KmerAffect k) const;

  template<typename Shortcut>
  friend ostream &operator<<(ostream&, const FilterWithACAutomaton<Shortcut>&);

 private:
  /**
   * Get the size of the longest sequence among the sequences that were just
   * transferred to the BioReader reader.
   */
  int getSizeLongestTransferredSequence(const BioReader &reader, KmerAffect k) const;
};

template <typename S>
FilterWithACAutomaton<S>::FilterWithACAutomaton(BioReader &origin, string seed) : originalBioReader(origin){
  this->filtered_sequences_nb = 0;
  this->filtered_sequences_calls = 0;
  buildACAutomatonToFilterBioReader(seed);
}

template <typename S>
FilterWithACAutomaton<S>::~FilterWithACAutomaton(){
    if(automaton){
      delete automaton;
    }
    if(indexes){
      delete indexes;
    }
}

template <typename S>
void FilterWithACAutomaton<S>::buildACAutomatonToFilterBioReader(string seed){
  char asciiChar;
  int asciiNumber;
  string currentLabel;
  string previousLabel;

  if(originalBioReader.size() < 1){
    automaton = nullptr;
    indexes = nullptr;
    return;
  }
  automaton = new PointerACAutomaton<S, KmerAffect>(seed, false, true);
  indexes = new vector<int>();
  asciiNumber = SPECIFIC_KMERS_NUMBER;
  automaton->insert(originalBioReader.sequence(0),std::string("") + char(asciiNumber), true, 0, seed);
  indexes->push_back(0);
  previousLabel = extractGeneName(originalBioReader.label(0));
  for(int i = 1;i < originalBioReader.size(); ++i){
    currentLabel = extractGeneName(originalBioReader.label(i));
    if(currentLabel != previousLabel){
      PRINT_VAR(currentLabel);
      indexes->push_back(i);
      asciiNumber++;
    }
    if(asciiNumber > 127){
      cerr << WARNING_STRING << "Pre-filtering disabled" << endl;
      delete automaton; delete indexes;
      automaton = nullptr;
      indexes = nullptr;
      return;
    }
    asciiChar = char(asciiNumber);
    automaton->insert(originalBioReader.sequence(i),std::string("") + asciiChar, true, 0, seed);
    previousLabel = currentLabel;
  }
  indexes->push_back(originalBioReader.size());
  automaton->build_failure_functions();
}

/*
  Takes a built automaton and a vector of indexes and build a BioReader
  based on it.
*/
template <typename S>
BioReader FilterWithACAutomaton<S>::filterBioReaderWithACAutomaton(
    seqtype &seq, int kmer_threshold, int pvalue){

  BioReader result;
  map<KmerAffect, int> mapAho;
  this->filtered_sequences_calls += 1;
  if(!automaton || !indexes || kmer_threshold < 0){
    this->filtered_sequences_nb += originalBioReader.size();
    return originalBioReader;
  }
  mapAho = automaton->getMultiResults(seq);

  #ifdef DEBUG_FILTER /* Display the number of k-mers found for each genes. */
  int currentAsciiNumber;
  for(auto const mx: mapAho){
    string previousLabel = "", currentLabel;
    currentAsciiNumber = SPECIFIC_KMERS_NUMBER;
    previousLabel = extractGeneName(originalBioReader.label(0));
    for(int i = 1;i < originalBioReader.size(); ++i){
      currentLabel = extractGeneName(originalBioReader.label(i));
      if(currentLabel != previousLabel){
        currentAsciiNumber++;
      }
      if(currentAsciiNumber == int(mx.first.getLabel().at(0))){
        cout << mx.second << " kmers found for " << originalBioReader.label(i) << endl;
      }
      previousLabel = currentLabel;
    }
  }
  #endif  

  //All k-mers selected : iterate over all map
  if(kmer_threshold == ALL_KMERS_VALUE || kmer_threshold > (int)mapAho.size()){
    for(auto const &mx: mapAho){
      if(mx.first.isGeneric()){
        transferBioReaderSequences(originalBioReader, result, mx.first);
      }
    }
  /* The most significant k-mers selected : iterate over a portion of the
    sorted map */
  }else{
    /* sort map */
    using Comparator = bool (*) (pair<KmerAffect, int>, pair<KmerAffect, int>);
    Comparator compFunctor = [](pair<KmerAffect, int> elem1 ,pair<KmerAffect, int> elem2){
      return (elem1.second == elem2.second) ? elem1.first > elem2.first : elem1.second > elem2.second;
    };
    // Use a set to use the comparator and sort function
    set<pair<KmerAffect, int>, Comparator> setOfWords(mapAho.begin(), mapAho.end(), compFunctor);
    // Iterate over the pair and not the map
    int nbKmers = 0;
    int nb_kmers_limit = -1;    // Limit number of kmers, defined when the last gene of interest is reached
    
    for(pair<KmerAffect, int> element : setOfWords){
      // Add corresponding sequences to the BioReader
        if(!element.first.isGeneric()){
          continue;
        }
        if(nbKmers == kmer_threshold && nb_kmers_limit <= element.second){
          // We have reached our limit of number of genes recovered but we
          // continue taking sequences are they have a similar number of
          // matching k-mers.
        }else if(nbKmers < kmer_threshold){
          nbKmers++;
        }else{
          break;
        }
        transferBioReaderSequences(originalBioReader, result, element.first);
        if (nbKmers == kmer_threshold && nb_kmers_limit == -1) {
          int maxlen = getSizeLongestTransferredSequence(result, element.first);
          nb_kmers_limit = compute_nb_kmers_limit(element.first.getLength(), element.second, maxlen, pvalue);
          if (nb_kmers_limit == 0) {
            this->filtered_sequences_nb += originalBioReader.size();
            return originalBioReader;
          }
        }
    }
  }
  this->filtered_sequences_nb += (result.size () == 0) ? originalBioReader.size() : result.size();
  return (result.size() == 0) ? originalBioReader : result;
}

template <typename S>
void FilterWithACAutomaton<S>::transferBioReaderSequences(const BioReader &src, BioReader &dst, KmerAffect k) const{
  char asciiChar = k.getLabel().at(0);
  unsigned int asciiNum = int(asciiChar);

  if(asciiNum > indexes->size() || !k.isGeneric()){
    throw invalid_argument("Incorrect K-mer transmitted.");
  }
  for(int i = indexes->at(asciiNum - SPECIFIC_KMERS_NUMBER); i < indexes->at(asciiNum - SPECIFIC_KMERS_NUMBER + 1); ++i){
    dst.add(src.read(i));
  }
}

template <typename S>
int FilterWithACAutomaton<S>::getSizeLongestTransferredSequence(const BioReader &reader, KmerAffect k) const{
  char asciiChar = k.getLabel().at(0);
  unsigned int asciiNum = int(asciiChar);

  if(asciiNum > indexes->size() || !k.isGeneric()){
    throw invalid_argument("Incorrect K-mer transmitted.");
  }

  size_t longest = 0;
  for(int i = 0; i < indexes->at(asciiNum - SPECIFIC_KMERS_NUMBER + 1) - indexes->at(asciiNum - SPECIFIC_KMERS_NUMBER); ++i){
    if (longest < reader.sequence(reader.size() - i - 1).length())
      longest = reader.sequence(reader.size() - i - 1).length();
  }
  return longest;
}

template <typename S>
vector<int>* FilterWithACAutomaton<S>::getIndexes() const{
  return this->indexes;
}

template <typename S>
AbstractACAutomaton<S, KmerAffect>* FilterWithACAutomaton<S>::getAutomaton() const{
  return this->automaton;
}

template <typename S>
ostream &operator<<(ostream &out, const FilterWithACAutomaton<S>& obj){
  int origin_bioreader_size = obj.originalBioReader.size();
  int total_sequences_filtered = obj.filtered_sequences_nb;
  int total_filtered_calls = obj.filtered_sequences_calls;
  int total_sequences_origin = total_filtered_calls * origin_bioreader_size;
  float aligned_rate = ((float)total_sequences_filtered/(float)total_sequences_origin) * 100;

  out << fixed << setw(8) << total_sequences_filtered << "/"
      << fixed << setw(8) << total_sequences_origin << "    "
      << fixed << setprecision(1) << setw(6) << aligned_rate << "%"
      << endl ;

  return out ;
}

#endif
