#pragma once

#define INVALID_POS ~0

#define AMINO_ACID_1_BASED_POS_TO_FIRST_NUCLEOTIDE_0_BASED_POS(aa_pos) (3 * (aa_pos - 1))

enum
{
  // JUNCTION/CDR3 extraction from gapped V/J sequences
  CYS104_IN_GAPPED_V = AMINO_ACID_1_BASED_POS_TO_FIRST_NUCLEOTIDE_0_BASED_POS(104),

  // Special case: based on (W|P)G_G amino acid pattern position on J genes
  PHE118_TRP118_IN_GAPPED_J = 38 - 1
};

enum
{
  START_GENE,
  END_GENE,
  JUNCTION_POS
};

// V or J gene, or a different gene
enum VJGeneType
{
  VJ_GENE_V = 0,
  VJ_GENE_J,
  VJ_GENE_NEITHER,

  VJ_GENE_COUNT
};

// Description of a set of locations a specific gene overlaps at specific positions
struct OrderedGeneLocationsToMark
{
  // Locations held by "locations" are expected to belong to a same "group" that is more or less
  // englobing (from the framework region, complementary-determining region, variable domain,
  // constant domain, etc.). In practice, its intended use reflects this expectation: "locations"
  // should store values coming from the same enum, whose values are no bigger than unsigned char's
  // maximum value (255). Although the actual underlying type of the enum is erased, the context in
  // which OrderedGeneLocationsToMark is used, stored or named should indicate which enum type the
  // stored locations come from
  //
  // locations[i] = location associated to position positions[i]
  const unsigned char* locations;

  // Positions associated to locations.
  // positions[i] = position of the location locations[i]
  const unsigned short* positions;

  // The count of locations/positions the two previous fields point to
  unsigned long long count;
};

// Description of germline V and J genes locations to mark
extern const OrderedGeneLocationsToMark germline_vj_locations_to_mark[VJ_GENE_COUNT];
