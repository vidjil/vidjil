#include "kmersignals.h"

KmerSignals::KmerSignals(int k, const Fasta& input, IKmerStore<Kmer>& store){
	for(int r = 0 ; r < input.size() ; r++){
                vector<Kmer> l = store.getResults(input.sequence(r));
		vector<int> s(l.size());
		for(size_t i = 0 ; i < l.size() ; i++)
                  s[i] = l[i].count;
	}
}

int KmerSignals::size() const{ return (int)sig.size(); }
int KmerSignals::size(int r) const{ return (int)sig[r].size(); }
int KmerSignals::operator()(int r, int i){
	return sig[r][i];
}
