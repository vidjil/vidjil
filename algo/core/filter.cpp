#include "filter.h"

FilterWithACAutomaton::FilterWithACAutomaton(BioReader &origin, string seed) : originalBioReader(origin){
  this->filtered_sequences_nb = 0;
  this->filtered_sequences_calls = 0;
  buildACAutomatonToFilterBioReader(seed);
}

FilterWithACAutomaton::~FilterWithACAutomaton(){
    if(automaton){
      delete automaton;
    }
    if(indexes){
      delete indexes;
    }
}

void FilterWithACAutomaton::buildACAutomatonToFilterBioReader(string seed){
  char asciiChar;
  int asciiNumber;
  string currentLabel;
  string previousLabel;

  if(originalBioReader.size() < 1){
    automaton = nullptr;
    indexes = nullptr;
    return;
  }
  automaton = new PointerACAutomaton<KmerAffect>(seed, false, true);
  indexes = new vector<int>();
  asciiNumber = SPECIFIC_KMERS_NUMBER;
  automaton->insert(originalBioReader.sequence(0),std::string("") + char(asciiNumber), true, 0, seed);
  indexes->push_back(0);
  previousLabel = extractGeneName(originalBioReader.label(0));
  for(int i = 1;i < originalBioReader.size(); ++i){
    currentLabel = extractGeneName(originalBioReader.label(i));
    if(currentLabel != previousLabel){
      indexes->push_back(i);
      asciiNumber++;
    }
    if(asciiNumber > 127){
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
BioReader FilterWithACAutomaton::filterBioReaderWithACAutomaton(
    seqtype &seq, int kmer_threshold){

  BioReader result;
  map<KmerAffect, int> mapAho;
  this->filtered_sequences_calls += 1;
  if(!automaton || !indexes || kmer_threshold < 0){
    this->filtered_sequences_nb += originalBioReader.size();
    return originalBioReader;
  }
  mapAho = automaton->getMultiResults(seq);

  //All k-mers selected : iterate over all map
  if(kmer_threshold == ALL_KMERS_VALUE || kmer_threshold > (int)mapAho.size()){
    for(auto const mx: mapAho){
      if(mx.first.isGeneric()){
        transferBioReaderSequences(originalBioReader, result, mx.first);
      }
    }
  /* The most significant k-mers selected : iterate over a portion of the
    sorted map */
  }else{
    /* sort map */
    typedef function<bool(pair<KmerAffect, int>, pair<KmerAffect, int>)> Comparator;
    Comparator compFunctor = [](pair<KmerAffect, int> elem1 ,pair<KmerAffect, int> elem2){
      return (elem1.second == elem2.second) ? elem1.first > elem2.first : elem1.second > elem2.second;
    };
    // Use a set to use the comparator and sort function
    set<pair<KmerAffect, int>, Comparator> setOfWords(mapAho.begin(), mapAho.end(), compFunctor);
    // Iterate over the pair and not the map
    int nbKmers = 0, previousOccurences = 0;
    for(pair<KmerAffect, int> element : setOfWords){
      // Add corresponding sequences to the BioReader
        if(!element.first.isGeneric()){
          continue;
        }
        if(nbKmers == kmer_threshold && previousOccurences == element.second){
          //Keep the same amount of genes
        }else if(nbKmers < kmer_threshold){
          nbKmers++;
        }else{
          break;
        }
        transferBioReaderSequences(originalBioReader, result, element.first);
        previousOccurences = element.second;
    }
  }
  this->filtered_sequences_nb += (result.size () == 0) ? originalBioReader.size() : result.size();
  return (result.size() == 0) ? originalBioReader : result;
}

void FilterWithACAutomaton::transferBioReaderSequences(const BioReader &src, BioReader &dst, KmerAffect k) const{
  char asciiChar = k.getLabel().at(0);
  unsigned int asciiNum = int(asciiChar);

  if(asciiNum > indexes->size() || !k.isGeneric()){
    throw invalid_argument("Incorrect K-mer transmitted.");
  }
  for(int i = indexes->at(asciiNum - SPECIFIC_KMERS_NUMBER); i < indexes->at(asciiNum - SPECIFIC_KMERS_NUMBER + 1); ++i){
    dst.add(src.read(i));
  }
}

vector<int>* FilterWithACAutomaton::getIndexes() const{
  return this->indexes;
}

AbstractACAutomaton<KmerAffect>* FilterWithACAutomaton::getAutomaton() const{
  return this->automaton;
}

ostream &operator<<(ostream &out, const FilterWithACAutomaton& obj){
  int origin_bioreader_size = obj.originalBioReader.size();
  int total_sequences_filtered = obj.filtered_sequences_nb;
  int total_filtered_calls = obj.filtered_sequences_calls;
  int total_sequences_origin = total_filtered_calls * origin_bioreader_size;
  float aligned_rate = ((float)total_sequences_filtered/(float)total_sequences_origin) * 100;
  out << "aligned\t" << total_sequences_filtered;
  out << "/" << total_sequences_origin << " (" << aligned_rate << "%)";
  out << endl;
  return out;
}
