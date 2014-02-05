#include <cstdlib>
#include <iostream>
#include <string>
#include "core/fasta.h"
#include "core/kmerstore.h"

using namespace std;

const string usage = "Output k-mer signals of a set of DNA sequences\n\
Usage:	kmer [options] fasta_file\n\
		kmer --help\n\
\n\
Options :\n\
-k <unsigned int>	: length of the k-mer (default 12)\n\
-r                      : Consider reverse complement\n\
";

int main(int argc, char* argv[]){
  int k = 12;
  bool rc = false;
	
  for(int i = 1 ; i < argc ; i++){
    string option(argv[i]);
    if(option == "--help"){
      cout << usage << endl;
      return 0;
    }else if(option == "-k")
      k = atol(argv[i+1]);
    else if (option == "-r")
      rc = true;
  }
	
  Fasta input(argv[argc-1]);

  IKmerStore<Kmer>  *index = KmerStoreFactory::createIndex<Kmer>(k, rc);
  index->insert(input);

  // Gives the number of occurrences in each read for each k-mer
  for (int i = 0; i < input.size(); i++) {
    vector<Kmer> counts = index->getResults(input.sequence(i));
    cout << input.label(i) << "\t";
    for (unsigned int j = 0; j < counts.size(); j++) {
      cout << counts[j];
    }
    cout << endl;
  }
		
  delete index;
  return 0;
}
