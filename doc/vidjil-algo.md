# vidjil-algo 2019.03
**Command-line manual**

*The Vidjil team (Mathieu, Mikaël, Aurélien, Florian, Marc, Tatiana and Rayan)*

```
  Vidjil -- High-throughput Analysis of V(D)J Immune Repertoire -- [[http://www.vidjil.org]]
  Copyright (C) 2011-2019 by Bonsai bioinformatics
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  and VidjilNet consortium.
  contact@vidjil.org
```

This is the help of vidjil-algo, for command-line usage.
This manual can be browsed online:

 - <http://www.vidjil.org/doc/vidjil-algo>                (last stable release)
 - <http://gitlab.vidjil.org/blob/dev/doc/vidjil-algo.md> (development version)

Other documentation (users and administrators of the web application, developpers) can be found from <http://www.vidjil.org/doc/>.


## About

*V(D)J recombinations* in lymphocytes are essential for immunological
diversity. They are also useful markers of pathologies, and in
leukemia, are used to quantify the minimal residual disease during
patient follow-up.

Vidjil-algo processes high-throughput sequencing data to extract V(D)J
junctions and gather them into clones. Vidjil-algo starts
from a set of reads and detects "windows" overlapping the actual CDR3.
This is based on an fast and reliable seed-based heuristic and allows
to output all sequenced clones. The analysis is extremely fast
because, in the first phase, no alignment is performed with database
germline sequences. At the end, only the consensus sequences
of each clone have to be analyzed. Vidjil-algo can also cluster similar
clones, or leave this to the user after a manual review in the web application.

The method is described in the following references:

- Marc Duez et al.,
“Vidjil: A web platform for analysis of high-throughput repertoire sequencing”,
PLOS ONE 2016, 11(11):e0166126
<http://dx.doi.org/10.1371/journal.pone.0166126>

- Mathieu Giraud, Mikaël Salson, et al.,
"Fast multiclonal clusterization of V(D)J recombinations from high-throughput sequencing",
BMC Genomics 2014, 15:409
<http://dx.doi.org/10.1186/1471-2164-15-409>

Vidjil-algo is open-source, released under GNU GPLv3+ license.

# Requirements and installation

## Supported platforms

Vidjil-algo has been successfully tested on the following platforms :

  - CentOS 6.3 amd64
  - CentOS 6.3 i386
  - CentOS 7.2 i386
  - Debian Squeeze 6.0
  - Debian Wheezy 7.0 amd64
  - Fedora 19
  - FreeBSD 9.2
  - Ubuntu 12.04 LTS amd64
  - Ubuntu 14.04 LTS amd64
  - Ubuntu 16.04 LTS
  - Ubuntu 18.04 LTS
  - OS X 10.9, 10.10, 10.11

Vidjil-algo is developed with continuous integration using systematic unit and functional testing.
The development team internally uses [Gitlab CI](http://gitlab.vidjil.org/pipelines) and [Jenkins](https://jenkins-ci.org/) for that.

## Build requirements (optional)

This paragraph details the requirements to build Vidjil-algo from source.
You can also download a static binary, see [installation](#installation).

To compile Vidjil-algo, make sure:

  - to be on a POSIX system ;
  - to have a C++11 compiler (as `g++` 4.8 or above, `g++` 7.3 being supported, or `clang` 3.3 or above).
    This version of Vidjil-algo does not work with `g++` 8.0 or above.
  - to have the `zlib` installed (`zlib1g-dev` package under Debian/Ubuntu,
    `zlib-devel` package under Fedora/CentOS).

### CentOS 6

g++-4.8 is included in the devtools 2.0.

``` bash
sudo wget http://people.centos.org/tru/devtools-2/devtools-2.repo -O /etc/yum.repos.d/devtools-2.repo
sudo yum install devtoolset-2-gcc devtoolset-2-binutils devtoolset-2-gcc-c++ devtoolset-2-valgrind

# scl enable devtoolset-2 bash     # either open a shell running devtools
source /opt/rh/devtoolset-2/enable # ... or source devtools in the same shell
```

### CentOS 7.2

g++-4.8 is included.

### FreeBSD 9.2

g++-4.8 is included in FreeBSD 9.2.

You may also need to install the `gzstream` library with:

``` bash
pkg install gzstream
```

Also Vidjil-algo uses GNU make which requires `gmake` under FreeBSD.
At the time of redacting the documentation, `g++` requires extra options to
ensure flawless compilation and execution of Vidjil-algo:

``` bash
make MAKE=gmake CXXFLAGS="-std=c++11 -O2 Wall -D_GLIBCXX_USE_C99 -Wl,-rpath=/usr/local/lib/gcc49"
```

The `gcc49` at the end of the command line is to be replaced by the `gcc` version
used.

### Debian Squeeze 6.0 / Wheezy 7.0

g++-4.8 should be pinned from testing.
Put in `/etc/apt/preferences` the following lines:

``` bash
Package: *
Pin: release n=wheezy # (or squeeze)
Pin-Priority: 900

Package: g++-4.8, gcc-4.8, valgrind*
Pin: release n=jessie
Pin-Priority: 950
```

Then g++ 4.8 can be installed.

``` bash
apt-get update
apt-get install -t jessie g++-4.8 valgrind
```

### Ubuntu 16.04 LTS, Ubuntu 18.04 LTS

Recent versions of `g++` are included.

### Ubuntu 14.04 LTS

``` bash
sudo apt-get install g++-4.8
```

### Ubuntu 12.04 LTS

g++-4.8 is included in the devtools 2.0.

``` bash
sudo apt-get install python-software-properties
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt-get update
sudo apt-get install g++-4.8
```

### OS X

Xcode should be installed first.

## Installation

### Download

Stables releases can be downloaded from <http://www.vidjil.org/releases> or <http://bioinfo.lifl.fr/vidjil/>.
Development code is found at <http://gitlab.vidjil.org>.

### Compiling

Running `make` from the extracted archive should be enough to install vidjil-algo with germline and demo files.
It runs the three following `make` commands.

``` bash

make germline
   # get IMGT germline databases (IMGT/GENE-DB) -- you have to agree to IMGT license: 
   # academic research only, provided that it is referred to IMGT®,
   # and cited as "IMGT®, the international ImMunoGeneTics information system® 
   # http://www.imgt.org (founder and director: Marie-Paule Lefranc, Montpellier, France). 
   # Lefranc, M.-P., IMGT®, the international ImMunoGeneTics database,
   # Nucl. Acids Res., 29, 207-209 (2001). PMID: 11125093


make vijdil-algo         # build vijil-algo from the sources (see the requirements,
                         # another option is: wget http://www.vidjil.org/releases/vidjil-algo-latest_x86_64 -O vidjil-algo
                         # to download a static binary (built for x86_64 architectures)

make demo                # download demo files (S22 and L4, see demo/get-sequences)

./vidjil-algo -h         # display help/usage
```

On some older systems you may need to replace the `make` commands with:

``` bash
make LDFLAGS='-stdlib=libc++'  ### OS X Mavericks
```

## Self-tests (optional)

You can run the tests with the following commands:

``` bash
make -C src/tests/data
   # get IGH recombinations from a single individual, as described in:
   # Boyd, S. D., and al. Individual variation in the germline Ig gene
   # repertoire inferred from variable region gene rearrangements. J
   # Immunol, 184(12), 6986–92.

make -C src test                # run self-tests (can take 5 to 60 minutes)
```

# Input and parameters

The main input file of Vidjil-algo is a *set of reads*, given as a `.fasta`
or `.fastq` file, possibly compressed with gzip (`.gz`).
This set of reads can reach several gigabytes and 2\*10<sup>9</sup> reads. It is
never loaded entirely in the memory, but reads are processed one by
one by Vidjil-algo.
Vidjil-algo can also process BAM files, but please note that:

1.  The reads don't need to be aligned beforehand.
2.  In case of paired-end sequencing, the reads must have already been merged
    in the BAM file.

The `-h` and `-H` help options provide the list of parameters that can be
used. We detail here the options of the main `-c clones` command.

The default options are very conservative (large window, no further
automatic clusterization, see below), leaving the user or other
software making detailed analysis and decisions on the final
clustering.

## Recombination / locus selection


``` diff
Germline presets (at least one -g or -V/(-D)/-J option must be given)
  -g, --germline GERMLINES ...

         -g <.g FILE>(:FILTER)
                    multiple locus/germlines, with tuned parameters.
                    Common values are '-g germline/homo-sapiens.g' or '-g germline/mus-musculus.g'
                    The list of locus/recombinations can be restricted, such as in '-g germline/homo-sapiens.g:IGH,IGK,IGL'
         -g PATH
                    multiple locus/germlines, shortcut for '-g PATH/homo-sapiens.g',
                    processes human TRA, TRB, TRG, TRD, IGH, IGK and IGL locus, possibly with incomplete/unusal recombinations
  -V FILE ...                 custom V germline multi-fasta file(s)
  -D FILE ...                 custom D germline multi-fasta file(s), analyze into V(D)J components
  -J FILE ...                 custom V germline multi-fasta file(s)
  -2                          try to detect unexpected recombinations
```

The `germline/*.g` presets configure the analyzed recombinations.
The following presets are provided:

  - `germline/homo-sapiens.g`: Homo sapiens, TR (`TRA`, `TRB`, `TRG`, `TRD`) and Ig (`IGH`, `IGK`, `IGL`) locus,
    including incomplete/unusal recombinations (`TRA+D`, `TRB+`, `TRD+`, `IGH+`, `IGK+`, see [locus](locus)).
  - `germline/homo-sapiens-isotypes.g`: Homo sapiens heavy chain locus, looking for sequences with, on one side, IGHJ (or even IGHV) genes,
    and, on the other side, an IGH constant chain.
  - `germline/homo-sapiens-cd.g`: Homo sapiens, common CD genes (experimental, does not check for recombinations)
  - `germline/mus-musculus.g`: Mus musculus (strains BALB/c and C57BL/6)
  - `germline/rattus-norvegicus.g`: Rattus norvegicus (strains BN/SsNHsdMCW and Sprague-Dawley)

New `germline/*.g` presets for other species or for custom recombinations can be created, possibly referring to other `.fasta` files.
Please contact us if you need help in configuring other germlines.

  - Recombinations can be filtered, such as in
    `-g germline/homo-sapiens.g:IGH` (only IGH, complete recombinations),
    `-g germline/homo-sapiens.g:IGH,IGH+` (only IGH, as well with incomplete recombinations)
    or `-g germline/homo-sapiens.g:TRA,TRB,TRG` (only TR locus, complete recombinations).

  - Several presets can be loaded at the same time, as for instance `-g germline/homo-sapiens.g -g germline/germline/homo-sapiens-isotypes.g`.

  - Using `-2` further test unexpected recombinations (tagged as `xxx`), as in `-g germline/homo-sapiens.g -2`.

Finally, the advanced `-V/(-D)/-J` options enable to select custom V, (D) and J repertoires given as `.fasta` files.

## Main algorithm parameters

``` diff
Recombination detection ("window" prediction, first pass)
    (use either -s or -k option, but not both)
    (using -k option is equivalent to set with -s a contiguous seed with only '#' characters)
    (all these options, except -w, are overriden when using -g)
  -k, --kmer INT              k-mer size used for the V/J affectation (default: 10, 12, 13, depends on germline)
  -w, --window INT            w-mer size used for the length of the extracted window ('all': use all the read, no window clustering)
  -e, --e-value FLOAT=1       maximal e-value for determining if a V-J segmentation can be trusted
  --trim INT                  trim V and J genes (resp. 5' and 3' regions) to keep at most <INT> nt  (0: no trim)
  -s, --seed SEED=10s         seed, possibly spaced, used for the V/J affectation (default: depends on germline), given either explicitely or by an alias
                               10s:#####-##### 12s:######-###### 13s:#######-###### 9c:#########
```

The `-s`, `-k` are the options of the seed-based heuristic that detects
"junctions", that is a zone in a read that is similar to V genes on its
left end and similar to J genes in its right end. A detailed
explanation can be found in (Giraud, Salson and al., 2014).
*These options are for advanced usage, the defaults values should work.*
The `-s` or `-k` option selects the seed used for the k-mer V/J affectation.

The `-w` option fixes the size of the "window" that is the main
identifier to cluster clones. The default value (`-w 50`) was selected
to ensure a high-quality clone clustering: reads are clustered when
they *exactly* share, at the nucleotide level, a 50 bp-window centered
on the CDR3. No sequencing errors are corrected inside this window.
The center of the "window", predicted by the high-throughput heuristic, may
be shifted by a few bases from the actual "center" of the CDR3 (for TRG,
less than 15 bases compared to the IMGT/V-QUEST or IgBlast prediction
in \>99% of cases when the reads are large enough). Usually, a 50 bp-window
fully contains the CDR3 as well as some part of the end of the V and
the start of the J, or at least some specific N region to uniquely identify the clone.

Setting `-w` to higher values (such as `-w 60` or `-w 100`) makes the clone clustering
even more conservative, enabling to split clones with low specificity (such as IGH with very
large D, short or no N regions and almost no somatic hypermutations). However, such settings
may "segment" (analyze) less reads, depending on the read length of your data, and may also
return more clones, as any sequencing error in the window is not corrected.

The special `-w all` option takes all the read as the windows, completely disabling
the clustering by windows and generally returning more clones. This should only be used on
datasets where reads of the same clone do have exactly the same length, or in situations
in which one want to study very precisely the clonality, tracking all mutations along the read.

Setting `-w` to lower values than 50 may analyze a few more reads, depending
on the read length of your data, but may in some cases falsely cluster reads from
different clones.
For VJ recombinations, the `-w 40` option is usually safe, and `-w 30` can also be tested.
Setting `-w` to lower values is not recommended.

When the read is too short too extract the requested length, the window can be shifted
(at most 10 bp) or shrinkened (down until 30bp) by increments of 5bp. Such reads
are counted in `SEG changed w` and the corresponding clones are output with the `W50` warning.

The `-e` option sets the maximal e-value accepted for analyzing a sequence.
It is an upper bound on the number of exepcted windows found by chance by the seed-based heuristic.
The e-value computation takes into account both the number of reads in the
input sequence and the number of locus searched for.
The default value is 1.0, but values such as 1000, 1e-3 or even less can be used
to have a more or less permissive designation.
The threshold can be disabled with `-e all`.

The advanced `--trim` option sets the maximal number of nucleotides that will be indexed in
V genes (the 3' end) or in J genes (the 5' end). This reduces the load of the
indexes, giving more precise window estimation and e-value computation.
However giving a `--trim` may also reduce the probability of seeing a heavily
trimmed or mutated V gene.
The default is `--trim 0`.

## Thresholds on clone output

The following options control how many clones are output and analyzed.

``` diff
Input
  -x, --first-reads INT       maximal number of reads to process ('all': no limit, default), only first reads
  -X, --sampled-reads INT     maximal number of reads to process ('all': no limit, default), sampled reads

Limits to report and to analyze clones (second pass)
  -r, --min-reads INT=5       minimal number of reads supporting a clone
  --min-ratio FLOAT=0         minimal percentage of reads supporting a clone
  --max-clones INT            maximal number of output clones ('all': no maximum, default)
  -y, --max-consensus INT=100 maximal number of clones computed with a consensus sequence ('all': no limit)
  -z, --max-designations INT=100
                              maximal number of clones to be analyzed with a full V(D)J designation ('all': no limit, do not use)
  --all                       reports and analyzes all clones
                              (--min-reads 1 --min-ratio 0 --max-clones all --max-consensus all --max-designations all),
                              to be used only on small datasets (for example --all -X 1000)
```

The `-r/--ratio` options are strong thresholds: if a clone does not have
the requested number of reads, the clone is discarded (except when
using `--label`, see below).
The default `-r 5` option is meant to only output clones that
have a significant read support. **You should use** `-r 1` **if you
want to detect all clones starting from the first read** (especially for
MRD detection).

The `--max-clones` option limits the number of output clones, even without consensus sequences.

The `--max-consensus` option limits the number of clones for which a consensus
sequence is computed. Usually you do not need to have more
consensus (see below), but you can safely put `--max-consensus all` if you want
to compute all consensus sequences.

The `--max-designations` option limits the number of clones that are fully analyzed,
*with their V(D)J designation and possibly a CDR3 detection*,
in particular to enable the web application
to display the clones on the grid (otherwise they are displayed on the
'?/?' axis).
If you want to analyze more clones, you should use `--max-designations 200` or
`--max-designations 500`. It is not recommended to use larger values: outputting more
than 500 clones is often not useful since they can not be visualized easily
in the web application, and takes more computation time.

Note that even if a clone is not in the top 100 (or 200, or 500) but
still passes the `-r`, `--ratio` options, it is still reported in both the `.vidjil`
and `.vdj.fa` files. If the clone is at some MRD point in the top 100 (or 200, or 500),
it will be fully analyzed by this other point (and then
collected by the `fuse.py` script, using consensus sequences computed at this
other point, and then, on the web application, correctly displayed on the grid).
**Thus is advised to leave the default** `--max-designations 100` **option
for the majority of uses.**

The `--all` option disables all these thresholds. This option can be
used for test and debug purposes or on small datasets.
It produces large file and takes more time. 

The `--analysis-filter` advanced option speeds up the full analysis by a pre-processing step,
again based on k-mers, to select a subset of the V germline genes to be compared to the read.
The option gives the typical size of this subset (it can be larger when several V germlines
genes are very similar, or smaller when there are not enough V germline genes).
The default `--analysis-filter 3` is generally safe.
Setting `--analysis-filter all` removes this pre-processing step, running a full dynamic programming
with all germline sequences that is much slower.

## Sequences of interest

Vidjil-algo allows to indicate that specific sequences should be followed and output,
even if those sequences are 'rare' (below the `-r/--ratio` thresholds).
Such sequences can be provided either with `--label <sequence>`, or with `--label-file <file>`.
The file given by `--label-file` should have one sequence by line, as in the following example:

``` diff
GAGAGATGGACGGGATACGTAAAACGACATATGGTTCGGGGTTTGGTGCT my-clone-1
GAGAGATGGACGGAATACGTTAAACGACATATGGTTCGGGGTATGGTGCT my-clone-2 foo
```

Sequences and labels must be separated by one space.
The first column of the file is the sequence to be followed
while the remaining columns consist of the sequence's label.
In Vidjil-algo output, the labels are output alongside their sequences.

A sequence given `--label <sequence>` or with `-label-file <file>` can be exactly the size
of the window (`-w`, that is 50 by default). In this case, it is guaranteed that
such a window will be output if it is detected in the reads.
More generally, when the provided sequence differs in length with the windows
we will keep any windows that contain the sequence of interest or, conversely,
we will keep any window that is contained in the sequence of interest.
This filtering will work as expected when the provided sequence overlaps
(at least partially) the CDR3 or its close neighborhood.

With the `--label-filter` option, *only* the windows related to the given sequences are kept.
This allows to quickly filter a set of reads, looking for a known sequence or window,
with the `--grep-reads <sequence>` preset, equivalent to
`--out-reads --label-filter --label <sequence>`:
All the reads with the windows related to the sequence will be extracted 
to files such as `out/seq/clone.fa-1`.

## Clone analysis: VDJ assignation and CDR3 detection

```
Clone analysis (second pass)
  -d, --several-D             try to detect several D (experimental)
  -3, --cdr3                  CDR3/JUNCTION detection (requires gapped V/J germlines)
```

The `-3` option launches a CDR3/JUNCTION detection based on the position
of Cys104 and Phe118/Trp118 amino acids. This detection relies on alignment
with gapped V and J sequences, as for instance, for V genes, IMGT/GENE-DB sequences,
as provided by `make germline`.
The CDR3/JUNCTION detection won't work with custom non-gapped V/J repertoires.

CDR3 are reported as productive when they come from an in-frame recombination
and when the sequence does not contain any in-frame stop codons.

The advanced `--analysis-cost` option sets the parameters used in the comparisons between
the clone sequence and the V(D)J germline genes. The default values should work.

The e-value set by `-e` is also applied to the V/J designation.
The `-E` option further sets the e-value for the detection of D segments.

## Further clustering (experimental)

The following options are experimental and have no consequences on the `.vdj.fa` file,
nor on the standard output. They instead add a `clusters` sections in the `.vidjil` file
that will be visualized in the web application.

The `--cluster-epsilon` option triggers an automatic clustering using DBSCAN algorithm (Ester and al., 1996).
Using `--cluster-epsilon 5` usually clusters reads within a distance of 1 mismatch (default score
being +1 for a match and -4 for a mismatch). However, more distant reads can also
be clustered when there are more than 10 reads within the distance threshold.
This behaviour can be controlled with the `-cluster-N` option.

The `--cluster-forced-edges` option allows to specify a file for manually clustering two windows
considered as similar. Such a file may be automatically produced by vidjil
(`out/edges`), depending on the option provided. Only the two first columns
(separed by one space) are important to vidjil, they only consist of the
two windows that must be clustered.

# Output

## Main output files

The main output of Vidjil-algo (with the default `-c clones` command) are two following files:

  - The `.vidjil` file is *the file for the Vidjil web application*.
    The file is in a `.json` format (detailed in [vidjil-format](vidjil-format))
    describing the windows and their count, the consensus sequences (`--max-consensus`),
    the detailed V(D)J and CDR3 designation (`--max-designations`, see warning below), and possibly
    the results of the further clustering.
    
    The web application takes this `.vidjil` file ([possibly merged with `fuse.py`](#following-clones-in-several-samples)) for the *visualization and analysis* of clones and their
    tracking along different samples (for example time points in a MRD
    setup or in a immunological study).
    Please see the [user manual](user.md) for more information on the web application.

  - The `.vdj.fa` file is *a FASTA file for further processing by other bioinformatics tools*.
    The sequences are at least the windows (and their count in the headers) or
    the consensus sequences (`--max-consensus`) when they have been computed.
    The headers include the count of each window, and further includes the
    detailed V(D)J and CDR3 designation (`--max-designations`, see warning below), given in a '.vdj' format, see below.
    The further clustering is not output in this file.
    
    The `.vdj.fa` output enables to use Vidjil-algo as a *filtering tool*,
    shrinking a large read set into a manageable number of (pre-)clones
    that will be deeply analyzed and possibly further clustered by
    other software.

By default, the two output files are named `out/basename.vidjil` in `out/basename.vdj.fa`, where:

  - `out` is the directory where all the outputs are stored (can be changed with the `--dir` option).
  - `basename` is the basename of the input `.fasta/.fastq` file (can be overriden with the `--base` option)

## Auxiliary output files

The `out/basename.windows.fa` file contains the list of windows, with number of occurrences:

``` diff
>8--window--1
TATTACTGTACCCGGGAGGAACAATATAGCAGCTGGTACTTTGACTTCTG
>5--window--2
CGAGAGGTTACTATGATAGTAGTGGTTATTACGGGGTAGGGCAGTACTAC
ATAGTAGTGGTTATTACGGGGTAGGGCAGTACTACTACTACTACATGGAC
(...)
```

Windows of size 50 (modifiable by `-w`) have been extracted.
The first window has 8 occurrences, the second window has 5 occurrences.

The `out/seq/clone.fa-*` contains the detailed analysis by clone, with
the window, the consensus sequence, as well as with the most similar V, (D) and J germline genes:

``` diff
>clone-001--IGH--0000008--0.0608%--window
TATTACTGTACCCGGGAGGAACAATATAGCAGCTGGTACTTTGACTTCTG
>clone-001--IGH--0000008--0.0608%--lcl|FLN1FA001CPAUQ.1|-[105,232]-#2 - 128 bp (55% of 232.0 bp) + VDJ  0 54 73 84 85 127   IGHV3-23*05 6/ACCCGGGAGGAACAATAT/9 IGHD6-13*01 0//5 IGHJ4*02  IGH SEG_+ 1.946653e-19 1.352882e-19/5.937712e-20
GCTGTACCTGCAAATGAACAGCCTGCGAGCCGAGGACACGGCCACCTATTACTGT
ACCCGGGAGGAACAATATAGCAGCTGGTAC
TTTGACTTCTGGGGCCAGGGGATCCTGGTCACCGTCTCCTCAG

>IGHV3-23*05
GAGGTGCAGCTGTTGGAGTCTGGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTTAGCAGCTATGCCATGAGCTGGGTCCGCCAGGCTCCAGGGAAGGGGCTGGAGTGGGTCTCAGCTATTTATAGCAGTGGTAGTAGCACATACTATGCAGACTCCGTGAAGGGCCGGTTCACCATCTCCAGAGACAATTCCAAGAACACGCTGTATCTGCAAATGAACAGCCTGAGAGCCGAGGACACGGCCGTATATTACTGTGCGAAA
>IGHD6-13*01
GGGTATAGCAGCAGCTGGTAC
>IGHJ4*02
ACTACTTTGACTACTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAG
```

The `--out-reads` debug option further output in each `out/seq/clone.fa-*` files the full list of reads belonging to this clone.
The `--out-reads` option produces large files, and is not recommended in general cases.

## Diversity measures

Several [diversity indices](https://en.wikipedia.org/wiki/Diversity_index) are reported, both on the standard output and in the `.vidjil` file:

  - H (`index_H_entropy`): Shannon's diversity
  - E (`index_E_equitability`): Shannon's equitability
  - Ds (`index_Ds_diversity`): Simpson's diversity

E ans Ds values are between 0 (no diversity, one clone clusters all analyzed reads)
and 1 (full diversity, each analyzed read belongs to a different clone).
These values are now computed on the windows, before any further clustering.
PCR and sequencing errors can thus lead to slightly over-estimate the diversity.

## Details on non analyzed reads

Vidjil-algo outputs details statistics on the reads that are not analyzed.
Basically, **an unanalyzed read is a read where Vidjil-algo cannot identify a window at the junction of V and J genes**.
To properly analyze a read, Vijdil-algo needs that the sequence spans enough V region and J region
(or, more generally, 5' region and 3' regions when looking for incomplete or unusual recombinations).
The following causes are reported:

|                     |                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `UNSEG too short`   | Reads are too short, shorter than the seed (by default between 9 and 13 bp).                                             |
| `UNSEG strand`      | The strand is mixed in the read, with some similarities both with the `+` and the `-` strand.                            |
| `UNSEG too few V/J` | No information has been found on the read: There are not enough similarities neither with a V gene or a J gene.          |
| `UNSEG only V/5`    | Relevant similarities have been found with some V, but none or not enough with any J.                                    |
| `UNSEG only J/3`    | Relevant similarities have been found with some J, but none or not enough with any V.                                    |
| `UNSEG ambiguous`   | vidjil-algo finds some V and J similarities mixed together which makes the situation ambiguous and hardly solvable.      |
| `UNSEG too short w` | The junction can be identified but the read is too short so that vidjil-algo could extract the window (by default 50bp). |
|                     | It often means the junction is very close from one end of the read.                                                      |

Some datasets may give reads with many low `UNSEG too few` reads:

  - `UNSEG too few V/J` usually happens when reads share almost nothing with the V(D)J region.
    This is expected when the PCR or capture-based approach included other regions, such as in whole RNA-seq.

  - `UNSEG only V/5` and `UNSEG only J/3` happen when reads do not span enough the junction zone.
    Vidjil-algo detects a “window” including the CDR3. By default this window is 50bp long,
    so the read needs be that long centered on the junction.

See the [user manual](user.md) for information on the biological or sequencing causes 
that can lead to few analyzed reads.

## Filtering reads

``` diff
Detailed output per read (generally not recommended, large files, but may be used for filtering, as in -uu -X 1000)
  -U, --out-analyzed          output analyzed reads (in .segmented.vdj.fa file)
  -u, --out-unanalyzed        
        -u          output unanalyzed reads, gathered by cause, except for very short and 'too few V/J' reads (in *.fa files)
        -uu         output unanalyzed reads, gathered by cause, all reads (in *.fa files) (use only for debug)
        -uuu        output unanalyzed reads, all reads, including a .unsegmented.vdj.fa file (use only for debug)
  --out-reads                 output all reads by clones (clone.fa-*), to be used only on small datasets
  -K, --out-affects           output detailed k-mer affectation for each read (in .affects file) (use only for debug, for example -KX 100)
```

It is possible to extract all analyzed or not analyzed reads, possibly to give them to other software.
Runing Vidjil with `-U` gives a file `out/basename.analyzed.vdj.fa`, with all analyzed reads.
On datasets generated with rather specific V(D)J primers, this is generally not recommended, as it may generate a large file.
However, the `-U` option is very useful for whole RNA-Seq or capture datasets that contain few reads with V(D)J recombinations.

Similarly, options are available to get the non analyzed reads:

  - `-u` gives a set of files `out/basename.UNSEG_*`, with not analyzed reads gathered by cause.
    It outputs only reads sharing significantly sequences with V/J germline genes or with some ambiguity:
    it may be interesting to further study RNA-Seq datasets.

  - `-uu` gives the same set of files, including **all** not analyzed reads (including `UNSEG too short` and `UNSEG too few V/J`),
    and `-uuu` further outputs all these reads in a file `out/basename.unsegmented.vdj.fa`.

Again, as these options may generate large files, they are generally not recommended.
However, they are very useful in some situations, especially to understand why some dataset gives poor segmentation result.
For example `-uu -X 1000` splits the not analyzed reads from the 1000 first reads.


## AIRR .tsv output

Since version 2018.10, vidjil-algo supports the [AIRR format](http://docs.airr-community.org/en/latest/datarep/rearrangements.html#fields).
We export all required fields, some optional fields, as also some custom fields (+).

Note that Vidjil-algo is designed to efficiently gather reads from large datasets into clones. 
By default (`-c clones`), we thus report in the AIRR format *clones*.
See also [What is a clone ?](vidjil-format/#what-is-a-clone).
Using `-c designations` trigger a separate analysis for each read, but this is usually not advised for large datasets. 


| Name  | Type | AIRR 1.2 Description <br /> *vidjil-algo implementation* |
| ----- | ---- |  ------------------------------------------------------- |
| locus | string | Gene locus (chain type). For example, `IGH`, `IGK`, `IGL`, `TRA`, `TRB`, `TRD`, or `TRG`.<br />*Vidjil-algo outputs all these loci. Moreover, the incomplete recombinations analyzed by vidjil-algo are reported as `IGH+`, `IGK+`, `TRA+D`, `TRB+`, `TRD+`, and `xxx` for unexpected recombinations. See  [locus](locus).*
| duplicate_count | number | Number of reads contributing to the (UMI) consensus for this sequence. For example, the sum of the number of reads for all UMIs that contribute to the query sequence. <br />*Number of reads gathered in the clone.*
| sequence_id | string  | Unique query sequence identifier within the file. Most often this will be the input sequence header or a substring thereof, but may also be a custom identifier defined by the tool in cases where query sequences have been combined in some fashion prior to alignment. <br />*This identifier is the (50 bp by default) window extacted around the junction.* |
| clone_id 	| string | 	Clonal cluster assignment for the query sequence. <br />*This identifier is again the (50 bp by default) window extacted around the junction.*
| warnings (+) | string | *Warnings associated to this clone. See <https://gitlab.vidjil.org/blob/dev/doc/warnings.md>.*
| sequence  | string | The query nucleotide sequence. Usually, this is the unmodified input sequence, which may be reverse complemented if necessary. In some cases, this field may contain consensus sequences or other types of collapsed input sequences if these steps are performed prior to alignment. <br />*This contains the consensus/representative sequence of each clone.*
| rev_comp  | boolean | True if the alignment is on the opposite strand (reverse complemented) with respect to the query sequence. If True then all output data, such as alignment coordinates and sequences, are based on the reverse complement of 'sequence'. <br />*Set to null, as vidjil-algo gather reads from both strands in clones* |
| v_call, d_call, j_call  | string  | V/D/J gene with allele. For example, IGHV4-59\*01. <br /> *implemented. In the case of uncomplete/unexpected recombinations (locus with a `+`), we still use `v/d/j_call`. Note that this value can be null on clones beyond the `--max-designations` option.* |
| junction  | string  |      Junction region nucleotide sequence, where the junction is defined as the CDR3 plus the two flanking conserved codons. <br />*null*
| junction_aa  | string  | Junction region amino acid sequence.      <br />*implemented*
| cdr3_aa | string | Amino acid translation of the cdr3 field.   <br />*implemented*
| productive | boolean | True if the V(D)J sequence is predicted to be productive.  <br /> *true, false, or null when no CDR3 has been detected* |
| sequence_alignment  | string  | Aligned portion of query sequence, including any indel corrections or numbering spacers, such as IMGT-gaps. Typically, this will include only the V(D)J region, but that is not a requirement. <br /> *null*                                         |
| germline_alignment | string  | Assembled, aligned, fully length inferred germline sequence spanning the same region as the sequence_alignment field (typically the V(D)J region) and including the same set of corrections and spacers (if any). <br />*null*
| v_cigar, d_cigar, j_cigar | string  | CIGAR strings for the V/D/J gene <br />*null*.

Currently, we do not output alignment strings.
Our implementation of .tsv may evolve in future versions.
Contact us if a particular feature does interest you.


## The .vdj format

Vidjil output includes analysis of V(D)J recombinations. This happens
in the following situations:

  - in a first pass, when requested with `-U` option, in a `.segmented.vdj.fa` file.
    
    The goal of this ultra-fast analysis, based on a seed
    heuristics, is only to identify the locus and to locate the w-window overlapping the
    CDR3. This should not be taken as a real V(D)J designation, as
    the center of the window may be shifted up to 15 bases from the
    actual center.

  - in a second pass, on the standard output and in both `.vidjil` and `.vdj.fa` files
    
      - at the end of the clones detection (default command `-c clones`,
        on a number of clones limited by the `--max-designations` option)
      - or directly when explicitly requiring V(D)J designation for each read 
        (`-c designations`)
    
    These V(D)J designations are obtained by full comparison (dynamic programming)
    with all germline sequences.
    
    Note that these designations are relatively slow to compute, especially
    for the IGH locus. However, they
    are not at the core of the Vidjil clone clustering method (which
    relies only on the 'window', see above).
    To check the quality of these designations, the automated test suite include
    sequences with manually curated V(D)J designations (see [should-vdj.org](http://git.vidjil.org/blob/master/doc/should-vdj.org)).

Designations of V(D)J recombinations are displayed using a dedicated
`.vdj` format. This format is compatible with FASTA format. A line starting
with a \> is of the following form:

``` diff
>name + VDJ  startV endV   startD endD   startJ  endJ   Vgene   delV/N1/delD5'   Dgene   delD3'/N2/delJ   Jgene   comments

        name          sequence name (include the number of occurrences in the read set and possibly other information)
        +             strand on which the sequence is mapped
        VDJ           type of designation (can be "VJ", "VDJ", "VDDJ", "53"...
                      or shorter tags such as "V" for incomplete sequences).    
              The following line are for "VDJ" recombinations :

        startV endV   start and end position of the V gene in the sequence (start at 1)
        startD endD                      ... of the D gene ...
        startJ endJ                      ... of the J gene ...

        Vgene         name of the V gene 

        delV          number of deletions at the end (3') of the V
        N1            nucleotide sequence inserted between the V and the D
        delD5'        number of deletions at the start (5') of the D

        Dgene         name of the D gene being rearranged

        delD3'        number of deletions at the end (3') of the D
        N2            nucleotide sequence inserted between the D and the J
        delJ          number of deletions at the start (5') of the J

        Jgene         name of the J gene being rearranged

        comments      optional comments. In Vidjil, the following comments are now used:
                      - "seed" when this comes for the first pass (.segmented.vdj.fa). See the warning above.
                      - "!ov x" when there is an overlap of x bases between last V seed and first J seed
                      - the name of the locus (TRA, TRB, TRG, TRD, IGH, IGL, IGK, possibly followed
                        by a + for incomplete/unusual recombinations)

```

Following such a line, the nucleotide sequence may be given, giving in
this case a valid FASTA file.

For VJ recombinations the output is similar, the fields that are not
applicable being removed:

``` diff
>name + VJ  startV endV   startJ endJ   Vgene   delV/N1/delJ   Jgene  comments
```

# Examples of use

Examples on a IGH VDJ recombinations require either to specigy `-g germline/homo-sapiens-g:IGH`,
or to use the multi-germline option `-g germline/homo-sapiens.g` that can be shortened into `-g germline`.

## Basic usage: PCR-based datasets, with primers in the V(D)J regions (such as BIOMED-2 primers)

``` bash
./vidjil-algo -c clones   -g germline/homo-sapiens.g -2 -3 -r 1  demo/Demo-X5.fa
  # Detect the locus for each read, cluster and report clones starting from the first read (-r 1).
  # including unexpected recombinations (-2). Assign the V(D)J genes and try to detect the CDR3s (-3).
  # Demo-X5 is a collection of sequences on all human locus, including some incomplete or unusual recombinations:
  # IGH (VDJ, DJ), IGK (VJ, V-KDE, Intron-KDE), IGL, TRA, TRB (VJ, DJ), TRG and TRD (VDDJ, Dd2-Dd3, Vd-Ja).
```

``` bash
./vidjil-algo -g germline/homo-sapiens.g:IGH -3 demo/Stanford_S22.fasta
   # Cluster the reads and report the clones, based on windows overlapping IGH CDR3s.
   # Assign the V(D)J genes and try to detect the CDR3 of each clone.
   # Summary of clones is available both on stdout, in out/Stanford_S22.vdj.fa and in out/Stanford_S22.vidjil.
```

``` bash
./vidjil-algo -g germline -2 -3 -d demo/Stanford_S22.fasta
   # Detects for each read the best locus, including an analysis of incomplete/unusual and unexpected recombinations
   # Cluster the reads into clones, again based on windows overlapping the detected CDR3s.
   # Assign the VDJ genes (including multiple D) and try to detect the CDR3 of each clone.
   # Summary of clones is available both on stdout, in out/reads.vdj.fa and in out/reads.vidjil.
```

## Basic usage: Whole RNA-Seq or capture datasets

``` bash
./vidjil-algo -g germline -2 -U demo/Stanford_S22.fasta
   # Detects for each read the best locus, including an analysis of incomplete/unusual and unexpected recombinations
   # Cluster the reads into clones, again based on windows overlapping the detected CDR3s.
   # Assign the VDJ genes and try to detect the CDR3 of each clone.
   # The out/reads.segmented.vdj.fa include all reads where a V(D)J recombination was found
```

Typical whole RNA-Seq or capture datasets may be huge (several GB) but with only a (very) small portion of CDR3s.
Using Vidjil with `-U` will create a `out/reads.segmented.vdj.fa` file
that includes all reads where a V(D)J recombination (or an unexpected recombination, with `-2`) was found.
This file will be relatively small (a few kB or MB) and can be taken again as an input for Vidjil or for other programs.

## Advanced usage

``` bash
./vidjil-algo -c clones -g germline/homo-sapiens.g -r 1 --cluster-epsilon 5 -x 10000 demo/LIL-L4.fastq.gz
   # Extracts the windows with at least 1 read each (-r 1, the default being -r 5)
   # on the first 10,000 reads, then cluster them into clones
   # with a second clustering step at distance five (--cluster-epsilon 5)
   # The result of this second is in the .vidjil file ('clusters')
   # and can been seen and edited in the web application.
```

``` bash
./vidjil-algo -c designations -g germline/homo-sapiens.g -2 -3 -d -x 50 demo/Stanford_S22.fasta
   # Detailed V(D)J designation, including multiple D, and CDR3 detection on the first 50 reads, without clone clustering
   # (this is not as efficient as '-c clones')
```

``` bash
./vidjil-algo -c germlines -g germline/homo-sapiens.g demo/Stanford_S22.fasta
   # Output statistics on the number of occurrences of k-mers of the different germlines
```

## Following clones in several samples

In a minimal residual disease setup, for instance, we are interested in
following the main clones identified at diagnosis in the following samples.

In its output files, Vidjil keeps track of all the clones, even if it
provides a V(D)J assignation only for the main ones. Therefore the
meaningful information is already in the files (for instance in the `.vidjil`
files). However we have one `.vidjil` per sample which may not be very
convenient. All the more since the web client only takes one `.vidjil` file
as input and cannot take several ones.

Therefore we need to merge all the `.vidjil` files into a single one. That is
the purpose of the [tools/fuse.py](../tools/fuse.py) script.

Let assume that four `.vidjil` files have been produced for each sample
(namely `diag.vidjil`, `fu1.vidjil`, `fu2.vidjil`, `fu3.vidjil`), merging them will
be done in the following way:

``` bash
python tools/fuse.py --output mrd.vidjil --top 100 diag.vidjil fu1.vidjil fu2.vidjil fu3.vidjil
```

The `--top` parameter allows to choose how many top clones per sample should
be kept. 100 means that for each sample, the top 100 clones are kept and
followed in the other samples. In this example the output file is stored in
`mrd.vidjil` which can then be fed to the web client.
