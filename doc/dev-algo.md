
!!! note
    Here are aggregated notes forming a part of the developer documentation on the vidjil-algo.  
    These notes are a work-in-progress, they are not as polished as the user documentation.  
    Developers should also have a look at the documentation for [bioinformaticians](vidjil-algo.md) and [server administrators](admin.md),
    at the [issues](https://gitlab.inria.fr/vidjil/vidjil), at the commit messages, and at the source code.

# Development notes -- Vidjil-algo

## Code organization

The algorithm follows roughly those steps, supposing the matching command line options have been supplied:

0. Vidjil is launched, `main()` is called (vidjil.cpp) which parses and validates the command line on the go
1. Species germline genes are loaded from the input .g files (e.g. `homo-sapiens.g`) which reference FASTA files describing genes of specific loci (e.g. IGHV.fa, TRAJ.fa, TRAJ+down.fa, etc.) as provided by IMGT, going through `MultiGermline` (multi_germline.hpp), `Germline` (germline.h) and `GermlineElement` (germline_element.hpp) and finally `PointerACAutomaton` (automaton.hpp) to build an Aho-Corasick graph of all genes based on specific seeds, and to mark regions of interest on raw germline genes
2. The input sequence file (FASTA, FASTQ, BAM, optionally gzipped) is read either by `OnlineFasta` (`core/fasta.h`) or `OnlineBAM` (`core/bam.h`) and the k-mers recognized as part of a germline gene (affects) are counted in its reads as an overview
3. Each read's affects are analyzed individually to probabilistically find V(D)J recombinations with `KmerAffectAnalyser` or `MultiKmerAffectAnalyser` (affectanalyser.hpp), and `KmerSegmenter` (segment.hpp)
4. For reads in which V(D)J recombinations have been detected, a sub-sequence between the likely V gene end and the likely J gene start serves as a key to count reads with the same sub-sequence (called a window), and to store them together (up to a certain amount, with some heuristic) in `BinReadStorage` (read_storage.h), used by `WindowsStorage` (windows.h) through `WindowsExtractor` (windowExtractor.h)
5. Windows that are identical-enough have their reads further clustered together using `comp_matrix` (cluster-junctions.h), using the distance between pairs of windows, as determined through sequence alignment with `DynProg` (dynprog.h)
6. For each remaining cluster of reads around a window, a sequence that is as representative as possible of stored reads and as long as possible is generated, using those same stored reads, as output by KmerRepresentativeComputer (representative.h). The resulting sequence is an approximate consensus
7. The representative sequence of each window is then aligned with possibly matching V (, D) and J genes by `DynProg` (dynprog.h). The V(D)J recombination the window represents is actually designated: the actual V (, D) and J genes is it made of are determined and finely segmented by `FineSegmenter` (segment.h), which positions the start and end of its sub-regions, especially its CDR3 and JUNCTION
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
