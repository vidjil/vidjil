#include <core/kmerstore.h>
#include <core/affectanalyser.h>
#include <core/fasta.h>
#include <core/read_chooser.h>
#include <core/read_score.h>
#include <iostream>
#include <fstream>
#include <cassert>
#include <string>
#include <cstdlib>
using namespace std;

int main(int argc, char **argv) {
  int k = 14;
  bool rc = true;
  list<Sequence> sequences;
  string input_file;

  if ((argc > 1 && string(argv[1]) == "-h") || argc <= 3) {
      cerr << "Usage: " << argv[0] << " repV repJ input_file" << endl;
      exit(1);
  }

  Fasta seqV(argv[1]);
  Fasta seqJ(argv[2]);
  input_file = argv[3];

  Fasta seq(input_file);

  IKmerStore<KmerAffect>  *index = new ArrayKmerStore<KmerAffect>(k, rc);
  index->insert(seqV, "V");
  index->insert(seqJ, "J");

  
  for (int i=0; i < seq.size(); i++) {
    AffectAnalyser<KmerAffect> *kaa = new KmerAffectAnalyser<KmerAffect>(*index, seq.sequence(i));
    sequences.push_back(seq.read(i));

    cout << seq.sequence(i) << endl;
    cout << kaa->toString() << endl;
    delete kaa;
  }

  VirtualReadScore *scorer = new KmerAffectReadScore(*index);
  ReadChooser chooser(sequences, *scorer);

  cout << "Best sequence is:" << endl << chooser.getBest() << endl;
  
  delete scorer;
  delete index;

  cout << "Everything is ok!" << endl;
}
