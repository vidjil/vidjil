/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>

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

#include "kmeraffect.h"

int affect_strand(const affect_t &affect) {
  return (affect.c & (1 << 7)) ? 1 : -1;
}

char affect_char(const affect_t &affect) {
  return (affect.c & ((1 << 7)-1));
}

// KmerAffect class

bool operator==(const affect_t &a1, const affect_t &a2) {
  return a1.c == a2.c;
}
bool operator<(const affect_t &a1, const affect_t &a2) {
  return a1.c < a2.c;
}
bool operator>(const affect_t &a1, const affect_t &a2) {
  return a1.c > a2.c;
}
bool operator<=(const affect_t &a1, const affect_t &a2) {
  return ! (a1 > a2);
}
bool operator>=(const affect_t &a1, const affect_t &a2) {
  return ! (a1 < a2);
}
bool operator!=(const affect_t &a1, const affect_t &a2) {
  return a1.c != a2.c;
}
string toString(const affect_t &a) {
  string result;
  if(a ==AFFECT_UNKNOWN)
    result = " _";
  else if (a == AFFECT_AMBIGUOUS)
    result = " ?"; 
  else
    result = (affect_strand(a)==1 ? "+" : "-") + string(1,affect_char(a));
  return result;
}
ostream &operator<<(ostream &os, const affect_t &a) {
  os << toString(a);
  return os;
}


KmerAffect::KmerAffect() {
  affect.c = 0;
}

KmerAffect::KmerAffect(const affect_t &a) {
  affect = a;
}

KmerAffect::KmerAffect(const KmerAffect &ka) {
  affect = ka.affect;
}

KmerAffect::KmerAffect(const string &kmer, const string &label,
                       int strand) {
  affect.c = label[0];
  if (strand == 1)
     affect.c |= (1 << 7);
}

KmerAffect &KmerAffect::operator+=(const KmerAffect &kmer) {
  if (kmer.affect != affect) {
    if (affect == AFFECT_UNKNOWN) 
      affect = kmer.affect;
    else if (affect_char(affect) == affect_char(kmer.affect)
             && (affect_strand(affect) != affect_strand(kmer.affect)))
      // Same label but different strand
      // -> we put forward strand by default
      affect.c |= (1 << 7);
    else 
      *this = AFFECT_AMBIGUOUS;
  }
  return *this;
}

KmerAffect &KmerAffect::operator=(const KmerAffect &ka) {
  this->affect = ka.affect;
  return *this;
}

bool KmerAffect::hasRevcompSymetry() {
  return false;
}

int KmerAffect::getStrand() const{
  if (isUnknown() || isAmbiguous())
    return 0;
  return affect_strand(affect);
}

string KmerAffect::getLabel() const {
  if (isUnknown())
    return "_";
  if (isAmbiguous())
    return "?";
  return string(1, affect_char(affect));
}

bool KmerAffect::isAmbiguous() const {
  return affect_strand(affect) == 1 && affect_char(affect) == 0;
}

bool KmerAffect::isUnknown() const {
  return affect.c == 0;
}

string KmerAffect::toString() const {
  return ::toString(affect);
}

bool operator==(const KmerAffect &a1, const KmerAffect &a2) {
  return a1.affect == a2.affect;
}
bool operator<(const KmerAffect &a1, const KmerAffect &a2) {
  return a1.affect < a2.affect;
}
bool operator>(const KmerAffect &a1, const KmerAffect &a2) {
  return a1.affect > a2.affect;
              }
bool operator<=(const KmerAffect &a1, const KmerAffect &a2) {
  return a1.affect <= a2.affect;
}
bool operator>=(const KmerAffect &a1, const KmerAffect &a2) {
  return a1.affect >= a2.affect;
}
bool operator!=(const KmerAffect &a1, const KmerAffect &a2) {
  return a1.affect != a2.affect;
}

ostream &operator<<(ostream &os, const KmerAffect &kmer) {
  os << kmer.affect;
  return os;
}

//////////////////////////////////////////////////

KmerStringAffect::KmerStringAffect() {
  label = "";
  strand = 0;
}

KmerStringAffect::KmerStringAffect(const KmerStringAffect &ksa):
  label(ksa.label),strand(ksa.strand){}


KmerStringAffect::KmerStringAffect(const string &kmer, const string &label,
                                   int strand) {
  this->label = label;
  this->strand = strand;
}

KmerStringAffect &KmerStringAffect::operator+=(const KmerStringAffect &kmer) {
  if (*this != kmer) {
    if (*this == KSA_UNKNOWN) 
      // Not defined yet
      *this = kmer;
    else if (*this != KSA_AMBIGUOUS) {
      if (this->label == kmer.label)
        // Different strand but same label, put forward by default
        strand = 1;
      else
        // Ambiguous: different labels
        *this = KSA_AMBIGUOUS;
    } // else we are already ambiguous, stay as is.
  }
  return *this;
}

KmerStringAffect &KmerStringAffect::operator=(const KmerStringAffect &ka) {
  label = ka.label;
  strand = ka.strand;
  return *this;
}

int KmerStringAffect::getStrand() const {
  return (isUnknown() || isAmbiguous()) ? 0 : strand;
}

string KmerStringAffect::getLabel() const {
  return label;
}

bool KmerStringAffect::isAmbiguous() const {
  return *this == KSA_AMBIGUOUS;
}

bool KmerStringAffect::isUnknown() const {
  return *this == KSA_UNKNOWN;
}

string KmerStringAffect::toString() const {
  if (isUnknown()) {
    return " _";
  }
  
  switch(strand) {
  case 1:
    return "+"+label;
  case -1:
    return "-"+label;
  default:
    return " ?";
  }
}

bool operator==(const KmerStringAffect &k1, const KmerStringAffect &k2) {
  return k1.strand == k2.strand && (k1.label == k2.label || k1.strand == 0);
}
bool operator!=(const KmerStringAffect &k1, const KmerStringAffect &k2) {
  return ! (k1 == k2);
}
bool operator<(const KmerStringAffect &k1, const KmerStringAffect &k2) {
  return k1.label < k2.label || (k1.label == k2.label && k1.strand < k2.strand);
}
bool operator>(const KmerStringAffect &k1, const KmerStringAffect &k2) {
  return k1.label > k2.label || (k1.label == k2.label && k1.strand > k2.strand);
}
bool operator<=(const KmerStringAffect &k1, const KmerStringAffect &k2) {
  return ! (k1 > k2);
}
bool operator>=(const KmerStringAffect &k1, const KmerStringAffect &k2) {
  return ! (k1 < k2);
}

ostream &operator<<(ostream &os, const KmerStringAffect &kmer) {
  os << kmer.toString();
  return os;
}

bool KmerStringAffect::hasRevcompSymetry() {
  return false;
}
