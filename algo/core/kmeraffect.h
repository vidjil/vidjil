#ifndef KMER_AFFECT_H
#define KMER_AFFECT_H

#include <string>
#include <iostream>

using namespace std;

/*
  A virtual class for the KmerAffect* would be much better but that would
  imply much more space for the KmerAffect class (which just stores one byte).
  Instead, we would have 8 more bytes for a pointer due to the virtual class plus
  the alignment of types which leads to 16 bytes for a single object instead of 1.
 */

typedef struct affect_s affect_t;
/**
 * This type represents the affectation by itself on the 7 least significant
 * bits and the strand on the most significant bit.  Hence the 7 lsb
 * correspond to the standard ASCII code of the character.  The most
 * significant bit is 0 for the reverse strand and 1 for the forward strand.
 */
struct affect_s {
  // 7 lsb are the label, the msb is the strand (0 -> -, 1 -> +)
  char c;
};

/**
 * @return the strand (-1 or +1) associated to the affect_t
 */
int affect_strand(const affect_t &affect);

/**
 * @return the character associated to the affect_t
 */
char affect_char(const affect_t &affect);

bool operator==(const affect_t &a1, const affect_t &a2);
bool operator<(const affect_t &a1, const affect_t &a2);
bool operator>(const affect_t &a1, const affect_t &a2);
bool operator<=(const affect_t &a1, const affect_t &a2);
bool operator>=(const affect_t &a1, const affect_t &a2);
bool operator!=(const affect_t &a1, const affect_t &a2);
string toString(const affect_t &a);
ostream &operator<<(ostream &os, const affect_t &a);


class KmerAffect {
public:
  affect_t affect;

  /**
   * Construct an unknown affectation.
   * @post isUnknown()
   */
  KmerAffect();

  /**
   * @post affect == a
   */
  KmerAffect(const affect_t &a);

  /**
   * Copy constructor
   */ 
  KmerAffect(const KmerAffect &ka);

  /**
   * Construct an affectation as stated by the parameters
   * @post affect_strand(affect) == strand AND affect_char(affect) == kmer[0]
   */
  KmerAffect(const string &label, int strand=1);
  /**
   * Add another affectation to the current one.
   * @post The current affectation is not modified if the parameter is the same
   *       affectation as the current one.
   *       If the current affectation is unknown, the affectation is set to the
   *       parameter.
   *       If the label is the same but the strand is different, the strand is
   *       arbitrarily put to forward.
   *       In the other cases, the affectation is set to ambiguous.
   */
  KmerAffect &operator+=(const KmerAffect &);

  /**
   * Affectation
   */
  KmerAffect &operator=(const KmerAffect &ka);

  /**
   * @return the ambiguous affectation
   */
  static KmerAffect getAmbiguous();

  /**
   * @return the strand of the affectation
   *         -1 for backward
   *          1 for forward
   *          0 for unknown or ambiguous
   */
  int getStrand() const;

  /**
   * @return the label of the affectation.
   *         In that case, the string consists of the first letter only
   */
  string getLabel() const;

  /**
   * @return the unknown affectation
   */
  static KmerAffect getUnknown();

  /**
   * @return true iff the class does not take care of the strand
   *         (false in our case).
   */
  static bool hasRevcompSymetry();

  /**
   * @return true iff the affectation should be considered as ambiguous.
   */
  bool isAmbiguous() const;

  /**
   * @return true iff the affectation is unkwown yet.
   */
  bool isUnknown() const;

  string toString() const;
};


bool operator==(const KmerAffect &a1, const KmerAffect &a2);
bool operator<(const KmerAffect &a1, const KmerAffect &a2);
bool operator>(const KmerAffect &a1, const KmerAffect &a2);
bool operator<=(const KmerAffect &a1, const KmerAffect &a2);
bool operator>=(const KmerAffect &a1, const KmerAffect &a2);
bool operator!=(const KmerAffect &a1, const KmerAffect &a2);
ostream &operator<<(ostream &os, const KmerAffect &kmer);


#define AFFECT_AMBIGUOUS_SYMBOL "?"
#define AFFECT_UNKNOWN_SYMBOL "_"
#define AFFECT_AMBIGUOUS_CHAR '?'
#define AFFECT_UNKNOWN_CHAR '_'

/**
 * Constant defining the unknown affectation (not known yet)
 */
const KmerAffect AFFECT_UNKNOWN = KmerAffect(AFFECT_UNKNOWN_SYMBOL, 0); 
/**
 * Constant defining the ambiguous affectation (many possibilities)
 */
const KmerAffect AFFECT_AMBIGUOUS = KmerAffect(AFFECT_AMBIGUOUS_SYMBOL, 1); 

const KmerAffect AFFECT_V = KmerAffect("V", 1); 
const KmerAffect AFFECT_J = KmerAffect("J", 1); 

const KmerAffect AFFECT_V_BWD = KmerAffect("V", -1); 
const KmerAffect AFFECT_J_BWD = KmerAffect("J", -1); 

////////////////////////////////////////////////////////////////////////////////////////////////////

#endif
