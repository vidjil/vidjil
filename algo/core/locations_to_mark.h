#pragma once

#define INVALID_POS ~0

enum
{
  // JUNCTION/CDR3 extraction from gapped V/J sequences
  CYS104_IN_GAPPED_V        = 310 - 1, // First nucleotide of Cys104
  PHE118_TRP118_IN_GAPPED_J = 38 - 1   // Last nucleotide of Phe118/Trp118
};

enum
{
  START_GENE,
  END_GENE,
  CDR3_POS
};