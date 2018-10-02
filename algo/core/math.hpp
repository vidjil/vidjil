#ifndef MATH_HPP
#define MATH_HPP

/**
 * Compute the minimal number of k-mers that is not significantly different from nb_occ
 * Given that the k-mers used are those used for `affect` on the sequence `sequence`.
 * @param kmer_size: size of the kmer
 * @param nb_occ: Number of occurrences found on this sequence
 * @param sequence_length: The sequence length
 * @param p_value: The p_value to be used. The lower the p_value, the lower the value will be returned
 *                 Beware! The p_value must be given as an integer to prevent issues with float equalities.
 *                 Therefore a pvalue of .95 should be given as 95 and a p-value of .999 should be given as 999.
 *                 Not all p-values are possible. Please refer to the keys of Z_SCORES.
 * @return The lower bound of the confidence interval assumuing that the center of the confidence 
 *         interval is given by `nb_occ`. In all cases the returned value will be >= 0.
 */
int compute_nb_kmers_limit(int kmer_size, int nb_occ, int sequence_length, int p_value=99);

#endif
