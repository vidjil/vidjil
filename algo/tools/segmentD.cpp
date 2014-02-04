
#include <fstream>
#include <iostream>
#include <string>
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"
#include <core/affectanalyser.h>
// #include "core/output.h"

using namespace std;

int main(int argc, char* argv[])
{
  const char* frep_V = "../../../../seq/Repertoire/IGHV.fa" ; 
  const char* frep_D = "../../../../seq/Repertoire/IGHD.fa" ; 
  const char* frep_J = "../../../../seq/Repertoire/IGHJ.fa" ; 

  const char* fdata_default = "../../../../seq/Stanford_S22_s.fasta" ; 
  const char* fdata = argc>1 ? argv[1] : fdata_default ;
  

  Fasta data(fdata, 1, " ");
  Fasta rep_V(frep_V, 2, "|");
  Fasta rep_D(frep_D, 2, "|");
  Fasta rep_J(frep_J, 2, "|");

  int w = 40 ;

  int ch=0;
  int tot=0;
  //for(int i = 0 ; i < data.size() ; i++)
  for(int i = 0 ; i < 10 ; i++)
    {
      cout << endl ;
      cout << endl ;
      cout << "=== " << data.label_full(i) << endl ;

      
        cout << endl << "--- FineSegmenter" << endl ;
      
	//segmentation VJ
        FineSegmenter s(data.read(i), rep_V, rep_J, 0, 40);
	
	s.FineSegmentD(rep_V, rep_D, rep_J);
	
	//cout << s.info << endl << endl ;

        if (s.isSegmented()){
	  cout << s.info << endl << endl ;
          cout << "    V    :" << s.seg_V << endl ;
	  cout << " XX D XX :" << s.seg_N1 << "   " << s.seg_D << "   " << s.seg_N2 <<endl ;
	  cout << "    J    :" << s.seg_J << endl ;
	  cout << "Junction :" << s.getJunction(w) << endl ;
	  
	  if (s.seg_N1[0]=='o'||s.seg_N2[0]=='o') ch++;
	  tot++;
	}
        else{
          cout <<  "fail" << s.info ;
	}
	
	
    }
}

