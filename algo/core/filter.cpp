#include "filter.h"

FilterWithACAutomaton::FilterWithACAutomaton(BioReader &origin, string seed){
  buildACAutomatonToFilterBioReader(origin, seed);
}
  (BioReader &origin, string seed){
  pair<vector<int>*, AbstractACAutomaton<KmerAffect>*>* result;
  vector<int>* indexes;
  PointerACAutomaton<KmerAffect>* aho;
  char asciiChar;
  int asciiNumber;
  string currentLabel;
  string previousLabel;

  if(origin.size() < 1){
    return nullptr;
  }
  result = new pair<vector<int>*,AbstractACAutomaton<KmerAffect>*>();
  aho = new PointerACAutomaton<KmerAffect>(seed, false, true);
  indexes = new vector<int>();
  aho->insert(origin.sequence(0),std::string("") + char(1), true, 0, seed);
  asciiNumber = 1;
  indexes->push_back(0);
  previousLabel = extractGeneName(origin.label(0));
  int i;
  for(i = 1;i < origin.size(); ++i){
    currentLabel = extractGeneName(origin.label(i));
    if(currentLabel != previousLabel){
      indexes->push_back(i);
      asciiNumber++;
    }
    if(asciiNumber > 127){
      delete result; delete aho; delete indexes;
      return nullptr;
    }
    asciiChar = char(asciiNumber);
    aho->insert(origin.sequence(i),std::string("") + asciiChar, true, 0, seed);
    previousLabel = currentLabel;
  }
  indexes->push_back(origin.size());
  aho->build_failure_functions();
  result->first = indexes;
  result->second = aho;
  return result;
}

/*
  Takes a built automaton and a vector of indexes and build a BioReader
  based on it.
*/
BioReader FilterWithACAutomaton::filterBioReaderWithACAutomaton(
    pair<vector<int>*, AbstractACAutomaton<KmerAffect>*>* idxAho,
    BioReader &origin, seqtype &seq,
    int kmer_threshold){

  BioReader result;
  AbstractACAutomaton<KmerAffect>* aho;
  vector<int>* indexes;
  map<KmerAffect, int> mapAho;
  KmerAffect tmpKmer;
  unsigned int asciiNum;
  char asciiChar;
  if(!idxAho || kmer_threshold < 0){
    return origin;
  }
  indexes =  idxAho->first;
  aho = idxAho->second;
  mapAho = aho->getMultiResults(seq);

  //All k-mers selected : iterate over all map
  if(kmer_threshold == ALL_KMERS_VALUE || kmer_threshold > (int)mapAho.size()){
    for(auto const mx: mapAho){
      tmpKmer = mx.first;
      asciiChar = tmpKmer.getLabel().at(0);
      asciiNum = int(asciiChar);
      if(asciiNum > indexes->size() - 1){
        break;
      }
      for(int i = indexes->at(asciiNum - 1); i < indexes->at(asciiNum); ++i){
        result.add(origin.read(i));
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
        if(nbKmers == kmer_threshold && previousOccurences == element.second){
          //Keep the same amount of genes
        }else if(nbKmers < kmer_threshold){
          nbKmers++;
        }else{
          break;
        }
        tmpKmer = element.first;
        asciiChar = tmpKmer.getLabel().at(0);
        asciiNum = int(asciiChar);
        if(asciiNum > indexes->size() - 1){
          break;
        }
        for(int i = indexes->at(asciiNum - 1); i < indexes->at(asciiNum); ++i){
          result.add(origin.read(i));
        }
        previousOccurences = element.second;
    }
  }
  return (result.size() == 0) ? origin : result;
}
