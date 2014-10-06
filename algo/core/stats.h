
#ifndef STATS_H
#define STATS_H

#include <string>
#include <iostream>
#include <iomanip>

using namespace std;

class Stats {
 public:
  string label;
  int nb;
  int length;

 public:
  Stats();
  void setLabel(string _label);
  void insert(int _length);

  float getAverageLength();
};

ostream &operator<<(ostream &out, Stats &stats);

#endif
