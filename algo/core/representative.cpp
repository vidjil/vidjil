#include "representative.h"
#include "kmerstore.h"
#include "read_score.h"
#include "read_chooser.h"
#include "stats.h"
#include "tools.h"

#include <cstring>
#include <iostream>
using namespace std;

RepresentativeComputer::RepresentativeComputer(list<Sequence> &r)
  :sequences(r),is_computed(false),representative(),min_cover(1),
   percent_cover(0.5),revcomp(true),required(""),coverage_reference_length(0),
   coverage(0.0),coverage_info("") {
}

Sequence RepresentativeComputer::getRepresentative() const{
  assert(hasRepresentative());
  return representative;
}

bool RepresentativeComputer::hasRepresentative() const{
  return is_computed;
}

bool RepresentativeComputer::isSufficienlyExpressed(size_t count,
                                                    size_t max) const {
  return count>= min_cover
    && count >= max*percent_cover;
}

void RepresentativeComputer::setMinCover(size_t min_cover) {
  this->min_cover = min_cover;
}

void RepresentativeComputer::setOptions(bool do_revcomp, size_t min_cover, 
                                        float percent_cover) {
  setMinCover(min_cover);
  setPercentCoverage(percent_cover);
  setRevcomp(do_revcomp);
}

void RepresentativeComputer::setPercentCoverage(float percent_cover) {
  this->percent_cover = percent_cover;
}

void RepresentativeComputer::setRevcomp(bool do_revcomp) {
  this->revcomp = do_revcomp;
}

void RepresentativeComputer::setRequiredSequence(string sequence) {
  required = sequence;
}

void RepresentativeComputer::setCoverageReferenceLength(float coverage_reference_length) {
  this->coverage_reference_length = coverage_reference_length;
}

string KmerRepresentativeComputer::getSeed() const{
  return seed;
}

float KmerRepresentativeComputer::getCoverage() const{
  return coverage;
}

string KmerRepresentativeComputer::getQuality() const{
  return quality;
}

string KmerRepresentativeComputer::getCoverageInfo() const{
  return coverage_info;
}

void KmerRepresentativeComputer::setStabilityLimit(int limit) {
  stability_limit = limit;
}

KmerRepresentativeComputer::KmerRepresentativeComputer(list<Sequence> &r,
                                                       string seed)
  :RepresentativeComputer(r),seed(seed),stability_limit(DEFAULT_STABILITY_LIMIT){}
  
void KmerRepresentativeComputer::compute(VirtualReadScore &readScorer, bool try_hard) {
  assert(coverage_reference_length > 0);
  assert(required.length() > 0);
  is_computed = false;
  string seed = getSeed();

  if (seed.size() == 0)
    seed = "##########";

  assert(seed.find('-') == string::npos);

  string seeds[] = {seed, // The first seed should be a contiguous seed.
                    "##-##-##-##-##-",
                    "#-##-##-##-##-#",
                    "-##-##-##-##-##",
                    "--#--#--#--#--#--#--#--#--#--#"};
  size_t nb_seeds = 5;

  if (! try_hard)
    nb_seeds = 1;

  // First create an index on the set of reads
  IKmerStore<Kmer> *index[nb_seeds];
  for (size_t i = 0; i < nb_seeds; i++) {
    index[i] = new MapKmerStore<Kmer>(seeds[i], revcomp);
  }

  // Add sequences to the index, allowing extended nucleotides (false)
  for (list<Sequence>::iterator it=sequences.begin(); it != sequences.end(); ++it) {
    for (size_t i = 0; i < nb_seeds; i++)
      index[i]->insert(it->sequence, it->label, false, 0, seeds[i]);
  }

  // Create a read chooser to have the sequences sorted on the criteria we want
  ReadChooser rc(sequences, readScorer);

  // Traverse the sequences to get the desired representative
  size_t pos_longest_run = 0;
  size_t length_longest_run = 0;
  size_t seq_index_longest_run = 1;
  size_t length_longest_cover = 0;
  size_t pos_required_longest = 0;
  Sequence sequence_longest_run;
  bool *cover_longest_run = NULL;
  int sequence_used_for_quality = 0;
  int window_quality_sum [required.length()];
  memset(window_quality_sum, 0, required.length()*sizeof(int));
  
  for (size_t seq = 1; seq <= sequences.size() && seq <= seq_index_longest_run + stability_limit ; seq++) {
    Sequence sequence = rc.getithBest(seq);
    size_t length_cover = 0;
    
    // Break as soon as the sequences are too small
    if (sequence.sequence.size() < required.size()) {
      break;
    }
    
    size_t pos_required = sequence.sequence.find(required);
    if (pos_required == string::npos && revcomp)
      pos_required = sequence.sequence.find(::revcomp(required));

    if (pos_required == string::npos) {
      continue;
    }
    
    //sum quality
    if (sequence.quality.length() > 0) {
      for (size_t i = 0; i<required.length(); i++) {
        window_quality_sum[i] += static_cast<int>(sequence.quality[i+pos_required]);
      }
      sequence_used_for_quality++;
    }

    // When sequences are smaller than length_longest_run,
    // they are used only for the above quality computation
    if (sequence.sequence.size() <= length_longest_cover) {
      continue;
    }

    bool cover[sequence.sequence.size()];
    memset(cover, false, sequence.sequence.size()*sizeof(bool));

    size_t pos_end_required = pos_required + required.length();

    memset(&cover[pos_required], true, required.length()*sizeof(bool));
    length_cover = required.length();

    vector<Kmer> *counts = new vector<Kmer>[nb_seeds];
    for (size_t i = 0; i < nb_seeds; i++)
      counts[i] = index[i]->getResults(sequence.sequence, false, seeds[i]);

    size_t length_run = 0;
    size_t i = pos_required;
    bool was_extended = true;

    // Extend to the left, starting from 'pos_required'
    while (i > 0 && was_extended) {
      was_extended = tryToExtendRepresentative(counts, seeds, nb_seeds, i, cover, length_cover, -1);
      if (was_extended) {
        i--;
        length_run++;
      }
    }
    
    // Extend to the right, starting from 'pos_end_required'
    i = pos_end_required-1;
    length_run += pos_end_required - pos_required;
    was_extended = true;
    while (i < sequence.sequence.size() && was_extended) {
      was_extended = tryToExtendRepresentative(counts, seeds, nb_seeds, i, cover, length_cover, 1);
      if (was_extended) {
        i++;
        length_run++;
      }
    }

    if (length_cover > length_longest_cover
        || ((length_cover == length_longest_cover) && (length_run > length_longest_run))) {
      length_longest_run = length_run;
      pos_longest_run = i - (length_run - 1);
      sequence_longest_run = sequence;
      length_longest_cover = length_cover;
      seq_index_longest_run = seq;
      pos_required_longest = pos_required;
      if (cover_longest_run)
        delete [] cover_longest_run;
      cover_longest_run = new bool[sequence.sequence.size()];
      memcpy(cover_longest_run, cover, sizeof(bool) * sequence.sequence.size());
    }
    // We have a requirement (ie. a non empty string). We reached it, exit.
    length_run = 0;
    delete [] counts;
  }

  coverage = (float) length_longest_run / coverage_reference_length;


  if (coverage < THRESHOLD_BAD_COVERAGE && ! try_hard) {
    compute(readScorer, true);
    delete index[0];

    if (cover_longest_run)
      delete [] cover_longest_run;

    return;
  }

  if (length_longest_run) {
    is_computed = true;
    representative = sequence_longest_run;
    if (nb_seeds > 1) {
      size_t last_pos_covered = 0;
      for (size_t i = 0; i < sequence_longest_run.sequence.size(); i++) {
        if (!cover_longest_run[i])
          representative.sequence[i] = 'N';
        else
          last_pos_covered = i;
      }
      // Update length_longest_run with its actual value
      length_longest_run = last_pos_covered - pos_longest_run + 1;
      trimSequence(representative.sequence, pos_longest_run, length_longest_run,
                   pos_required_longest, required.length());
    }
    delete [] cover_longest_run;
    representative.sequence = representative.sequence.substr(pos_longest_run, length_longest_run);
    representative.label = representative.label + "-[" + string_of_int(pos_longest_run) + "," 
      + string_of_int(pos_longest_run + length_longest_run - 1) + "]"
      + "-#" + string_of_int(seq_index_longest_run);

    quality = "";
    
    if (sequence_used_for_quality > 0) {
      //init default quality
      for (size_t i = 0; i < representative.sequence.length(); i++)
        quality += "!";
    
      //add window quality
      size_t pos_required = representative.sequence.find(required);
      if (pos_required == string::npos && revcomp) {
        size_t pos_required_rev = ::revcomp(representative.sequence).find(required);
        size_t pos_end_required_rev = pos_required_rev+required.length();
        for (size_t i = 0; i<required.length(); i++)
          quality[pos_end_required_rev-i-1] = static_cast<char>(window_quality_sum[i]/sequence_used_for_quality);
      }else{
        for (size_t i = 0; i<required.length(); i++)
          quality[pos_required+i] = static_cast<char>(window_quality_sum[i]/sequence_used_for_quality);
      }
    }
    
    coverage_info  = string_of_int(length_longest_run) + " bp"
      + " (" + string_of_int(100 * coverage) + "% of " + fixed_string_of_float(coverage_reference_length, 1) + " bp)";

    representative.label += " - " + coverage_info;
  }
  for (size_t i = 0; i < nb_seeds; i++)
    delete index[i];
}

bool KmerRepresentativeComputer::tryToExtendRepresentative(const vector<Kmer> counts[],
                                                           string seeds[],
                                                           size_t nb_seeds,
                                                           size_t i,
                                                           bool *cover,
                                                           size_t &length_cover,
                                                           int direction) {
  bool was_extended = false;
  for (size_t current_seed = 0; current_seed < nb_seeds && ! was_extended; current_seed++) {
    int pos_of_interest;
    if (direction == 1) {
      pos_of_interest = (i+1) - seeds[current_seed].size() + 1;
    }
    else
      pos_of_interest = i - 1;
    if (pos_of_interest < (int) counts[current_seed].size() && pos_of_interest >= 0) {
      if (isSufficienlyExpressed(counts[current_seed][pos_of_interest].count, sequences.size())) {
	i += direction;

	if (nb_seeds > 1) {
	  size_t seed_length = seeds[current_seed].size();
	  for (size_t pos = 0; pos < seed_length; pos++) {
	    bool previous_cover = cover[pos_of_interest+pos];
	    cover[pos_of_interest+pos] |= (seeds[current_seed][pos] == '#');
	    if (! previous_cover && cover[pos_of_interest+pos])
	      length_cover++;
	  }
	} else {
	  int pos_modif = (direction == -1) ? pos_of_interest : i;
	  if (!cover[pos_modif])
	    length_cover++;
	  cover[pos_modif] = true;
	}

	was_extended = true;
      }
    }
  }
  return was_extended;
}

