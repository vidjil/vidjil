#include <core/fasta.h>
#include <iostream>
#include <cstdlib>
#include <stdexcept>
using namespace std;

int main(int argc, char **argv) {
  if (argc <= 1) {
    cerr << "Usage: " << argv[0] << " files+" << endl << endl
	 << "Count the number of sequences in valid files" << endl;
    exit(1);
  }
  unsigned long long int nb_sequences = 0;

  for (int i = 1; i < argc; i++) {
    try {
      unsigned long long int nb_sequences_current_file = 0;
      OnlineFasta fasta(argv[i]);
      while (fasta.hasNext()) {
	nb_sequences_current_file++;
	fasta.next();
      }
      nb_sequences += nb_sequences_current_file;
    } catch (invalid_argument e) {
      cerr << "\tError at sequence " << nb_sequences << ": " << e.what() << endl;
    }
  }

  cout << nb_sequences << endl;
  exit(0);
}
