#include "msa.h"
#include <cstdlib>
#include <algorithm>

list<string> multiple_seq_align(string file)
{
  // Extremement non generique...

  list<string> out;

  string alig_file = file + ".aln" ;
  string com = CLUSTALW  + file + " -outfile="+alig_file+" -outorder=INPUT -align -type=dna  -pairgap=3 -pwmatrix=gonnet -pwdnamatrix=iub -pwgapopen=10 -pwgapext=2.0 -matrix=gonnet -dnamatrix=iub -gapopen=10 -gapext=2.0 -gapdist=1 -clustering=NJ > /dev/null 2> /dev/null";
  // cout << com << endl ;

  cout << "[clustalw... " ;
  cout.flush() ;
  system(com.c_str());

  ifstream alig(alig_file.c_str());
  
  if (!alig.is_open())
    {
      cout << "FAILED] " << endl ;
      cout.flush();
      return out;
    }

  cout << "ok]" << endl ;
  cout.flush() ;

  while (alig.good())
    {
      string line ;
      getline (alig, line);

      replace (line.begin(), line.end(), 'N', ' ');

      if (line.find("junction") != (size_t) string::npos)
	{
	  if (line.size() > 22)	  	    
	    out.push_front(line.substr(22));
	  else
	    out.push_front(line);
	}
    }
  alig.close();

  return out ;
}
