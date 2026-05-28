
> [!note]
> Here are aggregated notes forming a part of the developer documentation on the vidjil-algo.  
> These notes are a work-in-progress, they are not as polished as the user documentation.  
> Developers should also have a look at the documentation for [bioinformaticians](vidjil-algo.md) and [server administrators](admin.md), at the [issues](https://gitlab.inria.fr/vidjil/vidjil), at the commit messages, and at the source code.

# Development notes -- Vidjil-algo

## Code organization

The canonical path through code follows roughly those steps:

0. Vidjil is launched, `main()` is called (vidjil.cpp) which parses and validates the command line on the go
1. Species germline genes are loaded from the input .g files (e.g. `homo-sapiens.g`) which reference FASTA files describing genes of specific recombination systems (IGHV.fa, TRAJ+down.fa, IGK-INTRON.fa, etc.) as provided by IMGT, going through `MultiGermline` (multi_germline.hpp), `Germline` (germline.h) and `GermlineElement` (germline_element.hpp) and finally `PointerACAutomaton` (automaton.hpp) to build an Aho-Corasick graph of all genes based on specific seeds. The germline gene sequences are streamed through `OnlineFasta` (fasta.h) and some regions of interest are marked on them
2. The input sequence file (FASTA, FASTQ, BAM, optionally gzipped) is read either by `OnlineFasta` (fasta.h) or `OnlineBAM` (bam.h) and the k-mers recognized as part of a germline gene (affectations) are counted on its reads as an overview
3. On each read, the set of affectations found is analyzed to probabilistically find V(D)J recombinations with `KmerAffectAnalyser` or `MultiKmerAffectAnalyser` (affectanalyser.hpp), and `KmerSegmenter` (segment.hpp)
4. For reads in which V(D)J recombinations have been detected, a sub-sequence between the likely V gene's end and the likely J gene's start serves as a key to count reads with the same sub-sequence (called a window), and to store them together (up to a certain amount, with some heuristic) in `BinReadStorage` (read_storage.h), used by `WindowsStorage` (windows.h) through `WindowsExtractor` (windowExtractor.h)
5. Windows that are identical-enough have their reads further clustered together using `comp_matrix` (cluster-junctions.h), using the distance between pairs of windows, as determined through sequence alignment with `DynProg` (dynprog.h)
6. For each remaining cluster of reads around a window, a sequence that is as representative as possible of stored reads and as long as possible is generated, using those same stored reads, as output by `KmerRepresentativeComputer` (representative.h). The resulting sequence is an approximate consensus
7. The representative sequence of each window is then aligned with possibly matching V (, D) and J genes by `DynProg` (dynprog.h). The V(D)J recombination the window represents is actually designated: the actual V (, D) and J genes a window is made of are determined and finely segmented by `FineSegmenter` (segment.h), which locates the start and end of its sub-regions, especially that of the CDR3 and JUNCTION
8. Since reads associated with a window have been counted, V(D)J recombinations are now both quantified and qualified. They are output to a JSON-like .vidjil file by `SampleOutputVidjil` and to an AIRR's .tsv file by `CloneOutputAIRR` (output.h)

## Tests

### Unit

Unit tests are managed using an internal lightweight poorly-designed
library that outputs a TAP file. They are organized in the directory
[algo/tests](https://gitlab.inria.fr/vidjil/vidjil/-/tree/dev/algo/tests).

All the tests are defined in the [tests.cpp](https://gitlab.inria.fr/vidjil/vidjil/-/blob/dev/algo/tests/unit-tests/tests.cpp) file. But, for the sake of
clarity, this file includes other `cpp` files that incorporate all the
tests. A call to `make` compiles and launches the `tests.cpp` file, which
outputs a TAP file (in case of total success) and creates a `tests.cpp.tap`
file (in every case).

1. Tap test library

The library is defined in the [testing.h](https://gitlab.inria.fr/vidjil/vidjil/-/blob/dev/algo/tests/unit-tests/testing.h) file.

Tests must be declared in the [tests.h](https://gitlab.inria.fr/vidjil/vidjil/-/blob/dev/algo/tests/unit-tests/tests.h) file:
    1. Define a new macro (in the enum) corresponding to the test name
    2. In `declare_tests()` use `RECORD_TAP_TEST` to associate the macro with a
        description (that will be displayed in the TAP output file).

    Then testing can be done using the `TAP_TEST` macro. The macro takes three
    arguments. The first one is a boolean that is supposed to be true, the
    second is the test name (using the macro defined in `tests.h`) and the
    third one (which can be an empty string) is something which is displayed
    when the test fails.

## Purpose of central classes / source files

[vidjil.cpp](../algo/core/vidjil.cpp): entry point into the program (`main()`)

### File parsers (load germlines and parse patient's lymphocytes DNA samples)
- [bioreader.hpp](../algo/core/bioreader.hpp): reads and stores sequences from an input string or file
- [onlinebioreader.h](../algo/core/onlinebioreader.h): abstract file streaming of input reads, one by one
- [fasta.h](../algo/core/fasta.h): specialized OnlineBioReader for (optionally gzipped) FASTA/FASTQ files
- [bam.h](../algo/core/bam.h): specialized OnlineBioReader for BAM files

### Germlines (organize reads, recombination systems, shortcuts and other data associated with IMGT germlines)
- [germline_element.hpp](../algo/core/germline_element.hpp): represents one FASTA file (e.g. containing the V, D, J, C genes of a recombination system for instance)
- [germline_element_repository.hpp](../algo/core/germline_element_repository.hpp): associative finder of shortcut by affect and of FASTA files by (filename + seeds) pairs or by shortcut
- [germline.hpp](../algo/core/germline.hpp): represents a recombination system, as described in .g files, associating gene types (V/"5", D/"4", J/"3" etc.) that are part of the system to the FASTA files holding the collection of matching genes
- [multi_germline.hpp](../algo/core/multi_germline.hpp): holds all recombination systems passed through input .g files

### Detection (analyze reads and find V(D)J recombinations)
- [kmerstore.h](../algo/core/kmerstore.h): stores k-mer affects derived from a specific seed and their associated FASTA file(s)
- [automaton.h](../algo/core/automaton.h): builds and queries an Aho-Corasick graph to match parts of reads against known genes, which is a specialized k-mer storage
- [kmeraffect.h](../algo/core/kmeraffect.h): assigns a matching gene to a sub-sequence (an affect)
- [affectanalyser.h](../algo/core/affectanalyser.h): analyzes gene parts that were recognized on a read, based on affect count, positions and probabilities

### Clusterization (grouping and counting reads sharing similar V(D)J recombinations)
- [read_storage.h](../algo/core/read_storage.h): stores reads in bins, in limited amounts, following scoring heuristic
- [read_score.h](../algo/core/read_score.h): scoring heuristics
- [windows.h](../algo/core/windows.h): organizes windows (sub-sequences from the end of a V gene to the start of a J gene) by sequences, germlines, status
- [windowExtractor.h](../algo/core/windowExtractor.h): extracts windows, performs statistics and formats data for outputs
- [cluster-junctions.h](..algo/core/cluster-junctions.h): clusters similar windows and their associated reads together, based on windows alignment by pairs (see dynprog.h)
- [representative.h](../algo/core/representative.h): computes a representative sequence from a list of sequences sharing a common sub-sequence (window)

### Designation and segmentation
- [dynprog.h](../algo/core/dynprog.h): aligns a read with a reference gene based on the Smith-Waterman-Gotoh algorithm
- [segment.h](../algo/core/segment.h): designates the precise genes a recombination is made of, positions them, and detects any anomaly (out of frame, stop codon, too short, etc.)

### Output
- [output.h](../algo/core/output.h): formats and outputs data following specific file formats
