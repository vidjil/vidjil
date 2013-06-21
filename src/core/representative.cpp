#include "representative.h"
#include "kmerstore.h"
#include "read_score.h"
#include "read_chooser.h"

#include <iostream>
using namespace std;

RepresentativeComputer::RepresentativeComputer(list<Sequence> &r)
  :sequences(r),is_computed(false),representative() {
  cout << "***** RepresentativeComputer" << endl;
}

string RepresentativeComputer::getRepresentative() const{
  assert(hasRepresentative());
  return representative;
}

list<Sequence>& RepresentativeComputer::getSequenceList() const{
  return sequences;
}

bool RepresentativeComputer::hasRepresentative() const{
  return is_computed;
}


KmerRepresentativeComputer::KmerRepresentativeComputer(list<Sequence> &r,
                                                       int k)
  :RepresentativeComputer(r),k(k){}
  
void KmerRepresentativeComputer::compute(size_t min_cover, float percent_cover) {
  is_computed = false;

  // First create an index on the set of reads
  IKmerStore<Kmer> *index = KmerStoreFactory::createIndex<Kmer>(getK());

  // Add sequences to the index
  for (list<Sequence>::iterator it=sequences.begin(); it != sequences.end(); ++it) {
    index->insert(it->sequence, it->label);
  }
  
  size_t max = sequences.size();
  // Create a read chooser to have the sequences sorted by length
  ReadLengthScore rlc;
  ReadChooser rc(sequences, rlc);
  list<Sequence> sorted = rc.getSorted();

  // Traverse the sequences to get the desired representative
  representative = "";
  size_t pos_longest_run = 0;
  size_t length_longest_run = 0;
  string sequence_longest_run;

  for (list<Sequence>::iterator it=sorted.begin(); it != sorted.end(); ++it) {
    vector<Kmer> counts = index->getResults(it->sequence);

    for (size_t i =0; i < counts.size(); i++) {
      size_t length_run = 0;
      // Search the longest "run" of consecutive k-mers that are sufficiently
      // expressed in the read.
      while (i < counts.size()
             && counts[i].count >= min_cover 
             && counts[i].count >= max*percent_cover) {
        length_run++;
        i++;
      }
      if (length_run > length_longest_run) {
        length_longest_run = length_run;
        pos_longest_run = i - length_run;
        sequence_longest_run = it->sequence;
      }
    }
  }

  if (length_longest_run) {
    is_computed = true;
    representative = sequence_longest_run.substr(pos_longest_run, length_longest_run);
  }
}
