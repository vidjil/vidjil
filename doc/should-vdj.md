
# Quality control of designation of V(D)J recombinations with `.should-vdj.fa` tests

The `.should-vdj.fa` tests are sequences with manually curated V(D)J designations.
These designations were checked by hand, possibly with the help of some bioinformatics tools.
Tests may range from very easy cases with unambiguous V(D)J designations
to borderline or difficult cases, including incomplete or unusual recombinations or translocations.

This collection of sequences, distributed as open-source data, may help the robustness
of any software doing immune repertoire sequencing (RepSeq) analysis.

## Contributing to the tests

Users and developers of RepSeq software are encouraged to [send us](contact@vidjil.org)
their manually curated sequences, ideally in the format described below, or by
directly proposing pull requests on Gitlab with new tests in the [`algo/tests/should-vdj`](https://gitlab.com/vidjil/vidjil/tree/master/algo/tests/should-vdj-tests) directory.
We can also help to encode sequences in this format.
The current tests were contributed by:

  - Yann Ferret (CHRU Lille), 2014-2015 \[1\]
  - Florian Thonier (Inserm, Paris Necker), 2015-2016
  - And many users of the Vidjil platform

## A `.should-vdj.fa` file

A `.should-vdj.fa` file is (almost) a Fasta file, containing one or several sequences
with their V(D)J designation:

``` example
>IGKV1-5*03 9/4/1 IGKJ1*01  [IGK]
TATTAATAACAACTTGGCCTGGTATCAGGAGAAGCCAGGGAAAGCCCCTAAGGTCCTG
ATCTATAAGGCGTCTAGTTTAGAAAGTGGGGTCCCATCAAGGTTCAGCGGCAGTGGAT
CTGGGACAGAATTCACTCTCACCATCAGCAGCCTGCAGCCTGATGATTTTGCAACCTA
TTACTGCCAACAATATAATAGACTTTGGACGTTCGGCCAAGGGACCAAGGTGGAAGTC
AAACGAACTGTGGCTGCACCATCT

# Patient 0122
>TRGV5*01 4/AG/5 TRGJP2*01  [TRG]   # 1st clone
GGAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAA
TCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATT
GATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGA
ag
AGTGATTGGATCAAGACGTTTGCAAAAGGGACTAGGCTCATAGTAACTTCGCCTGGTAA

>TRGV11 TRGJ1  [TRG]               # 2nd clone
TCTTCCACTTCCACTTtgAAAATAAAGTTCTTAGAGAAAGAAGATGAGGTGGTGTACC
aCTGTGCCTGCtaGTCACCTCATCGAATTATTATAAGA
```

Nucleotide sequences can mix upper-case and lower-case characters, and may contain arbitrary line breaks.
Comments can be given either as lines starting with `#`, or parts of headers, again starting with `#`.

## Encoding the V(D)J designation

The header of each sequence, beginning by `>`, gives the V(D)J designation of the underlying sequence,
such as in `>IGKV1-5*03 9/CTAC/1 IGKJ1*01  [IGK]`.

  - Gene names are taken as specified in IMGT/GENE-DB.
    They can be either fully qualified, with their alleles (`IGKJ1*01`) or without (`IGKJ1`).
    When there is no allele given, the number of deletions for the N regions should refer to the `*01` allele.
    Special names are also accepted, such as `Intron` or `KDE`.

  - N-regions are given in three components: number of nucleotides deleted at the right (3') of the left segment,
    insertion, and number of nucleotides deleted at the left (5') of the right segment.
    The insertion can be specified either by the full sequence of nucleotides (`9/CCCTGG/1`),
    or by only the number of nucleotides (`9/6/1`).

  - N-regions are optional : `>IGKV1-5*03 IGKJ1*01` can be given instead of `>IGKV1-5*03 9/4/1 IGKJ1*01`

The designation can thus be very short, such as in `>TRGV2 TRGJP1`.
However, it is advised to put as much information as possible in the designation,
such as in `>TRGV2*01 9/CCCTGG/1 TRGJP1*01  [TRG]`.
Such complete designations will give more extensive tests.

VDJ recombinations can be encoded, such as

  - `>IGHV3-74*02 7/CCGCGGT/6 IGHD3-9*01 4/CTTCGAACA/7 IGHJ4*02`

Incomplete or unusual recombinations can also be specified, such as

  - `>IGHD7-27*01 10/CATTA/0 IGHJ3*02`
  - `>TRDV1*01 TRDD2*01 TRAJ29*01`
  - `>TRDD2 18/6/0 TRDD3 5/5/0 TRDJ1`
  - `>Intron 2/0/9 KDE`

Very special cases should be explained by comments in plain English.

## Encoding the locus

The end of the header may also contain information on the locus, between brackets, leading to additional tests.
This also allows to specify only `>[TRG]` for a sequence that should be recognized as TRG
even if it is difficult to choose a precise VJ designation.

Human locus should be encoded by `[IGH]`, `[IGK]`, `[IGL]`, `[TRA]`, `[TRB]`, `[TRG]`, `[TRD]`.
Incomplete or unusual recombinations can be encoded with an additional `+` character, such as in `[IGH+]` or `[TRD+]`.
Mixed TRA/TRD recombinations can be encoded with `[TRA+D]`.

Other special cases, such as translocations involving BCL1 or BCL2, should be written now as comments after a `#` character.

## Encoding the JUNCTION/CDR3 information

JUNCTION or CDR3 information can be optionnaly encoded, using curly braces:

``` example
>TRGV10*02 5/AGAC/3 TRGJP1*01  [TRG]  {CAAWRPTGWFKIF}
AAGTCCGTAGAGAAAGAAGACATGGCCGTTTACTACTGTGCTGCGTGGAGACCCACTGGTTGGTTCAAGATATTTGCTGAAGGGACTAAGC
```

## Ambiguous or alternate designations

On some sequences, several V(D)J designations may be equally acceptable.
These alternate choices can be encoded as `(choice1, choice2)`.
For difficult cases, is advised to further leave a comment in plain English:

``` example
# The D/J junction can be seen as 2//7, 3//6, or 4//5
>IGHV3-48*01 0/AA/6 IGHD5-12*01 (2//7, 3//6, 4//5) IGHJ4*02  [IGH]
ATGAACAGCCTGAGAGCCGAGGACACGGCTGTGTATTACTGTGCGAGAGAAAATAGTG
GCTACGATTTGACTAC
TGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGTT

# TRGJ1*01 or TRGJ1*02
>TRGV5*01 (TRGJ1*01, TRGJ1*02)  [TRG]
...

# TRGJ1*01 or TRGJ1*02 but with different deletions
>TRGV4*02 (4/4/4 TRGJ1*01, 4/4/1 TRGJ1*02) [TRG]
```

## Program-specific information

### Vidjil-algo

The automated test suite of vidjil-algo launches the analysis on all these `.should-vdj`
sequences and compares the computed designations with the curated designations.
Cases with current failure will be marked as TODO.
Having a correct behavior on these tests may be a goal for future releases.

Within the `algo/tests` directory:

  - `python should-vdj-to-tap.py` runs one or several tests, given as parameters on the command line,
  - `make shouldvdj` runs all `.should-vdj.fa` tests,
  - `make shouldvdj_and_locus` further runs tests on the locus.
    This locus test is also launched for all reverse complement sequences.

## References

The paper \[1\] includes an evaluation of the V(D)J designation of 125 clones.

1.  Yann Ferret, A. Caillault et al.,
    *Multi-loci diagnosis of acute lymphoblastic leukaemia with high-throughput sequencing and bioinformatics analysis*,
    British Journal of Haematology, 2016, 173, 413–420,
    <http://dx.doi.org/10.1111/bjh.13981>

2.  Mikaël Salson et al., A dataset of sequences with manually curated V(D)J designations
    RepSeq 2015,
    <https://hal.inria.fr/hal-01331556>
