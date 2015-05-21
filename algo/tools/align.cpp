
#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include <stdlib.h>   
#include <core/dynprog.h>
#include <core/fasta.h>
#include "docopt.h"

using namespace std;



// très sensible aux espaces, tabulations...

static const char VERSION[] = "align beta" ;

static const char USAGE[] =
R"(Align sequences using core/dynprog.cpp
The two sequences can be taken in either one or two fasta files.

    Usage:       
      align [options] <file>         
      align [options] <file> <file>  

    Options:
      -h --help     Show help
      --version     Show version
      -i <i>        Sequence number in file1 [default: 0]
      -j <j>        Sequence number in file2 [default: 0]
      -m <mode>     Mode [default: 0]
                0       loop on all modes
                1       Local 
                2       LocalEndWithSomeDeletions 
                3       SemiGlobalTrans 
                4       SemiGlobal
                5       GlobalButMostlyLocal
                6       Global
      -c <cost>     Cost [default: 2]
                1       DNA
                2       VDJ
                9       VDJaffine
                5       IdentityDirty
                6       Hammong
                7       Levenshtein
                8       Cluster
      -x --matrix    Display matrix
)";


// Should be moved in core/dynprog

DynProg::DynProgMode getdpMode(int mode)
{
  DynProg::DynProgMode dpMode = DynProg::Local;
  if (mode == 1) dpMode = DynProg::Local;
  if (mode == 2) dpMode = DynProg::LocalEndWithSomeDeletions;
  if (mode == 3) dpMode = DynProg::SemiGlobalTrans;
  if (mode == 4) dpMode = DynProg::SemiGlobal;
  if (mode == 5) dpMode = DynProg::GlobalButMostlyLocal;
  if (mode == 6) dpMode = DynProg::Global;
  return dpMode ;
}

Cost getCost(int cost)
{
  Cost dpCost = VDJ;

  if (cost == 1) dpCost = DNA;
  if (cost == 2) dpCost = VDJ;
  if (cost == 9) dpCost = VDJaffine;
  if (cost == 5) dpCost = IdentityDirty;
  if (cost == 6) dpCost = Hamming;
  if (cost == 7) dpCost = Levenshtein;
  if (cost == 8) dpCost = Cluster;

  return dpCost ;
}  


int main(int argc, const char** argv)
{
  // Options parsing
  std::map<std::string, docopt::value> args
    = docopt::docopt(USAGE, { argv + 1, argv + argc }, true, VERSION); 

  for(auto const& arg : args) 
    cout << arg.first << ":" <<arg.second << endl;
  cout << endl ;
  
  // Files
  vector<string> files = args["<file>"].asStringList();
  
  const char* file1 = files.front().c_str();
  const char* file2 = files.back().c_str();
  
  Fasta fasta1(file1, 1, " ");
  Fasta fasta2(file2, 1, " ");
  
  // Sequences
  int i = atoi(args["-i"].asString().c_str());
  int j = atoi(args["-j"].asString().c_str());

  if (i >= fasta1.size())
    {
      cerr << "ERROR : no sequence #" << i << " in " << file1 << endl ;
      exit(1);
    }
  
  if (j >= fasta2.size())
    {
      cerr << "ERROR : no sequence #" << j << " in " << file2 << endl ;
      exit(1);
    }

  string seq1 = fasta1.sequence(i);
  string seq2 = fasta2.sequence(j);

  cout << ">" << fasta1.label(i) << "\t" << file1 << " " << i << endl << seq1 << endl;
  cout << ">" << fasta2.label(i) << "\t" << file2 << " " << j << endl << seq2 << endl;
  cout << endl;

  
  // Cost
  Cost dpCost = getCost( atoi(args["-c"].asString().c_str()));
  cout << "Cost: " << dpCost << endl;
  cout << endl;

  
  // Mode
  int m = atoi(args["-m"].asString().c_str());

  for (int mm=1; mm<=6; mm++)
    {      
      int this_m = m > 0 ? m : mm ;
      cout << "===== -m " << this_m << " : " << mode_description[this_m] << endl ;
      DynProg::DynProgMode dpMode = getdpMode(this_m);
    DynProg dp = DynProg(seq1, seq2, dpMode, dpCost);

    dp.compute(); 
    dp.backtrack();

    if (args["--matrix"].asBool())
      cout << dp;
    
    cout << dp.str_back << endl;

    if (m)
      break ;      
  }
}
