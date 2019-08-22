
Here are aggregated notes forming the developer documentation of vidjil-algo.
This documentation is a work-in-progress, it is far from being as polished as the user documentation.
Help can also be found in the source code and in the commit messages.

# Algorithm

## Code organisation

The algorithm follows roughly those steps:

1.  The germlines are read. Germlines are in the fasta format and are read
    by the Fasta class (`core/fasta.h`). Germlines are built using the
    Germline (or MultiGermline) class (`core/germline.h`)
2.  The input sequence file (.fasta, .fastq, .gz) is read by an OnlineFasta
    (`core/fasta.h`). The difference with the Fasta class being that all the
    data is not stored in memory but the file is read online, storing only
    the current entry.
3.  Windows must be extracted from the read, which is done by the
    WindowExtractor class (`core/windowExtractor.h`). This class has an
    `extract` method which returns a WindowsStorage object
    (`core/windows.h`) in which windows are stored.
4.  To save space consumption, all the reads linked to a given window are
    not stored. Only the longer ones are kept. The BinReadStorage class is
    used for that purpose (`core/read_storage.h`).
5.  In the WindowStorage, we now have the information on the clusters and on
    the abundance of each cluster. However we lack a sequence representative
    of the cluster. For that purpose the class provides a
    `getRepresentativeComputer` method that provides a
    KmerRepresentativeComputer (`core/representative.h`). This class can
    compute a representative sequence using the (long) reads that were
    stored for a given window.
6.  The representative can then be segmented to determine what V, D and J
    genes are at play. This is done by the FineSegmenter (`core/segment.h`).

## The xxx germline

  - All germlines are inserted in one index using `build_with_one_index()` and
    the segmentation method is set to `SEG_METHOD_MAX12` to tell that the
    segmentation must somehow differ.
  - So that the FineSegmenter correctly segments the sequence, the `rep_5` and
    `rep_3` members (class `Fasta`) of the xxx germline are modified by the
    FineSegmenter. The `override_rep5_rep3_from_labels()` method from the
    Germline is the one that overwrites those members with the Fasta
    corresponding to the affectation found by the KmerSegmenter.

## Tests

### Unit

Unit tests are managed using an internal lightweight poorly-designed
library that outputs a TAP file. They are organised in the directory
[algo/tests](../algo/tests).

All the tests are defined in the [tests.cpp](../algo/tests/tests.cpp) file. But, for the sake of
clarity, this file includes other `cpp` files that incorporate all the
tests. A call to `make` compiles and launches the `tests.cpp` file, which
outputs a TAP file (in case of total success) and creates a `tests.cpp.tap`
file (in every case).

1.  Tap test library
    
    The library is defined in the [testing.h](../algo/tests/testing.h) file.
    
    Tests must be declared in the [tests.h](../algo/tests/tests.h) file:
    
    1.  Define a new macro (in the enum) corresponding to the test name
    2.  In `declare_tests()` use `RECORD_TAP_TEST` to associate the macro with a
        description (that will be displayed in the TAP output file).
    
    Then testing can be done using the `TAP_TEST` macro. The macro takes three
    arguments. The first one is a boolean that is supposed to be true, the
    second is the test name (using the macro defined in `tests.h`) and the
    third one (which can be an empty string) is something which is displayed
    when the test fails.
