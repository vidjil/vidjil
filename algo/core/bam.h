#ifndef BAM_H
#define BAM_H

#include <istream>
#include <string>
#include <vector>
#include <list>

extern "C" {
#include "lib/unbam/bamopen.h"
#include "lib/unbam/bgzf.h"
}

using namespace std;

#include "bioreader.hpp"

/**
 * Read a BAM file.
 * Space complexity: constant. Only one sequence is stored at most in memory.
 * The file is read online meaning that we cannot access a random sequence.
 */
class OnlineBAM: public OnlineBioReader {
  BGZF *input;
  bam1_t *bam_entry;
  int bytes_read;
  bam_hdr_t *header;

 public:

  /**
   * Default constructor
   */
  OnlineBAM(int extract_field=0, string extract_separator="|",
            int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  /**
   * Open the file. No sequence is read at first.
   * @post getSequence() does not return the first sequence yet. 
   *       next() must be called first.
   * @throws invalid_argument if file cannot be opened or is not
   *         well-formed
   */
  OnlineBAM(const string &input_filename, 
            int extract_field=0, string extract_separator="|",
            int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  virtual ~OnlineBAM();

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
};
#endif
