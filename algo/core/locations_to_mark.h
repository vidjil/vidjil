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
  CDR3_POS
};