#include "lazy_msa.h"
#include <cassert>
#include <list>
#include <cstdlib>
#include <string>

using namespace std;

LazyMsa::LazyMsa(int max, string reference)
{
  sizeMax=max;
  sizeUsed=-1;
  ref=reference;
  sequences = new string[sizeMax];
  
  gapRef= new int *[sizeMax];
  gapSeq= new int *[sizeMax];
  link= new int *[sizeMax];
  
}

LazyMsa::~LazyMsa()
{
}

void LazyMsa::add(string sequence){
  sizeUsed++;
  sequences[sizeUsed]=sequence;
  
  DynProg::DynProgMode dpMode = DynProg::GlobalButMostlyLocal ;
  Cost dpCost = VDJ;
  
  DynProg dp = DynProg(ref, sequence, dpMode, dpCost);
  dp.compute();

  // cout << "======================" << sizeUsed << endl ;
  // cout << dpCost << endl ;

  dp.backtrack();

  gapRef[sizeUsed]= new int[ref.size()+1];
  std::copy(dp.gap1, dp.gap1+(ref.size()+1), gapRef[sizeUsed]);
  
  gapSeq[sizeUsed]=new int[sequence.size()+1];
  std::copy(dp.gap2, dp.gap2+(sequence.size()+1), gapSeq[sizeUsed]);
  
  link[sizeUsed]= new int[ref.size()+1];
  std::copy(dp.linkgap, dp.linkgap+(ref.size()+1), link[sizeUsed]);
}

void LazyMsa::alignOne(string *align, int one){
  
  ostringstream stream;
    
    for (unsigned int i=0; i<ref.size(); i++){
      for (int j=0; j<gapRef[one][i] ; j++){
	stream <<"-";
      }
      stream<<ref[i];
    }
    for (int j=0; j<gapRef[one][ref.size()] ; j++){
	stream <<"-";
    }
    
  align[0]=stream.str();

  ostringstream stream2;
    
    for (unsigned int i=0; i<sequences[one].size(); i++){
      for (int j=0; j<gapSeq[one][i] ; j++){
	stream2 <<"-";
      }
      stream2<<sequences[one][i];
    }
    for (int j=0; j<gapSeq[one][sequences[one].size()] ; j++){
      stream2 <<"-";
    }
    
  align[1]=stream2.str();

}

void LazyMsa::align(string *align){
  
  int *maxGap= new int [ref.size()+1];
  
  for (unsigned int i = 0; i< ref.size()+1; i++){
    maxGap[i]=0;
  }
  
  for (int i=0; i<sizeUsed+1; i++){
   for (unsigned int j=0; j<ref.size()+1; j++){
     if ( gapRef[i][j] > maxGap[j] ) maxGap[j]=gapRef[i][j];
   }
  }
  
  ostringstream stream;
    
    for (unsigned int i=0; i<ref.size(); i++){
      for (int j=0; j<maxGap[i] ; j++){
	stream <<"-";
      }
      stream<<ref[i];
    }
    for (int j=0; j<maxGap[ref.size()] ; j++){
      stream <<"-";
    }
    
  align[0]=stream.str();
  
  for (int i=0; i<sizeUsed+1; i++){
    ostringstream stream2;
  
    for (unsigned int j = 0; j< ref.size()+1; j++){
      gapSeq[i][link[i][j]]+=maxGap[j]-gapRef[i][j];
    }
    
    for (unsigned int j=0; j<sequences[i].size(); j++){
      for (int k=0; k<gapSeq[i][j] ; k++){
	stream2 <<"-";
      }
      stream2<<sequences[i][j];
    }
    for (int k=0; k<gapSeq[i][sequences[i].size()] ; k++){
      stream2 <<"-";
    }

    align[i+1]=stream2.str();
  }
}






