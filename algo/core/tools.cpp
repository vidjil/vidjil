#include <algorithm>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include "tools.h"
#include "../lib/json.hpp"

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

map<string, string> seedMap = {
  {"7c", "#######"},
  {"8c", "########"},
  {"9c", "#########"},
  {"8s", "####-####"},
  {"10s", "#####-#####"},
  {"12s", "######-######"},
  {"13s", "#######-######"}
};

string expand_seed(const string &seed)
{
  if (seed.size() == 0)
    return expand_seed(DEFAULT_SEED);

  if (seed.find(SEED_YES) == std::string::npos)
    {
      if (seedMap.find(seed) == seedMap.end())
        throw invalid_argument("Unknown seed: " + seed);
      else
        return seedMap[seed];
    }

  return seed ;
}


char spaced_buf[MAX_SEED_SIZE+1];

string spaced(const string &input, const string &seed) {

// #ifdef STATIC_SPACED_SEED_FOURTEEN
//   return input.substr(0, 7) + input.substr(8, 7);
// #endif

  int j = 0 ;

  // cout << input << endl << seed << endl ;
  assert(input.length() == seed.length());

  for (size_t i = 0; i < input.length(); i++) 
    if (seed[i] == SEED_YES)
      spaced_buf[j++] = input[i] ;
  
  spaced_buf[j] = (char) 0;

#ifdef DEBUG_SPACED
  cout << input << " => |" << spaced_buf << "|" <<  endl ;
#endif

  return string(spaced_buf);
}


string string_of_int(int number, int w)
{
   stringstream ss;
   ss << setfill('0') << setw(w) << number ;
   return ss.str();
}

string fixed_string_of_float(float number, int precision)
{
   stringstream ss;
   ss << fixed << setprecision(precision) << number ;
   return ss.str();
}

string scientific_string_of_double(double number)
{
   stringstream ss;
   ss << scientific << number ;
   return ss.str();
}

string string_of_map(map <string, string> m, const string &before)
{
  stringstream ss;
  for (auto x: m)
    ss << before << x.first << ":" << x.second;
  return ss.str();
}


bool is_extended_nucleotide(char nuc) {
  switch(nuc) {
  case 'A': case 'a':
  case 'C': case 'c':
  case 'G': case 'g':
  case 'T': case 't':
    return false ;

  default:
    return true;
  }
}

bool has_extended_nucleotides(string s) {
  for (unsigned int i = 0; i<s.length(); i++)
    if (is_extended_nucleotide(s[i]))
      return true ;

  return false ;
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

  case 'N': case 'n': return 'N';

  case ' ': return ' '; // ne devrait pas arriver...

  default: return '?';
  }
}

string complement(const string &dna) {
  string comp(dna);
  for (size_t i = 0; i < dna.length(); i++) {
    comp[i] = complement_nucleotide(dna[i]);
  }
  return comp;
}

int dna_to_int(const string &word, int size) {
  int index_word = 0;
  for(int i = 0 ; i < size ; i++){
    index_word = (index_word << 2) | nuc_to_int(word[i]);
  }
  return index_word;
}

uint64_t dna_to_hash(const string &word, int size) {
  // djb2-xor hash
  // no collision on 12-char strings on "ACGT" (nor on 8-char strings on "ACGTacgt")
  // min/max for 12-char strings on "AGCT" are "AAGAACCAACCC"/"TGAACCAACCAA"
  uint64_t hash = 5381;
  for(int i = 0 ; i < size ; i++){
    hash = ((hash << 5) + hash) ^ word[i];
  }
  return hash;
}

string nuc_to_aa(const string &word) {
  string aa;
  int index_word = 0;
  size_t i = 0;

  for (; i < word.length() ; i++) {
    index_word = (index_word << 2) | nuc_to_int(word[i]);

    if (i % 3 == 2) {
      aa += GENETIC_CODE[index_word];
      index_word = 0 ;
    }
  }

  if (i % 3)
    aa += GENETIC_CODE_OUT_OF_FRAME ;

  return aa;
}

Sequence create_sequence(string label_full, string label, string sequence, string quality) {
  Sequence seq;
  seq.label_full = label_full;
  seq.label = label;
  seq.sequence = sequence;
  seq.quality = quality;
  // ! TODO: seq.seq, factorize with fasta.cpp
  return seq;
}

bool operator==(const Sequence &s1, const Sequence &s2) {
  return s1.label_full == s2.label_full && s1.sequence == s2.sequence
    && s1.quality == s2.quality && s1.label == s2.label;
}

bool operator!=(const Sequence &s1, const Sequence &s2) {
  return !(s1 == s2);
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


string extract_dirname(string path) {
  size_t pos_lastdir = path.find_last_of('/');
  if (pos_lastdir != std::string::npos) {
    path = path.substr(0, pos_lastdir);
  }

  return path;
}

string extract_basename(string path, bool remove_ext) {
  size_t pos_lastdir = path.find_last_of('/');
  if (pos_lastdir != std::string::npos) {
    path = path.substr(pos_lastdir+1);
  }

  if (remove_ext) {
    size_t lastdot = path.find_last_of('.');
    if (lastdot != std::string::npos)
      path = path.substr(0, lastdot);
  }

  return path;
}

vector<string> generate_all_seeds(const string &str, const string &seed) {
  assert(str.length() == seed.length());
  static const string nucleotides = "ACGT";
  static const size_t nb_nucleotides = nucleotides.length();
  size_t nb_spaces = count(seed.begin(), seed.end(), '-');
  vector<string> sequences(1 << (nb_spaces * 2));
  if (nb_spaces == 0)
    sequences[0] = str;
  else {
    size_t first_pos = seed.find_first_of('-');
    string start_str = str.substr(0,first_pos);
    vector<string> end_sequences = generate_all_seeds(str.substr(first_pos+1), seed.substr(first_pos+1));
    size_t j = 0;
    for (string &end_str: end_sequences) {
      for (size_t i = 0; i < nb_nucleotides; i++) {
        sequences[j++] = start_str + nucleotides[i] + end_str;
      }
    }
  }

  return sequences;
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

string subsequence(const string &seq, int start, int end) {
  return seq.substr(start - 1, end - start + 1);
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

int revcomp_int(int word, int size) {
  int revcomp = 0;
  while (size) {
    revcomp <<= 2;
    revcomp |= (word & 3) ^ 3;
    word >>= 2;
    size--;
  }
  return revcomp;
}

bool hasInFrameStopCodon(const string &sequence, int frame) {
  list<string> stop_codons {"TAG", "TAA", "TGA"};

  for (auto codon: stop_codons) {
    size_t pos_codon = sequence.find(codon);
    while (pos_codon != string::npos) {
      if (pos_codon % 3 == (size_t) frame)
        return true;
      pos_codon = sequence.find(codon, pos_codon+1);
    }
  }
  return false;
}

string reverse(const string &text) {
  return string(text.rbegin(), text.rend());
}

double nChoosek_stored[NB_N_CHOOSE_K_STORED][NB_N_CHOOSE_K_STORED] = {};
double nChoosek(unsigned n, unsigned k)
{
    if (k > n) return 0;
    if (k * 2 > n) k = n-k;
    if (k == 0) return 1;

    if (n >= NB_N_CHOOSE_K_STORED || nChoosek_stored[n][k] == 0) {
      double result = 1;
      unsigned i;
      for (i = 0; i < k && ((n-i) >= NB_N_CHOOSE_K_STORED || nChoosek_stored[n-i][k-i] == 0); i++ ) {
        result *= (n - i)*1./(k - i);
      }
      if (i < k) {
        result *= nChoosek_stored[n-i][k-i];
      }
      if (n < NB_N_CHOOSE_K_STORED)
        nChoosek_stored[n][k] = result;
      return result;
    }
    return nChoosek_stored[n][k];
}

void trimSequence(string &sequence, size_t &start_pos, size_t &length,
                  size_t required_start, size_t required_length) {
  float prefix_score = 0;
  float suffix_score = 0;
  size_t start_bad_suffix = 0;
  size_t start_prefix = start_pos;
  size_t max_factor_length = 0;
  size_t max_start_factor = 0;
  bool is_bad_suffix = false;
  size_t end_pos = start_prefix + length ; // first position outside our
                                           // substring of interest

  for (size_t i = start_prefix; i < end_pos; i++) {

    // prefix_score = PERCENT_TOO_MANY_N * |p| - 100 * (number of N in p),
    // where p = sequence[start_prefix..i]
    
    if (sequence[i] == 'N') {
      prefix_score -= 100;
      suffix_score -= 100;
    }
    
    prefix_score += PERCENT_TOO_MANY_N;
    suffix_score += PERCENT_TOO_MANY_N;

    if (suffix_score >= 0) {
      is_bad_suffix = false;
      suffix_score = 0;
    } else if (! is_bad_suffix) {
      is_bad_suffix = true;
      start_bad_suffix = i;
    }

    // As soon as a prefix doesn't reach our criteria we must cut the factor
    // here, and then we will see if another one will meet the criteria again
    if (prefix_score < 0 || i == end_pos - 1) {
      size_t length_factor = i - start_prefix;
      if (i == end_pos - 1)
        length_factor++;
      if (is_bad_suffix) {
        length_factor = start_bad_suffix - start_prefix;
      }
      if (length_factor > max_factor_length) {
        max_factor_length = length_factor;
        max_start_factor = start_prefix;
      }
      // Restart for a new factor
      start_prefix = i+1;
      is_bad_suffix = false;
      suffix_score = 0;
      prefix_score = 0;
    }
  }

  start_pos = min(required_start, max_start_factor);
  length = max_factor_length;
  if (required_start != string::npos && start_pos + length < required_start + required_length)
    length = required_start + required_length - start_pos;
}


void output_label_average(ostream &out, string label, long long int nb, double average, int precision)
 {
  out << "  ";

  if (label.size())
    out << left << setw(18) << label << "->" ;

  out << right << setw(9) << nb ;
  out << "   " << setw(5) ;
  if (nb)
    out << fixed << setprecision(precision) << average ;
  else
    out << "-" ;
}


void json_add_warning(json &clone, string code, string msg, string level)
{
  if (!clone.count("warn"))
    clone["warn"] = {} ;

  clone["warn"] += { {"code", code}, {"level", level}, {"msg", msg} } ;
}

// Signal handling

bool global_interrupted;

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
void sigintHandler(int sig_num)
{
  signal(SIGINT, sigintHandler);
  global_interrupted = true;
}
#pragma GCC diagnostic pop


/* 
	 Return the part of label before the star
	 For example:
	 IGHV5-51*01 -> IGHV5-51
	 If there is no star in the name, the whole label is returned.
	 IGHV10-40 -> IGHV10-40
*/
string extractGeneName(string label){
	string result;
	size_t star_pos;
	star_pos = label.rfind("*");
	if(star_pos != string::npos){
		result = label.substr(0, star_pos);
	}else{
		result = label;
	}
	return result;
}


/*
   Opens a ostream, possibly gz-compressed
*/
std::ostream* new_ofgzstream(string &f, bool gz, string message)
{
  
  if (gz)
  {
    f += GZ_SUFFIX;
  }
  cout << "  ==> " << f <<  message << endl ;

  if (gz) {
    return new ogzstream(f.c_str());
  }
  else
  {
    return new ofstream(f.c_str());
  }
}
