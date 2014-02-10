#include "sequenceSampler.h"
#include <cstdlib>

SequenceSampler::SequenceSampler(list<Sequence> &seqs):sequences(seqs), length_distribution(NULL) {}

SequenceSampler::~SequenceSampler() {
  if (length_distribution)
    delete [] length_distribution;
}

void SequenceSampler::computeLengthDistribution(size_t nb_buckets) {
  if (length_distribution)
    delete [] length_distribution;

  // Initialize our buckets
  length_distribution = new size_t[nb_buckets];
  for (size_t i=0; i < nb_buckets; i++)
    length_distribution[i] = 0;

  // Count the lengths
  for (list<Sequence>::const_iterator it = sequences.begin(); it != sequences.end(); ++it) {
    size_t length = (*it).sequence.size();
    if (length >= nb_buckets)
      length = nb_buckets-1 ;
    length_distribution[length]++ ;
  }  
}

size_t *SequenceSampler::getLengthDistribution() {
  return length_distribution;
}

list<Sequence> SequenceSampler::getLongest(size_t nb_min, size_t nb_buckets) {
  computeLengthDistribution(nb_buckets);

  size_t to_be_sampled = nb_min ;
  size_t sampled_min_length ;     // The minimum sequence length that will be sampled.

  for (sampled_min_length=nb_buckets-1; sampled_min_length>0; sampled_min_length--) {
    if (to_be_sampled < length_distribution[sampled_min_length]) {
      to_be_sampled = 0;
      break;
    }
    to_be_sampled -= length_distribution[sampled_min_length];
  }

  // Get the sampled sequences whose length is >= sampled_min_length
  list<Sequence> sampled_sequences;
  for (list<Sequence>::const_iterator it = sequences.begin(); it != sequences.end(); ++it) {
    if ((*it).sequence.size() >= sampled_min_length) {
      sampled_sequences.push_back(*it);
      if (sampled_sequences.size() == nb_min)
        break ;
    }
  }

  return sampled_sequences;
}

list<Sequence> SequenceSampler::getRandom(size_t nb_min) {
  size_t total_elements_left = sequences.size();
  nb_min++;                     // Can't reach 0, so start one after
  list<Sequence> sampled_sequences;
  for (list<Sequence>::const_iterator it = sequences.begin()
         ; it != sequences.end() && nb_min > 0; ++it) {
    if (rand() *1.0 / RAND_MAX > nb_min * 1.0 / total_elements_left) {
      nb_min --;
      sampled_sequences.push_back(*it);
    }
    total_elements_left--;
  }
  return sampled_sequences;
}
