#include "lazy_msa.h"
#include <cassert>
#include <list>
#include <cstdlib>
#include <string>

using namespace std;


string format_seq_align(string seq, unsigned int n, int *gaps)
{
  ostringstream stream;

  for (unsigned int i=0; i<n; i++){
    for (int j=0; j<gaps[i] ; j++){
      stream << "-";
      }
    stream << seq[i];
  }

  // gaps after the last position
  for (int j=0; j<gaps[n] ; j++){
    stream << "-";
  }

  return stream.str();
}



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
  for (int i = 0; i <= sizeUsed; i++) {
    delete [] gapRef[i];
    delete [] gapSeq[i];
    delete [] link[i];
  }

  delete [] gapRef;
  delete [] gapSeq;
  delete [] link;
  delete [] sequences;
}

void LazyMsa::add(string sequence){
  sizeUsed++;
  sequences[sizeUsed]=sequence;
  
  DynProg::DynProgMode dpMode = DynProg::GlobalButMostlyLocal ;
  Cost dpCost = VDJaffine;
  
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
  align[0] = format_seq_align(ref, ref.size(), gapRef[one]);
  align[1] = format_seq_align(sequences[one], sequences[one].size(), gapSeq[one]);
}

void LazyMsa::align(string *align){

  // Define and compute maxGap, the maximum number of insertions at each position of the reference sequence
  int *maxGap= new int [ref.size()+1];
  
  for (unsigned int i = 0; i< ref.size()+1; i++){
    maxGap[i]=0;
  }
  
  for (int i=0; i<sizeUsed+1; i++){
   for (unsigned int j=0; j<ref.size()+1; j++){
     if ( gapRef[i][j] > maxGap[j] ) maxGap[j]=gapRef[i][j];
   }
  }

  // Reference sequence
  align[0] = format_seq_align(ref, ref.size(), maxGap);

  // Other sequences
  for (int i=0; i<sizeUsed+1; i++){

    // Update gapSeq
    for (unsigned int j = 0; j< ref.size()+1; j++){
      gapSeq[i][link[i][j]]+=maxGap[j]-gapRef[i][j];
    }
    
    // Build output
    align[i+1] = format_seq_align(sequences[i], sequences[i].size(), gapSeq[i]);
  }

  delete [] maxGap;
}






