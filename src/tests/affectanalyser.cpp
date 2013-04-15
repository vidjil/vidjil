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
  Fasta seqV("data/Repertoire/TRGV.fa");
  Fasta seqJ("data/Repertoire/TRGJ.fa");
  string input_file = "data/leukemia.fa";
  list<Sequence> sequences;

  if (argc > 1) {
    if (string(argv[1]) == "-h") {
      cerr << "Usage: " << argv[0] << " [file]" << endl;
      exit(1);
    }
    input_file = argv[1];
  }

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
