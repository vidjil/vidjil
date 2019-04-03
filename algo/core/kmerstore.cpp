/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011-2019 by VidjilNet consortium and Bonsai bioinformatics
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
Kmer::Kmer(const string &label, int strand, size_t length) {
  count = 1;
}
#pragma GCC diagnostic pop

Kmer &Kmer::operator+=(const Kmer &kmer) {
  count += kmer.count;
  return *this;
}

string Kmer::getLabel() const{
	return "";
}

size_t Kmer::getLength() const{
  return 10;
}

bool Kmer::hasRevcompSymetry() {
  return true;
}

bool Kmer::isNull() const{
  return count == 0;
}

bool Kmer::isUnknown() const{
  return false;
}

ostream &operator<<(ostream &os, const Kmer &kmer) {
  os << kmer.count << ",";
  return os;
}

bool operator==(const Kmer &k1, const Kmer &k2) {
  return k1.count == k2.count;
}

bool operator<(const Kmer &k1, const Kmer &k2) {
  return k1.count < k2.count;
}

bool operator>(const Kmer &k1, const Kmer &k2) {
  return k1.count > k2.count;
}

bool operator<=(const Kmer &k1, const Kmer &k2) {
  return ! (k1 > k2);
}

bool operator>=(const Kmer &k1, const Kmer &k2) {
  return ! (k1 < k2);
}

bool operator!=(const Kmer &k1, const Kmer &k2) {
  return ! (k1 == k2);
}

