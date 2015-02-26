#include "stats.h"

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
  out << "  ";
  
  if (stats.label.size())
    out << left << setw(17) << stats.label << "->" ;

  out << right << setw(9) << stats.nb ;
  out << "   " << setw(5) ;
  if (stats.nb)
    out << fixed << setprecision(1) << stats.getAverage() ;
  else
    out << "-" ;
  
  return out;
}
