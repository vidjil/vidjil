#ifndef TOOLS_H
#define TOOLS_H

#define MAX_SEED_SIZE  50 // Spaced seed buffer
#define FIRST_POS  0      // Numbering of the base pairs

#include <sstream>
#include <iostream>
#include <string>
#include <cassert>
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


string extract_from_label(string str, int field, string separator);

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
 * @return the reverse of text (ie. text read from right to left)
 */
string reverse(const string &text);


//////////////////////////////////////////////////
// Template code
//////////////////////////////////////////////////

template <class T>
bool pair_occurrence_sort(pair<T, int> a, pair<T, int> b) {
  return a.second >= b.second;
}

#endif
