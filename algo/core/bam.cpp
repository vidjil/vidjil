/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011-2020 by VidjilNet consortium and Bonsai bioinformatics
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

#include <fstream>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include "bam.h"
#include <lib/unbam/sam.h>

#include "../lib/gzstream.h"


// OnlineBAM

OnlineBAM::OnlineBAM(int extract_field, string extract_separator,
                         int nb_sequences_max, int only_nth_sequence)
  :OnlineBioReader(extract_field, extract_separator, nb_sequences_max, only_nth_sequence) {}

OnlineBAM::OnlineBAM(const string &input_filename, 
                         int extract_field, string extract_separator,
                         int nb_sequences_max, int only_nth_sequence)
  :OnlineBioReader(input_filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence) {this->init();}

OnlineBAM::~OnlineBAM() {
  bam_destroy1(bam_entry);
  bam_hdr_destroy(header);
  if (input_allocated)
    bgzf_close(input);
}

void OnlineBAM::init() {
  if (! filename.empty()) {
    input = bgzf_open(filename.c_str(), "r");

    if (! input) {
      throw invalid_argument("!! Error in opening file "+filename);
    }
  }
  bam_entry = bam_init1();
  header = bam_hdr_read(input);
  bytes_read = bam_read1(input, bam_entry);
  char_nb += bytes_read;
}

bool OnlineBAM::hasNextData() {
  return hasNext();
}

bool OnlineBAM::hasNext() {
  return bytes_read > 0;
}

void OnlineBAM::next() {
  assert((bam_entry->core.flag & (BAM_FPAIRED | BAM_FREAD1 | BAM_FREAD2)) == 0);
  assert(hasNext());

  char *qualities = get_quality(bam_entry);
  char *seq = get_sequence(bam_entry);
  current.sequence.erase();
  addLineToCurrentSequence(string(seq));

  current.quality = string(qualities);
  current.label_full = string(bam_get_qname(bam_entry));
  current.label = extract_from_label(current.label_full, extract_field, extract_separator);

  free(seq);
  free(qualities);

  bytes_read = bam_read1(input, bam_entry);
  char_nb += bytes_read;

  skipToNthSequence();
}

void OnlineBAM::unexpectedEOF() {
  throw invalid_argument("Unexpected EOF while reading BAM file");
}


