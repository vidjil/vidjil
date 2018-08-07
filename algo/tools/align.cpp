
#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include <stdlib.h>   
#include <core/dynprog.h>
#include <core/bioreader.hpp>
#include "CLI11.hpp"

using namespace std;


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


int main(int argc, char** argv)
{
  CLI::App app{"Align sequences using core/dynprog.cpp.\n The two sequences can be taken in either one or two fasta files."};

  // Sequence selection
  int i = 0;
  int j = 0;
  app.add_option("-i", i, "Sequence number in file1", true)
    ->group("Sequence selection");

  app.add_option("-j", j, "Sequence number in file2", true)
    ->group("Sequence selection");

  bool rev_i = false;
  bool rev_j = false;
  app.add_flag("--rev-i", rev_i, "Reverse sequence(s) in file1")
    ->group("Sequence selection");
  app.add_flag("--rev-j", rev_j, "Reverse sequence(s) in file2")
    ->group("Sequence selection");
  
  // Files
  string file1 = "" ;
  string file2 = "" ;
  app.add_option("file1", file1, "file1 (.fa)")
    ->check(CLI::ExistingFile)
    ->required();
  app.add_option("file2", file2, "file2 (.fa) [when not given, take file1 twice]")
    ->check(CLI::ExistingFile);

  // Mode
  int m = 0;
  app.add_option("-m,--mode", m, R"(Mode
    0       loop on all modes
    1       Local
    2       LocalEndWithSomeDeletions
    3       SemiGlobalTrans
    4       SemiGlobal
    5       GlobalButMostlyLocal
    6       Global)", true);

  // Cost
  int cost = 0;
  app.add_option("-c,--cost", cost, R"(Cost
    1       DNA
    2       VDJ
    9       VDJaffine
    5       IdentityDirty
    6       Hammong
    7       Levenshtein
    8       Cluster)", true);

  // Matrix
  bool matrix = false;
  app.add_flag("-x,--matrix", matrix, "Display matrix");
  
  // Options parsing
  CLI11_PARSE(app, argc, argv);

  if (!file2.size())
    file2 = file1;

  // ----------------------------------------------------------
  
  // Read files
  BioReader fasta1(file1, 1, " ");
  BioReader fasta2(file2, 1, " ");
  
  // Sequences
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
  cout << ">" << fasta2.label(j) << "\t" << file2 << " " << j << endl << seq2 << endl;
  cout << endl;

  
  // Cost
  Cost dpCost = getCost(cost);
  dpCost.debug = true ;
  cout << "Cost: " << dpCost << endl;
  cout << endl;

  
  // Mode
  for (int mm=1; mm<=6; mm++)
    {      
      int this_m = m > 0 ? m : mm ;
      cout << "===== -m " << this_m << " : " << mode_description[this_m] << endl ;
      DynProg::DynProgMode dpMode = getdpMode(this_m);
      DynProg dp = DynProg(seq1, seq2, dpMode, dpCost, rev_i, rev_j);

    dp.compute(); 
    dp.backtrack();

    if (matrix)
      cout << dp;
    
    cout << dp.str_back << endl;

    if (m)
      break ;      
  }
}
