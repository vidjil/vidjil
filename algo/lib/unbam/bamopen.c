/*  sam_view.c -- SAM<->BAM<->CRAM conversion.

    Copyright (C) 2009-2014 Genome Research Ltd.
    Portions copyright (C) 2009, 2011, 2012 Broad Institute.

    Author: Heng Li <lh3@sanger.ac.uk>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notices and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.  */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <inttypes.h>
#include <assert.h>
#include "bamopen.h"

#ifndef bam_get_seq
#define bam_get_seq(b)   ((b)->data + ((b)->core.n_cigar<<2) + (b)->core.l_qname)
#endif
const char seq_nt16_str[] = "=ACMGRSVTWYHKDBN";
const char comp_seq_nt16_str[] = "=TGKCYSBAWRDMHVN";

char *get_sequence(const bam1_t *entry) {
  int i;
  int length = entry->core.l_qseq;
  char *seq = malloc(length + 1);
  unsigned char *bam_seq = bam_get_seq(entry);
  /* The for could be factored but this prevents from having a if in the
     loop */
  if (entry->core.flag & BAM_FREVERSE) {
    for (i = 0; i < length; i++) {
      seq[length - i - 1] = comp_seq_nt16_str[bam_seqi(bam_seq, i)];
    }
  } else {
    for (i = 0; i < length; ++i) {
      seq[i] = seq_nt16_str[bam_seqi(bam_seq,i)];
    }
  }
  seq[i] = 0;
  return seq;
}

char *get_quality(const bam1_t *entry) {
    const uint8_t *qual = bam_get_qual(entry);
    int length = entry->core.l_qseq;
    char* quality = malloc(length+1);
    int i;
    if (*qual == 255) {
      for (i = 0; i < length; i++) {
        quality[i] = 'I';
      }      
    } else if (entry->core.flag & BAM_FREVERSE) {
      for (i = 0; i < length; i++) {
        quality[length - i - 1] = (char)((int)qual[i] + 33);
      }
    } else {
      for (i = 0; i < length; i++) {
        quality[i] = (char)((int)qual[i] + 33);
      }
    }
    quality[i] = 0;
    return quality;
}
