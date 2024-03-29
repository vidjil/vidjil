
!!! note
	This changelog concerns vijil-algo, the algorithmic part (C++) of the Vidjil platform.

## Algo 2024-02-02

* New option --top-by-locus, reporting a minimum number of clonotypes per recombination system !1335
* Improved .json output, with number of clones by locus !1146
* Use global similarity for similarity matrix computation !1284

## Algo 2022-03-14

* Fix a regression from the previous release, correctly handling absolute paths in germlines !1144

## Algo 2022-02-21

* New option --find to detect and align sequences without recombinations !1004
* Diversity measures also reported by locus !1111, Pielou's evenness index correctly named !1132
* Report not designated sequences as "Possibly", new warning W68 !1008
* Refactor, streamlining germline handling/declaration  !1010
:xxx filter works with several -g / mix of -g / -V/-D/-J / --find
* Update third-party libraries (CLI11, json, see also doc/LICENSE.md) !1036 !1123
* New Docker framework to run tests #4203
* Update test framework !669, faster tests launching at once .should-vdj tests !413
* New support policy for compilers, gcc >= 7.5, clang >= 6.0, support also gcc 11, clang 12 !1005 !1128
* Bugs closed #4425 #4775
* New and updated documentation, roadmap, and credits

## Algo 2021-04-28

* New unproductivity cause, reporting IGH sequences without a {WP}GxG pattern !935
* Updated germlines from IMGT/GENE-DB, as well with 60bp up/downstream !885 !892
* Included Sus Scrofa and Gallus Gallus germlines !478 !839
* JUNCTION/CDR3 analysis by default, deprecating -3 option !947
* Smaller --max-consensus output, without debug information, new advanced option --out-details !724
* Updated outputs (e-values, affects) !932
* New and updated documentation and online help

## Algo 2021-02-18

* New preset --filter-reads to filter potentially huge datasets (vidjil.cpp) #4681
* Better --gz option, outputting also .fa.gz and .affects.gz files (vidjil.cpp) #4692
* New and updated documentation

## Algo 2021-02-05

* New report of unproductivity causes in 'seg.junction.unproductive' (core/segment.cpp) #4599
* New fields in AIRR .tsv output, 'vj_in_frame', 'stop_codon', '{v,j}_support', '{v,d,j,cdr3}_sequence_{start,end}' (core/output.cpp) #3569 #4643
* Ability to get the input reads from stdin with '-' (core/fasta.cpp) #4642
* New advanced option --read-number to override e-value multiplier, new warning W21 on doubtful multipliers (vidjil.cpp) !887
* New experimental option --show-junction, displaying germline genes on stdout (core/segment.cpp) !886
* Bugs closed (W61 warning check)
* New and updated documentation, including on input selection and on custom germline presets (-g)
* New and updated tests

## Algo 2020-08-21

* Cleaned output, no .vdj.fa and seq/clone-*.fa by default, new options --out-vdjfa and --out-clone-files #4386 #4387
Pipelines should not rely on the format of the headers in the .vdj.fa file, but rather parse the .vidjil file #3795
* Extended test and support to g++ 10.1, while reworking the documentation on supported compilers !733
* Updated documentation
* Updated the functional test framework (tools/should.py) !669 !784, new and updated tests

## Algo 2020-06-12

* New report of 'start of V' and 'end of J' positions #2138, improving the productivity estimation #2142
This is based on a streamlined alignment for reverse sequences (core/segment.cpp) !706
* Faster and improved probability computations (core/proba.cpp) !679
This will bring further speed-ups in a future release
* Ctrl-C now gracefully stops execution with a warning W09 and some output #4286
* Streamlined handling of warnings #3360, also reported with -c designations #3811
* Better and more reproducible speed and memory benchmarks (benchmark-releases.py, #4275) #918, new profiling #918
* Adoption of 'detected' term, renamed output files to '.detected.vdj.fa' #3413
* Updated documentation
* New and updated tests
* Better release process through a merge request template !685

## Algo 2020-05-02

* Bug closed (crash in very rare cases #4272)

## Algo 2020-04-29

* New --gz option to output compressed files #4253 #4269 #4270
* Improved seed framework, with different seeds on V/D/J parts. Analysis will be improved in further releases #3954
* Bugs closed (missing affectations #4225, crash in rare cases #4263)
* New Docker framework for tests on multiple compilers #4203
* New and updated tests

## Algo 2020-01-24

* Improved e-value estimation, -e is now the global e-value, new advanced option --e-value-kmer
Sequences on larger datasets will now be better analyzed #3594 !538
* Added 'seg.cdr3.seq' output with nucleotide sequence #4017
* Improved 'name' output on sequences not fully analyzed with '-c designations' #3890
* Limit on 50 clones on stdout, as the main output is the .vidjil file #3302 !530
* New --no-vidjil and --no-airr advanced options to control the output #3861
* Extended and updated documentation, including on library preparation and sequencing and on quality
* New and updated tests

## Algo 2019-05-17

* Better method to build consensus sequences used by default, old behaviour with --consensus-on-longest-sequences #3866
* Optimized analyses with pre-computations, including for e-value estimation !468
* Updated functional .should tests with new syntax, renaming and moving some tests #3206 #3762

## Algo 2019-04-04

* New --config and --label-json experimental options (vidjil.cpp, lib/CLI11_json.cpp) #3837 #3839
* Improved computation of consensus sequence when there are many reads (vidjil.cpp) !448
* Better --alternative-genes reporting, including genes with same score (core/segment.cpp) #3414
* Updated the functional test framework (tools/should.py)

## Algo 2019-03-14

* New --consensus-on-random-sample experimental option (core/representative.cpp) #3764
* Aho-Corasick automaton used by default (vidjil.cpp) #2566, will bring speed-ups in a future release
* Refactored command and option names, deprecate some short options names (vidjil.cpp) #3295 #3772
* Bug closed (incorrect deletion reported on unexpected recombinations, core/segment.cpp) #3518
* Updated documentation
* Improved test framework (tools/should.py), updating code coverage, test compilation warnings #1233
* New and updated unit and functional tests

## Algo 2018-11-26

* Corrected 2018-10 release, works now on all suported platforms #3601 #3062 (core/output.cpp)
* Updated the functional test framework, relaunching some tests (tools/should.py)

## Algo 2018-10-31

* New option --alternative-genes, outputs germline genes beyond the most probable one (core/segment.cpp) #1459
* New warning W69 for equally probable germline genes (core/segment.cpp) #3575
* Improved again memory usage, creating bins only when necessary (core/readstorage.cpp) #3393
* Improved the full analysis pre-processing, extending -Z 1 based on probabilities (core/filter.cpp, core/math.cpp) #3225
* Refactored output handling (core/output.cpp) #3858
* New AIRR .tsv output (core/output.c) #2828
* Updated documentation
* New and updated unit and functional tests
* Known regressions: This version may not work on some systems #3601 #3602

## Algo 2018-07-18

* Cleaned memory after the heuristic, lowering memory usage up to 50% on datasets with many 1-read clones #2120 #3387

## Algo 2018-07-16

* New default option -Z 3, speeding up the full analysis of clones with a pre-processing based on k-mers #3298
Processes with `-c segment` or with large `-z` values will be between 2x and 15x faster (vidjil.cpp, core/filter.cpp)
* Integrated and extended up/downstream regions, improving analysis of heavily deleted 3' genes (germline/) #3008 #3009
* Corrected the heuristic in borderline cases with overlapping VJ affectations (core/affectanalyser.cpp) #3296
* Streamlined handling of seeds, enabling the use of aliases with -s (core/tools.cpp) #3293
* Refactored option processing for vidjil-algo with CLI11 (lib/CLI11.hpp, vidjil.cpp) #2732
* Improved build time up to 40% (lib/json_fwd.h) #3307
* Updated third-party library (lib/json.hpp) #2935
* Improved build and release process, supporting also g++ 7.3 and testing several compilers (.gitlab-ci.yml) #3002 #3015 #3310
* Removed unused code and CI parts #3294 #3287
* Updated documentation, converted into .md files (#3004)
* Refactored and re-enabled code coverage, making it publicly accessible on Gitlab (algo/Makefile, .gitlab-ci.yml) #1696
* New and updated unit and functional tests

## Algo 2018-06-14

* New experimental option -Z to speed-up the full analysis with a pre-processing based on k-mers (core/filter.cpp) #920
* New experimental analysis of Ikaros/ERG recombinations (germline/homo-sapiens-ikaros.g) #2139
* Improved analysis with large number of mutations in V or J genes (core/dynprog.cpp) #3066
* Added levels to warnings, lowering level for W53 (core/tools.cpp) #3136 #3137
* Refactored the functional test framework (tools/should.py) #3105
* New and updated unit and functional tests

## Algo 2018-02-02

* Renamed program to 'vidjil-algo'
* Improved analysis of large deletions in V or J genes (core/segment.cpp) #2767
* Improved analysis of reads where V/J junction is close to an end, slightly shifting or shortening
the window (core/segment.cpp, core/windowExtractor.cpp) #2913
* Removed default homopolymer cost, improving detection on the majority of sequencers (core/dynprog.h) #2851
* Added warnings in the json output on some clones #2916
* Bug closed (clean some germinal sequences #2598)
* Corrected memory leaks #3018 #3031
* Cleaned folders, with sources in src/, demo data in demo/, test data in algo/tests/data/ #2635 #2611
* Changed option processing library, trying CLI11 instead of docopt (lib/CLI11.hpp, tools/align.cpp) #926
* Streamlined packaging and Makefile, based on git #2255 #2630
* Updated build process (supporting g++ 4.8 to 7.2, clang from 3.3), warns on non-supported compilers #2614 #2615 #2631
* Updated help and online help, added demo files and commands, -f option #2635 #2076
* Refactored unit tests with TEST_TAP_EQUAL #2989
* New and updated unit and functional tests, including tests from documentation #1284 #2634

## Algo 2017-09-08

* New BAM input parser, refactored input parsers (core/bioreader.cpp, core/bam.cpp) #2016
* Streamlined seed options (-m, -k, -s), overriding -g presets (vidjil.cpp, core/germlines.cpp) #1673 #2156
* New and updated unit and functional tests #2016 #2552
* Faster tests (tests/Makefile, tests/*) #2254
* Bug closed (halting when a representative is too short) #2224
* Documented dependencies and libraries (lib/info.txt)
* Updated help, correcting -h documentation on -u/-uu/-uuu options
* Moved continuous integration to Gitlab CI (.gitlab-ci.yml)

## Algo 2017-03-14

* Better support for germlines from several species (germlines/*.g) #1987 #2132
* Streamlined option -g, including filtering, removed old -i/-G options (vidjil.cpp, core/germline.cpp) #2134
* Better productivity estimation, handling in-frame stop codons (core/segment.cpp) #2220
* Better unsegmentation causes, 'UNSEG only V/J' needs really significant V/J fragments (core/segment.cpp) #2107
* New experimental faster heuristic with Aho-Corasick automaton (core/automaton.hpp) #1366
* New option to disable window clustering (-w all) (core/windowExtractor.cpp) #1642
* Updated germline genes from IMGT/GENE-DB
* Bugs closed (json output, consensus computation, -y option) #2214 #2217 #2224 #2239
* Refactored test structure for should-vdj tests (tests/should-vdj-to-tap.py, tests/repseq_vdj.py)
* New and updated unit and functional tests, including more solved former bugs
* Moved code to gitlab, better project management, commit messages are now linked to issues

## Algo 2016-09-30

* New default trim option (-t 0) for germlines, leading to better results on some special recombinations (vidjil.cpp)
* More flexible option to keep sequences of intereset (-W), accepting sequences of any size (core/windows.cpp)
* Better generation of consensus sequences, marking ambiguous positions with Ns (core/representative.cpp)
* Better recognition of standard recombinations by lowering incomplete germline attractiveness (core/segment.cpp)
* Better TRD locus analysis, including some Dd-Dd-Jd recombinations (data/germlines.data)
* Reduced unused similarity section of .json file output (vidjil.cpp)
* New json output with -c segment (vidjil.cpp)
* Updated help (doc/algo.org)
* New and updated unit and functional tests, updated test process

## Algo 2016-08-06

* New computation of average quality for each representative sequence, inside its window (core/representative.cpp)
* New option (-E) to set the e-value for FineSegmenter D segment detection (vidjil.cpp)
* Safer e-value estimation for D segments (vidjil.cpp)
* Raised capacity to 2*10^9 reads (core/segment.cpp, core/fasta.cpp)
* Better filtering/debug options (-u/-uu/-uuu), keeping interesting reads (vidjil.cpp, core/windowExtractor.cpp)
* Better .vdj.fa header for irregular/incomplete recombinations, 1-based positions (core/segment.cpp)
* Bugs closed (-u files, similarity in .vidjil)
* New and updated unit and functional tests, checking again .should-vdj tests

## Algo 2016-07-13

* New json 2016b format, renamed fields 'seg.{5,4,3,evalue}' and 'diversity', 1-based positions (core/segment.cpp)
* New tool to display and debug alignments between a read and selected V/J genes (tools/vdj_assign.cpp)
* Better test structure and process. The should-vdj tests will be soon moved to their own repository.
* Bugs closed (build process, affine gaps (core/dynprog.cpp), JUNCTION/CDR3 detection (core/segment.cpp))
* New and updated functional tests

## Algo 2016-03-04

* Better JUNCTION/CDR3 detection (-3), based on positions of Cys104 and Phe118/Trp118 (core/segment.cpp)
* Bugs closed (.vidjil output of revcomp'd sequences, computation of Simpson index Ds)
* Streamlined structure of tests directory
* New and updated unit and functional tests

## Algo 2016-02-08

* New default threshold (-z 100), fully analyzing more clones
* New computation of diversity indices (Shannon, Simpson) (core/windows.cpp)
* Streamlined KmerSegmenter test (core/affectanalyser.cpp)
* Safer p-value estimation in KmerSegmenter, taking into account the central region (core/affectanalyser.cpp)
* New experimental VDDJ detection analysis (-d) (core/segment.cpp)
* Better FineSegmenter V(D)J designation for inverted genes in unexpected recombination analysis (core/segment.cpp)
The unexpected recombination analysis (-2) can now safely be used.
* Streamlined FineSegmenter handling of V, D and J segments (core/segment.cpp)
* Faster FineSegmenter (~30%), relying on the KmerSegmenter to select to correct strand (core/segment.cpp)
* Updated germline genes from IMGT/GENE-DB
* Bugs closed (.vidjil output for sequences beyond the -z threshold)
* New and updated unit and functional tests

## Algo 2015-12-22

* Better KmerSegmenter, rejecting reads with large alterning V/J zones (core/segment.cpp)
* Better unsegmentation causes, 'UNSEG only V/J' needs significant V/J fragments (core/segment.cpp)
* Renamed unsegmentation messages to "only V/5'" and "only J/3'" to avoid confusion (core/segment.h)
* Better unexpected recombination analysis (-2), with a FineSegmenter V(D)J assignation (core/segment.cpp)
* Faster FineSegmenter (~35%), computing roughly half of the dynamic programming matrix (core/segment.cpp)
* More flexible handling of badly formatted .fastq files (core/fasta.cpp)
* New filtering/debug option (-uu), sort unsegmented reads (core/windowExtractor.cpp)
* Streamlined json output, removing short codes (vidjil.cpp, core/segment.cpp)
* Updated and refactored help (doc/algo.org)
* Updated unit and functional tests
* Bugs closed (build process, -X with large numbers, -x/-X combined with -c segment, stdout messages)

## Algo 2015-10-08

* Bug closed (V(D)J assignation when V/D/J segments are close on the negative strand) (core/segment.cpp)

## Algo 2015-10-05

* Better FineSegmenter V(D)J assignation, especially when V/D/J segments are close (core/segment.cpp)
* Better e-value computation for FineSegmenter V(D)J assignation (core/segment.cpp)
* Renamed 'UNSEG too few J/V' to 'UNSEG only V/J' to better reflect the actual detection of one part
* Refactored tests for V(D)J assignation, allowing flexible patterns, new documentation (doc/should-vdj.org)
* New tests on sequences with manually curated V(D)J assignations (tests/should-vdj-tests)
* Bugs closed (no more spurious D in some VJ recombinations, corrected number of deletions around D regions)

## Algo 2015-07-21

* New flexible parameterization of analyzed recombinations through a json file (germline/germlines.data)
* New experimental unexpected recombination analysis (-4 -e 10) (core/segment.cpp)
* New threshold for FineSegmenter VJ assignation, with at least 10 matches (core/germline.cpp)
* Streamlined handling of segmentation methods (core/germline.h, core/segment.cpp)
* Updated distance matrix computation between all clones (core/similarityMatrix.cpp)
* New nlohmann json libray to parse and write json files (lib/json.h)
* Updated build process, now requiring a C++11 compiler
* New draft developer documentation (doc/dev.org), updated help and user documentation
* New and updated unit and functional tests, bugs closed in shouldvdj tests

## Algo 2015-06-05

* New default trim option (-t 100), considering only the relevant ends of the germline genes
* Better segmentation heuristic when there are few k-mers (core/segment.cpp)
* Better TRA/TRD locus analysis (-i), including both Vd-(Dd)-Ja and Dd-Ja recombinations (core/germline.cpp)
* Better incomplete TRD and Dh/Jh analysis (-i), including up/downstream region of D genes (core/germline.cpp)
* Better computation of the reference length for the coverage information, considering all reads of each clone
* Better unexpected recombination analysis (-2), with information on the locus used (core/segment.cpp)
* Streamlined again unsegmentation causes and removed delta_{min,max} for the heuristic (core/segment.cpp)
* Refactored stats computation (core/read_storage.cpp)
* Updated build process
The next release will require a C++11 compiler. Static binaries will also be distributed.
* Updated help (unsegmentation causes, clustering options, -m option)
* Bugs closed (segmentation with k-mers on the negative strand, e-value computation, clone output on stdout)
* New and updated unit and functional tests, and faster functional tests

## Algo 2015-05-08

* New default e-value threshold (-e 1.0), improving the segmentation heuristic
* New default for window length (-w 50), even with -D or with -g, streamlining the window handling
* Better multi-germline analysis (-g), selecting the best locus on the e-value (core/segment.cpp)
* New experimental trim option (-t), considering only the relevant ends of the germline genes (core/kmerstore.h)
* Streamlined unsegmentation causes, including 'too short for w(indow)'
* Updated main and debug ouptut
* Updated help (algo.org, and new locus.org)
* New option to keep only reads with labeled windows (-F), new combo (-FaW) to filter reads by window
* Bugs closed (non symmetrical seeds and revcomp)
* New and updated unit and functional tests

## Algo 2015-04-09

* New experimental e-value threshold (-e) (core/segment.cpp)
* New experimental unexpected recombination analysis (-2) (core/segment.cpp)
* New preview/debug options to stop after a given number of reads (-x), possibly sampled throughout the file (-X)
* New preview/debug option to output unsegmented reads as clones (-!)
* New progress bar during computation
* Better memory management for the reads taken into account for the representative (core/read_storage.cpp)
* Updated .json output, with k-mer affectation results
* Updated .json output, with the 'coverage' of the representative (core/representative.cpp)
* Removed unused code parts as well as some files
* Updated help, separing basic (-h) and advanced/experimental options (-H)
* Bugs closed (extended nucleotides and revcomp)
* New and updated unit and functional tests

## Algo 2015-03-04

* Better multi-germline analysis (-g), returning the best locus for each read (core/segment.cpp)
The incomplete rearrangement analysis (-i) can now safely be used.
The speed of this multi-germline analysis will be improved in a next release.
* Faster representative computation (core/read_chooser.cpp)
* Included tools (tools/*.py) to process .vidjil files
* New statistics on the number of clones (core/germline.cpp)
* New experimental CDR3 detection (-3). We still advise to use IMGT/V-QUEST for better and complete results.
* Better debug option -K (.affect), especially in the case of multi-germline analysis
* Refactored dynamic programming computations (core/dynprog.cpp), experimental affine gaps
* Removed unused code parts as well as some files
* Streamlined flag processing in Makefiles
* New mechanism for some functional tests (make shouldvdj)
* New experimental tests from generated recombinations (make shouldvdj_generated)
* New and updated unit and functional tests

## Algo 2015-01-31

* Better TRG and TRD+ parameters (-g). The multi-germline analysis will again be improved in a next release.
* New experimental option (-I) to discard common kmers between different germlines (core/germline.cpp)
* Updated outputs for better traceability (version in .json, germlines on stdout)
* New mechanism to retrieve germline databases (germline/get-saved-germline)

## Algo 2014-12-22

* Better multi-germline analysis (-g). This will again be improved in a next release.
* New experimental incomplete rearrangement analysis (-i)
* New and updated unit and functional tests
* Bugs closed (-w 40 when no D germline)

## Algo 2014-11-28

* New input method, now accepts compressed fasta files with gzip (core/fasta.cpp, gzstream/zlib)
* Better multi-germline analysis (-g) and documentation. This analysis can now safely be used.
* Streamlined input. Option -d is removed, and a germline is required (-V/(-D)/-J, or -G, or -g)
* Removed unused code parts as well as some files
* New and updated unit and functional tests - now more than 80% code coverage
* New public continuous integration - travis, coveralls
* Bugs closed (-l, large -r)

## Algo 2014-10-22

* Streamlined filtering options (-r/-y/-z), better documented (doc/algo.org)
* Streamlined output files, option to fix their basename (-b)
* Updated .data .json output, now in the better documented 2014.10 format (doc/format-analysis.org)
* New experimental multi-germline analysis (-g). This will be improved and documented in a next release.
* Faster FineSegmenter with a better memory allocation (core/dynprog.cpp)
* Refactored main vidjil.cpp, objects storing germlines and statistics (core/germline.cpp, core/stats.cpp)
* Transferred clustering from clone output to information in .data, again simplifying vidjil.cpp
* Removed unused code parts as well as some files
* New and updated unit and functional tests
* Bugs closed

## Algo 2014-09-23

* Export cause of non-segmentation in the .data
* New option to output segmented reads (-U), now by default segmented reads are not output one by one
* Updated .data .json output (the format will change again in a next release)
* Updated tests

## Algo 2014-07-28

* Better heuristic, segment more reads (core/affectanalyser.h, core/segment.cpp)
This improved heuristic was designed to implement a multi-germline analysis in a next release.
* Improved computation of the heuristic affectation. Halves the time of -c windows (core/kmerstore.h)
* New command '-c germlines', discovering germlines (vidjil.cpp)
* New unit tests, updated some tests
* Updated .json output (experimental distance graph)
* Bugs closed

## Algo 2014-03-27

* Better default seed selection, depending on the germline, segments more reads (vidjil.cpp)
* Better selection of representative read (core/representative.cpp)
* New option to output all clones (-A), for testing purposes
* Updated debug option (-u) to display k-mer affection (core/windowExtractor.cpp)
* New unit tests, updated some tests
* Improved management of dependencies (Makefile)
* Improved documentation and comments on main stdout

## Algo 2014-02-20

* Refactored main vidjil.cpp (core/windows.cpp, core/windowExtractor.cpp)
* Removed unused html output
* Better json output (core/json.cpp)
* Updated main stdout, with representative sequence for each clone
* Updated parameters for FineSegmenter (delta_max) and dynprog (substition cost)
* Bugs closed

## Algo 2013-10-07

* Better heuristic, segments more reads (core/segment.cpp)
* Better and faster selection of representative read (vidjil.cpp, core/read_chooser.cpp)
* Better display of reason of non-segmenting reads
* New normalization against a standard (-Z) (core/labels.cpp)
* New experimental lazy_msa multiple aligner
* New .json output
* New unit tests
* Bugs closed

## Algo 2013-07-03

* New selection of representative read (core/read_chooser.cpp)
* Faster spaced seed computation (core/tools.cpp)
* New unit tests
* Bugs closed

## Algo 2013-04-18

* First public release


