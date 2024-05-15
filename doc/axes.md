
# Analysis axes

Information computed on each clonotype are detailed on the clone information panel (`🛈` button).
They can be shown as *axes* on the grid view.
Some of them can be shown as *data columns* in the aligner (`‖` button)
and used by the *color by* menu.

## Basic axes

* **size**: Ratio of the number of reads of the clone to the total number of reads in the selected locus
* **size (other sample)**: Ratio of the number of reads of the clone to the total number of reads in the selected locus, on a second sample
(applicable when there are several samples)

* **locus**: Locus or recombination system, as detailed [here](https://www.vidjil.org/doc/locus)

* **V/5' gene, D gene, J/3' gene**: V, D, and J genes (or 5' and 3' segments for [incomplete or special recombinations](https://www.vidjil.org/doc/locus)), regardless of the allele
* **V/5' allele, D allele, J/3' allele**: Same as above, but taking into account each allele

* **clone consensus length**: Length of the consensus sequence
* **clone average read length**: Average length of the reads belonging to each clone
* **primers**: Length of the consensus sequence between primers (inclusive), possibly interpolated, see [Working with primers](user.md#how-to-work-with-primers))

* **clone consensus coverage**: Ratio of the length of the clone consensus sequence to the median read length of the clone. Coverage between .85 and 1.0 (or more) are good values. See [clone coverage](user.md#clone-coverage)
* **GC content**: %GC content of the consensus sequence

* **number of samples**: Number of samples sharing the clone
* **tag**: Tag, as defined by the user with the `★` button in the [list of clones](user.md#the-list-of-clonotypes-left-panel)

* **VIdentity IMGT**: V identity (as computed by IMGT/V-QUEST, available when the clonotypes have been submitted there)
* **V ratio**: coverage ratio of germline sequence of V segment. A complete coverage return 1.

### N-region / CDR3 analysis

* **V/5' deletions in 3'**: Number of deleted nucleotides at the 3' side of the V/5' segment
* **J/3' deletions in 5'**: Number of deleted nucleotides at the 5' side of the J/3' segment

* **N length**: N length, from the end of the V/5' segment to the start of the J/3' segment (excluded)
* **CDR3 length (nt)**: CDR3 length, in nucleotides, from Cys104 to Phe118/Trp118 (excluded)
* **productivity**: Productivity as computed by vidjil-algo (`no CDR3 detected`, `productive`, or `unproductive`
* **productivity detailed**: Same as above, but with further detail on the non-productivity cause: `stop-codon`, `out-of-frame`, `no-{WP}GxG-pattern`,
following ERIC guidelines ([Rosenquist et al., 2017](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5508071/)).

* **productivity IMGT**: Productivity (as computed by IMGT/V-QUEST, available when the clonotypes have been submitted there)

## Other axes

These values require to have some setup on some instances of the server.

* **cloneDB occurrences**: number of occurrences in cloneDB
* **cloneDB patients/runs/sets occurrences**:  "number of patients/runs/sets sharing clones in cloneDB

## Availability of axes

| name                     | axes (grid view)  | aligner | color_by |
| :----------------------- | :---------: | :--------: | :------: |
| V/5' gene                |     x        |            |    x     |
| V/5 allele               |     x        |            |          |
| D gene                   |     x        |            |          |
| D  allele                |     x        |            |          |
| J/3' gene                |     x        |            |    x     |
| J/3 allele               |     x        |            |          |
| clone consensus length   |    x         |      x     |          |
| clone average read length|    x         |      x     |          |
| GC content               |    x         |      x     |          |
| N length                 |    x         |            |    x     |
| CDR3 length (nt)         |    x         |            |          |
| productivity             |    x         |      x     |   x      |
| productivity detailed    |    x         |      x     |          |
| productivity IMGT        |    x         |      x     |          |
| VIdentity IMGT           |    x         |      x     |          |
| tag                      |    x         |            |    x     |
| clone consensus coverage |    x         |            |          |
| locus                    |    x         |            |    x     |
| size                     |    x         |      x     |          |
| size (other sample)      |    x         |            |          |
| number of samples        |    x         |      x     |          |
| primers                  |    x         |      x     |          |
| V/5' deletions in 3'     |    x         |            |          |
| J/3' deletions in 5'     |    x         |            |          |
| V/5' length              |    x         |            |          |
| J/3' length              |    x         |            |          |
| V/5' ratio               |    x         |            |          |
| cloneDB occurrences      |    x         |            |          |
| cloneDB patients/runs/sets occurrences| |            |          |
