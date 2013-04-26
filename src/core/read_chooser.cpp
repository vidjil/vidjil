#include "read_chooser.h"
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

ReadChooser::ReadChooser(list<Sequence> &r, VirtualReadScore &scorer) {
  float best_score = -1;
  float current_score;

  for (list <Sequence>::const_iterator it = r.begin(); it != r.end(); ++it) {
    current_score = scorer.getScore(it->sequence);
    if (current_score > best_score) {
      best_score = current_score;
      best_sequence = *it;
    }
  }
  // vector<Sequence> test(r.begin(), r.end());
  // sort(test.begin(), test.end(), *this);
  // reads = list<Sequence>(test.begin(), test.end());
}

Sequence ReadChooser::getBest() const{
  return best_sequence;
}

// list<Sequence> ReadChooser::getSorted() const {
//   return reads;
// }

// bool ReadChooser::operator()(Sequence first, Sequence second) {
//   return scorer.getScore(first.sequence) > scorer.getScore(second.sequence);
// }
