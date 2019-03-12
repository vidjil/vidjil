/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011-2019 by VidjilNet consortium and Bonsai bioinformatics
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
  Mathieu Giraud <mathieu.giraud@vidjil.org>
  Mikaël Salson <mikael.salson@vidjil.org>
  Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
*/

#ifndef BIO_READER_HPP
#define BIO_READER_HPP

#include <string>
#include <vector>
#include <list>
#include <stdexcept>

#define SAMPLE_APPROX_NB_SEQUENCES 200

using namespace std;

typedef string seqtype ;

typedef struct read_t
{
  string label_full;
  string label;
  string sequence; // Sequence: original string representation
  string quality;
  size_t    marked_pos; // Some marked position in the sequence
} Sequence;

typedef enum {
  FASTX_UNINIT, FASTX_FASTA,
  FASTX_FASTQ_ID, FASTX_FASTQ_SEQ,
  FASTX_FASTQ_SEP, FASTX_FASTQ_QUAL
} fasta_state;

#include "tools.h"

class OnlineBioReader {
protected:
  string filename;
  
  Sequence current;
  int current_gaps;
  
  int extract_field;
  string extract_separator;
  string line;
  bool input_allocated;
  unsigned long long char_nb;

  int mark_pos;

  int nb_sequences_parsed;
  int nb_sequences_returned;
  int nb_sequences_max;
  int only_nth_sequence;  
public:
  /**
   * Default constructor
   */
  OnlineBioReader(int extract_field=0, string extract_separator="|",
                  int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  /**
   * Open the file. No sequence is read at first.
   * @param input: filename
   * @param extract_field: the field number to extract from the header
   *                       (0: keep the header full)
   * @param extract_separator: the string used as a separator
   * @param nb_sequences_max: maximal number of sequences to read
   *                          (default: NO_LIMIT_VALUE)
   * @param only_nth_sequence: modulo of the sequence to retrieve
   *                           (default: 1 (ie. all))
   * @post getSequence() does not return the first sequence yet. 
   *       next() must be called first.
   * @throws invalid_argument if file cannot be opened or is not
   *         well-formed
   */
  OnlineBioReader(const string &input_filename, 
                  int extract_field=0, string extract_separator="|",
                  int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);

  virtual ~OnlineBioReader();

  /**
   * sets a position to be followed in gapped sequences
   */
  void setMarkPos(int mark_pos);

  /**
   * @return the position in the file
   */
  unsigned long long getPos();

  /**
   * @return the current sequence or an undetermined sequence if the end
   * of the file is reached
   */
  Sequence getSequence();

  /**
   * @return true iff we did not reach yet the end of the file.
   */
  virtual bool hasNextData() = 0;

  /**
   * @return true iff we did not reach yet both the end of the file and the maximal number of returned sequences
   */
  virtual bool hasNext() = 0;

  /**
   * Go to the next sequence in the file.
   * @post hasNext() ==> getSequence() returns the following sequence in the file.
   * @throws invalid_argument if the file is not well formated
   */
  virtual void next() = 0;

protected:
  /**
   * Initialisation of the object.
   * Must be redefined in child classes for instance to open the file…
   * This function is called from the controller.
   * So because of C++ limits, the base controller won't be able to call the derived init().
   * Therefore a derived init() must be called in the derived constructors
   */
  virtual void init();
  
  /**
   * Parse the read line and keep the valuable characters in memory.  It
   * discards the . (and consider them as being gaps eg. for the IMGT gapped
   * sequences). It also discards spaces
   */
  virtual void addLineToCurrentSequence(string line);

  /**
   * Skip to the next sequence that is a multiple of 'only_nth_sequence'
   */
  void skipToNthSequence();
  
  /**
   * Called when we have an unexcepted EOF.
   * @throws exception
   */
  virtual void unexpectedEOF();  
};

class BioReader
{
  void init(int extract_field, string extract_separator, size_t mark_pos=0);

  size_t total_size;
  int extract_field;
  int mark_pos;
  string extract_separator;
	
  vector<Sequence> reads;
  // ostream *oout ;

public:
  BioReader(int extract_field=0, string extract_separator="|", int mark_pos=0);
  /**
   * Read all the sequences in the input filename and record them in the object.
   *
   * @throws invalid_argument if filename or file content is not
   *         valid
   */
  BioReader(const string &input, 
            int extract_field=0, string extract_separator="|",
            int mark_pos = 0, bool verbose=true);

  BioReader(bool virtualfasta, const string name); // virtualfasta unused

  string name;
  string basename;
  int size() const;
  size_t totalSize() const;

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
   * Add the content of the file to the current object
   * @throws invalid_argument if the file cannot be opened or
   *         if the content is not valid
   */
  void add(const string &filename, bool verbose=true);

  /**
   * Add the content of an OnlineBioReader to the current object
   */
  void add(OnlineBioReader& reader);

  void add(const Sequence sequence);
};

istream& operator>>(istream& in, BioReader& reader);
ostream& operator<<(ostream& out, BioReader& fasta);
ostream &operator<<(ostream &out, const Sequence &seq);


const BioReader BIOREADER_UNKNOWN = BioReader(true, "_");
const BioReader BIOREADER_AMBIGUOUS = BioReader(true, "?");

unsigned long long filesize(const char* filename);

/**
 * Count the number of sequences in a Fasta file.
 * @complexity Linear in the file size
 * @return the number of sequences
 */
unsigned long long nb_sequences_in_file(string f, bool approx = false);

/**
 * Give an approximate count of the number of sequences in the file
 * @complexity linear in SAMPLE_APPROX_NB_SEQUENCES
 * @return the approximate number of sequences
 */
unsigned long long approx_nb_sequences_in_file(string f);

class OnlineBioReaderFactory {
public:
  /**
   * Instantiates an OnlineBioReader.
   * @throws invalid_argument if the file could not be opened
   */
  static OnlineBioReader *create(const string &filename,int extract_field=0, string extract_separator="|",
                                 int nb_sequences_max=NO_LIMIT_VALUE, int only_nth_sequence=1);
};
#endif
