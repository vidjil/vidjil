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

#include <algorithm>
#include <string>
#include <fstream>
#include "bioreader.hpp"
#include "fasta.h"
#include "bam.h"

OnlineBioReader::OnlineBioReader(int extract_field, string extract_separator,
                     int nb_sequences_max, int only_nth_sequence):
  filename(""), extract_field(extract_field),
  extract_separator(extract_separator),
  nb_sequences_max(nb_sequences_max), only_nth_sequence(only_nth_sequence){}

OnlineBioReader::OnlineBioReader(const string &input_filename, 
                     int extract_field, string extract_separator,
                     int nb_sequences_max, int only_nth_sequence):
  filename(input_filename), extract_field(extract_field), 
  extract_separator(extract_separator),
  nb_sequences_max(nb_sequences_max), only_nth_sequence(only_nth_sequence)
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
  current.marked_pos = 0;
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
        if ((int) current.sequence.length() + current_gaps == mark_pos)
          current.marked_pos = current.sequence.length();
      }
    }
}

void OnlineBioReader::unexpectedEOF() {
  throw invalid_argument("Unexpected EOF while reading sequence file");
}

//// BioReader


void BioReader::init(int extract_field, string extract_separator, size_t mark_pos)
{
  this -> extract_field = extract_field ;
  this -> extract_separator = extract_separator ; 
  this -> mark_pos = mark_pos;
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
}

BioReader::BioReader(int extract_field, string extract_separator, int mark_pos)
{
  init(extract_field, extract_separator, mark_pos);
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
                                                           extract_separator);

  if (name.size())
    name += " ";

  if (basename.size())
    basename += " ";

  name += filename;
  basename += extract_basename(filename);

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

  if (seq.marked_pos) {
    out << " !@" << seq.marked_pos ;
  }

  out << endl;

  out << seq.sequence << endl;
  if (is_fastq) {
    out << "+" << endl << seq.quality << endl;
  }
  return out;
}

OnlineBioReader *OnlineBioReaderFactory::create(const string &filename,
                                                int extract_field, string extract_separator,
                                                int nb_sequences_max, int only_nth_sequence) {
  string extension = filename.substr(filename.find_last_of(".") + 1);
  transform(extension.begin(), extension.end(), extension.begin(), ::tolower);
  if (extension == "bam")
    return new OnlineBAM(filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence);
  else
    return new OnlineFasta(filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence);
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
