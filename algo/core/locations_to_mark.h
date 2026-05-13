#pragma once

// References:
// - https://www.imgt.org/IMGTScientificChart/Nomenclature/IMGT-FRCDRdefinition.html
// - CDR3 max length: https://www.imgt.org/IMGTScientificChart/Numbering/IMGTIGVLsuperfamily.html
// - Variable domain regions coverage of V(D)J genes: https://mixcr.com/mixcr/reference/ref-gene-features/

#define INVALID_POS ~0

#define AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(aa_pos) ((3 * (aa_pos)) - 2)

enum LocationToMark
{
  // Handled separately
  START_GENE,
  END_GENE,

  // Anchor points are amino acids found directly before and after CDRs, on the extremities of FRs.
  // Since CDRs are highly variable due to somatic hypermutations, CDRs are detected and segmented
  // indirectly on reads by first aligning the nucleotides of these anchor amino acids. However, in
  // practice, the codon encoding one of these anchor amino acid may vary between recombined V(D)J
  // genes on reads and germline genes. Sometimes (open question: how often?), the matching codon
  // found on the read encodes the same amino acid but differs in its last nucleotide (as is the
  // case for most amino acids). In such cases, read alignment on germline genes would stop at the
  // 2nd nucleotide of the anchor amino acid, since the next nucleotide wouldn't match and
  // hypermutated regions follow directly after. This is why the 2nd nucleotide of anchor points is
  // and aligned, rather than the first or last one
  FR1_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR1_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR2_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR2_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR3_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR3_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR4_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE,
  FR4_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE,

  LOCATION_TO_MARK_COUNT
};

enum VGeneLocationPosition
{
  FR1_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS = AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(1),
  FR1_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS  = AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(26),

  FR2_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS = AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(39),
  FR2_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS  = AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(55),

  FR3_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS = AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(66),
  FR3_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS  = AMINO_ACID_1_BASED_POS_TO_MIDDLE_NUCLEOTIDE_0_BASED_POS(104)
};

enum JGeneLocationPosition
{
  // Special case: position based on (W|F)G_G amino acid pattern position on J genes, with:
  // W = Tryptophan (tgg)
  // F = Phenylalanine (ttt or ttc)
  // G = Glycine (gga, ggc, ggg or ggt)
  // _ = any amino acid
  FR4_FIRST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS = 37 - 1
  
  // Despite IMGT providing a fixed position for the end of the FR4 (129), in practice the end of
  // the FR4 wouldn't always be marked when using that position (adjusted to be relative to the J
  // gene). The FR4 has a length of 10 to 12 amino acids, meaning it might end before amino acid
  // 129. Modified germline IMGT FASTA files modified to include extra nucleotides toward the 3' end
  // of the J genes, that not part of the FR4, would further complicate marking the middle nucleotde
  // of the FR4.
  //
  // Instead, the middle nucleotide is marked based on each gene length as it appears in IMGT FASTA
  // files, and based on the expected mininum and maximum length of the FR4 (see below)
  // FR4_LAST_AMINO_ACID_MIDDLE_NUCLEOTIDE_POS = x
};

// Minimum and maximum length of each region, from first to last nucleotide/amino acid (inclusive)
enum MinMaxGeneRegionLength
{
  FR1_MIN_LENGTH_IN_AMINO_ACIDS  = 25,
  FR1_MAX_LENGTH_IN_AMINO_ACIDS  = 26,

  CDR1_MIN_LENGTH_IN_AMINO_ACIDS = 5,
  CDR1_MAX_LENGTH_IN_AMINO_ACIDS = 12,

  FR2_MIN_LENGTH_IN_AMINO_ACIDS  = 16,
  FR2_MAX_LENGTH_IN_AMINO_ACIDS  = 17,

  CDR2_MIN_LENGTH_IN_AMINO_ACIDS = 0,
  CDR2_MAX_LENGTH_IN_AMINO_ACIDS = 10,

  FR3_MIN_LENGTH_IN_AMINO_ACIDS  = 36,
  FR3_MAX_LENGTH_IN_AMINO_ACIDS  = 39,

  // Vidjil's lowest expectation was 1 nucleotide before
  // CDR3_MIN_LENGTH_IN_AMINO_ACIDS = 2, // IMGT
  CDR3_MIN_LENGTH_IN_AMINO_ACIDS = 0,
  CDR3_MAX_LENGTH_IN_AMINO_ACIDS = 91,

  FR4_MIN_LENGTH_IN_AMINO_ACIDS  = 10,
  FR4_MAX_LENGTH_IN_AMINO_ACIDS  = 12,

  JUNCTION_MIN_LENGTH_IN_AMINO_ACIDS = CDR3_MIN_LENGTH_IN_AMINO_ACIDS + 2,
  JUNCTION_MAX_LENGTH_IN_AMINO_ACIDS = CDR3_MAX_LENGTH_IN_AMINO_ACIDS + 2,

  FR1_MIN_LENGTH_IN_NUCLEOTIDES  = FR1_MIN_LENGTH_IN_AMINO_ACIDS  * 3,
  FR1_MAX_LENGTH_IN_NUCLEOTIDES  = FR1_MAX_LENGTH_IN_AMINO_ACIDS  * 3,

  CDR1_MIN_LENGTH_IN_NUCLEOTIDES = CDR1_MIN_LENGTH_IN_AMINO_ACIDS * 3,
  CDR1_MAX_LENGTH_IN_NUCLEOTIDES = CDR1_MAX_LENGTH_IN_AMINO_ACIDS * 3,

  FR2_MIN_LENGTH_IN_NUCLEOTIDES  = FR2_MIN_LENGTH_IN_AMINO_ACIDS  * 3,
  FR2_MAX_LENGTH_IN_NUCLEOTIDES  = FR2_MAX_LENGTH_IN_AMINO_ACIDS  * 3,

  CDR2_MIN_LENGTH_IN_NUCLEOTIDES = CDR2_MIN_LENGTH_IN_AMINO_ACIDS * 3,
  CDR2_MAX_LENGTH_IN_NUCLEOTIDES = CDR2_MAX_LENGTH_IN_AMINO_ACIDS * 3,

  FR3_MIN_LENGTH_IN_NUCLEOTIDES  = FR3_MIN_LENGTH_IN_AMINO_ACIDS  * 3,
  FR3_MAX_LENGTH_IN_NUCLEOTIDES  = FR3_MAX_LENGTH_IN_AMINO_ACIDS  * 3,

  // Vidjil's lowest expectation was 1 nucleotide before
  // CDR3_MIN_LENGTH_IN_NUCLEOTIDES = CDR3_MIN_LENGTH_IN_AMINO_ACIDS * 3, // IMGT
  CDR3_MIN_LENGTH_IN_NUCLEOTIDES = 1,
  CDR3_MAX_LENGTH_IN_NUCLEOTIDES = CDR3_MAX_LENGTH_IN_AMINO_ACIDS * 3,

  FR4_MIN_LENGTH_IN_NUCLEOTIDES  = FR4_MIN_LENGTH_IN_AMINO_ACIDS  * 3,
  FR4_MAX_LENGTH_IN_NUCLEOTIDES  = FR4_MAX_LENGTH_IN_AMINO_ACIDS  * 3,

  // Vidjil's lowest expectation was 6 nucleotides before
  JUNCTION_MIN_LENGTH_IN_NUCLEOTIDES = JUNCTION_MIN_LENGTH_IN_AMINO_ACIDS * 3,
  JUNCTION_MAX_LENGTH_IN_NUCLEOTIDES = JUNCTION_MAX_LENGTH_IN_AMINO_ACIDS * 3,
};

// V or J gene, or a different gene
enum VJGeneType
{
  VJ_GENE_V = 0,
  VJ_GENE_J,
  VJ_GENE_NEITHER,

  VJ_GENE_COUNT
};

// Description of a set of locations a specific gene overlaps, ordered by increasing positions.
struct OrderedGeneLocationsToMark
{
  // Locations held by "locations" are expected to belong to a single "group" that is more or less
  // encompassing (from the framework region, complementary-determining region, variable domain,
  // constant domain, etc.). In practice, its intended use reflects this expectation: "locations"
  // should store values coming from the same enum, whose values are no bigger than unsigned char's
  // maximum value (255) and all different. Although the actual underlying type of the enum is
  // erased, the context in which OrderedGeneLocationsToMark is used, stored or named should
  // indicate which enum type the stored locations come from
  //
  // locations[i] = location associated to position positions[i]
  const unsigned char* locations;

  // Positions associated to locations.
  // positions[i] = position of the location locations[i], such that positions[i] < positions[i+1]
  const unsigned short* positions;

  // The count of locations/positions the two previous fields point to
  unsigned long long count;
};

// Description of germline V and J genes locations to mark
extern const OrderedGeneLocationsToMark germline_vj_locations_to_mark[VJ_GENE_COUNT];
