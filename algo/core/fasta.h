#ifndef FASTA_H
#define FASTA_H

#include <istream>
#include <string>
#include <vector>
#include <list>

using namespace std;

typedef string seqtype ;

typedef struct read_t
{
  string label_full;
  string label;
  string sequence; // Sequence: original string representation
  string quality;
  int*   seq;      // Sequence: seq representation
  int    marked_pos; // Some marked position in the sequence
} Sequence;

typedef enum {
  FASTX_UNINIT, FASTX_FASTA,
  FASTX_FASTQ_ID, FASTX_FASTQ_SEQ,
  FASTX_FASTQ_SEP, FASTX_FASTQ_QUAL
} fasta_state;

#include "tools.h"

unsigned long long filesize(const char* filename);

class Fasta
{
        void init(int extract_field, string extract_separator, int mark_pos=0);

        int total_size;
        int extract_field;
        int mark_pos;
	string extract_separator;
	
	vector<Sequence> reads;
	// ostream *oout ;

public:
        Fasta(int extract_field=0, string extract_separator="|", int mark_pos=0);
        /**
         * Read all the sequences in the input filename and record them in the object.
         *
         * @throws invalid_argument if filename or file content is not
         *         valid
         */
	Fasta(const string &input, 
	      int extract_field=0, string extract_separator="|",
              bool verbose=true);

        Fasta(bool virtualfasta, const string name); // virtualfasta unused

        string name;
        string basename;
	int size() const;
        int totalSize() const;

        /**
         * Get all the sequences from the FASTA file
         * @return a list of sequences in the same order as in the input file
         */
        list<Sequence> getAll() const;
	const string& label(int index) const;
	const string& label_full(int index) const;
        const Sequence &read(int index) const;
	const string& sequence(int index) const;

        /**
         * Add the content of the stream to the current object
         */
        void add(istream &in, bool verbose=true);
        /**
         * Add the content of the file to the current object
         * @throws invalid_argument if the file cannot be opened or
         *         if the content is not valid
         */
        void add(const string &filename, bool verbose=true);

        void add(const Sequence sequence);
	
	friend istream& operator>>(istream&, Fasta&);
};

/**
 * Read a FASTA/FASTQ file.
 * Space complexity: constant. Only one sequence is stored at most in memory.
 * The file is read online meaning that we cannot access a random sequence.
 */
class OnlineFasta {
 private:
  Sequence current;
  int current_gaps;

  istream *input;
  int extract_field;
  string extract_separator;
  string line;
  bool input_allocated;
  size_t line_nb;
  unsigned long long char_nb;

  int mark_pos;
  void addLineToCurrentSequence(string line);

  int nb_sequences_parsed;
  int nb_sequences_returned;
  int nb_sequences_max;
  int only_nth_sequence;

 public:

  /**
   * Default constructor
   */
  OnlineFasta(int extract_field=0, string extract_separator="|",
              int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  /**
   * Open the file. No sequence is read at first.
   * @post getSequence() does not return the first sequence yet. 
   *       next() must be called first.
   * @throws invalid_argument if file cannot be opened or is not
   *         well-formed
   */
  OnlineFasta(const string &input, 
              int extract_field=0, string extract_separator="|",
              int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  OnlineFasta(istream &input, 
              int extract_field=0, string extract_separator="|",
              int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  ~OnlineFasta();

  /**
   * sets a position to be followed in gapped sequences
   */
  void setMarkPos(int mark_pos);

  /**
   * @return the position in the file
   */
  unsigned long long getPos();

  /**
   * @return the current line number
   */
  size_t getLineNb();

  /**
   * @return the current sequence or an undetermined sequence if the end
   * of the file is reached
   */
  Sequence getSequence();

  /**
   * @return true iff we did not reach yet the end of the file.
   */
  bool hasNextData();

  /**
   * @return true iff we did not reach yet both the end of the file and the maximal number of returned sequences
   */
  bool hasNext();

  /**
   * Go to the next sequence in the file.
   * @post hasNext() ==> getSequence() returns the following sequence in the file.
   * @throws invalid_argument if the file is not well formated
   */
  void next();

 private:

  /**
   * Initialisation of the object
   */
  void init();

  /**
   * Skip to the next sequence that is a multiple of 'only_nth_sequence'
   */
  void skipToNthSequence();

  /**
   * Reads line in the input stream until we have a line with at least one
   * non-whitespace character.
   * @return A non-empty string whose trailing whitespaces have been removed
   */
  string getInterestingLine(int state = FASTX_UNINIT);

  /**
   * Called when we have an unexcepted EOF.
   * @throws exception
   */
  void unexpectedEOF();
};

istream& operator>>(istream& in, Fasta& fasta);
ostream& operator<<(ostream& out, Fasta& fasta);
ostream &operator<<(ostream &out, const Sequence &seq);

const Fasta FASTA_UNKNOWN = Fasta(true, "_");
const Fasta FASTA_AMBIGUOUS = Fasta(true, "?");

/**
 * Count the number of sequences in a Fasta file
 * @return the number of sequences
 */
int nb_sequences_in_fasta(string f, bool approx = false);
int approx_nb_sequences_in_fasta(string f);

#endif
