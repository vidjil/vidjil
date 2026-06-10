#include "locations_to_mark.h"

const OrderedGeneLocationsToMark germline_vj_locations_to_mark[VJ_GENE_COUNT] =
{
  // [VJ_GENE_V] =
  {
    .locations = (unsigned char[])
    {
      FR1_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE, FR1_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
      FR2_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE, FR2_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
      FR3_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE, FR3_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE
    },
    .positions = (unsigned short[])
    {
      FR1_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS, FR1_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS,
      FR2_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS, FR2_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS,
      FR3_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS, FR3_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS
    },
    .count = 6
  },
  // [VJ_GENE_J] =
  {
    .locations = (unsigned char[])
    {
      // special case, see JGeneLocationPosition comments
      FR4_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE
    },
    .positions = (unsigned short[])
    {
      // special case, see JGeneLocationPosition comments
      FR4_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS
    },
    .count = 1
  },
  // [VJ_GENE_NEITHER] =
  {
    // Since these values are always used in conjunction with count, which prevents any computation
    // from happening because it is 0, dummy values are used to avoid having to test and branch on
    // (count != 0)
    .locations = (unsigned char []){255},
    .positions = (unsigned short[]){(unsigned short)INVALID_POS},
    .count     = 0
  }
};
