#ifndef KMERSIGNALS_H
#define KMERSIGNALS_H

#include <vector>
#include "fasta.h"
#include "kmerstore.h"

using namespace std;

class IKmerSignals
{
public:
	virtual int size() const;
	virtual int size(int r) const;
	virtual int operator()(int r, int i)=0;
};

class KmerSignals
{
	vector<vector<int> > sig;
public:
	KmerSignals(const int k, const Fasta& input, IKmerStore<Kmer>& store);

	int size() const;
	int size(int r) const;
	int operator()(int r, int i);
};

#endif
