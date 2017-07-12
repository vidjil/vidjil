#ifndef FASTA_H
#define FASTA_H

#include <istream>
#include <string>
#include <vector>
#include <list>

using namespace std;

#include "bioreader.hpp"

/**
 * Read a FASTA/FASTQ file.
 * Space complexity: constant. Only one sequence is stored at most in memory.
 * The file is read online meaning that we cannot access a random sequence.
 */
class OnlineFasta: public OnlineBioReader {
  istream *input;
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
  OnlineFasta(const string &input_filename, 
              int extract_field=0, string extract_separator="|",
              int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  virtual ~OnlineFasta();

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

protected:
  /**
   * @inherited
   */
  void init();

  /**
   * @inherited
   */
  void unexpectedEOF();  

 private:

  /**
   * Reads line in the input stream until we have a line with at least one
   * non-whitespace character.
   * @return A non-empty string whose trailing whitespaces have been removed
   */
  string getInterestingLine(int state = FASTX_UNINIT);
};
#endif
