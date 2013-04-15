
#include <fstream>
#include <iostream>
#include <string>
#include <cstdlib>
#include "core/dynprog.h"
#include "core/fasta.h"


using namespace std;


int main(int argc, char* argv[])
{
  

  Fasta rep_V("../../../../seq/Repertoire/TRGV.fa", 2, "|", cout);

  
 for (int i = 0 ; i < rep_V.size() ; i++)
 { 
   cout << " V " << (i+1) <<"  " << rep_V.sequence(i) << endl <<endl ;
 }
  
  
  cout << "	|";
 for (int i = 0 ; i < rep_V.size() ; i++)
 { 
   cout << " V " << (i+1) << "	|" ;
 }
 cout << endl;
 for (int i = 0 ; i < rep_V.size() ; i++)
 {
   cout << " V " << (i+1) << "	| " ;
   for (int j = 0 ; j < i+1 ; j++)
    {
      string s1 = rep_V.sequence(i);
      string s2 = rep_V.sequence(j);
      
      DynProg dp = DynProg(s1, s2, DynProg::Local, VDJ);
      
      int sizemax = max(s1.length(), s2.length());
      int score = dp.compute();
      
      cout << (int)((score*20)/sizemax) << "	| ";
    }
    cout <<endl;
  }

}
