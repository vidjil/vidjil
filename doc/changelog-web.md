
!!! note

	This changelog concerns the Vidjil web application, client and server.
	As we are using continuous integration and deployment, some features are pushed on our servers between these releases.

## Web 2023-03

??? note "Milestone 2023-04"
	  Complete list of issue and change of this release can be found [here](https://gitlab.inria.fr/groups/vidjil/-/milestones/8).

**Improve analysis**

* New view displaying warnings and allowing to select related clonotypes
* New preset "locus by sizes"
* New .csv export of metadata information of a sample
* Custom primer sets can be set on local server installations

**Improve reports and report templates**

* Shared template across analyses
* Harmonize rendering of clonotypes depending of the number of samples
* Better selection of loci
* Better clone name display, using N region parameters

**Improve ergonomy**

* Remember columns and feature layers selection in aligner
* Keyboard "Esc" shortcut to close open panels

**API**, <https://www.vidjil.org/doc/api>

* More endpoints: impersonating, analysis download, data deletion with a confirmation

**Bugs corrected**

* Reflect changes on grid on reports
* Resolve error on the downloading of result file
* Fix "number of samples" axis
* Resolve bug in selection of sample by presence of selected clonotypes
* Cleaner error message on broken files
* Faster groups controller
* Automatic deletion of temporary (and potentially large) files from addon scripts

**Continuous integration**

* More testing on Docker images (tools, germlines)


## Web 2022-06

??? note "Milestone 2022-06"
	  Complete list of issue and change of this release can be found [here](https://gitlab.inria.fr/groups/vidjil/-/milestones/7).

**Improve analysis**

* More sample information: diversity measures by germline, summary of warnings
* More clonotype information: detailed productivity
* More tags and colors, new color by sample
* V gene identity computed by IMGT now takes into account ins/del events
* Distributions clonotypes can now be filtered by locus

**Improve ergonomy**

* New reports, with flexible template/blocks
* More flexible inclusion of third-party sequence analysis tools
* Many fixes, including better page resets between analyses

**Improve patient/run/set database usage**

* Search can be done by set number
* Upload from network includes a search field
* Returning to a sample page keeps the current analysis configuration

**Interoperability, API**

* New Python module to interact with a Vidjil server, see <https://www.vidjil.org/doc/api>

**Improve software quality**

* New cypress tests on client and tutorial (deleting old watir)
* Updated documentation, also with a search field

**Other points**

* Update supported browsers, see <https://www.vidjil.org/doc/user/#supported-browsers>

## Web 2021-11

??? note "Milestone 2021-11"
	  Complete list of issue and change of this release can be found [here](https://gitlab.inria.fr/groups/vidjil/-/milestones/4).

**Improve analysis**

* Primers can be shown on the sequences and be removed before sending sequences to external tools such as IMGT or IgBlast
* AIRR external analysis can be uploaded  ("AIRR/.vidjil/.clntab import")

**Improve ergonomy**

* Add button to launch analysis on all files of a patient/run/set
* Renamed some analysis axes
* Some axes have now sliders

**Improve internal database usage**

* Faster access to databases (patient/set/run lists)

**Improve traceability**

* New logs on pre-process steps, such as for merging ("i" on samples)
* Access logs are available again (on the public server, since mid-2019)

**Improve software quality**

* New tests and improved test pipelines (cypress), improved Docker containers

**Other points**

* New server option to use an LDAP server
* Warning for legacy or non supported browsers (see <http://www.vidjil.org/doc/user/#supported-browsers>)
* Fix error in opening clone information after opening single analysis
* Many other bug fixes

## Web 2021-05

**Improve analysis**

* New sequence aligner, flexible display of nucleotide/AA sequences, VDJ, CDR, and FR features
* New detection of primer positions and computation of interpolated length (BIOMED-2 and EuroClonality-NGS primer sets)
* New report and axis, detailed cause of non-productivity

**Improve ergonomy**

* Better handling of saved settings (color by, naming choices)
* New button to open one sample with its analysis from the patient/sample database
* Color settings are used in report

**Improve quality testing**

* The tutorial is better tested, including interactions with the sample database

**Other points**

* Fix disgracious position in graph
* Add more explicit warning about healthcare compliance
* Fix logout error for some instances (app.vidjil.org)

## Web 2020-12

* Possibility to create at once multiple patients/runs/sets by pasting data from the clipboard

**Add new warnings**

* Add warnings when the server is not approved for healthcare data (!813, see >vidjil.org/doc/healthcare>)
* Add warning to show variation in V(D)J designation or productivity prediction between samples (#4566, #4578)

**Improve quality testing**

* The tutorial is now tested, step by step (#2880)

**Improve internal database usage**

* Refactor some queries of the database. Filtering and searches are now way faster.
  Note that the basic query may be a little bit slower. (#3169)

**Other points**

* Fix error on clusterBy (#4495)
* Many other bug fixes

## Web 2020-07

**Better study full repertoires**

* Genescan-like distributions on the full repertoire (preset 4) (!595, !551, !525)
* New configuration to export the full list of clones in AIRR format (with no clone limitation)

**Clone list**

* New options to lock clone sorting (!630, !564)

**Time graph, working with several samples**

* Better options to hide/show samples in the time graph (!565)
* Possibility to hide clones not present in the current sample (!564)
* New design of curves

**Other points**

* Better organization of configurations (!627)
* Free text zone in report
* Read merger: Flash instead of PEAR (#3911)
* Many bug fixes

## Web 2020-01

* New behaviour of graphList (#4105); Now you can hide/show sample directly from a list with checkbox, and button for automation  

You can also hidding them by double clicking on their label in the timeline graphic.

## Web 2017-10

* New tag mechanism to store/filter default or custom metadata on patient/runs/sets #2170 #2172 #2683
* Added a second grid view when there is only one sample #2244
* New experimental feature to add germline genes in the segmenter #1925
* New axes with number of deleted nucleotides #2506
* Better test process (jshint, nightmare.js) #2272 #2273
* Moved continuous integration to Gitlab CI (.gitlab-ci.yml)
* New and updated unit and functional tests
* Bugs corrected: Fasta export #2628, values on axes #2540, spurious data #2598, timeout in segmenter #2559...

## Web 2017.05

* Refactor of the axes for the grid and bar plots. New features are forthcoming #1471 #1763 #2175
* New option to download output files #2141 #2405
* Refactor of the sequence view. The sequence view will soon be able to display V(D)J germline genes.
* New setting to display shorter clone names (by default, allele is hidden when it is *01) #1679
* Renamed "merge" to "cluster", more consistent clustering options, including undo #2336 #2335
* New keyboard shortcuts on some browsers #1227
* Made Docker configuration easier to update #2469
* Improved CSV export with additional information on productivity and CDR3 #2428
* Updated results on sample deletion #1631
* Bugs corrected: #2304, #2371, #2386, #2402, #2466, ...

## Web 2017.03

* New server installation option to get data from mounted directories instead of uploading them #1588
* New "color by clone" option #2205
* New "hide clone" option #2227
* Faster server processing, multi-threaded #1919
* New paginated output of the sampleset pages #2037
* Removed limit of 16 displayed samples into a set #2269
* Bugs corrected: reports #1979, #2281, IMGT segmenter  #2273
