
#include <fstream>
#include <iostream>
#include <string>
#include <set>
#include <cstdlib>
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"
// #include "core/output.h"

using namespace std;

#define DEFAULT_K 14

void usage() {
  cerr << "[options] <reads.fa>" << endl << endl;
  cerr << "The program just uses kmers to determine which V and J are in place."
       << endl
       << "It must be told, that the results are not really satisfying with this method" << endl << endl;
  cerr << "Options: " << endl
       << "\t-V <file>" << endl
       << "\t\tV repertoire multi-fasta file" << endl
       << "\t-J <file>" << endl
       << "\t\tJ repertoire multi-fasta file" << endl
       << "\t-k <size>" << endl
       << "\t\tk-mer size used for the V/J affectation (default: " << DEFAULT_K << ")" << endl
       << "\t-r" << endl
       << "\t\tconsider revcomp of k-mers" << endl;
    exit(EXIT_FAILURE);
}

void print_unique(vector<KmerStringAffect> &v) {
  if (v.size() > 0) {
    set<KmerStringAffect> s(v.begin(), v.end());
    for(set<KmerStringAffect>::iterator it = s.begin(); it != s.end(); it++) {
      if (it->strand != 0)
        cout << *it << " ";
    }
  }
  cout << endl;
}

int main(int argc, char* argv[])
{
  const char* frep_V = "../../../seq/Repertoire/TRGV.fa" ; 
  const char* frep_J = "../../../seq/Repertoire/TRGJ.fa" ; 

  const char* fdata_default = "tests/data/leukemia.fa" ; 
  
  int k = DEFAULT_K;
  bool rc = false ;
  int c;

  while ((c = getopt(argc, argv, "hV:J:k:r")) != EOF)
    switch (c)
      {
      case 'h':
        cerr << "Usage: " << argv[0]<< " " ;
        usage();
      case 'V':
        frep_V = optarg;
        break;
      case 'J': 
        frep_J = optarg;
        break;
      case 'k':
        k = atoi(optarg);
        break;
      case 'r':
        rc = true;
        break;
      }
    
  const char* fdata = argc>optind ? argv[optind] : fdata_default ;


  Fasta rep_V(frep_V, 2, "|");
  Fasta rep_J(frep_J, 2, "|");

  IKmerStore<KmerStringAffect> *indexV = new MapKmerStore<KmerStringAffect>(k, rc);
  IKmerStore<KmerStringAffect> *indexJ = new MapKmerStore<KmerStringAffect>(k, rc);
  for (int i = 0; i < rep_V.size(); i++) {
    indexV->insert(rep_V.sequence(i), rep_V.label(i));
  }
  for (int i = 0; i < rep_J.size(); i++) {
    indexJ->insert(rep_J.sequence(i), rep_J.label(i));
  }

  OnlineFasta data(fdata, 1, " ");
  while (data.hasNext()) {
    Sequence seq;
    data.next();
    seq = data.getSequence();
    cout << ">" << seq.label << endl ;

    if (seq.sequence.length() > (size_t)k) {
      vector<KmerStringAffect> v = indexV->getResults(seq.sequence, rc);
      print_unique(v);
      vector<KmerStringAffect> j = indexJ->getResults(seq.sequence, rc);
      print_unique(j);
    }
      
  }
  delete indexV ;
  delete indexJ ;
}
