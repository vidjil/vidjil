
#include <fstream>
#include <iostream>
#include <string>
#include <cstdlib>
#include "core/dynprog.h"
#include "core/fasta.h"

using namespace std;


int main(int argc, char* argv[])
{
  const char* fdata_default = "data/leukemia.fa" ; 
  
  const char* fdata = argc>1 ? argv[1] : fdata_default ;

  Fasta f(fdata, 1, " ");

  if (f.size() < 2)
    {
      cout << "Not enough sequences in " << fdata << endl ;
      exit(1);
    }
	   

  string seq0 = f.sequence(0);
  string seq1 = f.sequence(1);

  cout << f.label(0) << " ";
  cout << seq0 << " " << seq0.size() << endl ;

  cout << f.label(1) << " ";
  cout << seq1 << " " << seq1.size() << endl ;

  DynProg dp = DynProg(seq0, seq1, DynProg::Local, Identity);
 
  // cout << dp ;
  cout << dp.compute() << endl;
  cout << dp ;

  /*
  dp.mode = DynProg::SemiGlobal ;
  dp.init();
  cout << dp.compute() << endl;
  cout << dp ;

  dp.mode = DynProg::SemiGlobalTrans ;
  dp.init();
  cout << dp.compute() << endl;
  cout << dp ;

  dp.mode = DynProg::Global ;
  dp.init();
  cout << dp.compute() << endl;
  cout << dp ;
  */
}
