#include "read_chooser.h"
#include <vector>
#include <algorithm>
#include <iostream>
#include <cstdlib>
using namespace std;

int compare_score_seq(const void *si1, const void *si2) {
  const score_seq *s1 = (const score_seq *)si1;
  const score_seq *s2 = (const score_seq *)si2;
  if (s1->score < s2->score)
    return 1;
  if (s1->score == s2->score)
    return 0;
  return -1;
}

ReadChooser::ReadChooser(list<Sequence> &r, VirtualReadScore &scorer) {
  reads = new score_seq[r.size()];

  size_t i = 0;
  for (list <Sequence>::iterator it = r.begin(); it != r.end(); ++it) {
    reads[i].score = scorer.getScore(it->sequence);
    reads[i].seq = &(*it);
    i++;
  }

  qsort(reads, r.size(), sizeof(score_seq), compare_score_seq);
}

ReadChooser::~ReadChooser() {
  delete [] reads;
}

Sequence ReadChooser::getBest() const{
  return *(reads[0].seq);
}

Sequence ReadChooser::getithBest(size_t i) const {
  return *(reads[i-1].seq);
}
