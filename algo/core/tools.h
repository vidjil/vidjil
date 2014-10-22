#ifndef TOOLS_H
#define TOOLS_H

#define MAX_SEED_SIZE  50 // Spaced seed buffer
#define FIRST_POS  0      // Numbering of the base pairs

#include <sstream>
#include <iostream>
#include <string>
#include <cassert>
#include "fasta.h"
using namespace std;

#define PRINT_VAR(v) cerr << #v << " = " << v << endl


#define SEED_YES '#'




string seed_contiguous(int k);

int seed_weight(const string &seed);


/**
 * Return a spaced key from a contiguous key and a seed model
 * @param input: contiguous key
 * @param seed: spaced seed model, like "###-###"
 * @return the spaced key
 */
string spaced(const string &input, const string &seed);

inline int spaced_int(int *input, const string &seed) {

#ifdef NO_SPACED_SEEDS
  return input ;
#endif

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


/**
 * Sort the number of occurrence stored as the second element of a pair.
 * @param a: a pair containing an element and an associated number of occurrence
 * @param b: a pair containing an element and an associated number of occurrence
 * @return true iff a has a number of occurrence greater or equal to b.
 */
template <class T>
bool pair_occurrence_sort(pair<T, int> a, pair<T, int> b);


string string_of_int(int number);

/**
 * @param nuc is A, C, G, T or N (or lowercase)
 * @return the complementary nucleotide of nuc
 */
char complement_nucleotide(char nuc);

/**
 * @return the complementary sequence of dna
 */
string complement(const string &dna);

/**
 * @pre nuc est un nucléotide en majuscule (A, C, G ou T)
 * @return le code entier du nucléotide (respectivement 0, 1, 2 ou 3)
 */
inline int nuc_to_int(char nuc) {
  // A : 0100 0001
  // C : 0100 0011
  // G : 0100 0111
  // T : 0101 0100
  // pos :    3210
  // Bit de poids fort : b_2
  // Bit de poids faible : xor entre b_2 et b_1
  return ((nuc & 4) >> 1) // poids fort
    | (((nuc & 4) >> 2) ^ ((nuc & 2) >> 1));
}

/**
 * Convert size nucleotides from a DNA string to an integer.
 */
int dna_to_int(const string &, int size);

string extract_from_label(string str, int field, string separator);

/**
 * @return Extract basename of a file and extracts extension (by default
 */
string extract_basename(string path, bool remove_ext = true);

/**
 * remove_trailing_whitespaces removes the whitespaces (ie. ' ', '\t', '\r')
 * that may be at the end of the string
 * @param str: the string 
 * @return the number of whitespaces removed
 */
int remove_trailing_whitespaces(string &str);

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
 * @return a Sequence whose fields are given by the parameters
 */
Sequence create_sequence(string label_full, string label, string sequence, string quality);

const Sequence NULL_SEQUENCE = create_sequence("", "", "NULL", "");

bool operator==(const Sequence &s1, const Sequence &s2);
bool operator!=(const Sequence &s1, const Sequence &s2);

//////////////////////////////////////////////////
// Template code
//////////////////////////////////////////////////

template <class T>
bool pair_occurrence_sort(pair<T, int> a, pair<T, int> b) {
  return a.second >= b.second;
}

#endif
