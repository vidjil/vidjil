#include "stats.h"
#include "tools.h"

Stats::Stats()
{
  nb = 0 ;
  data = 0 ;
}

void Stats::setLabel(string _label)
{
  label = _label ;
}

void Stats::insert(int _data)
{
  nb++ ;
  data += _data ;
}

float Stats::getAverage()
{
  return (float) data / nb ;
}

ostream &operator<<(ostream &out, Stats &stats)
{
  output_label_average(out, stats.label, stats.nb, stats.getAverage());
  return out;
}
