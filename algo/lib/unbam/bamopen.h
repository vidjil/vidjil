#ifndef BAMOPEN_H
#define BAMOPEN_H

#include "sam.h"
#include "hfile.h"

/**
 * @return the DNA sequence contained in the BAM entry
 */
char *get_sequence(const bam1_t *entry);

/**
 * @return the quality sequence contained in the BAM entry
 */
char *get_quality(const bam1_t *entry);

#endif
