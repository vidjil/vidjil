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

#include "kmeraffect.h"
#include <cassert>

int affect_strand(const affect_t &affect) {
  return (affect.c & (1 << 7)) ? 1 : -1;
}

char affect_char(const affect_t &affect) {
  return (affect.c & ((1 << 7)-1));
}

size_t affect_length(const affect_t &affect) {
  return affect.length;
}

// KmerAffect class

bool operator==(const affect_t &a1, const affect_t &a2) {
  return a1.c == a2.c &&
    (affect_char(a1) == AFFECT_AMBIGUOUS_CHAR || affect_char(a1) == AFFECT_UNKNOWN_CHAR
     || a1.length == (unsigned char) ~0 || a2.length == (unsigned char)~0 || a1.length == a2.length);
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
  return ! (a1 == a2);
}
string toString(const affect_t &a) {
  string result;
  result = toStringSigns(a);
  result += toStringValues(a);
  return result;
}

string toStringValues(const affect_t &a){
  if(a == AFFECT_UNKNOWN.affect){
    return AFFECT_UNKNOWN_TO_STRING;
  }
  if(a == AFFECT_AMBIGUOUS.affect){
    return AFFECT_AMBIGUOUS_TO_STRING;
  }
  return string(1,affect_char(a));
}

string toStringSigns(const affect_t &a){
  if((a == AFFECT_UNKNOWN.affect) || (a == AFFECT_AMBIGUOUS.affect))
    return " ";
  else
    return (affect_strand(a)==1 ? "+" : "-");
}

ostream &operator<<(ostream &os, const affect_t &a) {
  os << toString(a);
  return os;
}


KmerAffect::KmerAffect() {
  *this = AFFECT_UNKNOWN;
}

KmerAffect::KmerAffect(const affect_t &a) {
  affect = a;
}

KmerAffect::KmerAffect(const KmerAffect &ka) {
  affect = ka.affect;
}

KmerAffect::KmerAffect(const KmerAffect &ka, bool reverse) {
  affect = ka.affect;
  if (reverse)
    affect.c ^= (1 << 7);
}

KmerAffect::KmerAffect(const string &label,
                       int strand, size_t length) {
  affect.c = label[0];
  affect.length = length;
  if (strand == 1)
     affect.c |= (1 << 7);
}

KmerAffect &KmerAffect::operator+=(const KmerAffect &kmer) {
  if (kmer.affect != affect) {
    if (isUnknown())
      *this = kmer;
    else if (affect_char(affect) == affect_char(kmer.affect)
             && (affect_strand(affect) != affect_strand(kmer.affect))) {
      // Same label but different strand
      // -> we put ambiguous, we could have something to say that
      // strand is ambiguous but not the label, but we don't have enough space
      // in 1 byte…
      *this = AFFECT_AMBIGUOUS;
      affect.length = kmer.getLength();
    } else {
      assert(affect.c != kmer.affect.c || getLength() == kmer.getLength());
      *this = AFFECT_AMBIGUOUS;
      affect.length = kmer.getLength();
    }
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

KmerAffect KmerAffect::getAmbiguous() {
  return AFFECT_AMBIGUOUS;
}

int KmerAffect::getStrand() const{
  if (isUnknown() || isAmbiguous())
    return 0;
  return affect_strand(affect);
}

string KmerAffect::getLabel() const {
 return ::toStringValues(affect);
}

unsigned char KmerAffect::getLength() const {
  return affect_length(affect);
}

KmerAffect KmerAffect::getUnknown() {
  return AFFECT_UNKNOWN;
}

bool KmerAffect::isAmbiguous() const {
  return affect_strand(affect) == 1 && affect_char(affect) == AFFECT_AMBIGUOUS_CHAR;
}

bool KmerAffect::isNull() const {
  return isUnknown();
}

bool KmerAffect::isUnknown() const {
  return affect.c == (int) AFFECT_UNKNOWN_CHAR;
}

bool KmerAffect::isGeneric() const {
  return !(isUnknown() || isAmbiguous());
}

string KmerAffect::toString() const {
  return ::toString(affect);
}

string KmerAffect::toStringValues() const {
  return ::toStringValues(affect);
}

string KmerAffect::toStringSigns() const {
  return ::toStringSigns(affect);
}

void KmerAffect::setLength(unsigned char length) {
  affect.length = length;
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
  return ! (a1 == a2);
}

ostream &operator<<(ostream &os, const KmerAffect &kmer) {
  os << kmer.affect;
  return os;
}

