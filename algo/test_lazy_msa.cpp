
#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/lazy_msa.h"



using namespace std;


int main(int argc, char* argv[])
{
  //initilisation par defaut
  const char* fdata_default = "../data/msa_test.fa" ; 
  DynProg::DynProgMode dpMode = DynProg::Global;
  Cost dpCost = VDJ;
  
  const char* fdata = fdata_default;
  
  //initialisation
  if ( argc > 1 && argv[1][0] != '-'){
    fdata = argv[1];
  }
  
  Fasta f(fdata, 1, " ");
  string seq0 = f.sequence(0);
  
    LazyMsa lm = LazyMsa(50, seq0);
  
  for (int i=1; i < f.size(); i++){
    string seq1 = f.sequence(i);
    
    lm.add(seq1);

  string *result;
  result =new string[2];
  
  cout <<"align 0/"<<i<<endl;
  lm.alignOne(result, i-1);
  cout<<result[0]<<endl;
  cout<<result[1]<<endl<<endl;
  }
  
  string *result;
  result =new string[lm.sizeUsed+2];
  lm.align(result);
  
  cout <<"lazy_msa"<<endl;
  for (int i=0; i<lm.sizeUsed+2; i++){
    cout<<result[i]<<endl;
  }
  
}
