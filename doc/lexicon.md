# Lexicon
> [!note]
> This document is a work in progress.

The definitions of the following words apply in the context of Vidjil; they may have a broader meaning outside its context.

- Affectation: the gene type (V, D, J, etc.) associated to a specific recombination system, and the strand (sometimes represented as `-` or `+`) that a series of nucleotides is guessed to come from
- Affect: an affectation associated with the length of the k-mer it qualifies
- Aho-Corasick algorithm/automata/graph/trie: a trie in which each node represents a nucleotide that is part of a sequence. The depth of each node represents the order in which a nucleotide was seen in a sequence. The trie is complemented by a "failure function" which indicates a fallback node to transition to, in the event no transition exists from the current nucleotide at depth `n` to the desired target nucleotide at a depth `n + 1`
- Clone / clonotype: a population of lymphocytes carrying the same V(D)J recombination
- DNA: deoxyribonucleic acid, two strands of nucleotides that coil around each other in a double helix
- K-mer: a series of k nucleotides extracted from bigger sequence (e.g. "TTAC" is a 4-mer of "GATTACA")
- Gene: a sequence of nucleotides on a chromosome, which can be translated by our cell's biological machinery
- Germline: a set of genes found in unaltered genes, such as non-recombined V, D and J genes
- Locus/loci: the position of a significant portion of DNA on a chromosome. Loci is the plural of locus
- Lymphoblast: the precursor cell of a lymphocyte, derived from a stem cell, in which V(D)J recombinations occur
- Lymphocyte: one of the matured form of a lymphoblast. Vidjil is interested into 2 types of lymphocytes: B lymphocytes, also called B-cells, and T lymphocyte, also called T-cells
- Productive/unproductive: 
- Nucleotide: an information-encoding molecule that makes up DNA (or RNA). In DNA, a nucleotide can be one of:
  - Adenine, abbreviated A
  - Cytosine, abbreviated C
  - Guanine, abbreviated G
  - Thymine, abbreviated T
- Read: sequenced DNA from a patient, as found in Vidjil's input FASTA (.fa, .fasta), FASTQ (.fq, .fastq) and BAM (.bam) files
- Recombination system: a possible conformation of recombined V(D)J genes. A recombination system can be:
  - Regular: VJ and VDJ genes recombinations in a locus
  - Irregular: mixing genes from 2 locus (TRA & TRD), containing introns for instance
  - Incomplete: interrupted/unachieved recombinations, with two D genes for instance
  Irregular or incomplete recombination systems have a `+` in their name (e.g IGH+)
- Spaced seed: a string filter applied to nucleotide sequences account for possible mutations. A space seed has a fixed length and is composed of "match" (`#`) and "don't care" (`-`) symbols, similar to regular expression symbols `[ACGT]` and `.`, respectively. It is projected on nucleotide sequences by applying consecutive symbols to consecutive nucleotides, starting at any position in the sequence followed by at least as many nucleotides than symbols in the seed. The outputs of a spaced seed projected on a nucleotide sequence are multiple sub-sequences of the same length as the seed, in which "match" symbols have been replaced with the nucleotide found at the same position in the sequence, while "don't care" symbols have been replaced with all possible combinations of nucleotides.  
Here's an illustrated example showing the projection of seed `##--##` on nucleotide sequence `GATTACA`:
```
                       projection(GATTACA, ##--##)
                      /                           \
                     v                             v
                     
         |G|A|T|T|A|C|A                           G|A|T|T|A|C|A|
         |#|#|-|-|#|#|                             |#|#|-|-|#|#|

               |                                         |
               v                                         v

  GAAAAC GAACAC GAAGAC GAATAC               ATAAAA ATACCA ATAGGA ATATTA
  GACAAC GACCAC GACGAC GACTAC               ATCACA ATCCCA ATCGCA ATCTCA
  GAGAAC GAGCAC GAGGAC GAGTAC               ATGACA ATGCCA ATGGCA ATGTCA
  GATAAC GATCAC GATGAC GATTAC               ATTACA ATTCCA ATTGCA ATTTCA
```
- Shortcut: a unique 1-character identifier for a specific recombination system
- V(D)J recombination: the somatic process through which V, optionally D, and J genes are combined together in lymphoblasts. See [immunobiological_background.md](immunobiological_background.md) for details
- Window: a sequence of nucleotides centered on the junction between a V and J gene, used a key to store reads with V(D)J recombinations sharing the same sequence together

- Detection: determining whether any V(D)J recombination is present in each read
- Clusterization: grouping and counting reads with similar V(D)J recombinations yet to be identified
- Designation: identifying which particular genes a V(D)J recombination is made of