#include "representative.h"
#include "kmerstore.h"
#include "read_score.h"
#include "read_chooser.h"
#include "stats.h"

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
  
void KmerRepresentativeComputer::compute() {
  assert(coverage_reference_length > 0);
  is_computed = false;

  // First create an index on the set of reads
  IKmerStore<Kmer> *index = new MapKmerStore<Kmer>(getSeed(), revcomp);

  string seeds[] = {"##########", // The first seed should be a contiguous seed.
                    "##-##-##-##-##-",
                    "#-##-##-##-##-#",
                    "-##-##-##-##-##",
                    "--#--#--#--#--#--#--#--#--#--#"};
  size_t nb_seeds = 5;
  // Add sequences to the index, allowing extended nucleotides (false)
  for (list<Sequence>::iterator it=sequences.begin(); it != sequences.end(); ++it) {
    for (size_t i = 0; i < nb_seeds; i++)
      index->insert(it->sequence, it->label, false, 0, seeds[i]);
  }

  // Create a read chooser to have the sequences sorted by length
  ReadQualityScore *rlc = new ReadQualityScore();
  ReadChooser rc(sequences, *rlc);
   delete rlc;

  // Traverse the sequences to get the desired representative
  size_t pos_longest_run = 0;
  size_t length_longest_run = 0;
  size_t seq_index_longest_run = 1;
  Sequence sequence_longest_run;
  bool *cover_longest_run = NULL;
  int sequence_used_for_quality = 0;
  int window_quality_sum [required.length()];
  memset(window_quality_sum, 0, required.length()*sizeof(int));
  
  size_t k = getSeed().length();

  for (size_t seq = 1; seq <= sequences.size() && seq <= seq_index_longest_run + stability_limit ; seq++) {
    Sequence sequence = rc.getithBest(seq);

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
    if (sequence.sequence.size() <= length_longest_run) {
      continue;
    }

    bool cover[sequence.sequence.size()];
    memset(cover, false, sequence.sequence.size()*sizeof(bool));

    size_t pos_end_required = pos_required + required.length();

    memset(&cover[pos_required], true, required.length()*sizeof(bool));

    vector<Kmer> counts[nb_seeds];
    for (size_t i = 0; i < nb_seeds; i++)
      counts[i] = index->getResults(sequence.sequence, false, seeds[i]);

    size_t length_run = 0;
    size_t i = pos_required;
    bool was_extended = true;

    // Extend to the left, starting from 'pos_required'
    while (i > 0 && was_extended) {
      was_extended = tryToExtendRepresentative(counts, seeds, nb_seeds, i, cover, -1);
      if (was_extended) {
        i--;
        length_run++;
      }
    }
    
    // Extend to the right, starting from 'pos_required'
    i = pos_required ;
    was_extended = true;
    while (i+1 < counts[0].size() && was_extended) {
      was_extended = tryToExtendRepresentative(counts, seeds, nb_seeds, i, cover, 1);
      if (was_extended) {
        i++;
        length_run++;
      }
    }

      if (length_run)
        // Take into account the whole k-mer, not just the starting positions
        length_run += k - 1;
      if (length_run > length_longest_run) {
        length_longest_run = length_run;
        pos_longest_run = i - (length_run - k + 1);
        sequence_longest_run = sequence;
        seq_index_longest_run = seq;
        if (cover_longest_run)
          delete [] cover_longest_run;
        cover_longest_run = new bool[sequence.sequence.size()];
        memcpy(cover_longest_run, cover, sizeof(bool) * sequence.sequence.size());
      }
      // We have a requirement (ie. a non empty string). We reached it, exit.
      if (pos_required != pos_end_required)
        break;
      length_run = 0;
  }

  if (length_longest_run) {
    is_computed = true;
    representative = sequence_longest_run;
    if (nb_seeds > 1) {
      for (size_t i = 0; i < sequence_longest_run.sequence.size(); i++) {
        if (!cover_longest_run[i])
          representative.sequence[i] = 'N';
      }
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
    
    coverage = (float) length_longest_run / coverage_reference_length;

    coverage_info  = string_of_int(length_longest_run) + " bp"
      + " (" + string_of_int(100 * coverage) + "% of " + fixed_string_of_float(coverage_reference_length, 1) + " bp)";

    representative.label += " - " + coverage_info ;
  }
  delete index;
}

bool KmerRepresentativeComputer::tryToExtendRepresentative(const vector<Kmer> counts[],
                                                           string seeds[],
                                                           size_t nb_seeds,
                                                           size_t i,
                                                           bool *cover,
                                                           int direction) {
  bool was_extended = false;
  for (size_t current_seed = 0; current_seed < nb_seeds && ! was_extended; current_seed++) {
    if (isSufficienlyExpressed(counts[current_seed][i+direction].count, sequences.size())) {
      i += direction;

      if (nb_seeds > 1) {
        size_t seed_length = seeds[current_seed].size();
        for (size_t pos = 0; pos < seed_length; pos++)
          cover[i+pos] |= (seeds[current_seed][pos] == '#');
      } else {
        if (direction == -1)
          cover[i] = true;
        else {
          cover[i + seeds[current_seed].size() - 1] = true;
        }
      }

      was_extended = true;
    }
  }
  return was_extended;
}
