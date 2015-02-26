#include "stats.h"

Stats::Stats()
{
  nb = 0 ;
  length = 0 ;
}

void Stats::setLabel(string _label)
{
  label = _label ;
}

void Stats::insert(int _length)
{
  nb++ ;
  length += _length ;
}

float Stats::getAverageLength()
{
  return (float) length / nb ;
}

ostream &operator<<(ostream &out, Stats &stats)
{
  if (stats.label.size())
    out << "   " << left << setw(20) << stats.label << " ->" ;

  out << right << setw(9) << stats.nb ;
  out << "      " << setw(5) ;
  if (stats.nb)
    out << fixed << setprecision(1) << stats.getAverageLength() ;
  else
    out << "-" ;
  
  return out;
}
