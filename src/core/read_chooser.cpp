#include "read_chooser.h"
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

ReadChooser::ReadChooser(list<Sequence> &r, VirtualReadScore &scorer) {
  for (list <Sequence>::const_iterator it = r.begin(); it != r.end(); ++it) {
    scores[it->sequence] = scorer.getScore(it->sequence);
  }

  vector<Sequence> test(r.begin(), r.end());
  sort(test.begin(), test.end(), *this);
  reads = list<Sequence>(test.begin(), test.end());
}

Sequence ReadChooser::getBest() const{
  return *(reads.begin());
}

list<Sequence> ReadChooser::getSorted() const {
  return reads;
}

bool ReadChooser::operator()(Sequence first, Sequence second) {
  return scores[first.sequence] > scores[second.sequence];
}
