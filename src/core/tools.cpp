#include <algorithm>
#include "tools.h"

string seed_contiguous(int k)
{
  string seed = "" ;

  for (int i = 0; i < k; i++) 
    seed += SEED_YES;

  return seed ;
}

int seed_weight(const string &seed)
{
  return count(seed.begin(), seed.end(), SEED_YES);
}

string spaced(const string &input, const string &seed) {

#ifdef NO_SPACED_SEEDS
  return input ;
#endif

  string output = "";
  
  // cout << input << endl << seed << endl ;
  assert(input.length() == seed.length());

  for (size_t i = 0; i < input.length(); i++) 
    if (seed[i] == SEED_YES)
      output += input[i] ;
  
  return output ;
}




string string_of_int(int number)
{
   stringstream ss;
   ss << number ;
   return ss.str();
}



char complement_nucleotide(char nuc) {
  switch(nuc) {
  case 'A': case 'a': return 'T';
  case 'C': case 'c': return 'G';
  case 'G': case 'g': return 'C';
  case 'T': case 't': return 'A';

  case 'Y': case 'y': return 'R'; // pyrimidine (CT)
  case 'R': case 'r': return 'Y'; // purine (AG)
  case 'W': case 'w': return 'W'; // weak (AT)
  case 'S': case 's': return 'S'; // strong (GC)
  case 'K': case 'k': return 'M'; // keto (TG)
  case 'M': case 'm': return 'K'; // amino (AC)

  case 'B': case 'b': return 'V'; // not A
  case 'D': case 'd': return 'H'; // not C
  case 'H': case 'h': return 'D'; // not G
  case 'V': case 'v': return 'B'; // not T

  case ' ': return ' '; // ne devrait pas arriver...

  default: return 'N';
  }
}

string complement(const string &dna) {
  string comp(dna);
  for (size_t i = 0; i < dna.length(); i++) {
    comp[i] = complement_nucleotide(dna[i]);
  }
  return comp;
}

string extract_from_label(string str, int field, string separator)
{
  if (!field)
    return str ;

  int found1 = -1;
  int i = 1;

  while (i++ < field)
    {
      found1 = str.find(separator, found1 + 1);
      if (found1 == (int) string::npos)
	return str ;
    }

  int found2 = str.find(separator, found1 + 1);

  if (found2 == (int) string::npos)
    return str ;
  
  return str.substr(found1+1, found2-found1-1);
}

int remove_trailing_whitespaces(string &str) {
  int count = 0;
  while (str.size() > 0 && (str[str.size() - 1] == '\r'
                            || str[str.size()-1] == ' '
                            || str[str.size()-1] == '\t')) {
    count++;
    str.resize(str.size() - 1);
  }
  return count;
}

string revcomp(const string &dna, bool do_revcomp) {
  
  if (!do_revcomp)
    return dna;

  string rcomp(dna);
  for (size_t i = 0; i < dna.length(); i++) {
    rcomp[dna.length() - i - 1] = complement_nucleotide(dna[i]);
  }

  // cout << dna << " " << dna.length() << "  " << rcomp << " " << rcomp.length() << endl  ;

  return rcomp;
}

string reverse(const string &text) {
  return string(text.rbegin(), text.rend());
}
