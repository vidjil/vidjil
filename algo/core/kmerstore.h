#ifndef KMERSTORE_H
#define KMERSTORE_H

#include <map>
#include <string>
#include <list>
#include <stdexcept>
#include <stdint.h>
#include <math.h>
#include "fasta.h"
#include "tools.h"

using namespace std;

class Kmer {
public:
  unsigned int count;

  Kmer();

  /**
   * This constructor is used via a IKmerStore<Kmer> index (hence the argument list)       
   */
  Kmer(const string &label, int strand=1);

  Kmer &operator+=(const Kmer &);
  static bool hasRevcompSymetry();

  /**
   * @return true if the element is the same as when initialised with default constructor.
   */
  bool isNull();
} ;
ostream &operator<<(ostream &os, const Kmer &kmer);


/* K-mer indexing */

template <class T> class IKmerStore
{
protected:
  bool revcomp_indexed;
  int k; // weight of the seed
  int s; // span of the seed (s >= k)
  string seed ;
  size_t nb_kmers_inserted;

public:

  virtual ~IKmerStore();

  list< pair <T, string> > labels;

  /**
   * @param input: A single FASTA file
   * @param label: label that must be associated to the given files
   * @post All the sequences in the FASTA files have been indexed, and the label is stored in the list of labels
   */
  void insert(Fasta& input, const string& label="", int keep_only = 0);

  /**
   * @param input: A list of FASTA files
   * @param label: label that must be associated to the given files
   * @post All the sequences in the FASTA files have been indexed, and the label is stored in the list of labels
   */
  void insert(list<Fasta>& input, const string& label="", int keep_only = 0);
  
  /**
   * @param input: A sequence to be cut in k-mers
   * @param label: label that must be associated to the given files
   * @param keep_only: if > 0 will keep at most the last keep_only nucleotides
   *                   of the sequence. if < 0 will keep at most the first
   *                   keep_only nucleotides of the sequence. if == 0,
   *                   will keep all the sequence.
   * @post All the k-mers in the sequence have been indexed.
   */
  void insert(const seqtype &sequence,
              const string &label,
              bool ignore_extended_nucleotides=true, int keep_only = 0);

  /**
   * @param word: a k-mer
   * @return the value for the kmer as stored in the structure (don't do revcomp)
   */ 
  virtual T& get(seqtype &word) = 0;

  /**
   * @return the percentage of kmers that are set in the index
   */
  float getIndexLoad() const;

  /**
   * @return probability that the number of kmers is 'at_least' or more in a sequence of length 'length'
   */
  double getProbabilityAtLeastOrAbove(int at_least, int length) const;

  /**
   * @return the value of k
   */
  int getK() const;

  /**
   * @return the value of s
   */
  int getS() const;

  /**
   * @return the seed used
   */
  string getSeed() const;

  /**
   * @param kmer: a kmer
   * @return one label associated with the kmer
   */
  string getLabel(T kmer) const;

  /**
   * @param seq: a sequence
   * @param no_revcomp: force not to revcomp the sequence, even if
   *                    the index was built with revcomp.
   * @return a vector of length seq.length() - getK() + 1 containing
   * for each k-mer the corresponding value in the index.
   */
  virtual vector<T> getResults(const seqtype &seq, bool no_revcomp=false) = 0;

  /**
   * @return true iff the revcomp is indexed
   */
  bool isRevcomp() const;

  /**
   * @param string: a k-mer
   * @return the value in the index associated to the given k-mer.
   *         isRevcomp() ==> the revcomp of the k-mer may be considered
   * @pre word.length() == this->k
   */
  virtual T& operator[](seqtype& word) = 0;
};


template <class T> 
class MapKmerStore : public IKmerStore<T>
{
public:	
  map<seqtype, T> store;

  /**
   * @param bool: if true, will also index revcomp
   * @param seed: the seed
   */
  MapKmerStore(string seed, bool=false);
  MapKmerStore(int k, bool=false);

  vector<T> getResults(const seqtype &seq, bool no_revcomp=false);
  T& get(seqtype &word);
  T& operator[](seqtype & word);

 private:
  void init();
};

template <class T> 
class ArrayKmerStore : public IKmerStore<T>
{
  T* store;
	
  int index(const seqtype& word) const;

  /**
   * Allocates memory for store
   * @throws bad_alloc: when there is not enough memory or when the
   *                    the total number of kmers cannot be stored in an 
   *                    unsigned int
   */
  void init();
public:
  /**
   * @param bool: if true, will also index revcomp
   * @param seed: the seed
   */
  ArrayKmerStore(string seed, bool=false);
  ArrayKmerStore(int k, bool=false);
  ~ArrayKmerStore();

  vector<T> getResults(const seqtype &seq, bool no_revcomp=false);	
  T& get(seqtype &word);
  T& operator[](seqtype & word);
  T& operator[](int word);
};


// IKmerStore

template<class T>
IKmerStore<T>::~IKmerStore(){}

template<class T> 
void IKmerStore<T>::insert(list<Fasta>& input,
                           const string &label,
                           int keep_only){
  for(list<Fasta>::iterator it = input.begin() ; it != input.end() ; it++){
    insert(*it, label, keep_only);
  }
}

template<class T> 
void IKmerStore<T>::insert(Fasta& input,
                           const string &label,
                           int keep_only){
  for (int r = 0; r < input.size(); r++) {
    insert(input.sequence(r), label, true, keep_only);
  }

  labels.push_back(make_pair(T(label, 1), label)) ;
}

template<class T> 
void IKmerStore<T>::insert(const seqtype &sequence,
                           const string &label,
                           bool ignore_extended_nucleotides,
                           int keep_only){
  size_t start_indexing = 0;
  size_t end_indexing = sequence.length();
  if (keep_only > 0 && sequence.length() > (size_t)keep_only) {
    start_indexing = sequence.length() - keep_only;
  } else if (keep_only < 0 && sequence.length() > (size_t) -keep_only) {
    end_indexing = -keep_only;
  }
  for(size_t i = start_indexing ; i + s < end_indexing + 1 ; i++) {
    seqtype substr = sequence.substr(i, s);
    seqtype kmer = spaced(substr, seed);

    if (ignore_extended_nucleotides && has_extended_nucleotides(kmer))
      continue;

    int strand = 1;
    if (revcomp_indexed && T::hasRevcompSymetry()) {
      seqtype rc_kmer = revcomp(kmer);
      if (rc_kmer.compare(kmer) < 0) {
        strand = -1;
        kmer = rc_kmer;
      }
    }
    T &this_kmer = this->get(kmer);
    if (this_kmer.isNull()) {
      nb_kmers_inserted++;
    }
    this_kmer += T(label, strand);
    if (revcomp_indexed && ! T::hasRevcompSymetry()) {
      seqtype rc_kmer = spaced(revcomp(substr), seed);
      T &this_rc_kmer = this->get(rc_kmer);
      if (this_rc_kmer.isNull())
        nb_kmers_inserted++;
      this_rc_kmer += T(label, -1);
    }
  }
}

template<class T>
float IKmerStore<T>::getIndexLoad() const {
  return nb_kmers_inserted*1. / (1 << (2 * k));
}


template<class T>
double IKmerStore<T>::getProbabilityAtLeastOrAbove(int at_least, int length) const {

  // n: number of kmers in the sequence
  int n = length - getS() + 1;
  float index_load = getIndexLoad() ;

  double proba = 0;
  double probability_having_system = pow(index_load, at_least);
  double probability_not_having_system = pow(1 - index_load, n - at_least);
  for (int i=at_least; i<=n; i++) {
    proba += nChoosek(n, i) * probability_having_system * probability_not_having_system;
    probability_having_system *= index_load;
    probability_not_having_system /= (1 - index_load);
  }

  return proba;
}



template<class T>
int IKmerStore<T>::getK() const {
  return k;
}

template<class T>
int IKmerStore<T>::getS() const {
  return s;
}

template<class T>
string IKmerStore<T>::getSeed() const {
  return seed;
}

template<class T>
string IKmerStore<T>::getLabel(T kmer) const {
  for (typename list< pair<T, string> >::const_iterator it = labels.begin(); it != labels.end(); ++it)
    if (it->first == kmer)
      return it->second ;
  return "" ;
}

// .getResults()
template<class T>
vector<T> MapKmerStore<T>::getResults(const seqtype &seq, bool no_revcomp) {

  int s = IKmerStore<T>::getS();

  if ((int)seq.length() < s - 1) {
    return vector<T>(0);
  }
  vector<T> result(seq.length() - s + 1);
  for (size_t i=0; i + s < seq.length() + 1; i++) {
    seqtype kmer = spaced(seq.substr(i, s), IKmerStore<T>::seed);
    //    seqtype kmer = seq.substr(i, s);
    // cout << kmer << endl << kmer0 << endl << endl ;
    if (IKmerStore<T>::revcomp_indexed && no_revcomp) {
      result[i] = get(kmer);
    } else {
      result[i] = (*this)[kmer];
    }
  }
  return result;
}

template<class T>
vector<T> ArrayKmerStore<T>::getResults(const seqtype &seq, bool no_revcomp) {
  
  int s = IKmerStore<T>::getS();

  int N = (int)seq.length();

  if (N < s - 1) {
    return vector<T>(0);
  }
  vector<T> result(N - s + 1);

  /* Read once the sequence, convert it to int* */
  int* intseq = new int[N];
  for (int i=0; i<N; i++)
    {
      intseq[i] = nuc_to_int(seq[i]);
    }

  /* Compute results */
  for (size_t i=0; (int) i+s < N+1; i++) {
    int kmer = spaced_int(intseq + i, IKmerStore<T>::seed);
    if (IKmerStore<T>::revcomp_indexed && no_revcomp) {
      result[i] = store[kmer]; // getfromint(kmer); // store[kmer];
      // cout << i << "/" << N << "  " << kmer << result[i] << endl ;
    } else {
      result[i] = (*this)[kmer]; // Deals with revcomp
    }
  }

  delete[] intseq ;
  return result;
}


template<class T>
bool IKmerStore<T>::isRevcomp() const {
  return revcomp_indexed;
}

// MapKmerStore

template <class T>
MapKmerStore<T>::MapKmerStore(string seed, bool revcomp){
  this->seed = seed;   
  int k = seed_weight(seed);
  this->k = k;
  this->s = seed.size();
  this->revcomp_indexed = revcomp;
  init();
}

template <class T>
MapKmerStore<T>::MapKmerStore(int k, bool revcomp){
  this->seed = seed_contiguous(k);
  this->k = k;
  this->s = k;
  this->revcomp_indexed = revcomp;
  init();
}

template <class T>
void MapKmerStore<T>::init() {
  this->nb_kmers_inserted = 0;
}

template <class T> 
T& MapKmerStore<T>::get(seqtype& word){
  return store[word];
}

template <class T> 
T& MapKmerStore<T>::operator[](seqtype& word){
  if (this->isRevcomp() && T::hasRevcompSymetry()) {
    seqtype rc_kmer = revcomp(word);
    if (rc_kmer.compare(word) < 0)
      word = rc_kmer;
  }
  return store[word];
}

// ArrayKmerStore

template <class T> 
ArrayKmerStore<T>::ArrayKmerStore(int k, bool revcomp) {
  this->seed = seed_contiguous(k);
  this->k = k;
  this->s = k;
  this->revcomp_indexed = revcomp;
  init();
}


template <class T> 
ArrayKmerStore<T>::ArrayKmerStore(string seed, bool revcomp){
  this->seed = seed; 
  int k = seed_weight(seed);
  this->k = k;
  this->s = seed.size();
  this->revcomp_indexed = revcomp;
  init();
}

template <class T>
void ArrayKmerStore<T>::init() {
  this->nb_kmers_inserted = 0;
  if ((size_t)(this->k << 1) >= sizeof(int) * 8)
    throw std::bad_alloc();
  store = new T[(unsigned int)1 << (this->k << 1)];
  if (! store)
    throw std::bad_alloc();
}

template <class T> 
ArrayKmerStore<T>::~ArrayKmerStore(){
  delete [] store;
}

/**	Returns index of word in an array of size 4^k
	Considering B(A) = 0, B(C) = 1, B(T) = 2, B(G) = 3
	index_word = \sum_{i=0}^{k-1}B(word[i])*4^(k-i-1)
**/
template <class T> 
int ArrayKmerStore<T>::index(const seqtype& word) const{
  return dna_to_int(word, this->k);
}

template <class T> 
T& ArrayKmerStore<T>::get(seqtype& word){
  return store[index(word)];
}

template <class T> 
T& ArrayKmerStore<T>::operator[](seqtype& word){
  return (*this)[index(word)];
}

template <class T> 
T& ArrayKmerStore<T>::operator[](int word){
  if (this->isRevcomp() && T::hasRevcompSymetry()) {
    int rc_kmer = revcomp_int(word, IKmerStore<T>::k);
    if (rc_kmer < word)
      word = rc_kmer;
  }
  return store[word];
}


/**
 * KmerStoreFactory is a factory that allows to create an index that best fits
 * your needs!
 */
class KmerStoreFactory {
 public:
  template<class T>
    static IKmerStore<T> *createIndex(string seed, bool revcomp=false);
  template<class T>
    static IKmerStore<T> *createIndex(int k, bool revcomp=false);
};

template<class T>
IKmerStore<T> *KmerStoreFactory::createIndex(string seed, bool revcomp) {
  IKmerStore<T> *index;
  try{
    index = new ArrayKmerStore<T>(seed, revcomp);
  }catch(exception e){
    cout << "  (using a MapKmer to fit into memory)" << endl;
    index = new MapKmerStore<T>(seed, revcomp);
  }
  return index;
}

template<class T>
IKmerStore<T> *KmerStoreFactory::createIndex(int k, bool revcomp) {
  return createIndex<T>(seed_contiguous(k), revcomp);
}

#endif
