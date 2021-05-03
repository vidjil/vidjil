Various information are available on each clonotype, and can be show as axis.
Some of these information can also be exploited to be shown in the aligner, in the detailed informations of each clonotypes or as color by method.
Here is an unexaustive list and explanation about main availables axis:

Moreover, some axes allow to splitted clonotype by germline in scatterplot to limit the number os showed axes at the same time.

## Always present in a clonotype




* **V/5' gene**: V gene (or 5' segment), gathering all alleles
* **V/5 allele**: Same as V gene, but splitted by allele
* **D/4' gene**: D gene (or 4' segment), gathering all alleles
* **D/4 allele**: Same as D gene, but splitted by alleles
* **J/3' gene**: J gene (or 3' segment), gathering all alleles
* **J/3 allele**: Same as J gene, but splitted by alleles
* **V/5' deletions in 3'**: Number of deleted nucleotides at the 3' side of the V/5' segment
* **J/3' deletions in 5'**: Number of deleted nucleotides at the 5' side of the J/3' segment
* **locus**: Locus or recombination system
* **clone consensus length**: Length of the consensus sequence
* **clone average read length**: Average length of the reads belonging to each clone
* **clone consensus coverage**: Ratio of the length of the clone consensus sequence to the median read length of the clone. Coverage between .85 and 1.0 (or more) are good values
* **GC content**: %GC content of the consensus sequence of each clone
* **N length**: N length, from the end of the V/5' segment to the start of the J/3' segment (excluded)
* **CDR3 length (nt)**: CDR3 length, in nucleotides, from Cys104 and Phe118/Trp118 (excluded)
* **productivity**: Productivity as computed by vidjil-algo
* **productivity detailed**: Productivity detailed with non-productivity reason as "no CDR3 detected", "productive", presence of a stop-codon, seuqence out-of-frame, no-{WP}GxG-pattern. Non-productive reason are provided by the ERIC group.
* **size**: Ratio of the number of reads of each clone to the total number of reads in the selected locus
* **number of samples**: Number of samples sharing each clone
* **tag**: Tag, as defined by the user. See [user.md](user.md) XXX section The list of clones (left panel) ? XXX

## Computed depending of the options (or instance)
* **cloneDB occurrences**: number of occurrences in cloneDB
* **cloneDB patients/runs/sets occurrences**:  "number of patients/runs/sets sharing clones in cloneDB
* **primers**:  "interpolated length, between setted primers (inclusive)
* **size (other sample)**: Ratio of- the number of reads of each clone to the total number of reads in the selected locus, on a second sample


## Computed if some manipualtion made in the interface (primers ? )
* **productivity IMGT**: "productivity (as computed by IMGT/V-QUEST)
* **VIdentity IMGT**:  "V identity (as computed by IMGT/V-QUEST)

## Table of 

| name                     | scatterplot | in aligner | color_by |
| :----------------------- | :---------: | :--------: | :------: |
| V/5' gene                |     x        |            |    x     |
| V/5 allele               |     x        |            |          |
| D/4' gene                |     x        |            |          |
| D/4 allele               |     x        |            |          |
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
| primers                  |    x         |            |          |
| V/5' deletions in 3'     |    x         |            |          |
| J/3' deletions in 5'     |    x         |            |          |
| cloneDB occurrences      |    x         |            |          |
| cloneDB patients/runs/sets occurrences| |            |          |

