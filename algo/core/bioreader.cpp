/*
  This file is part of Vidjil-algo <http://www.vidjil.org>
  Copyright (C) 2011-2025 by VidjilNet consortium and Bonsai bioinformatics
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

#include <algorithm>
#include <string>
#include <fstream>
#include "bioreader.hpp"
#include "fasta.h"
#include "bam.h"

OnlineBioReader::OnlineBioReader(int extract_field, string extract_separator,
                                 int nb_sequences_max, int only_nth_sequence,
                                 bool ignore_uppercase_nt):
  filename(""), extract_field(extract_field),
  extract_separator(extract_separator),
  nb_sequences_max(nb_sequences_max), only_nth_sequence(only_nth_sequence),
  ignore_uppercase_nt(ignore_uppercase_nt){}

OnlineBioReader::OnlineBioReader(const string &input_filename, 
                     int extract_field, string extract_separator,
                     int nb_sequences_max, int only_nth_sequence,
                     bool ignore_uppercase_nt):
  filename(input_filename), extract_field(extract_field), 
  extract_separator(extract_separator),
  nb_sequences_max(nb_sequences_max), only_nth_sequence(only_nth_sequence),
  ignore_uppercase_nt(ignore_uppercase_nt)
{
  input_allocated = true;
  init();
}

OnlineBioReader::~OnlineBioReader() {
}

void OnlineBioReader::init() {
  mark_pos = 0;
  nb_sequences_parsed = 0;
  nb_sequences_returned = 0;
  char_nb = 0;
  current.marked_pos[CDR3_POS] = ~0;
  current_gaps = 0;
}

unsigned long long OnlineBioReader::getPos() {
  return char_nb;
}

void OnlineBioReader::setMarkPos(int mark_pos) {
  this -> mark_pos = mark_pos;
}

Sequence OnlineBioReader::getSequence() {
  return current;
}

void OnlineBioReader::skipToNthSequence() {
  // Possibly skip some reads, when only_nth_sequence > 1
  while (hasNextData())
    if (nb_sequences_parsed % only_nth_sequence)
      {
        nb_sequences_returned--;
        this->next();
        continue ;
      }
    else
      return  ;
}

void OnlineBioReader::addLineToCurrentSequence(string line)
{
  for (char& c : line)
    {
      if (c == ' ')
        continue ;

      if (c == '.') {
        current_gaps++;
        continue ;
      }
      current.sequence += c;

      if (mark_pos) {
        if ((int) current.sequence.length() + current_gaps == mark_pos) {
          current.marked_pos[CDR3_POS] = current.sequence.length();
        }
      }
    }
}

void OnlineBioReader::unexpectedEOF() {
  throw invalid_argument("Unexpected EOF while reading sequence file");
}

//// BioReader


void BioReader::init(int extract_field, string extract_separator, size_t mark_pos,
                     bool ignore_uppercase_nt)
{
  this -> extract_field = extract_field ;
  this -> extract_separator = extract_separator ; 
  this -> mark_pos = mark_pos;
  this -> ignore_uppercase_nt = ignore_uppercase_nt;
  total_size = 0;
  name = "";
  basename = "";
}

BioReader::BioReader(bool virtualfasta, string name)
{
  UNUSED(virtualfasta);
  init(0, "");
  this -> name = name;
  basename = extract_basename(name);
  filenames.push_back(this->name);
}

BioReader::BioReader(int extract_field, string extract_separator, int mark_pos, bool ignore_uppercase_nt)
{
  init(extract_field, extract_separator, mark_pos, ignore_uppercase_nt);
}

BioReader::BioReader(const string &input, 
                     int extract_field, string extract_separator,
                     int mark_pos, bool verbose) 
{
  init(extract_field, extract_separator, mark_pos);

  if (!input.size()) // Do not open empty filenames (D germline if not segmentD)
    return ;

  add(input, verbose);
}

void BioReader::add(const string &filename, bool verbose) {
  OnlineBioReader *reader = OnlineBioReaderFactory::create(filename, extract_field,
                                                           extract_separator, ignore_uppercase_nt);

  if (name.size())
    name += " ";

  if (basename.size())
    basename += " ";

  name += filename;
  basename += extract_basename(filename);
  filenames.push_back(name);

  if (verbose)
    cout << " <== " << filename ;

  try {
    add(*reader);
  } catch (...) {
    delete reader;
    throw;
  }

  delete reader;

  if (verbose)
    cout << "\t" << setw(6) << total_size << " bp in " << setw(3) << size() << " sequences" << endl ;
}

void BioReader::add(OnlineBioReader &reader) {
  string line;
  Sequence read;
  reader.setMarkPos(mark_pos);

  while (reader.hasNext()) {
    reader.next();
    add(reader.getSequence());
  }
}

void BioReader::add(Sequence seq) {
  reads.push_back(seq);
  total_size += seq.sequence.size();
}

int BioReader::size() const{ return (int)reads.size(); }
size_t BioReader::totalSize() const { return total_size ; }

list<Sequence> BioReader::getAll() const {
  list<Sequence> reads;

  for (int i=0; i < size(); i++) {
    reads.push_back(read(i));
  }

  return reads;
}
const string& BioReader::label(int index) const{ return reads[index].label; }
const string& BioReader::label_full(int index) const{ return reads[index].label_full; }
const Sequence& BioReader::read(int index) const {return reads[index];}
const string& BioReader::sequence(int index) const{ return reads[index].sequence; }


// Operators

ostream& operator<<(ostream& out, BioReader& fasta){
	for(int i = 0 ; i < fasta.size() ; i++){
          out << fasta.read(i);
	}
	return out;
}

ostream &operator<<(ostream &out, const Sequence &seq) {
  bool is_fastq=false;
  if (seq.quality.length() > 0) {
    is_fastq = true;
    out << "@";
  } else
    out << ">";
  out << seq.label;

  if (seq.marked_pos.count(CDR3_POS) > 0 && seq.marked_pos.at(CDR3_POS) != (size_t)~0)
    out << " !@" << seq.marked_pos.at(CDR3_POS) ;

  out << endl;

  out << seq.sequence << endl;
  if (is_fastq) {
    out << "+" << endl << seq.quality << endl;
  }
  return out;
}

OnlineBioReader *OnlineBioReaderFactory::create(const string &filename,
                                                int extract_field, string extract_separator,
                                                bool ignore_uppercase_nt,
                                                int nb_sequences_max, int only_nth_sequence) {
  size_t final_dot_pos = filename.find_last_of('.');
  string extension     = filename.substr(final_dot_pos + 1);
  transform(extension.begin(), extension.end(), extension.begin(), ::tolower);
  
  if (extension == "bam")
  {
    return new OnlineBAM(filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence, ignore_uppercase_nt);
  }

  if (extension == "gz")
  {
    // Find the previous '.' (if any) and extract characters between that '.' and the last one
    size_t before_final_dot_pos          = final_dot_pos - 1;
    size_t previous_dot_pos              = filename.find_last_of('.', before_final_dot_pos);
    size_t uncompressed_extension_length = final_dot_pos - previous_dot_pos - 1;
    string uncompressed_file_extension   = filename.substr(previous_dot_pos + 1, uncompressed_extension_length);
    transform(uncompressed_file_extension.begin(),
              uncompressed_file_extension.end(),
              uncompressed_file_extension.begin(),
              ::tolower);

    // Check if those characters match the known FASTA/FASTQ extensions
    if ((uncompressed_file_extension == "fasta") ||
        (uncompressed_file_extension == "fastq") ||
        (uncompressed_file_extension == "fa")    ||
        (uncompressed_file_extension == "fq"))
    {
      return new OnlineFasta(filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence, ignore_uppercase_nt);
    }
  }
  else if ((extension == "fasta") ||
           (extension == "fastq") ||
           (extension == "fa")    ||
           (extension == "fq"))
  {
    return new OnlineFasta(filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence, ignore_uppercase_nt);
  }

  cerr << "Input file \"" << filename << "\" format is not BAM, FASTA nor FASTQ\n";
  return nullptr;
}

// http://stackoverflow.com/a/5840160/4475279
unsigned long long filesize(const char* filename)
{
    std::ifstream in(filename, std::ifstream::ate | std::ifstream::binary);
    return in.tellg();
}

unsigned long long nb_sequences_in_file(string f, bool approx)
{
  if (approx)
    return approx_nb_sequences_in_file(f);

  OnlineBioReader *sequences = OnlineBioReaderFactory::create(f, 1, " ");
  unsigned long long nb_sequences = 0 ;

  while (sequences->hasNext())
    {
      sequences->next();
      nb_sequences++ ;
    }

  cout << "  ==> " << nb_sequences << " sequences" << endl;

  delete sequences ;
  return nb_sequences ;
}


unsigned long long approx_nb_sequences_in_file(string f)
{
  OnlineBioReader *sequences = OnlineBioReaderFactory::create(f, 1, " ");
  int nb_sequences = 0 ;

  while (nb_sequences < SAMPLE_APPROX_NB_SEQUENCES && sequences->hasNext())
    {
      sequences->next();
      nb_sequences++ ;
    }

  cout << "  ==> " ;

  if (sequences->hasNext())
    {
      cout << "approx. " ;
      float ratio = (float) filesize(f.c_str()) / (float) sequences->getPos();
      nb_sequences = (unsigned long long) (ratio * nb_sequences);
    }

  cout << nb_sequences << " sequences" << endl;

  delete sequences ;
  return nb_sequences ;
}
