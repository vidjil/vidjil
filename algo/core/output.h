#ifndef OUTPUT_H
#define OUTPUT_H

#include "fasta.h"
#include "kmerstore.h"

template<class T>
class IOutput
{
public:
	virtual void print(const int k, Fasta& input, IKmerStore<T>& store)=0;
};

template<class T>
class FastaOutput
{
public:
	void print(const int k, Fasta& input, IKmerStore<T>& store);
};


template<class T>
void FastaOutput<T>::print(const int k, Fasta& input, IKmerStore<T>& store){
	for(int r = 0 ; r < (int)input.size() ; r++){
		cout << ">" << input.label(r) << endl << input.sequence(r) << endl;
                vector<T> results = store.getResults(input.sequence(r));
                for(size_t i = 0 ; i < results.size() ; i++){
                  cout << results[i];
                }
                cout << endl;
	}
}
#endif
