
#include <fstream>
#include <iostream>
#include <algorithm>
#include <string>
#include <cstdlib>
#include "core/dynprog.h"
#include "core/fasta.h"

using namespace std;


int main(int argc, char* argv[])
{
  int MIN_CUT = 20 ;
  int MAX_MISMATCHES = 4 ; // See definition of 'threshold' below
  int verbose = 1 ;

  const char* fdata_default = "./data/to-cut.fa" ;
  const char* fdata = argc>1 ? argv[1] : fdata_default ;

  const char* fprimers_default = "./data/primers.fa" ;
  const char* fprimers = argc>2 ? argv[2] : fprimers_default ;

  Fasta f(fdata, 1, " ");
  Fasta base_primers(fprimers, 1, " ");

  const char* fcut = "./cuts.fa" ;
  cout << "  ==> " << fcut << endl ;
  ofstream cut_file(fcut, ios::out);


  // For each primer, add revcomp
  vector<Sequence> primers;
  for (int p = 0 ; p<base_primers.size() ; p++)
    {
      Sequence primer;      
      primer.sequence = base_primers.sequence(p);
      primer.label = "+" ;
      primer.label_full = base_primers.label(p);
      primers.push_back(primer);

      Sequence primer_revcomp;      
      primer_revcomp.sequence = revcomp(primer.sequence);
      primer_revcomp.label = "-" ;
      primer_revcomp.label_full = primer.label_full;
      primers.push_back(primer_revcomp);
    }


  vector<int> hits;

  const Cost cutCost = VDJ ; 

  // For each sequence
  for (int s = 0 ; s<f.size() ; s++)
    {
      string seq = f.sequence(s);;

      // Progress bar
      if (s && !(s % 1000))
	{	  
	  cout << "." ;
	  cout.flush();
	  
	  if (!(s % 10000))
	    cout << " " << s << endl ;
	}

      if (verbose)
	{
	  cout << "======= " << f.label(s) << " ";
	  cout << seq << " " << seq.size() << endl ;
	}
      
      if (seq.size() < MIN_CUT)
	continue ;

      // For each primer
      for (unsigned p = 0 ; p<primers.size() ; p++)
	{
	  string primer = primers[p].sequence;
	  int shift_pos = primers[p].label[0] == '-' ? primer.size() : 0 ;
	  int threshold = (primer.size() - MAX_MISMATCHES) * cutCost.match ; // XXXXXXXXXX

	  if (verbose)
	    {
	      cout << "==" << " " << primers[p].label << " " << primers[p].label_full << " ";
	      cout << "  shift: " << shift_pos ;
	      cout << "  size:" << primer.size() ;
	      cout << "  threshold:" << threshold ;
	      cout << "  \t" << primer << " \t" ;
	    }
	  
	  DynProg dp = DynProg(primer, seq, DynProg::SemiGlobal, cutCost);
 
	  int score = dp.compute();

	  if (verbose)	    
	    cout << "\t best score: " <<  score << " @" << dp.best_j << "  ";

	  dp.SemiGlobal_hits_threshold(hits, threshold, shift_pos, verbose);

	  // cout << dp ;

	  if (verbose)
	    cout << endl;
	}

      // 
      hits.push_back(0);
      sort(hits.begin(), hits.end());
      
      if (verbose)
	cout << " --> " ;
      
      int old_pos = seq.size();

      int nb_cut = 0;


      for (/* */; !hits.empty(); hits.pop_back())
	{
	  int pos = hits.back();
	  if (verbose)
	    cout << pos << " " ;

	  if (old_pos - pos > MIN_CUT)
	    {
	      // Output cut pos..old_pos

	      // TODO: reflechir sur +/- 1 de chaque cote :-)
	      if (verbose)
		cout << "! " ;	  
	      nb_cut++ ;
	      Sequence cut ;
	      cut.label = f.label(s) + "--" + string_of_int(nb_cut) + "  " + string_of_int(pos) + " " + string_of_int(old_pos) ;
	      cut.sequence =  seq.substr(pos, old_pos-pos) ;
	      cut_file << cut ;
	    }

	  old_pos = pos ;
	}

      if (verbose)
	cout << "\n ==> " << nb_cut << " cuts" << endl ;
    }

}
