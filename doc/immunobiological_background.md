# Immunobiological background of Vidjil
This is a starting point for anyone unfamiliar with the immunobiological context behind Vidjil.

## Overview
- Humans, and many other animals, have some specialized cells that are part of the immune system, found in our blood or some of our organs
- Among them are lymphoblasts, which may mature into:
  - B lymphocytes, also called B-cells
  - T lymphocytes, also called T-cells
- An important function of these specialized cells is to detect and react to specific molecules they may encounter called antigens, which may be carried by bacteria, viruses, fungies, etc., by binding with them

- This function is enabled by a biological process maturing lymphoblasts undergo, called V(D)J recombinations
- V(D)J recombinations alter a lymphoblast's DNA in specific regions (loci) where 3 (+ 1) types of genes are located and recombined: V genes, optionally D genes, and J genes (+ constant genes)
- These recombinations are carried down to mature B-cells and T-cells, and influence the structure and diversity of antigen binding agents, called immunoglobulin (for B-cells) and T-cell receptors (for T-cells), also referred to as antibodies (for both B-cells and T-cells)
- In healthy individuals, these recombinations are so diverse any given recombination represents only a very small fraction of all recombinations found in that individual's general lymphoblast and lymphocyte population

- In an individual suffering from Acute Lymphoblastic Leukemia (ALL) and Chronic Lymphocytic Leukemia (CLL) however, one or more lymphoblasts and/or lymphocytes have become cancerous and have multiplied out of control, meaning the V(D)J recombination(s) of these cancerous cells are over-represented in that individual's general lymphoblast and lymphocyte population

- Quantifying or qualifying these over-represented V(D)J recombinations from cancerous lymphoblasts and/or lymphocytes helps medical research devising better treatments and tracking whether leukemia is receding or spreading across time

This is what Vidjil does: analyze samples containing the DNA of many lymphocytes to count and identify V(D)J recombinations, using them as unique identifiers of specific populations of lymphoblasts/lymphocytes, providing insights into cases of ALL and CLL.

> [!note]
> Vidjil is for research use only and comes with no warranty.

## In details

### DNA structure
- Most of our cells contain a set of chromosomes that is unique between individuals
- In humans, chromosomes are organized in pairs, inherited from each parent: humans are "diploid"
- In other species, chromosomes may be grouped differently (haploid, tretraploid, etc.)
- Chromosomes are made of two long strands. Each strand is composed of many smaller molecules called nucleotides, which make up DNA
- DNA contains 4 different nucleotides:
  - Adenine, abbreviated A
  - Cytosine, abbreviated C
  - Guanine, abbreviated G
  - Thymine, abbreviated T
- Additionally, nucleotides on two strands of DNA on a chromosome are tethered together in pairs:
  - As with Ts
  - Cs with Gs
- A gene is a sequence of nucleotides on a chromosome, which can be transribed by our cell's biological machinery
- Genes often differ between individuals
- A locus (latin for "place", plural: loci) is the position of a significant sequence of DNA on a chromosome
- DNA has a reading direction: from the 5' (or upstream) end toward the 3' (or downstream) end, named after nucleic acid ring structures found in DNA
- Parts of our DNA can be read and expressed into more complex organic molecules called amino acids by our cells
- In protein-coding genes, consecutive sets of 3 nucleotides, also called a codon, encode 1 amino acid
- These amino acids can be chained together to form even more complex structures, such as antibodies


### Antibody structure expression
Although Vidjil is more interested in V(D)J recombinations found in lymphoblasts and lymphocytes DNA as unique markers/identifiers, rather than in the structure of lymphoblasts/lymphocytes and antibodies, some vocabulary and concepts describing antibodies are reused and extensible to V(D)J recombinations, which is why it is useful to know about them:
```
A possible antibody structure (simplified, not to scale)
____  ____           ____  ____
\   \ \   \         /   / /   /  <--  Variable regions
 \___\ \___\       /___/ /___/
  \   \ \   \     /   / /   /    <--|
   \___\-\___\   /___/-/___/        |
    ^      _\_---_/_                |
    |     |   | |   |            <--| Constant regions
  Light   |___| |___|               |
  chain   |   | |   |               |
          |___| |___|            <--|
            ^
            |
       Heavy chain
```
- Antibodies are composed of 2 identical pairs of amino acid chains, forming a Y-like shape
- Each pair is composed of 1 "light" amino acid chain and 1 "heavy" amino acid chain
- Both light and heavy amino acid chains are composed of 1 variable region (V region) and 1 or more constant regions (C region)
- A light chain is composed of 1 variable region, expressed by recombined V & J genes, and 1 constant region
- A heavy chain is composed of 1 variable region, expressed by recombined V, D & J genes, and 3 to 4 constant regions
- The set of nucleotides encoding a variable region's amino acids is called the variable domain, where V(D)J recombinations occur
- The set of nucleotides encoding a constant region's amino acids is called the constant domain, and is located past the variable domain toward the 3' end


### V(D)J recombination loci
- There are 7 different loci where V(D)J recombinations happen, named after the type of antibody's amino acid chain they encode:
  - IGH: **I**mmuno**G**lobulin γ, δ, α, μ and ε **H**eavy chain
  - IGK: **I**mmuno**G**lobulin κ (**K**appa) light chain
  - IGL: **I**mmuno**G**lobulin λ (**L**ambda) light chain
  - TRA: **T**-cell **R**eceptor α (**A**lpha) light chain
  - TRB: **T**-cell **R**eceptor β (**B**eta) heavy chain
  - TRG: **T**-cell **R**eceptor γ (**G**amma) light chain
  - TRD: **T**-cell **R**eceptor δ (**D**elta) heavy chain
- B-cell's antibodies are composed of either:
  - 1 light amino acid chain from the IGK locus + 1 heavy amino acid chain from the IGH locus
  - 1 light amino acid chain from the IGL locus + 1 heavy amino acid chain from the IGH locus
- T-cell's antibodies are composed of either:
  - 1 light amino acid chain from the TRA locus + 1 heavy amino acid chain from the TRB locus (usually ~95% of T-cells)
  - 1 light amino acid chain from the TRG locus + 1 heavy amino acid chain from the TRD locus (usually ~5% of T-cells)

- It is possible for a B-cell to exhibit V(D)J recombination(s) on T-cell-specific loci, in addition to its B-cell-specific V(D)J recombinations
- Likewise for T-cells
- It is also possible to find incomplete recombinations, for instance containing two D genes, in both B-cells and T-cells


### V(D)J recombinations effect on DNA
- V(D)J recombinations are named after variable V, diverse D and joining J genes found in groups in the 7 loci previously listed
- In each locus, there can be several successive groups of V, D or J genes, followed by constant C genes, all specific to their locus
- During recombinations:
  - Either 1 V gene + 1 J gene or 1 V gene + 1 D gene + 1 J gene are combined together, followed by one or more C genes
  - At the junction between V, D and J genes, some nucleotides may be deleted and some new ones inserted, resulting in new, modified nucleotide sequences that differ from the original V, D and J genes
- The variable region is subdivided in sub-regions:
  - Complimentary-Determining Regions (CDRs): CDR1, CDR2 and CDR3, whose amino acids are in direct contact with antigens. The CDR3 is the region of most interest
  - Framework regions (FRs): FR1, FR2, FR3 and FR4, which serve as scaffold for CDRs, not in direct contact with antigens
- These regions are expressed by recombined V, D and J genes on the variable domain:
```
FRs & CDRs overlap with recombined V, D and J genes
   _______________ __________ _______________ __________ _______________ __________ _______________ 
  |      FR1      |   CDR1   |      FR2      |   CDR2   |      FR3      |   CDR3   |      FR4      |
   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
 __________________________________________________________________________ ___ ____________________
|                                   V                                    //|/D/|//       J          |
 ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ ‾‾‾ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
                                                              Nucleotide deletions & insertions
```
- On non-recombined V, D and J genes (in "germinal" DNA), FRs and CDRs are bounded by specific amino acids, located at predicatable positions provided by the international ImMunoGeneTics information system (IMGT)
  - For instance, the CDR3 is always preceeded by a cysteine (C) amino acid and followed by either a phenylalanine (F) or tryptophan (W) amino acid

- Both in total and on each loci, there are more V genes than J or D genes, although their count vary. For instance:
  - The IGH locus holds 51 V genes, 27 D genes and 6 J genes
  - The TRA locus holds ~100 V genes and ~50 J genes
  - The TRB locus holds 50 to 100 V genes, 1 D gene, 7 J genes, followed by another 1 D gene and 7 J genes
- V genes are longer than J genes, and J genes are longer than D genes
- The sets V, D and J genes differ between individuals
- There is however a low-enough finite number of genes and alleles so that they can be described within a few megabytes
- Not all non-recombined V, D or J genes are functional, neither are all of their recombinations


### Hypermutations
- B-cells are prone to "hypermutations" during their lifetime, meaning many mutations occur on the CDRs of their recombined V(D)J genes
- FRs are not subject to hypermutations, they are stable (but can undergo some mutations still)