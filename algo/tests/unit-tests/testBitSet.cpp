#include "tests.h"
#include <core/BitSet.hpp>


void testBitSet1() {
  uint size = 100;
  BitSet b(size);

  TAP_TEST_EQUAL(b.count(), 0, TEST_BITSET_COUNT, "");
  for (uint i = 0; i < size; i++) {
    TAP_TEST_EQUAL(b.get(i), 0, TEST_BITSET_GET, "");
  }


  uint pos_set_bits[] = {0, 63, 64};
  uint nb_set_bits = sizeof(pos_set_bits) / sizeof(uint);
  
  for (uint i = 0; i < nb_set_bits; i++) {
    b.set(pos_set_bits[i]);
    TAP_TEST_EQUAL(b.get(pos_set_bits[i]), 1, TEST_BITSET_GET, "");
    b.set(pos_set_bits[i]);
    TAP_TEST_EQUAL(b.get(pos_set_bits[i]), 1, TEST_BITSET_GET, "");    
  }
  TAP_TEST_EQUAL(b.count(), nb_set_bits, TEST_BITSET_SET, "");
  uint j = 0;
  for (uint i = 0; i < size; i++) {
    if (j < nb_set_bits && i == pos_set_bits[j]) {
      TAP_TEST_EQUAL(b.get(i), 1, TEST_BITSET_SET, "pos " << i);
      j++;
    } else {
      TAP_TEST_EQUAL(b.get(i), 0, TEST_BITSET_SET, "pos " << i);
    }
  }

  b.flip();
  TAP_TEST_EQUAL(b.count(), size - nb_set_bits, TEST_BITSET_FLIP, "");
  j = 0;
  for (uint i = 0; i < size; i++) {
    if (j < nb_set_bits && i == pos_set_bits[j]) {
      TAP_TEST_EQUAL(b.get(i), 0, TEST_BITSET_FLIP, "pos " << i);
      j++;
    } else {
      TAP_TEST_EQUAL(b.get(i), 1, TEST_BITSET_FLIP, "pos " << i);
    }
  }

  b.flip();
  TAP_TEST_EQUAL(b.count(), nb_set_bits, TEST_BITSET_FLIP, "");
  j = 0;
  for (uint i = 0; i < size; i++) {
    if (j < nb_set_bits && i == pos_set_bits[j]) {
      TAP_TEST_EQUAL(b.get(i), 1, TEST_BITSET_FLIP, "");
      j++;
    } else {
      TAP_TEST_EQUAL(b.get(i), 0, TEST_BITSET_FLIP, "");
    }
  }

  pair<uint, uint> consecutive_sets[] = { {5, 3}, {60, 10}, {80, 12} };
  uint nb_consecutive_sets = sizeof(consecutive_sets) / sizeof(pair<uint, uint>);
  uint total_nb = 0;
  for (uint i = 0; i < nb_consecutive_sets; i++) {
    b.setConsecutive(consecutive_sets[i].first, consecutive_sets[i].second);
    total_nb += consecutive_sets[i].second;
  }
  total_nb += nb_set_bits - 2;                // Bits 63 and 64 already set

  TAP_TEST_EQUAL(b.count(), total_nb, TEST_BITSET_CONSECUTIVE_SET, "");

  j = 0;
  uint k = 0;
  for (uint i = 0; i < size; i++) {
    if (j < nb_set_bits && i == pos_set_bits[j]) {
      TAP_TEST_EQUAL(b.get(i), 1, TEST_BITSET_CONSECUTIVE_SET, "");
      j++;
    } else if (k < nb_consecutive_sets && i >= consecutive_sets[k].first &&
               i < consecutive_sets[k].first + consecutive_sets[k].second) {
      TAP_TEST_EQUAL(b.get(i), 1, TEST_BITSET_CONSECUTIVE_SET, "");
      if (i == consecutive_sets[k].first + consecutive_sets[k].second - 1)
        k++;
    } else {
      TAP_TEST_EQUAL(b.get(i), 0, TEST_BITSET_CONSECUTIVE_SET, "");
    }
  }
}

void testBitSetFlip() {
  BitSet b1(256);
  b1.flip();

  TAP_TEST_EQUAL(b1.count(), 256, TEST_BITSET_FLIP, "");
}
  

void testBitSetAND() {
  BitSet b1 (100);
  BitSet b2 (100);

  b1.setConsecutive(50, 20);
  b2.setConsecutive(60, 5);

  b2.set(80);
  b2.set(10);

  BitSet b3(b1);

  TAP_TEST_EQUAL(b1.count(), 20, TEST_BITSET_AND, "");
  TAP_TEST_EQUAL(b3.count(), 20, TEST_BITSET_COPY, "");
  TAP_TEST_EQUAL(b2.count(), 7, TEST_BITSET_AND, "");

  for (int i = 0; i < 100; i++) {
    if (i >= 50 && i < 70) {
      TAP_TEST_EQUAL(b1.get(i), 1, TEST_BITSET_CONSECUTIVE_SET, "");
      TAP_TEST_EQUAL(b3.get(i), 1, TEST_BITSET_COPY, "");
    } else {
      TAP_TEST_EQUAL(b1.get(i), 0, TEST_BITSET_CONSECUTIVE_SET, "");
      TAP_TEST_EQUAL(b3.get(i), 0, TEST_BITSET_COPY, "");
    }
    if ((i >= 60 && i < 65) || i == 10 || i == 80) {
      TAP_TEST_EQUAL(b2.get(i), 1, TEST_BITSET_CONSECUTIVE_SET, "");
    } else
      TAP_TEST_EQUAL(b2.get(i), 0, TEST_BITSET_CONSECUTIVE_SET, "");
  }

  b1 &= b2;
  TAP_TEST_EQUAL(b1.count(), 5, TEST_BITSET_CONSECUTIVE_SET, "");
  TAP_TEST_EQUAL(b2.count(), 7, TEST_BITSET_CONSECUTIVE_SET, "");
  
  for (int i = 0; i < 100; i++) {
    if (i >= 60 && i < 65) {
      TAP_TEST_EQUAL(b1.get(i), 1, TEST_BITSET_AND, "");
      TAP_TEST_EQUAL(b2.get(i), 1, TEST_BITSET_AND, "");
    } else {
      TAP_TEST_EQUAL(b1.get(i), 0, TEST_BITSET_AND, "");
      if (i == 10 || i == 80) {
        TAP_TEST_EQUAL(b2.get(i), 1, TEST_BITSET_AND, "");
      } else
        TAP_TEST_EQUAL(b2.get(i), 0, TEST_BITSET_AND, "");
    }
  }

  BitSet b4 = b3 & b2;

  TAP_TEST_EQUAL(b4.count(), 5, TEST_BITSET_CONSECUTIVE_SET, "");
  for (int i = 0; i < 100; i++) {
    if (i >= 60 && i < 65) {
      TAP_TEST_EQUAL(b4.get(i), 1, TEST_BITSET_AND, "");
      TAP_TEST_EQUAL(b2.get(i), 1, TEST_BITSET_AND, "");
    } else {
      TAP_TEST_EQUAL(b4.get(i), 0, TEST_BITSET_AND, "");
    }
  }
}

void testBitSet() {
  testBitSet1();
  testBitSetAND();
  testBitSetFlip();
}
