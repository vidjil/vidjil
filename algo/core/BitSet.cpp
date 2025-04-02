#include "BitSet.hpp"
#include <cassert>
#include <cstring>
#include "tools.h"

BitSet::BitSet(uint64_t nb_bits) {
  this->m_int_size = nb_bits / WORD_SIZE + ((nb_bits % WORD_SIZE > 0) ? 1 : 0);
  this->m_bits = new uint64_t[this->m_int_size];
  this->m_nb_bits = nb_bits;
  this->reset();
}

BitSet::BitSet(const BitSet &bitset) {
  this->m_int_size = bitset.m_int_size;
  this->m_bits = new uint64_t[this->m_int_size];
  this->m_nb_bits = bitset.m_nb_bits;
  memcpy(this->m_bits, bitset.m_bits, this->m_int_size * sizeof(uint64_t));
}

BitSet::~BitSet() {
  delete [] this->m_bits;
}

uint64_t BitSet::count() const {
  uint64_t total = 0;
  for (uint64_t i = 0; i < this->m_int_size; i++)
    total += popcount64(this->m_bits[i]);
  return total;
}

void BitSet::flip() {
  for (uint64_t i = 0; i < this->m_int_size-1; i++)
    m_bits[i] = ~m_bits[i];
  // In last block we must not flip them all
  uint nb_bits_remaining = this->m_nb_bits % 64;
  if (nb_bits_remaining == 0)
    this->m_bits[this->m_int_size-1] = ~this->m_bits[this->m_int_size-1];
  else
    this->m_bits[this->m_int_size-1] ^= ((uint64_t)1 << nb_bits_remaining) - 1;
}

bool BitSet::get(uint64_t pos) const {
  return (bitget(this->m_bits, pos) == 1);
}

void BitSet::set(uint64_t pos) {
  bitset(this->m_bits, pos);
}

void BitSet::setConsecutive(uint64_t pos, char len) {
  assert(len <= 64);

  uint64_t cell = pos / WORD_SIZE;
  char pos_in_cell = pos % WORD_SIZE;
  char len_in_cell = std::min(64 - pos_in_cell, (int)len);
  this->setConsecutiveInGivenCell(cell, pos_in_cell, len_in_cell);

  if (len_in_cell != len) {
    // Split between two blocs, store the remaining in the next one
    cell++;
    len_in_cell = len - len_in_cell;
    pos_in_cell = 0;
    this->setConsecutiveInGivenCell(cell, pos_in_cell, len_in_cell);
  }
}

void BitSet::setConsecutiveInGivenCell(uint64_t cell, char pos_in_cell, char len_in_cell) {
  uint64_t mask = ((uint64_t)1 << len_in_cell) - 1; // len_in_cell 1s at the lsb
  this->m_bits[cell] |= mask << pos_in_cell;
}

void BitSet::reset() {
  memset(this->m_bits, 0, this->m_int_size * WORD_SIZE / CHAR_BIT);
}

uint64_t BitSet::size() const {
  return this->m_nb_bits;
}

BitSet &BitSet::operator&=(const BitSet &bitset) {
  assert(this->size() == bitset.size());

  for (uint64_t i = 0; i < m_int_size; i++) {
    this->m_bits[i] &= bitset.m_bits[i];
  }
  return *this;
}

BitSet operator& (const BitSet &b1, const BitSet &b2) {
  assert(b1.size() == b2.size());
  BitSet result(b1.size());
  for (uint64_t i = 0; i < b1.m_int_size; i++) {
    result.m_bits[i] = b1.m_bits[i] & b2.m_bits[i];
  }
  return result;
}

std::ostream &operator<<(std::ostream &os, const BitSet &bitset) {
  for (uint64_t i = 0; i < bitset.size(); i++) {
    os << bitset.get(i);
  }
  return os;
}
