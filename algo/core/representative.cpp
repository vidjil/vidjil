#include "representative.h"
#include "kmerstore.h"
#include "read_score.h"
#include "read_chooser.h"
#include "stats.h"

#include <iostream>
using namespace std;

RepresentativeComputer::RepresentativeComputer(list<Sequence> &r)
  :sequences(r),is_computed(false),representative(),min_cover(1),
   percent_cover(0.5),revcomp(true),required(""),coverage(0.0),coverage_info("") {
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
  is_computed = false;

  // First create an index on the set of reads
  IKmerStore<Kmer> *index = new MapKmerStore<Kmer>(getSeed(), revcomp);

  // Add sequences to the index, allowing extended nucleotides (false)
  for (list<Sequence>::iterator it=sequences.begin(); it != sequences.end(); ++it) {
    index->insert(it->sequence, it->label, false);
  }
  
  size_t max = sequences.size();
  // Create a read chooser to have the sequences sorted by length
  ReadLengthScore *rlc = new ReadLengthScore();
  ReadChooser rc(sequences, *rlc);
  delete rlc;

  // Traverse the sequences to get the desired representative
  size_t pos_longest_run = 0;
  size_t length_longest_run = 0;
  size_t seq_index_longest_run = 1;
  Sequence sequence_longest_run;
  size_t k = getSeed().length();

  for (size_t seq = 1; seq <= sequences.size() && seq <= seq_index_longest_run + stability_limit ; seq++) {
    Sequence sequence = rc.getithBest(seq);

    if (sequence.sequence.size() <= length_longest_run) {
      continue;
    }
    size_t pos_required = sequence.sequence.find(required);
    if (pos_required == string::npos && revcomp)
      pos_required = sequence.sequence.find(::revcomp(required));

    if (pos_required == string::npos) {
      continue;
    }

    size_t pos_end_required = pos_required + required.length();

    vector<Kmer> counts = index->getResults(sequence.sequence);

    size_t length_run = 0;
    size_t i = pos_required;

    // Extend to the left, starting from 'pos_required'
      while (i > 0 && isSufficienlyExpressed(counts[i-1].count, max)) {
        i--;
        length_run++;
      }
    
    // Extend to the right, starting from 'pos_required'
    for (i = pos_required; i < counts.size(); i++) {
      while (i < counts.size() && 
             isSufficienlyExpressed(counts[i].count, max)) {
        length_run++;
        i++;
      }
      
      if (length_run)
        // Take into account the whole k-mer, not just the starting positions
        length_run += k - 1;
      if (length_run > length_longest_run) {
        length_longest_run = length_run;
        pos_longest_run = i - (length_run - k + 1);
        sequence_longest_run = sequence;
        seq_index_longest_run = seq;
      }
      // We have a requirement (ie. a non empty string). We reached it, exit.
      if (pos_required != pos_end_required)
        break;
      length_run = 0;
    }
  }

  if (length_longest_run) {
    is_computed = true;
    representative = sequence_longest_run;
    representative.sequence = representative.sequence.substr(pos_longest_run, length_longest_run);
    representative.label = representative.label + "-[" + string_of_int(pos_longest_run) + "," 
      + string_of_int(pos_longest_run + length_longest_run - 1) + "]"
      + "-#" + string_of_int(seq_index_longest_run);

    representative.quality = "";

    coverage = (float) length_longest_run / coverage_reference_length;

    coverage_info  = string_of_int(length_longest_run) + " bp"
      + " (" + string_of_int(100 * coverage) + "% of " + fixed_string_of_float(coverage_reference_length, 1) + " bp)";

    representative.label += " - " + coverage_info ;
  }
  delete index;
}
