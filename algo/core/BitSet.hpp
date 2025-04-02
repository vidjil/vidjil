#ifndef BITSET_HPP
#define BITSET_HPP

#include <climits>
#include <cstdint>
#include <memory>
#include <iostream>

#define WORD_TYPE uint64_t
#define WORD_SIZE (sizeof(WORD_TYPE) * CHAR_BIT)
/* reads bit p from e */
#define bitget(e, p) ((((e)[(p) / WORD_SIZE] >> ((p) % WORD_SIZE))) & 1)
/* sets bit p in e */
// note that bit at position 0 in a cell will be the lsb
#define bitset(e, p) ((e)[(p) / WORD_SIZE] |= ((WORD_TYPE)1 << ((p) % WORD_SIZE)))

// https://en.wikipedia.org/wiki/Hamming_weight
const uint64_t m1  = 0x5555555555555555; //binary: 0101...
const uint64_t m2  = 0x3333333333333333; //binary: 00110011..
const uint64_t m4  = 0x0f0f0f0f0f0f0f0f; //binary:  4 zeros,  4 ones ...
const uint64_t m8  = 0x00ff00ff00ff00ff; //binary:  8 zeros,  8 ones ...
const uint64_t m16 = 0x0000ffff0000ffff; //binary: 16 zeros, 16 ones ...
const uint64_t m32 = 0x00000000ffffffff; //binary: 32 zeros, 32 ones
const uint64_t h01 = 0x0101010101010101; //the sum of 256 to the power of 0,1,2,3...
inline int popcount64(uint64_t x) {
    x -= (x >> 1) & m1;             //put count of each 2 bits into those 2 bits
    x = (x & m2) + ((x >> 2) & m2); //put count of each 4 bits into those 4 bits 
    x = (x + (x >> 4)) & m4;        //put count of each 8 bits into those 8 bits 
    return (x * h01) >> 56;  //returns left 8 bits of x + (x<<8) + (x<<16) + (x<<24) + ... 
}

class BitSet {
public:
  BitSet(uint64_t nb_bits);
  BitSet(const BitSet &);
  ~BitSet();

  /**
   * Gives the number of 1-bit
   */
  uint64_t count() const;

  /**
   * Get the bit at the given position
   */
  bool get(uint64_t pos) const;
  /**
   * Set the bit at the given position
   */
  void set(uint64_t pos);

  /**
   * Set all the bits from position pos to position pos+len-1 (included)
   * @pre len <= 64
   * @complexity O(1)
   */
  void setConsecutive(uint64_t pos, char len);

  /**
   * Flip all the bits
   */
  void flip();
  
  void reset();

  /**
   * Number of bits
   */
  uint64_t size() const;

  /**
   * Bitwise AND with another BitSet of the same size
   */
  BitSet &operator&=(const BitSet &bitset);

private:
  uint64_t *m_bits;
  uint64_t m_nb_bits;
  uint64_t m_int_size;

  /**
   * Sets consecutive bits in a given cell
   * @pre pos_in_cell + len_in_cell <= 64
   */
  inline void setConsecutiveInGivenCell(uint64_t cell, char pos_in_cell, char len_in_cell);

  friend BitSet operator&(const BitSet &, const BitSet &);
};

/**
 * A bitwise AND between two bitsets which must be of the same size
 */
BitSet operator&(const BitSet &, const BitSet &);

std::ostream &operator<<(std::ostream &out, const BitSet &);

#endif
