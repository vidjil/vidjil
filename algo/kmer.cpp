#include <tr1/memory>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include "core/fasta.h"
#include "core/kmerstore.h"
#include "core/kmersignals.h"
#include "core/output.h"

using namespace std;

const string usage = "Output k-mer signals of a set of DNA sequences\n\
Usage:	kmer [options] < fasta_file\n\
		kmer --help\n\
\n\
Options :\n\
-k <unsigned int>	: length of the k-mer (default 12)\n\
-s <partial|full>	: statistical signals (mean and deviance)\n\
-d <unsigned int>	: derivative signals\n\
-vrep <v_repertoire>	: fasta file containing a V repertoire\n\
-drep <d_repertoire>	: fasta file containing a D repertoire\n\
-jrep <j_repertoire>	: fasta file containing a J repertoire\n\
-cut <N> <V>		: predict v/n and n/j cuts using a gaussian kernel centered in <N>, with variance <V>";

int main(int argc, char* argv[]){
	
	int k = 12;
	string stat = "no";
	int d;
	Fasta vrep;
	Fasta drep;
	Fasta jrep;
	bool cut = false;
	int n;
	int v;
	
	for(int i = 1 ; i < argc ; i++){
		string option(argv[i]);
		if(option == "--help"){
			cout << usage << endl;
			return 0;
		}else if(option == "-k")
			k = atol(argv[i+1]);
		else if(option == "-s")
			stat = string(argv[i+1]);
		else if(option == "-d")
			d = atol(argv[i+1]);
		else if(option == "-vrep"){
			ifstream ifs(argv[i+1]);
			if(ifs.fail())
				cerr << "Cannot open '" << argv[i+1] << "' v-repertoire\n";
			ifs >> vrep;
			ifs.close();
		}else if(option == "-drep"){
			ifstream ifs(argv[i+1]);
			if(ifs.fail())
				cerr << "Cannot open '" << argv[i+1] << "' d-repertoire\n";
			ifs >> drep;
			ifs.close();
		}else if(option == "-jrep"){
			ifstream ifs(argv[i+1]);
			if(ifs.fail())
				cerr << "Cannot open '" << argv[i+1] << "' j-repertoire\n";
			ifs >> jrep;
			ifs.close();
		}else if(option == "-cut"){
			cut = true;
			n = atol(argv[i+1]);
			v = atol(argv[i+2]);
		}
	}
	
	Fasta input;
	cin >> input;

	/**	Creation of the KmerStore
		Contains the occurrences of different Kmers
		First tries to create a fast (O(1) complexity) store using a large amount of memory.
		If it fails, it creates a slower (O(log(n)) complexity) but more memory efficient store.
	**/
	IKmerStore<Kmer> *store;
	try{
          double size = (1 << (k << 1)) * sizeof(Kmer);
		int i = 0;
		string sizes[] = {"bytes","Kb","Mb","Gb"};
		while(size >= 1024){
			size /= 1024;
			i++;
		}
		cerr << "Trying to create an Array Store of " << (1 << (k << 1)) << " elements (taking " << size << " " << sizes[i] << ")...";
		store = new ArrayKmerStore<Kmer>(k);
		cerr << "Succeed.\n";
	}catch(exception e){
		cerr << "Failed. Creating Map Store instead.\n";
		store = new MapKmerStore<Kmer>(k);
	}
	store->insert(vrep);
	
	// KmerSignals sig(k, input, *store);
	
	FastaOutput<Kmer> fo;
        fo.print(k, input, *store);
		
        delete store;
	return 0;
}
