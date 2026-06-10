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

#include <fstream>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include "fasta.h"

#include "../lib/gzstream.h"
#include "locations_to_mark.h"


// OnlineFasta

OnlineFasta::OnlineFasta(int extract_field, string extract_separator,
                         int nb_sequences_max, int only_nth_sequence, bool ignore_uppercase_nt)
  : OnlineBioReader(extract_field, extract_separator, nb_sequences_max, only_nth_sequence, ignore_uppercase_nt),
    is_not_gzipped{true}
{}

OnlineFasta::OnlineFasta(const string &input_filename, 
                         int extract_field, string extract_separator,
                         int nb_sequences_max, int only_nth_sequence, bool ignore_uppercase_nt, bool is_not_gzipped)
  : OnlineBioReader(input_filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence, ignore_uppercase_nt),
    is_not_gzipped{is_not_gzipped}
{
  this->init();
}

OnlineFasta::~OnlineFasta() {
  if (input_allocated)
    delete input;
}

void OnlineFasta::init() {
  if (filename == STDIN_FILENAME) {
    this->input = &cin;
    this->input_allocated = false;
    this->is_not_gzipped = false;
  }
  else if (! filename.empty()) {
    if (this->is_not_gzipped)
      this->input = new ifstream(filename);
    else
      this->input = new igzstream(filename.c_str());

    if (this->input->fail()) {
      delete this->input;
      throw invalid_argument("!! Error in opening file "+filename);
    }
  }

  this->line = getInterestingLine();
}

bool OnlineFasta::hasNextData() {
  return ((!input->eof()) || line.length() > 0);
}

bool OnlineFasta::hasNext() {
  return hasNextData()
    && ((nb_sequences_max == NO_LIMIT_VALUE) || (nb_sequences_returned < nb_sequences_max));
}

void OnlineFasta::next() {
  fasta_state state = FASTX_UNINIT;

  // Reinit the Sequence object
  current.label_full.erase();
  current.label.erase();
  current.sequence.erase();
  current.quality.erase();
  current.marked_locations_pos.clear();
  current_gaps = 0;
  next_location_to_mark_idx = 0;
  
  if  (hasNextData()) {
    switch(line[0]) {
    case '>': state=FASTX_FASTA; break;
    case '@': state=FASTX_FASTQ_ID; break;
    default: 
      throw invalid_argument("The file seems to be malformed!");
    }
    
    // Identifier line
    nb_sequences_parsed++;
    nb_sequences_returned++;
    current.label_full = line.substr(1);
    current.label = extract_from_label(current.label_full, extract_field, extract_separator);

    line = getInterestingLine();
    while (hasNextData() && ((state != FASTX_FASTA || line[0] != '>')
                         && (state != FASTX_FASTQ_QUAL || line[0] != '@'))) {

      if (hasNextData()) {
        switch(state) {
        case FASTX_FASTA: case FASTX_FASTQ_ID:
          // Sequence
          addLineToCurrentSequence(line);
          break;
        case FASTX_FASTQ_SEQ:
          // FASTQ separator between sequence and quality
          if (line[0] != '+')
            throw invalid_argument("Expected line starting with + in FASTQ file");
          break;
        case FASTX_FASTQ_SEP:
          // Reading quality
          current.quality = line;
          if (current.quality.length() != current.sequence.length())
            throw invalid_argument("Quality and sequence don't have the same length ");
          break;
        default:
          throw invalid_argument("Unexpected state after reading identifiers line");
        }
        if (state >= FASTX_FASTQ_ID && state <= FASTX_FASTQ_SEP)
          state = (fasta_state)(((int)state) + 1);
      } else {
        unexpectedEOF();
      }
      line = getInterestingLine(state);
    }

    if (state >= FASTX_FASTQ_ID && state < FASTX_FASTQ_QUAL) 
      unexpectedEOF();

    size_t start_gene_sequence = 0;
    size_t end_gene_sequence   = current.sequence.size() - 1;
    int state = 0;               // uppercase state
    for (size_t i = 0; i < current.sequence.size(); i++) {
      if (state == 1 && current.sequence[i] >= 'A' && current.sequence[i] <= 'Z') {
        state = 0;
        if (ignore_uppercase_nt)
          end_gene_sequence = i-1;
      }
      if (current.sequence[i] >= 'a' && current.sequence[i] <= 'z') {
        if (state == 0) {
          state = 1;
          if (ignore_uppercase_nt)
            start_gene_sequence = i;
        }
        current.sequence[i] = toupper(current.sequence[i]);
      }
    }

    current.marked_locations_pos[START_GENE] = start_gene_sequence;
    current.marked_locations_pos[END_GENE]   = end_gene_sequence;

    // J gene FR4 end
    const auto marked_loc_pos_end = current.marked_locations_pos.end();
    auto fr4_first_aa_mid_nuc_it = current.marked_locations_pos.find(FR4_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE);
    if (fr4_first_aa_mid_nuc_it != marked_loc_pos_end)
    {
      // The start anchor point of the FR4 was positioned. Try to position the FR4's end (gaps can
      // be safely ignored: J genes from IMGT germlines only have gaps before the start of the FR4,
      // never after)
      //
      // According to IMGT, the FR4 contains full amino acids/codons and no trailing nucleotides.
      // Germline J-REGIONs seem to either extend beyond the end of the FR4, or not include all FR4
      // nucleotides: the count of nucleotide from the start of the FR4 to the end of J genes in
      // IMGT germlines is not always a multiple of 3. The definitions of the FR4 and J-REGIONS are
      // not clear about how they overlap, but resources seem to show the actual J-REGION does
      // extend beyond the end of the FR4 (which ends with "V S S" here):
      // https://imgt.org/IMGTrepertoire/Proteins/alleles/index.php?species=Homo%20sapiens&group=IGHJ&gene=IGHJ6
      //
      // For these reasons, the end of the FR4 is positioned so its length is a multiple of 3
      size_t fr4_start_nuc_pos         = fr4_first_aa_mid_nuc_it->second - 1;
      size_t fr4_start_to_gene_end_len = end_gene_sequence - fr4_start_nuc_pos + 1;
      size_t candidate_fr4_aa_len      = fr4_start_to_gene_end_len / 3;
      if (candidate_fr4_aa_len >= FR4_MIN_LENGTH_IN_AMINO_ACIDS)
      {
        // This is just to avoid a GCC warning
        const size_t fr4_max_length_in_amino_acids = FR4_MAX_LENGTH_IN_AMINO_ACIDS;

        size_t clamped_fr4_aa_len      = (candidate_fr4_aa_len < fr4_max_length_in_amino_acids) ?
                                          candidate_fr4_aa_len : fr4_max_length_in_amino_acids;
        size_t fr4_last_aa_mid_nuc_pos = fr4_start_nuc_pos + (clamped_fr4_aa_len * 3) - 2;
        current.marked_locations_pos.emplace_hint(marked_loc_pos_end,
                                                  FR4_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
                                                  fr4_last_aa_mid_nuc_pos);
      }
    }
  } else
    unexpectedEOF();

  skipToNthSequence();
}

string OnlineFasta::getInterestingLine(int state) {
  string line;
  while (line.length() == 0 && hasNextData() && getline(*input, line)) {
    char_nb += line.length() + 1;
    remove_trailing_whitespaces(line);

    if (line.length() && line[0] == '#' && state != FASTX_FASTQ_SEP)
      line = "" ;
  }
  return line;
}


unsigned long long OnlineFasta::getPos() {
  if (!this->is_not_gzipped && input_allocated)
    return dynamic_cast<igzstream*>(input)->tellg();

  return char_nb;
}

void OnlineFasta::unexpectedEOF() {
  throw invalid_argument("Unexpected EOF while reading FASTA/FASTQ file");
}


