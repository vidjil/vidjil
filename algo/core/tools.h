#ifndef TOOLS_H
#define TOOLS_H


// error
#define ERROR_STRING "[error] "
#define WARNING_STRING "[warning] "


#define NO_LIMIT_VALUE  -1  // Value for 'all' on command-line options
#define NO_LIMIT_VALUE_STRING  "-1"


#define MAX_SEED_SIZE  50 // Spaced seed buffer
#define FIRST_POS  1      // Numbering of the base pairs for external output

#define PERCENT_TOO_MANY_N 30    /* Percent above which we consider there are too
                                  many Ns in the sequence and the
                                  corresponding subsequence should be
                                  trimmed. The constant *must* be an integer.
                                   */
#define MIN(x,y) ((x) < (y) ? (x) : (y))

#define LEVEL_DEBUG "debug"
#define LEVEL_INFO  "info"
#define LEVEL_WARN  "warn"
#define LEVEL_ERROR "error"
#define LEVEL_FATAL "fatal"

#define ALL_KMERS_VALUE 0 /* Use in -Z 0 (filtering on all k-mers with at least
                             one match. */
#include <sstream>
#include <iostream>
#include <iomanip>
#include <string>
#include <cassert>
#include <vector>
#include "bioreader.hpp"
#include "kmeraffect.h"
#include "../lib/json.hpp"
using json = nlohmann::json;
using namespace std;

#define PRINT_VAR(v) cerr << #v << " = " << v << endl

#define NB_N_CHOOSE_K_STORED 500

#define SEED_YES '#'

// Common seeds
extern map<string, string> seedMap;

string seed_contiguous(int k);

int seed_weight(const string &seed);

// https://stackoverflow.com/posts/3599170/revisions
#define UNUSED(x) ((void)(x))

#define FIRST_IF_UNCHANGED(first, second, changed) ((changed) ? (second) : (first))

/**
 * Return a spaced key from a contiguous key and a seed model
 * @param input: contiguous key
 * @param seed: spaced seed model, like "###-###"
 * @return the spaced key
 */
string spaced(const string &input, const string &seed);

inline int spaced_int(int *input, const string &seed) {

  // cout << input << endl << seed << endl ;
  // assert(input.length() == seed.length()); // length is not equal, pointer

  int index_word = 0;

  for (size_t i = 0; i < seed.length(); i++) 
    if (seed[i] == SEED_YES)
	index_word = (index_word << 2) | input[i] ;

#ifdef DEBUG_SPACED
  cout << input << " => |" << index_word << "|" <<  endl ;
#endif

  return index_word;

}

/* 
	Extract the gene name from a label. This take the whole part
	before the star and returns it. If there is no star in the
	name the whole label is returned.
	IGHV-01*05	->	IGHV-01
	IGHV-7500AB	->	IGHV-7500AB
*/
string extractGeneName(string label);

/**
 * Sort the number of occurrence stored as the second element of a pair.
 * @param a: a pair containing an element and an associated number of occurrence
 * @param b: a pair containing an element and an associated number of occurrence
 * @return true iff a has a number of occurrence greater or equal to b.
 */
template <class T>
bool pair_occurrence_sort(pair<T, int> a, pair<T, int> b);


string string_of_int(int number);
string fixed_string_of_float(float number, int precision);
string scientific_string_of_double(double number);

/**
 * @param nuc is A, C, G, T or any extended nucleotide (or lowercase)
 * @return is nuc an extended nucleotide ?
 */

bool is_extended_nucleotide(char nuc);
bool has_extended_nucleotides(string s);


/**
 * @param nuc is A, C, G, T or any extended nucleotide (or lowercase)
 * @return the complementary nucleotide of nuc
 */
char complement_nucleotide(char nuc);

/**
 * @return the complementary sequence of dna
 */
string complement(const string &dna);

/**
 * @param nuc: nucleotide in  either up- or down-casemajuscule (ACGTacgt)
 * @return integer representation (respectively 0, 1, 2 ou 3)
 */
inline int nuc_to_int(char nuc) {
  // A/a : 01*0 0001
  // C/c : 01*0 0011
  // G/g : 01*0 0111
  // T/t : 01*1 0100
  // pos :    3210
  // Bit de poids fort : b_2
  // Bit de poids faible : xor entre b_2 et b_1
  return ((nuc & 4) >> 1) // poids fort
    | (((nuc & 4) >> 2) ^ ((nuc & 2) >> 1));
}

/**
 * Convert size nucleotides from a DNA string to an integer or to an hash.
 */
int dna_to_int(const string &, int size);
uint64_t dna_to_hash(const string &, int size);

#define GENETIC_CODE \
  "KNKN" "TTTT" "RSRS" "IIMI" \
  "QHQH" "PPPP" "RRRR" "LLLL" \
  "EDED" "AAAA" "GGGG" "VVVV" \
  "*Y*Y" "SSSS" "*CWC" "LFLF"

#define GENETIC_CODE_OUT_OF_FRAME '#'

/**
 * Convert nucleotides to amino acids
 */
string nuc_to_aa(const string &nuc);

/**
 * Extract a field from a separated string
 * @param field: number of the field to be extracted (starts at 1,
 *               if 0: returns the whole string)
 * @param separator: the separator used in the string
 * @param str
 * @return the field to be extracted from the string
 */
string extract_from_label(string str, int field, string separator);

/**
 * @return Extract dirname of a file
 */
string extract_dirname(string path);

/**
 * @return Extract basename of a file and extracts extension (by default)
 */
string extract_basename(string path, bool remove_ext = true);

/**
 * Generate all the possible (nucleotide) strings from the (spaced) seed
 * provided in parameter.
 */
vector<string> generate_all_seeds(const string &str, const string &seed);

/**
 * remove_trailing_whitespaces removes the whitespaces (ie. ' ', '\t', '\r')
 * that may be at the end of the string
 * @param str: the string 
 * @return the number of whitespaces removed
 */
int remove_trailing_whitespaces(string &str);

/**
 * @return subsequence delimited by biological positions (starting from 1), including both positions
 */
string subsequence(const string &text, int start, int end);

/**
 * @return reverse(complement(dna)) if do_revcomp, otherwise dna
 */
string revcomp(const string &dna, bool do_revcomp = true);

/**
 * @return the int value corresponding to the revcomp of the DNA sequence
 *         represented by word, whose length (in number of nucleotides) is size.
 */
int revcomp_int(int word, int size);

/**
 * @return the reverse of text (ie. text read from right to left)
 */
string reverse(const string &text);

/**
 * @param sequence is a DNA sequence in the correct orientation in uppercase
 *      (ie. no revcomp will be tried)
 * @param frame (0, 1 or 2) depending on where the position of the first codon
 *        in the sequence starts
 * @return true iff a stop codon is in-frame.
 */ 
bool hasInFrameStopCodon(const string &sequence, int frame);

/**
 * @return a Sequence whose fields are given by the parameters
 */
Sequence create_sequence(string label_full, string label, string sequence, string quality);

extern double nChoosek_stored[NB_N_CHOOSE_K_STORED][NB_N_CHOOSE_K_STORED];
/**
 * @return the combinatorial of k among n
 * @see http://stackoverflow.com/a/9331125/1192742
 */
double nChoosek(unsigned n, unsigned k);

/**
 * Remove the ends of the sequence if they contain too many N.
 * The sequence will be considered starting at position start_pos
 * for length letters.
 * The values will be updated correspondingly after trimming.
 *
 * More precisely, the purpose of the function is to find the longest
 * substring whose prefixes and suffixes all have a ratio of N that
 * is less than or equal to RATIO_TOO_MANY_N
 */
void trimSequence(string &sequence, size_t &start_pos, size_t &length);


const Sequence NULL_SEQUENCE = create_sequence("", "", "NULL", "");

bool operator==(const Sequence &s1, const Sequence &s2);
bool operator!=(const Sequence &s1, const Sequence &s2);


/***
 Outputs
 ***/

void output_label_average(ostream &out, string label, long long int nb, double average, int precision=1);

void json_add_warning(json &clone, string code, string msg, string level=LEVEL_WARN);


//////////////////////////////////////////////////
// Template code
//////////////////////////////////////////////////

template <class T>
bool pair_occurrence_sort(pair<T, int> a, pair<T, int> b) {
  return a.second >= b.second;
}

#endif
