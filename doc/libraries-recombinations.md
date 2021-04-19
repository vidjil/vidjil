# Sequencing and analyzing human immune repertoires

[V(D)J recombinations](http://en.wikipedia.org/wiki/V\(D\)J_recombination) in lymphocytes are essential for immunological diversity.
They are also useful markers of pathologies, and in leukemia, are used to quantify the minimal residual disease during patient follow-up.
High-throughput sequencing (NGS/HTS) now
enables the deep sequencing of a lymphoid population with dedicated
sequencing methods and software, called either Rep-Seq or AIRR-Seq.

# Library preparation and sequencing for human RepSeq studies

Choosing library preparation and sequencing for immune repertoire analysis
is a challenging task [(Langerak 2017)](http://dx.doi.org/10.4049/jimmunol.1602050)
and depends of multiple factors: aim of the study, people, sequencers, reagents, costs...
We do not aim here to be authoritative,
but give a few links to commonly used strategies for library preparation and sequencing.

## Amplicon-based strategies

PCR approaches are the state-of-the-art way to detect
and quantify immune recombinations.

 - As of 2020, it is recommended to use the **EuroClonality-NGS** primer sets
   published in [(Brüggemann, 2019)](http://dx.doi.org/10.1038/s41375-019-0496-7)
   (2-step, 138 primers in 8 tubes, IGH FR1, IGH+, IGK, IGK+, TRB, TRB+, TRD/TRD+, TRG)
   and in [(Scheijen, 2019)](http://dx.doi.org/10.1038/s41375-019-0508-7)
   (1-step, 53 primers in 3 tubes, IGH FR3, IGH+, IGK, IGK+).
   These primer sets were evaluated in a multi-center validation study.
   The EuroClonality-NGS consortium also published
   [standard operating procedures](http://www.euroclonality.org/protocols)
   for Illumina MiSeq and Ion Torrent, that can be adapted for other sequencers.
   <br />
   Download: [2019-EuroClonality-NGS-primers.csv](http://www.vidjil.org/data/2019-EuroClonality-NGS-primers.csv)

 - Many studies are still successfully using primer sets based on
   the older **EuroClonality/BIOMED-2** sets
   published in [(van Dongen, 2003)](http://dx.doi.org/10.1038/sj.leu.2403202).
   See for example [(Ferret, 2016)](http://dx.doi.org/10.1111/bjh.13981)
   (1-step, 23 primers in 5 tubes, TRG, TRD/TRD+, IGK, IGK+).

These primer sets were designed and evaluated for onco-hematological studies on lymphoma and/or leukemia samples
but may also be used in other studies on the immune repertoire.
Such primer sets or DNA-Seq (or even on RNA-Seq) are very specific,
leading to usually datasets with more than 90% or 99% of reads with V(D)J recombinations.

One-step approaches may be used even with the 2-steps primers,
see [(Brüggemann, 2019)](http://dx.doi.org/10.1038/s41375-019-0496-7) for discussion.
Some labs do sequence independently the tubes with barcoding,
but for many applications the contents of the tubes can be pooled and sequenced at once.
Using the full depth of a recent sequencer with spike-in control sequences,
precise MRD quantification can be achieved [(Knecht 2019)](http://dx.doi.org/10.1038/s41375-019-0499-4).
When the goal is only to detect a few dominant clones,
many samples (10 to 100, or even more)
can be pooled with proper barcoding in a same sequencing run.
Contamination should then particularly be monitored.

## Capture and other strategies

Several library preparations on DNA or RNA can be done with limited or no amplification:
whole-genome or whole-transcriptome sequencing, capture, 5'RACE...
Probes can possibly be designed in every V, D, or J gene, in the constant region, and/or
consensus probes can be used.
These methods can also be applied on single-cell sequencing, possibly with UMI identifiers.

One advantage of such libraries is that they can be combined to other studies,
as for example with transcriptome analysis
or probes targeting oncogenes or other sequences of interest.
Of course, the downside is that non-recombined DNA or RNA are also sequenced:
Depending on the method and the datasets,
as few as between 0.001% and 0.1% reads will have an actual V(D)J recombination.
With datasets with billions of reads,
this is usally enough to detect  dominant clones
with something like a few hundred reads,
but quantification is more limited.
For such libraries, it may be worth to set up a [post-sequencer workflow](http://www.vidjil.org/doc/workflow/)
to work with smaller files.

## Read length

When the read length is too short and the reads do not span the CDR3 and a few more nucleotides,
some V(D)J recombinations may not be properly detected or designated.

As a rule of thumb, 100 bp centered around the CDR3 is usually enough to correctly identify *most* of the recombinations
-- and many sequencing approaches today allow to have 300bp, 500bp or even much longer reads.
However, even as few as 50 bp well-centered on the CDR3 usually detect many recombinations.
The key point, depending on the library preparation, is thus what position the CDR3 is actually in the read.

Anyway, with short reads, the identified recombinations may be skewed towards shorter sequences, such as:

 - more VJ than VDJ recombinations
 - shorter N and more deleted D genes
Those biases could occur inside one locus but also favor loci/systems with shorter recombinations


# Analyzed human immune recombinations in Vidjil

Vidjil is an open-source platform for the analysis of high-throughput sequencing data from lymphocytes.
It was designed to detect all the common V(D)J recombinations,
even the incomplete/special recombinations occurring during the hematopoeisis
-- such recombinations systems are denoted with a `+`.

In particular, Vidjil-algo detects all the human recombinations
targeted by the EuroClonality-NGS (2019) and the EuroClonality/BIOMED-2 (2003) primer sets.
Vidjil-algo currently analyzes the following recombinations,
selecting the best locus for each read.

|                      |         | complete recombinations                        |           | incomplete/special recombinations |
| -------------------- | ------- | ---------------------------------------------- | --------- | --------------------------------- |
|                      | **TRA** | Va-Ja                                          |           |                                   |
|                      | **TRB** | Vb-(Db)-Jb                                     | **TRB+**  | Db-Jb                             |
|                      | **TRD** | Vd-(Dd)-Jd                                     | **TRD+**  | Vd-Dd3, Dd2-(Dd)-Jd, Dd2-Dd3      |
|                      |         |                                                | **TRA+D** | Vd-(Dd)-Ja, Dd-Ja                 |
|                      | **TRG** | Vg-Jg                                          |           |                                   |
|                      | **IGH** | Vh-(Dh)-Jh                                     | **IGH+**  | Dh-Jh                             |
|                      | **IGL** | Vl-Jl                                          |           |                                   |
|                      | **IGK** | Vk-Jk                                          | **IGK+**  | Vk-KDE, INTRON-KDE                |
| vidjil-algo option   |         | `-g germline/homo-sapiens.g:TRA,TRB,TRD,TRG`   |           | `-g germline/homo-sapiens.g`      |
|                      |         | `-g germline/homo-sapiens.g:IGH,IGL,IGK`       |           |                                   |
| server configuration |         | `multi`                                        |           | `multi+inc`                       |


When using Vidjil-algo through the command-line, the configuration of analyzed recombinations is done in the `germline/homo-sapiens.g` preset.

The detection of complete recombinations is reliable provided the reads
are long enough around the V(D)J junction (see above).

The detection of incomplete/special recombinaisons is more challenging and may fail in some cases.
In particular, as D genes may be very short, detecting TRD+ (Dd2/Dd3) and IGH+ (Dh-Jh) recombinations
require to have reads with fairly conserved D genes or up/downstream regions.

Finally, the `-2` command line option and the `multi+inc+xxx` server configuration try to
detect unexpected or chimeric recombinations between genes of different germlines or on different
strands (such as PCR dimers or +V/-V recombinations).
These recombinations, tagged as `xxx`, can be technological artefacts or unusual biological recombinations.

Note that the Vidjil web application can also display recombinations detected by other software,
as long as this information is provided in the `.vidjil` file computed by such other software.