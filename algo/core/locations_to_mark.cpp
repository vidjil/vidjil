#include "locations_to_mark.h"

const OrderedGeneLocationsToMark germline_vj_locations_to_mark[VJ_GENE_COUNT] =
{
  /* [VJ_GENE_V] = */
  {
    .locations = (unsigned char[1]) {JUNCTION_POS},
    .positions = (unsigned short[1]){CYS104_IN_GAPPED_V},
    .count     = 1
  },

  /* [VJ_GENE_J] = */
  {
    .locations = (unsigned char[1]) {JUNCTION_POS},
    .positions = (unsigned short[1]){PHE118_TRP118_IN_GAPPED_J},
    .count     = 1
  },

  /* [VJ_GENE_NEITHER] = */
  {
    // Since these values are always used in conjunction with count, which prevents any computation
    // from happening because it is 0, dummy values are used to avoid having to test and branch on
    // (count != 0)
    .locations = (unsigned char[1]){0},
    .positions = (unsigned short[1]){0},
    .count     = 0
  }
};
