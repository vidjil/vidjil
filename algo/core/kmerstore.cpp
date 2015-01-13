/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011, 2012, 2013, 2014, 2015 by Bonsai bioinformatics 
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
*/


#include <cmath>
#include <list>
#include "kmerstore.h"

// KMer class

Kmer::Kmer():count(0) {}

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
Kmer::Kmer(const string &label, int strand) {
  count = 1;
}
#pragma GCC diagnostic pop

Kmer &Kmer::operator+=(const Kmer &kmer) {
  count += kmer.count;
  return *this;
}

bool Kmer::hasRevcompSymetry() {
  return true;
}

ostream &operator<<(ostream &os, const Kmer &kmer) {
  os << kmer.count << ",";
  return os;
}


