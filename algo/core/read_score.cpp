#include "read_score.h"
#include <cstdlib>
#include <cstring>


////////////////////////////////////////////////////////////////////////////////
//////////////////////////////  ReadLengthScore  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

ReadLengthScore::ReadLengthScore(){}
ReadLengthScore::~ReadLengthScore(){}

float ReadLengthScore::getScore(const Sequence &sequence) const {
  return sequence.sequence.size();
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////  ReadQualityScore  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

ReadQualityScore::ReadQualityScore(){}
ReadQualityScore::~ReadQualityScore(){}

size_t ReadQualityScore::qualities[MAX_QUALITY];

float ReadQualityScore::getScore(const Sequence &sequence) const {
  memset(qualities, 0, MAX_QUALITY * sizeof(size_t));
  for (size_t i = 0; i < sequence.quality.size(); i++) {
    int current_quality = (sequence.quality[i]) - ' ';
    if(current_quality >= MAX_QUALITY)
      current_quality = MAX_QUALITY - 1;
    else if (current_quality < 0)
      current_quality = 0;
    qualities[current_quality]++;
  }
  int max_percentile = (int) round(sequence.quality.size()*1. / 100);
  int percent_quality = 0;
  // Computes the percentile of the quality
  for (size_t i = 0; i < MAX_QUALITY; i++) {
    max_percentile -= qualities[i];
    if (max_percentile < 0) {
      percent_quality = i;
      break;
    }
  }
  if (! percent_quality)
    percent_quality = GOOD_QUALITY;
  return percent_quality * sequence.sequence.size() / GOOD_QUALITY;
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////  RandomScore  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

RandomScore::RandomScore(){srand(1);} // Ensures a deterministic output
RandomScore::~RandomScore(){}

float RandomScore::getScore(const Sequence &sequence) const {
  UNUSED(sequence);
  return rand() % 500;
}
