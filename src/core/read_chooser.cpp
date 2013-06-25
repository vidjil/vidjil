#include "read_chooser.h"
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

ReadChooser::ReadChooser(list<Sequence> &r, VirtualReadScore &scorer) {
  for (list <Sequence>::const_iterator it = r.begin(); it != r.end(); ++it) {
    scores[it->sequence] = scorer.getScore(it->sequence);
  }

  reads.assign(r.begin(), r.end());
  sort(reads.begin(), reads.end(), *this);
}

Sequence ReadChooser::getBest() const{
  return reads[0];
}

Sequence ReadChooser::getithBest(size_t i) const {
  return reads[i-1];
}

bool ReadChooser::operator()(Sequence first, Sequence second) {
  return scores[first.sequence] > scores[second.sequence];
}
