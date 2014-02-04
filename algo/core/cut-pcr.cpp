#include <algorithm>
#include "cut-pcr.h"

#define MIN_CUT 20 

void cut(Sequence read, vector<Sequence> primers, int verbose, 
	 map <string, int> &stats,
	 const Cost cutCost, const int cutRelativeThreshold)
// ostream &cut_file)
{
  string seq = read.sequence ;
      
  if (seq.size() < MIN_CUT)
      return;

  
  if (verbose)
    {
      cout << endl ;
      cout << seq << endl ;
    }

  vector<int> hits;

  // For each primer
  for (unsigned p = 0 ; p<primers.size() ; p++)
    {
      Sequence pri = primers[p] ;
      string primer = pri.sequence;
 
      bool positive = true ;
      
      // Les amorces '-' sont deja en revcomp
      // if (pri.label_full[0] == '-') // dans le fichier
      //    positive = not positive ;

      if (pri.label[0] == '-') // detection sens ou antisens
	positive = not positive ;

      int shift_pos = positive ? primer.size() : 0 ;
      int threshold = (primer.size() * cutCost.match) + cutRelativeThreshold ;

      if (verbose)
	{
	  cout << "==" << " " << pri.label << " " << pri.label_full << " ";
	  cout << "  shift: " << shift_pos ;
	  cout << "  size:" << primer.size() ;
	  cout << "  threshold:" << threshold ;
	  cout << "  \t" << primer << " \t" ;
	}
          

      DynProg dp = DynProg(primer, seq, DynProg::SemiGlobal, cutCost);

      // Run dynprog
      int score = dp.compute();

      if (verbose)      
	cout << "\t best score: " <<  score << " @" << dp.best_j << "  ";

      // Collect hits
      vector<int> my_hits;
      dp.SemiGlobal_hits_threshold(my_hits, threshold, shift_pos, verbose);

      if (verbose)  
	cout << endl;

      for (/* */; !my_hits.empty(); my_hits.pop_back())
	{
	  stats[primer]++ ;

	  int pos = my_hits.back() ;
	  hits.push_back(pos);
	  
	  if (verbose)
	    {
	      int z = pos - primer.size() + shift_pos ;
	      if (z > 0)
		cout << string(z, ' ') ;
	      cout << primer ;
	      cout <<  "\t  @" << pos << " " << shift_pos <<  " " <<  primers[p].label  << " " << primers[p].label_full  << endl ;
	    }
	}
    }

  
  // Process hits
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
	    cout << "! " << endl ;    
	  nb_cut++ ;

	  Sequence cut ;
	  cut.label = read.label + "--" + string_of_int(nb_cut) + "  " + string_of_int(pos) + " " + string_of_int(old_pos) ;
	  cut.sequence =  seq.substr(pos, old_pos-pos) ;
	  // cut_file << cut ;
	  cout << cut ;
	}
      
      old_pos = pos ;
    }

  if (verbose)
    cout << "\n ==> " << nb_cut << " cuts" << endl ;
}



