# Web platform, user manual

Vidjil is an open-source platform for the analysis of high-throughput sequencing data from lymphocytes.
[V(D)J recombinations](http://en.wikipedia.org/wiki/V\(D\)J_recombination) in lymphocytes are essential for immunological diversity.
They are also useful markers of pathologies, and in leukemia, are used to quantify the minimal residual disease during patient follow-up.
With adapted [library preparation and sequencing](http://www.vidjil.org/doc/locus),
high-throughput sequencing (NGS/HTS) now enables the deep sequencing of a lymphoid population with dedicated [Rep-Seq](http://omictools.com/rep-seq-c424-p1.html) methods and software.

This is the help of the [Vidjil web application](http://app.vidjil.org/).
Further help can always be asked to <support@vidjil.org>. We can also arrange phone or video meeting.

The Vidjil team (Mathieu, Mikaël, Aurélien, Florian, Marc, Ryan and Tatiana)

# Requirements

## Web application

The Vidjil web application runs in any modern browser. It has been successfully tested on the following platforms

  - Firefox version \>= 32
  - Chrome version \>= 38
  - IE version \>= 10.0 (Vidjil will not run on IE 9.0 or below)
  - Opera version \>= XX
  - Safari version \>= 6.0

## The .vidjil files

The vidjil web application displays `.vidjil` files that summarize the V(D)J
recombinations and the sequences found in one or several samples.

The easiest way to get these files is to [request an account](http://app.vidjil.org/) on the public Vidjil test server.
You will then be able to upload,
manage, process your samples (`.fasta`, `.fastq`, `.gz`, `.bam`, or `.clntab` files) directly on the web application
(see *The patient/experiment database and the server*), and the server behind the patient/experiment
database computes these `.vidjil` files with vidjil-algo.
Otherwise, such `.vidjil` files can be obtained either:

  - running vidjil-algo from the command line (starting from
    `.fasta`, `.fastq` or `.gz` files, see [vidjil-algo documentation](http://www.vidjil.org/doc/vidjil-algo/)).
    To gather several `.vidjil` files, you have to use the [fuse.py](http://git.vidjil.org/blob/master/tools/fuse.py) script
  - or by any other V(D)J analysis pipelines able to output files
    respecting the `.vidjil` [file format](http://www.vidjil.org/doc/vidjil-format/)
  - or by using the [fuse.py](http://git.vidjil.org/blob/master/tools/fuse.py) script on the standard [AIRR representation](http://docs.airr-community.org/en/latest/datarep/overview.html#format-specification)

Contact us if you want help on converting such data.

# First aid

  - Open data by:
    
      - either with “patients”/“open patient” if you are connected to a patient/experiment database, such as on <http://app.vidjil.org/>.
        In this case, there are always some "Demo" datasets for demonstration purposes.
        Once a patient/run/set is selected, you can access the results by clicking on the link near `See results` (bottom right).
    
      - or with “file”/“import/export”, manually selecting a `.vidjil` file

  - You can change the number of displayed clones by moving the slider “number of clones” (menu “filter”).
    The maximal number of clones that can be displayed depends on the processing step before.
    See below "[Can I see all the clones ?](#can-i-see-all-the-clones-and-all-the-reads)".

  - Clones can be selected by clicking on them either in the list, on the sample graph,
    or the grid (simple selection or rectangle selection).

  - There are often very similar clones, coming from either somatic hypermutations or from sequencing errors.
    You can select such clones (for example those sharing a same V and a same J), then:
    
      - inspect the sequences in the lower panel (possibly using the “align” function),
      - remove some of these sequences from the selection (clicking on their name in the lower panel)
      - cluster them (button “cluster”) in a unique clone.
        Once several clones are clustered, you can still visualize them by clicking on “+” in the list of clones.

  - Your analysis (clone tagging, renaming, clustering) can be saved:
    
      - either with “patients”/“save analysis” if you are connected to a patient/experiment database
      - or with “file”/“export .analysis”

You are advised to go through to the tutorial available from <http://www.vidjil.org/doc>
to learn the essential features of Vidjil.

# The elements of the Vidjil web application

## The info panel (upper left panel)

  - *patient/run/set information.*
  - *locus.* Germline(s) used for analyzing the data. In case of multi-locus
    data, you can select what locus should be displayed (see [locus.html](./locus.html))
  - *analysis.*   Name (without extension) of the loaded file.
  - *sample.* Name of the current sample.

<!-- The name can be edited (“edit”). -->

  - *date.* Date of the current sample
    (can be edited in the database, on the patient/run/sample set tab).
    When displaying multiple samples from a same patient/run/set,
    you can change the sample viewed by clicking on the `←` and `→` buttons,
    or cycle trough them by clicking on the "▶" button.

  - *analyzed reads.* umber of reads where the underlying RepSeq algorithm
    found a V(D)J recombination, for that sample.
    See *Number of analyzed reads* below.
    By hovering the mouse, one also sees the *total*
    number of reads for that sample.

## The list of clones (left panel)

When they were processed by **vidjil-algo**, clones are described with identifiers
such as `TRGV3*01 2/ATC/6 J1*02` that describes the V(D)J recombination.
Here the sequence was analyzed as
the V gene `TRGV3*01`, with `2` nucleotides deleted at its end (3'),
followed by a N region with the three nucleotides `ATC`,
then followed by the J gene `TRGJ1*02`, with `6` nucleotides deleted at its start (5').

  - You can adjust the way that these clone names are displayed through
    the menu options “settings > N regions in clone names”
    and “settings > alleles in clone names”.

  - You can assign other tags with colors to clones using the “★” button.
    The “filter” menu allows to further filter clones by tags.

  - Under the “★” button it is possible to normalize clone concentrations
    according to this clone. You must specify the expected concentration in the
    “expected size” field (e.g. 0.01 for 1%). See *Control with standard/spike* below.

  - The list can be sorted on V genes, J genes or clone abundance.
    The “+” and “-” allow respectively to un-cluster or re-cluster all clones that have
    already been clustered.

  - Clones can be searched (“search” box) by either their name, their custom name,
    their DNA sequence, their (partial) CDR3 amino acid sequence.

  - The concentration of some clones may not be displayed. Instead you can have
    either a `+` symbol or a `-` symbol. In the former case that means the clone has
    been detected (positive) but in few reads (typically less than five). In the
    latter case it means that the clone has not been detected (negative) in the
    sample but has been detected in another sample that is not currently
    displayed.

### Detailed information on each clone
The “🛈” button opens a window showing detailed information (V(D)J designation,
e-value, number of reads) about each clone.

In addition, depending on what the user launched on this clone, we may also
find detailed informations retrieved from IMGT or from CloneDB.

#### Detailed information from CloneDB (experimental feature)
If you are connected to a patient/experiment database where CloneDB is enabled,
and if CloneDB was launched on the selected clone,
you can see here occurrences of this clone in CloneDB
as well as links to the relevant patients/runs/sets.
Note that the percentage shown can be above 100% as the percentage is
calculated over all the samples in the sample set.

## The sample graph

The sample graph is hidden when there is only one sample. It shows the most frequent clones of each sample, tracked into every sample.
The number of displayed clones can be changed with the filter menu.

  - The current sample is highlighted with a vertical gray bar. You can select another sample by clicking on it or using `←` and `→`.

  - The gray areas at the bottom of the graph show, for each sample, the resolution (1 read / 5 reads).

  - You can reorder the samples by dragging them, and hide some samples by dragging them on the “…” mark at the right of the graph.
    If you want to recover some hidden sample, you need to drag them from the “…” mark to the graph.

  - If your dataset contains sampling dates (for example for diagnosis/follow-up samples), you can switch between sample keys and dates in “settings \> sample key”

## The plot view and the plot presets

The grid view shows the clones scattered according to some axes.
When there is only one sample, two such views are shown.

  - The default view, by V/J genes, focus on one recombination system within one locus.
    All the analyzes locus are on the right of the grid. You can select another locus by clicking on it or by using the associated shortcuts (see *Keyboard shortcuts* below).

  - The “plot“ menu allow to customize the plots, by selecting the X and Y axes and also by switching between grid and bar plots.
    Some presets are available.
    For example, the preset 4, similar to a "Genescan analysis", shows a bar plot of the clones according to the length of their consensus sequence,
    and the preset 7 shows the distribution of CDR3 lengths.

  - On the bar plots, the Y axis corresponds to the order of clones inside each bar.

  - At the bottom of the plot view, the “status bar“ displays information
    on the selected clone.

  - The “focus“ button (status bar, bottom right) allows to further analyze a selection of clones, and the “hide” button allows to hide some clones.
    To exit the focus/hide mode, click on the “X” near the search box.
To further analyze a set of clones sharing a same V and J, it is often useful
to focus on the clones, then to display them according either to their “clone length”
or their “N length” (that is N1-D-N2 in the case of VDJ recombinations).

   - The “★” button (status bar, bottom right) allows
   to tag at once all the selected clones.

## The sequence panel (bottom panel)

The sequence panel displays nucleotide sequences from selected clones.

  - See "[What is the sequence displayed for each clone ?](#what-is-the-sequence-displayed-for-each-clone)" below
  - Sequences can be aligned together (“align” button), identifying substitutions, insertions and deletions. Silent mutations are identified, as soon as a CDR3 is detected, and represented with a double border in blue.
  - You can remove sequences from the aligner (and the selection) by clicking on the “X” at the left.
  - You can further analyze the sequences with IMGT/V-QUEST, IgBlast or Blast. This opens another window/tab.
  - You can unselect all sequences by clicking on the background of the grid.

# The patient/experiment database and the server

If a server with a patient/experiment database is configured with your
installation of Vidjil (as on <http://app.vidjil.org/>), the
'patient' menu gives you access to the server.

With authentication, you can add 'patients', 'runs', or 'sets', they are just three different ways to group 'samples'.
Samples are `.fasta`, `.fastq`, `.gz` or `.clntab` files, possibly pre-processed.
Once you uploaded samples (either in 'patients', 'runs', or 'sets'),
you can process your data and save the results of your analysis.

## Patients

Once you are authenticated, this page shows the patient list. Here you
can see your patients and patients whose permission has been given to you.

New patients can be added ('add patient'), edited ('e') or deleted ('X').
By default, you are the only one who can see and update this new patient.
If you have an admin access, you can grant access to other users ('p').

## Runs and sets

Runs and sets can be manipulated the same way as patients. They can be added ('add run/set'),
edited ('e') or deleted ('X').
They are just different ways to group samples.
Sets can for example gather a set of samples of a same experiment.
Runs can be used to gather samples that have been sequenced in the same run.

## Permanent address (URL) to a set of samples

Addresses such as <http://app.vidjil.org/?set=3241&config=39> directly target a set of samples (here the public dataset L3), possibly with your saved analysis.
Moreover, the address also encodes other parameters, for instance <http://app.vidjil.org/?set=3241&config=39&plot=v,size,bar&clone=11,31> (selected axes and selected clones).

To discuss on some results or to raise any issue, you can share such addresses with other users (with whom you share access grants, see below),
to your local IT staff or to the Vidjil team.

## Samples and pre-processes

Clicking on a patient, a run or a set give acccess to the "samples" page. Each sample is
a `.fasta`, `.fastq`, `.gz` or `.clntab` file that will be processed by one or several
pipelines with one or several *configurations* that set software options.

Depending on your granted access, you can add a new sample to the list (`+ sample`),
download sample files when they are available (`dl`) or delete sequence files (`X`).
Note that sample files may be deleted (in particular to save server disk space),
which is not the case for the results (unless the user wants so).

You can see which samples have been processed with the selected
config, and access to the results (`See results`, bottom right).

### Adding a sample

To add a sample (`+ sample`), you must add at least one sample file. Each sample file must
be linked to a patient, a run or a set. One of those fields will be automatically
completed depending on whether you accessed the sample page.
These fields provide autocompletion to help you enter the correct
patient, run or sets. It is advised to fill in both fields (when it makes
sense). However please note that the correspondig patients, runs and sets must have
been created beforehand.

### Pre-processing

The sample files may be preprocessed, by selecting a *pre-process scenario* when adding a sample.
At the moment the only preprocess avalaible on the public server (<http://app.vidjil.org>) are the paired-end read merging.

1.  Read merging
    
    People using Illumina sequencers may sequence paired-end R1/R2 fragments. It is
    **highly** recommended to merge those reads in order to have a read that consists
    of the whole DNA fragment instead of split fragments.
    To merge R1/R2 fragments, select an adapted *pre-process scenario* and provide both R1/R2 files at once when adding a sample.
    
    There are two scenarios to merge reads. Indeed in case the merging is not
    possible for some paired-end reads we must keep only one of the fragments (either R1 or
    R2). We cannot keep both because it would bias the quantification (as there
    would be two unmerged reads instead of one). Depending on the sequencing
    strategy it could be better to keep R1 or R2 in such a case. Therefore it
    really depends on users and their sequencing protocols. You must choose to keep the fragment that most
    probably contains both a part of the V and the J genes.

## Processing samples, configs

Depending on your granted accesses, you can schedule a processing for a sequence file (select a config and `run`).
The processing can take a few seconds to a few hours, depending on the
software lauched, the options set in the config, the size of the sample and the server load.

The base human configurations with **vidjil-algo** are « TRG », « IGH », « multi » (`-g germline`), « multi+inc » (`-g germline -i`), « multi+inc+xxx » (`-g germline -i -2`, default advised configuration).
See [locus.html](./locus.html) for information on these configurations.
There are also configuration for other species and for other RepSeq algorithms, such as « MiXCR ».
The server mainteners can add new configurations tailored to specific needs, contact us if you have other needs.

The « reload » button (bottom left) updates the view. It is useful to see if the status of the task changed.
It should do `QUEUED` → `ASSIGNED` → `RUNNING` → `COMPLETED`.
It is possible to launch several processes at the same time (some will wait in the `QUEUED` / `ASSIGNED` states), and also to launch processes while you
are uploading data. Finally, you can safely close the window with the patient/experiment database (and even your web browser) when some process are queued/launched.
The only thing you should not do is to close completely your web browser (or the webpage) while sequences are uploading.

Once a task is completed, a click on the `See results` link (bottom right) will open the main window to browse the clones.
A click on the `out` link at the right of every sample give access to the raw output file of the RepSeq software.

## Groups

Each patient, run or set is assigned to at least one group.
Users are assigned to diffrent groups and therefore gain access to any patients, runs or sets that said group has access to.

There are also groups that may be clustered together. Usually this represents an organisation, such as a Hospital.
The organisation has a group to which subgroups are associated. This allows users with different sets of permissions
to gain access to files uploaded to the organisation's group automatically.

Users may be a part of several groups. By default Users are assigned their personnal group to which they can upload files
and be the sole possessor of an access to this file.
Different groups implies different sets of permissions. A user may not have the same permissions on a file accessed
from an organisation's group as (s)he does on files from her/his personnal group, or even from a group associated to
another organisation.

The different permissions that can be attributed are:

  - Read: Permissions to view patients/runs/sets to which a group or organisation has access to
  - Create: Permissions to create patients/runs/sets
  - Upload: Permissions to upload samples to the patients/runs/sets of a group
  - Run: Permissions to run vidjil on an uploaded samples to the patients/runs/sets of a group
  - View Details: Permissions to view patient/run/set data in an unencrypted manner for the patients/runs/sets of a group
  - Save: Permissions to save an analysis for the patients/runs/sets of a group

# How do you define clones, their sequences, their V(D)J designation and their productivity?

The Vidjil web application allows to run several RepSeq algorithms.
Each RepSeq algorithm (selected by « config », see above)
has its own definition of what a clone is (or, more precisely
a clonotype), how to output its sequence and how to assign a V(D)J designation.
Knowing how clones are defined is important to be aware of the
potential biases that could affect your analysis.

## How do you define a clone? How are gathered clones?

In vidjil-algo, called **vidjil-algo** (Giraud, Salson, BMC Genomics 2014),
sequences are gathered into a same clone as long as they share the
same 50bp DNA sequence around the CDR3 sequence.
In a first step, the algorithm has a quick heuristic which detects approximatively
where the CDR3 lies and extracts a 50bp nucleotide sequence centered on that
region. This region is called a **window** in vijdil-algo. When two
sequences share the same window, they belong to the same clone. Therefore
in vidjil-algo clones are only defined based on the exact match of a long DNA
sequence. This explains why some little clones can be seen around larger
clones: they may be due to sequencing error that lead to different windows.
However those small differences can also be due to a real biological process
inside the cells. Therefore we let the user choose whether the clones should
be manually clustered or not.

In **MiXCR**, clones are defined based on the amino-acid CDR3 sequence, on the V
gene used and on the hypermutations.

## What is the sequence displayed for each clone ?

The sequences displayed for each clone are not individual reads.
The clones may gather thousands of reads, and all these reads can have
some differences. Depending on the sequencing technology, the reads
inside a clone can have different lengths or can be shifted,
especially in the case of overlapping paired-end sequencing. There can be also
some sequencing errors.
The `.vidjil` file has to give one consensus sequence per clone, and
Rep-Seq algorithms have to deal with great care to these difference in
order not to gather reads from different clones.

For **vidjil-algo**, it is required that the window centered on
the CDR3 is *exactly* shared by all the reads. The other positions in
the consensus sequence are guaranteed to be present in *at least half*
of the reads. The consensus sequence can thus be shorter than some reads.

## How are computed the V(D)J designations?

In **vijdil-algo**, V(D)J designations are computed *after the clone clustering* by dynamic programming,
finding the most similar V (or 5') and J (or 3') gene, then trying to match a D gene.
Note that the algorithm also detects some VDDJ or VDDDJ recombinations that may happen in the TRD locus.
Some incomplete or unusual rearrangements (Dh/Jh, Dd2/Dd3, KDE-Intron, mixed TRA-TRD recombinations) are also detected.

Once clones are selected, you can send their sequence to **IMGT/V-QUEST** and **IgBlast**
by clicking on the links just above the sequence panel (bottom left).
This opens another window/tab.

## How is productivity computed? Why do I have some discrepancies with other software?
Vidjil-algo computes the productivity by checking that the CDR3 comes from
an in-frame recombination and that there is no stop codon in the full
sequence.

The productivitiy as computed by Vidjil-algo may differ from what computes
other software. For instance, as of September 2019, IMGT/V-QUEST removes by default
insertions and deletions from the sequences to compute the productivity, as it
considers them as sequencing errors. Moreover IMGT/V-QUEST checks that there
is no stop codon only in the CDR3 and not in the full sequence.
# Can I see all the clones and all the reads ?

The interest of NGS/RepSeq studies is to provide a deep view of any
V(D)J repertoire. The underlying analysis softwares (such as vidjil-algo)
try to analyze as much reads as possible (see *Number of analyzed reads* below).
One often wants to "see all clones and reads", but a complete list is difficult
to see in itself. In a typical dataset with about 10<sup>6</sup> reads, even in
the presence of a dominant clone, there can be 10<sup>4</sup> or 10<sup>5</sup> different
clones detected. A dominant clone can have thousands or even more reads.
There are ways to retrieve the full list of clones and reads (for example by launching
the command-line program), but, for most of the cases, one may want to focus on some clones
with their consensus sequences.

## The "top" slider in the "filter" menu

The "top 50" clones are the clones that are in the first 50 ones
in **at least one** sample. As soon as one clone is in this "top 50"
list, it is displayed for every sample, even if its concentration is
very low in other samples.
This is the case for clones tracked in follow-up samples
(for example checking minimal residual disease, MRD) after a diagnosis sample.

Most of the time, a "top 50" is enough. The hidden clones are thus the
one that never reach the 50 first clones. With a default installation,
the slider can be set to display clones until the "top 100" on the grid
(and, on the graph, until "top 20").

However, in some cames, one may want to track some known clones that are
never in the "top 100", as for example:

  - a standard/spike with low concentration
  - a clone tracked in a follow-up sample of a patient without the diagnosis sample

In these situations, a solution is to create a `.fasta` file with this sequences to be tracked
and upload it as another sample in the same patient/run/set.
It should then show up in any sample.

(Upcoming feature). If clone is "tagged" in the `.vidjil` or
in the `.analysis` file, it will always be shown even if it does not
meet the "top" filter.

## The "smaller clones"

There is a virtual clone per locus in the clone list which groups all clones that are hidden
(because of the "top" or because of hiding some tags). The sum of
ratios in the list of clones is always 100%: thus the "smaller clones"
changes when one use the "filter" menu.

Note that the ratios include the "smaller clones": if a clone
is reported to have 10.54%, this 10.54% ratio relates to the number of
analyzed reads, including the hidden clones.

## Going back to the analyzed reads

The web application displays one consensus sequence per clone (see [Representative](#what-is-the-sequence-displayed-for-each-clone) above).
In some situations, one may want to go back to the reads.

For **vidjil-algo**, analyzing a dataset with the *default + extract reads* config enables
to retrieve back the analyzed reads in the `.segmented.vdj.fa` file that can be downloaded through the `out` link near each sample.
This `.vdj.fa` output enables to use vidjil-algo as a *filtering tool*,
shrinking a large read set into a manageable number of (pre-)clones
that will be deeply analyzed and possibly further clustered by
other software.

Other custom configs are possible, in particular to retrieve reads for a particular clone.
Contact us if you are interested.

# How can I assess the quality of the data and the analysis ?

To make sure that the PCR, the sequencing and the RepSeq analysis went well, several elements can be controlled.

## Number of analyzed reads

A first control is to check the number of “analyzed reads” in the info panel (top left box).
This shows the number of reads where the underlying RepSeq algorithm found some V(D)J recombination in the selected sample.

With DNA-Seq sequencing with specific V(D)J primers,
ratios above 90% usually mean very good results. Smaller ratios, especially under 60%, often mean that something went wrong.
On the other side, capture with many probes or RNA-Seq strategies usually lead to datasets with less than 0.1% V(D)J recombinations.

The “info“ button further detail the causes of non-analysis (for vijdil-algo, `UNSEG`, see detail on [vidjil-algo documentation](http://www.vidjil.org/doc/vidjil-algo/#unsegmentation-causes)).
There can be several causes leading to bad ratios:

### Analysis or biological causes

  - The data actually contains other germline/locus that what was searched for
    (solution: relauch the processing, or ask that we relaunch it, with the correct germline sequences).
    See [locus documentation](http://www.vidjil.org/doc/locus/) for information on the analyzable human locus with vidjil-algo,
    and contact us if you would like to analyze data from species that are not currently available.

  - There are incomplete/exceptional recombinations
    (Vidjil can process some of them, config `multi+inc`, see [locus documentation](http://www.vidjil.org/doc/locus/) for details)

  - There are too many hypersomatic mutations
    (usually Vidjil can process mutations until 10% mutation rate… above that threshold, some sequences may be lost).

  - There are chimeric sequences or translocations
    (Vidjil does not process all of these sequences).

### PCR or sequencing causes

  - The read length is too short and the reads do not span the junction zone
    (see also comments on read length concerning [library preparation and sequencing](http://www.vidjil.org/doc/locus#read-length)).
    Vidjil-algo detects a “window” including the CDR3. By default this window is 50bp long, so the read needs be
    that long centered on the junction.
    Reads with no similarity to either V or J are reported as not analyzed (`UNSEG only V/J` or even `UNSEG too few V/J`).
    Reads with a V/J junction detected but not long enough are also reported as not analyzed (`UNSEG too short w`).
    Finally, some slightly short reads are analyzed but with slightly shifted or shortened windows (`SEG changed w`).
    The related clones are marked with a warning (W50), as they may, in some cases, falsely cluster reads from different clones.

  - In particular, for paired-end sequencing, one of the ends can lead to reads not fully containing the CDR3 region.
    Solutions are to merge the ends with very conservative parameters (see *Read merging* above),
    to ignore this end, or to extend the read length.

  - There were too many PCR or sequencing errors
    (this can be asserted by inspecting the related clones, checking if there is a large dispersion around the main clone)

## Control with standard/spike

  - If your sample included a standard/spike control, you should first
    identify the main standard sequence (if that is not already done) and
    specify its expected concentration (by clicking on the “★” button).
    Then the data is normalized according to that sequence.
  - You can (de)activate normalization in the settings menu.

## Steadiness verification

  - When assessing different PCR primers, PCR enzymes, PCR cycles, one may want to see how regular the concentrations are among the samples.
  - When following a patient one may want to identify any clone that is emerging.
  - To do so, you may want to change the color system, in the “color by” menu
    select “abundance”. The color ranges from red
    (high concentration) to purple (low concentration) and allows to easily
    spot on the graph any large change in concentration.

## Clone coverage

In **vidjil-algo**,
the clone coverage is the ratio of the length of the clone consensus sequence
to the median read length in the clone.
A consensus sequence is
displayed for each clone (see [What is the sequence displayed for each clone?](#what-is-the-sequence-displayed-for-each-clone)).
Its length should be representative of the read lengths among that clone. A
clone can be constituted of thousands of reads of various lengths. We
expect the consensus sequence to be close to the median read length of the
clone. The clone coverage is such a measure: having a clone coverage
between .85 and 1 is quite frequent. On the contrary, if it is .5 it means that the consensus sequence
length is half shorter than the median read length in the clone.

There is a bad clone coverage (\< 0.5) when reads do share the same window
(it is how Vidjil defines a clone) and when they have frequent discrepancies
outside of the window. Such cases have been observed with chimeric reads
which share the same V(D)J recombinations in their first half and have
totally different and unknown sequences in their second half.

In the web application, the clones with a low clone coverage (\< 0.5) are displayed in
the list with an orange I on the right. You can also visualize the clones
according to their clone coverage by selecting for example “clone
coverage/GC content” in the preset menu of the “plot” box.

## E-value

Vidjil-algo computes an e-value of the found
recombination. An e-value is the number of times such a recombination is
expected to be found by chance. The lower the e-value the more robust the
detection is.

Whenever the e-value is too large, a warning sign will be shown next to the
clone, instead of the info icon.

# Keyboard shortcuts

Note that some shortcuts may not work on some systems or on on some web browsers.

|                         |                                                     |
| ----------------------- | --------------------------------------------------- |
| `←` and `→`             | navigate between samples                            |
| `Shift-←` and `Shift-→` | decrease or increase the number of displayed clones |
| numeric keypad, `0-9`   | switch between available plot presets               |
| `#`                     | switch between grid and bar modes                   |

|                                         |                               |
| --------------------------------------- | ----------------------------- |
| `z`                                     | zoom/focus on selected clones |
| `Shift-z`                               | hide the selected clones      |
| `z` or `Shift-z` with no clone selected | reset the zoom/focus          |

|             |                             |
| ----------- | --------------------------- |
| `+`         | cluster selected clones     |
| `Backspace` | revert to previous clusters |

|                |                                    |
| -------------- | ---------------------------------- |
| `a`: TRA       |                                    |
| `b`: TRB       |                                    |
| `g`: TRG       |                                    |
| `d`: TRD, TRD+ | change the selected germline/locus |
| `h`: IGH, IGH+ |                                    |
| `l`: IGL       |                                    |
| `k`: IGK, IGK+ |                                    |
| `x`: xxx       |                                    |

Note: You can select just one locus by holding the `Shift` key while pressing
the letter corresponding to the locus of interest.

|           |                                                          |
| --------- | -------------------------------------------------------- |
| `Ctrl-s`  | save the analysis (when connected to a database)         |
| `Shift-p` | open the 'patient' window (when connected to a database) |

# References

If you use Vidjil for your research, please cite the following references:

Marc Duez et al.,
“Vidjil: A web platform for analysis of high-throughput repertoire sequencing”,
PLOS ONE 2016, 11(11):e0166126
<http://dx.doi.org/10.1371/journal.pone.0166126>

Mathieu Giraud, Mikaël Salson, et al.,
“Fast multiclonal clusterization of V(D)J recombinations from high-throughput sequencing”,
BMC Genomics 2014, 15:409
<http://dx.doi.org/10.1186/1471-2164-15-409>
