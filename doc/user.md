# Web platform, user manual

Vidjil is an open-source platform for the analysis of high-throughput sequencing data from lymphocytes.
[V(D)J recombinations](http://en.wikipedia.org/wiki/V\(D\)J_recombination) in lymphocytes are essential for immunological diversity.
They are also useful markers of pathologies, and in leukemia, are used to quantify the minimal residual disease during patient follow-up.
With adapted [library preparation and sequencing](http://www.vidjil.org/doc/locus),
high-throughput sequencing (NGS/HTS) now
enables the deep sequencing of a lymphoid population with dedicated
sequencing methods and software, called either Rep-Seq or AIRR-Seq.

This is the help of the [Vidjil web application](http://app.vidjil.org/).
Further help can always be asked to <support@vidjil.org>. We can also arrange phone or video meeting.

The Vidjil team (Mathieu, Mikaël, Aurélien, Florian, Marc, Ryan and Tatiana)

# Requirements

## Supported browsers

The Vidjil web application runs in any modern browser.
We recommend to either regularly update one's web browsers,
or to use long-term releases, such as [Firefox ESR](https://www.mozilla.org/en-US/firefox/enterprise).
As of September 2020, we recommend using Firefox or Chrome/Chromium :

  - Firefox, *version \>= 78 ESR*
  - Chrome, *version \>= 79*

These platforms will be supported to at least *June 2023*.
Chrome 79, and possibly other recent versions, are tested through our continuous integration pipelines.

## Legacy browsers

We also provide an extended support on

  - Firefox, versions 32 to 77
  - Chrome, version 49 to 78

Some of these legacy platforms are also tested through our continuous integration pipelines.
However, old platforms have security flaws and are not recommended for routine usage involving clinical data.
They may not get the new features, and *this extended support may be dropped in September 2021*.

## Other browsers

Vidjil is also reported to work with recent Edge, IE (version >= 10.0), Opera or Safari browsers,
but these browsers are not officialy supported.
Note that Vidjil will not run on IE 9.0 or below.


## Getting .vidjil files

The vidjil web application displays `.vidjil` files that summarize the V(D)J
recombinations and the sequences found in one or several samples.

The easiest way to get these files is to [request an account](http://app.vidjil.org/) on the public Vidjil test server.
You will then be able to upload,
manage, process your samples (`.fasta`, `.fastq`, `.gz`, `.bam`, or `.clntab` files) directly on the web application
(see *The sample database and the server*), and the server behind the sample
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
    
      - either with “samples”/“open samples” if you are connected to a sample database, such as on <http://app.vidjil.org/> or <http://health.vidjil.org/>.
        In these cases, there are always some "Demo" datasets for demonstration purposes.
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
    
      - either with “samples”/“save analysis” if you are connected to a sample database
      - or with “file”/“export .analysis”

You are advised to go through to the tutorial available from <http://www.vidjil.org/doc>
to learn the essential features of Vidjil.

# The elements of the Vidjil web application

## The info panel (upper left panel)

  - *patient/run/set information.*
  - *locus.* Germline(s) used for analyzing the data. In case of multi-locus
    data, you can select what locus should be displayed (see [Libraries and recombinations](locus.md))
  - *analysis.*   Name (without extension) of the loaded file.
  - *sample.* Name of the current sample.

<!-- The name can be edited (“edit”). -->

  - *date.* Date of the current sample
    (can be edited in the database, on the patient/run/set tab).
    When displaying multiple samples from a same patient/run/set,
    you can change the sample viewed by clicking on the `←` and `→` buttons,
    or cycle trough them by clicking on the "▶" button.

  - *analyzed reads.* umber of reads where the underlying RepSeq algorithm
    found a V(D)J recombination, for that sample.
    See *Number of analyzed reads* below.
    By hovering the mouse, one also sees the *total*
    number of reads for that sample.

  <figure> <p style="text-align:center">
      <img src="..//pictures/panel_info.png"/>
  </figure>
  <i>
      The information panel.
      The patient/run/set or sample information may contain tags such as `#T-ALL`.
      In this sample,
      V(D)J recombinations were detected
      in about 82% of the reads.</p>
  </i>

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

  - The concentration of some clones may not be displayed.
    - A clone with a plus symbol `+` has been detected in that sample,
      but with only a few reads, typically less than five.
      Its concentration ratio is thus not significant, and
      this clone would appear in the gray zone in the sample graph.
    - A clone with a minus symbol `−` has not been detected in that sample,
      but has been detected in another sample that is not currently displayed.

  <figure> <p style="text-align:center">
      <img src="..//pictures/panel_list.png"/>
  </figure>
  <i>The list of clones.
    The main clonotype is
    `IGHV3-9*01 7/CCCGGA/17 IGHJ6*02`,
    with 7 deletions on the 3' side of the V,
    17 deletions on the 5' side of the J,
    and a insertion of `CCCGGA` in the N region.
    Here the settings shorten this
    name by not showing the `*01` allele.
    This clonotype is actually a cluster (+)
    of sub-clones.
    The `TRGV10 4//8 JP2` clonotype has a warning.
  </i>

### Detailed information on each clone
The “🛈” button opens a window showing detailed information (V(D)J designation,
e-value, number of reads) about each clone.

In addition, depending on what the user launched on this clone, we may also
find detailed informations retrieved from IMGT or from CloneDB.

#### Detailed information from CloneDB

(experimental feature)
If you are connected to a sample database where CloneDB is enabled,
and if CloneDB was launched on the selected clone,
you can see here occurrences of this clone in CloneDB
as well as links to the relevant patients/runs/sets.
Note that the percentage shown can be above 100% as the percentage is
calculated over all the samples in the sample set.

## The sample graph

The sample graph is displayed as soon as there are at least two samples.
It shows the most frequent clones of each sample, tracked into every sample.

  - The current sample is highlighted with a vertical gray bar. You can select another sample by clicking on it or using `←` and `→`.

  - By default, the graph shows clones present in the top 20 of any sample.
    See below "[Can I see all the clones ?](#can-i-see-all-the-clones-and-all-the-reads)".
    You can instead choose to show only the clones present in the current sample
    with “filter \> focus on clones of one sample“.

  - When a clone gathers very few reads, typically less than five,
    its concentration ratio is not significant and it is shown by a `+` in the clone list.
    Such clones appear in the sample graph in a *gray zone*.
    They should be considered as “detected, but not quantifiable“,
    and different concentrations in the gray zone should not be compared.

  - Samples can be reordered by dragging their label.

  - Samples can be hidden by double-clicking on their label.
    At the top-right of the graph, a button such as `5/8`
    shows how many samples are displayed (here `5`) and the total number of samples (here `8`).
    This button reveals a menu where
    each sample can be selected (single click),
    shown or hidden (double click),
    as well as options to show or to hide all samples.

  - If your dataset contains sampling dates (for example for diagnosis/follow-up samples), you can switch between sample keys and dates in “settings \> sample key”

  <figure> <p style="text-align:center">
      <img src="..//pictures/panel_graph.png"/>
  </figure>
  <i>
  This sample graph show the evolution of a T-ALL patient relapsing at D+268/D+308 with a clonotype
  that was not the main one at the diagnosis.The view was filtered to show only clonotypes of interest.
  </i>
  </figure>

## The plot view and the plot presets

The grid view shows the clones scattered according to some axes.
When there is only one sample, two such views are shown.

  - The default view, by V/J genes, focus on one recombination system within one locus.
    All the analyzes locus are on the right of the grid. You can select another locus by clicking on it or by using the associated shortcuts (see *Keyboard shortcuts* below).

  - The “plot“ menu allow to customize the plots, by selecting the X and Y axes and also by switching between grid and bar plots.
    There are [20+ available axes](axes.md) to study the clones.
    Some presets are available.
    For example, the preset 4, similar to a "Genescan analysis", shows a bar plot of the clones according to the length of their consensus sequence,
    and the preset 7 shows the distribution of CDR3 lengths.

  - On the bar plots, the Y axis corresponds to the order of clones inside each bar.

  <figure> <p style="text-align:center">
      <img src="..//pictures/panel_scatterplot.png"/>
      </p>
  </figure>

<i>
  Grid view with the default axes (V/5' and J/3' gene) focusing on the TRG locus. The TRGV10/TRGJP10 clonotype appears in red because it has been tagged as `clone 1` from the clonotype list. Clicking on IGH focus on the IGH locus.
</i>


## Status bar

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

The sequence panel shows, for the selected clones:

 - the nucleotide or amino acid *sequences* -- see below "[What is the sequence displayed for each clone ?](#what-is-the-sequence-displayed-for-each-clone)"
 - some *features* on these sequences


  <figure> <p style="text-align:center">
      <img src="..//pictures/panel_sequence.png"/>
      <p style="text-align:center">For each clonotype, name and sequences are shown. Some other feature can also be added.</p>
    </p>
  </figure>

### Selecting clones for inspection

Clones can be (un)selected by several ways:

  - Select one clone: click on its representative element in any panel (a plot in the gridpanel, a line in the graph panel, or an entry in the list panel)
  - Select multiple clones at once:  click-and-drag a rectangular selection of an area of the grid panel
  - Add a clone to the selection : Ctrl+click 
  - Remove a clone from the selection : click on the 'X' at the left
  - Remove all selected clones : click on the background of the grid panel

### Cluster: regroup clones

The `cluster` button will create a cluster with the selected clones
Such a cluster will appear as a single clone,
with the first (largest) selected clone acting as its representative.

  <figure> <p style="text-align:center">
      <img src="..//pictures/panel_list_merge_2.png"/>
  </figure>
  <i>The top clonotype is actually a cluster of several sub-clonotypes. It is still possible to access to all the information of such sub-clonotype. Clicking on "x" remove a sub-clonotype from the cluster.</p>
  </i>

### Align

The `align` button aligns all the selected sequences,
the sequence of the first (largest) clone used as a reference.

  - `*` is a match
  - `-` is a gap
  - a single line under a character is a nucleotide mismatch
  - a double line under a character is a silent nucelotide mismatch (not impacting the resulting amino acid sequence)
  - `#` in an amino acid sequence indicates a frameshift in the junction (and thus an unproductive sequence)

The alignment settings `⚙` menu allows to customize such alignements, by

 - highlighting mismatches
 - hiding matches
 - switching between amino acid and nucleotide sequences


### Data Columns

The analysis software, on some configurations, may provide additional data for each clone.
The data columns `‖` menu allows to select such data.


### External Analysis: Further sequence analysis with external software
This sub menu display a range of other analysis software available online used for RepSeq studies.
These buttons will send the sequences of selected clones to them for analysis and open the resulting page in another window/tab.

  - [`❯ IMGT/V-QUEST`](http://www.imgt.org/IMGT_vquest):
    The reference analysis from IMGT®, including search for subset `#2` and `#8`.
    See [below](#imgt-sequence-features)

  - [`❯ IgBlast`](https://www.ncbi.nlm.nih.gov/igblast/):
    Nucleotide alignment with IG/TR germline sequences

  - `❯ CloneDB`.  See [above](#detailed-information-from-clonedb)

  - [`❯ Blast`](http://www.ensembl.org/Multi/Tools/Blast):
    Nucleotide alignement against the Homo sapiens genome and other nucleotide collections

  - [`❯ AssignSubsets`](https://station1.arrest.tools/subsets) (availaible for clones with IGH recombinations):
    Assignment to the [19 known major subsets](https://www.ncbi.nlm.nih.gov/pubmed/22415752)
    of stereotyped antigen receptor sequences for CLL


### Sequence Features

Depending on the analysis software and on its configuration, there can be positions of genes or specific regions of interest that can be highlighted.
The sequence feature `☰` menu usually contains at least the following genes/regions:

  - V/D/J genes
  - CDR3 position

### IMGT Sequence Features

The `☰ IMGT` menu further allows to select features provided by IMGT/V-QUEST:

  - V/D/J genes
  - FR1/FR2/FR3/FR4
  - CDR1/CDR2/CDR3 

To avoid overloading the IMGT servers that provide us this feature,
after adding new clones to the selection,
one has to click on the refresh `↻` button to request the features for the new sequences.


# The sample database and the server

If a server with a sample database is configured with your
installation of Vidjil (as on the public test server <http://app.vidjil.org/>
or on the healthcare server <http://health.vidjil.org/>), the
'samples' menu gives you access to the server.

With authentication, you can add 'patients', 'runs', or 'sets', they are just three different ways to group 'samples'.
Samples are `.fasta`, `.fastq`, `.gz` or `.clntab` files, possibly pre-processed.
Once you uploaded samples (either in 'patients', 'runs', or 'sets'),
you can process your data and save the results of your analysis.

## Patients


  <figure> <p style="text-align:center">
      <img src="..//pictures/table_db_content_patient_list.png"/>
  </figure>
  <i>
  The main page on the sample database show a list of patients, or runs or sets,
  with links to the samples and the results.
  </i>

<b>
⚠️ The public <http://app.vidjil.org/> server is for Research Use Only
and is not compliant for clinical use.
Clinical data have to be uploaded on a [certified healthcare server](http://www.vidjil.org/doc/healthcare).
</b>

Once you are authenticated, this page shows the patient list. Here you
can see your patients and patients whose permission has been given to you.

New patients can be added (`+ new patients`), edited (`✏️`)  or deleted (`⌫`).
By default, you are the only one who can see and update this new patient.
If you have an admin access, you can grant access to other users (`p`).

## Runs and sets

Runs and sets can be manipulated the same way as patients. They can be added (`+ new runs`, `+ new sets`),
edited (`✏️`) or deleted (`⌫`).
They are just different ways to group samples.
Sets can for example gather a set of samples of a same experiment.
Runs can be used to gather samples that have been sequenced in the same run.

## Batch creation of patients/runs/sets
<a name='batch-creation'></a>

Patients, runs and sets can be added one by one (`add patient`, `add run`, `add set`).
They can also be created by pasting data from a properly formatted table
created by any spreadsheet editor such as LibreCalc/LibreOffice or Excel.

Data has to be presented with the following columns, but some cells may be empty.
Do not copy any header row, but only the data rows.

*Patient* : 5 columns (patient id, first name, last name, birth date, info)

|     |        |      |            |      |
| --- | ------ | ---- | ---------- | ---- |
| 42  | John   | Doe  |            | #ALL |
|     | George | Sand | 1804-02-01 |      |

*Run* : 4 columns (run id, name, date, info)

|         |       |            |                    |
| ------- | ----- | ---------- | ------------------ |
| 2020r84 | Lib84 | 2020-09-15 |                    |
| 2020r85 | Lib85 | 2020-09-15 | new IGH-DJ primers |

*Set* : 2 columns (set name, info)

|           |                         |
| --------- | ----------------------- |
| CohortCLL | Retrospective 2015-2019 |
| Mouse1604 |                         |


## Permanent address (URL) to a set of samples

Addresses such as <http://app.vidjil.org/3241-25> directly target a set of samples (here the public dataset L3), possibly with your saved analysis.
Moreover, the address may also encode other parameters, for instance <https://app.vidjil.org/3241-25?plot=clone%20average%20read%20length,J/3%27%20gene,bar&clone=30> (selected axes and selected clones).

To discuss on some results or to raise any issue, you can share such addresses with other users (with whom you share access grants, see below),
to your local IT staff or to the Vidjil team.

## Samples and pre-processes

Clicking on a patient, a run or a set give acccess to the "samples" page. Each sample is
a `.fasta`, `.fastq`, `.gz` or `.clntab` file that will be processed by one or several
pipelines with one or several *process configurations* that set software options.

Depending on your granted access, you can add a new sample to the list (`+ add samples`),
download sample files when they are available (`⬇`) or delete sequence files (`⌫`).
Note that sample files may be deleted (in particular to save server disk space),
which is not the case for the results (unless the user wants so).

You can see which samples have been processed with the selected
process, and access to the results (`See results`, bottom right).

  <figure> <p style="text-align:center">
      <img src="..//pictures/table_db_content_patient_0_multi_config.png"/>
  </figure>
  <i>
      The demo patient LIL-L3, available
      from the demo account, has 5 samples here analyzed
      with the default `multi+inc+xxx` configuration.</p>
  </i>


### Adding a sample

To add a sample (`+ add samples`), you must add at least one sample file. Each sample file must
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
    On the public test server, the default scenarios use the [Flash2](https://academic.oup.com/bioinformatics/article/27/21/2957/217265) read merger with the option `-M 300`.
    
    There are two scenarios to merge reads. Indeed in case the merging is not
    possible for some paired-end reads we must keep only one of the fragments (either R1 or
    R2). We cannot keep both because it would bias the quantification (as there
    would be two unmerged reads instead of one). Depending on the sequencing
    strategy it could be better to keep R1 or R2 in such a case. Therefore it
    really depends on users and their sequencing protocols. You must choose to keep the fragment that most
    probably contains both a part of the V and the J genes.

## Processing samples and process configurations

Depending on your granted accesses, you can schedule a processing for a sequence file (select a config and `run`).
The processing can take a few seconds to a few hours, depending on the
software lauched, the options set in the process configuration, the size of the sample and the server load.

The base human configurations with **vidjil-algo** are « TRG », « IGH », « multi » (`-g germline`), « multi+inc » (`-g germline -i`), « multi+inc+xxx » (`-g germline -i -2`, default advised configuration).
See [Libraries and recombinations](locus.md) for information on these processes.
There are also processes for other species and for other RepSeq algorithms, such as « MiXCR ».
The server mainteners can add new process configurations tailored to specific needs, contact us if you have other needs.

The « reload » button (bottom left) updates the view. It is useful to see if the status of the task changed.
It should do `QUEUED` → `ASSIGNED` → `RUNNING` → `COMPLETED`.
It is possible to launch several processes at the same time (some will wait in the `QUEUED` / `ASSIGNED` states), and also to launch processes while you
are uploading data. Finally, you can safely close the window with the sample database (and even your web browser) when some process are queued/launched.
The only thing you should not do is to close completely your web browser (or the webpage) while sequences are uploading.

Once a task is completed, a click on the `See results` link (bottom right) will open the main window to browse the clones.
A click on the `out` link at the right of every sample give access to the raw output file of the RepSeq software.

## Groups

Each patient, run or set is assigned to at least one group.
Users are assigned to different groups and therefore gain access to any patients, runs or sets that said group has access to.

Groups may be nested.
For example, a group may represents an organization, such as a hospital or a network of hospitals.
Subgroups may be created for individual labs and/or for different roles in the labs.
This allows users to have different sets of permissions
while accessing to some of the files uploaded to the organization's group.

Users may be a part of several groups. By default Users are assigned their personal group to which they can upload files
and be the sole possessor of an access to this file.
Different groups imply different sets of permissions.
A user may not have the same permissions on a file accessed
from an organization's group as (s)he does on files from her/his personal group, or even from a group associated to
another organization.

The different permissions that can be attributed are:

  - Read: Permissions to view patients/runs/sets to which a group or organization has access to
  - Create: Permissions to create patients/runs/sets
  - Upload: Permissions to upload samples to the patients/runs/sets of a group
  - Run: Permissions to run Vidjil on an uploaded samples to the patients/runs/sets of a group
  - (Anon) View Details: Permissions to view patient/run/set data in an unencrypted manner for the patients/runs/sets of a group
  - Save: Permissions to save an analysis for the patients/runs/sets of a group

## Usage and processes pages

These pages allow to follow your activity and the activity of your groups.

### Usage page

The usage page detail, for each of your groups, data usage and last processes.
For each group, you will find:

  - A reminder of your permissions in that group (full permissions: admin anon create read run save upload,
    or some more restricted permissions)
  - The number of each type of sets (patient/runs/sets), with the number of processes done the last month and their status
    (`C`: completed, `F`: failed, `Q`: queued, `S`: stopped)
  - The list of the most frequent tags
  - Links to last processes

### Processes page

This page lists the last processes you ran, with information such as its configuration and its status.
Each sample is provided with links to the related patient/runs/sets.


# How do you define clones, their sequences, their V(D)J designation and their productivity?

The Vidjil web application allows to run several RepSeq algorithms.
Each RepSeq algorithm (selected by « process configuration », see above)
has its own definition of what a clone is (or, more precisely
a clonotype), how to output its sequence and how to assign a V(D)J designation.
Knowing how clones are defined is important to be aware of the
potential biases that could affect your analysis.

## How do you define a clone? How are gathered clones?

Some RepSeq studies want to broadly cluster clones to have a global view on the immune repertoire.
One may want to focus on CDR3 on the amino-acid level, or on the nucleotide level.
One also generally wants to correct technological artifacts (PCR, sequencing).
On the contrary, when studying hypermutations in IGH recombinations,
people want to know as precisely as possible differences between sequences,
even when they occur for a single nucleotide in the V gene or elsewhere.

In **vidjil-algo** (Giraud, Salson, BMC Genomics 2014),
sequences are gathered into a same clone as long as they share the
same 50bp DNA sequence around the CDR3 sequence.
In a first step, the algorithm has a quick heuristic which detects approximatively
where the CDR3 lies and extracts a 50bp nucleotide sequence centered on that
region. This region is called a **window** in vijdil-algo. When two
sequences share the same window, they belong to the same clone. Therefore
in vidjil-algo clones are only defined based on the (conservative) exact match of a long DNA
sequence. This explains why some little clones can be seen around larger
clones: They may be due to artifacts that lead to different windows.
However those small differences can also be due to a real biological process
inside the cells. Therefore we let the user choose whether the clones should
be manually clustered or not -- and the choice may depend on the purpose of her study.

In **MiXCR**, clones are defined based on the amino-acid CDR3 sequence, on the V
gene used and on the hypermutations.
Other software may have other definitions, see also [What is a clone ?](/vidjil-format/#what-is-a-clone).

## What is the sequence displayed for each clone ?

The sequences displayed for each clone are not individual reads.
The clones may gather thousands of reads, and all these reads can have
some differences. Depending on the sequencing technology, the reads
inside a clone can have different lengths or can be shifted,
especially in the case of overlapping paired-end sequencing. There can be also
some sequencing errors.
The `.vidjil` file has to give one consensus sequence per clone, and
RepSeq algorithms have to deal with great care to these difference in
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

Vidjil-algo reports CDR3 as *productive* when they come from
an in-frame recombination, the sequence does not contain any in-frame stop codons,
and, for IGH recombinations, when the FR4 begins with the `{WP}-GxG` pattern.
This follows the ERIC guidelines ([Rosenquist et al., 2017](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5508071/)).

The productivity as computed by Vidjil-algo may differ from what computes
other software. For instance, as of September 2019, IMGT/V-QUEST removes by default
insertions and deletions from the sequences to compute the productivity, as it
considers them as sequencing errors.


## How can there be discrepancies in annotations of a same clone in different samples?

Sometimes, the "same" clone shows different properties between different samples --
as for exemple different V(D)J designations or productivity prediction.
Warnings [W81 and W82](http://gitlab.vidjil.org/blob/dev/doc/warnings.md) are now raised for such situations.

Such differences may come from [the way sequences are clustered](/vidjil-format/#what-is-a-clone).
When different sequences are clustered in a "same" clone,
some of them may actually have different mutations or lengths even if they share the same window.
This can also be due to clustering results of different analysis programs, for example
with different releases of vidjil-algo.

# Can I see all the clones and all the reads ?

The interest of NGS/RepSeq studies is to provide a deep view of any
V(D)J repertoire. The underlying analysis softwares (such as vidjil-algo)
try to analyze as much reads as possible (see *Number of analyzed reads* below).
One often wants to "see all clones and reads", but a complete list is difficult
to see in itself. In a typical dataset with about 10<sup>6</sup> reads, even in
the presence of a dominant clone, there can be 10<sup>4</sup> or 10<sup>5</sup> different
clones detected. A dominant clone can have thousands or even more reads.

Whereas many applications require to focus on some clones with their consensus sequences,
repertoire studies usually consider all clones,
for example to assess their diversity or to compare repertoires between samples.
Vidjil allows both:

- by default, to fully study "top clones"
- when this is needed, to retrieve the full list of clones and/or reads for further analysis
- to study the distribution of all the clones
- to estimate diversity and overlap indices

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

## Studying the distribution of all clones, including "smaller clones"

Vidjil detects all clones, even if, by default,
only the top 50 or 100 clones are displayed with a full analysis.
The other clones, that are hidden (because of the "top" or because of hiding some tags)
are gathered into *virtual clones*, shown with light gray.

This enables to study full repertoires,
including assessing the polyclonal background and the diversity of the repertoires.
Note that selecting `color by clone` emphasizes the difference between the top clones, colored, and these virtual clones.
Depending on the process configuration, these "smaller clones" are shown, in the clone list:

- either *gathered by read length*, the Genescan-like plot showing the clone distribution.
  This is the default on  default processes on the public server,

- or *gathered by locus* into a unique virtual clone.

In both cases, the sum of ratios in the list of clones is always 100%: thus these "smaller clones"
changes when one uses the "filter" menu.

Note that the ratios include the "smaller clones": if a clone
is reported to have 10.54%, this 10.54% ratio relates to the number of
analyzed reads, including the hidden clones.

## Studying diversity and overlap indices

Several indices are computed on the full list of clones to assess the diversity and overlap of sample(s):

- On one sample, [diversity indices](https://en.wikipedia.org/wiki/Diversity_index) such as
  Shannon's diversity, Shannon's equitability and Simpson's diversity, as computed by [vijdil-algo](vidjil-algo.md#diversity-measures).
  Some of these indices have values between 0 (no diversity, one clone clusters all analyzed reads)
  and 1 (full diversity, each analyzed read belongs to a different clone).

- On several samples, overlap indexes such as [Morisita's overlap index](https://en.wikipedia.org/wiki/Morisita%27s_overlap_index)
  having values between 0 (no overlap between the two samples)
  and 1 (full overlap, clones in the same proportion in both samples).

Some of these indices are currently shown on the sample information panel (“🛈” next to the sample name in the info panel).
Contact us if you have other needs.

## Exporting the full list of clones

The `Export all clones (AIRR)` process exports all clones
in the [AIRR format](http://docs.airr-community.org/en/latest/datarep/rearrangements.html#fields).
Such a `.tsv` file that can be further processed or opened in any spreadsheet editor.
The exported fields are described in the [documentation of vidjil-algo](vidjil-algo.md#airr-tsv-output).
Once the process has run, click on `See the output files` (at the right of `COMPLETED`)
to download this file.
Note that results can then not be visualized on the main Vidjil window.

For more specific analyses, we advise to work with bioinformaticians.
The full list of clones can be retrieved by launching the command-line `vidjil-algo` (see [documentation](vidjil-algo.md)),
Parsing the `.vidjil` files gives then all information computed on each clone (see [documentation](vidjil-format.md)).


## Going back to the analyzed reads

The web application displays one consensus sequence per clone (see [Representative](#what-is-the-sequence-displayed-for-each-clone) above).
In some situations, one may want to go back to the reads.

For **vidjil-algo**, analyzing a dataset with the *default + extract reads* process
generates a `.detected.vdj.fa` file with the reads with detected V(D)J recombinations.
This file can be downloaded through the `See the output files` link near each sample.
It enables to use vidjil-algo as a *filtering tool*,
shrinking a large read set into a manageable number of (pre-)clones
that will be deeply analyzed and possibly further clustered by
other software.

Other custom processes are possible, in particular to retrieve reads for a particular clone.
Contact us if you are interested.

# How can I assess the quality of the data and the analysis ?

To make sure that the PCR, the sequencing and the RepSeq analysis went well, several elements can be controlled.

## Number of analyzed reads

A first control is to check the number of “analyzed reads” in the info panel (top left box).
This shows the number of reads where the underlying RepSeq algorithm found some V(D)J recombination in the selected sample.

With DNA-Seq sequencing with specific V(D)J primers,
ratios above 90% usually mean very good results. Smaller ratios, especially under 60%, often mean that something went wrong.
On the other side, capture with many probes or RNA-Seq strategies usually lead to datasets with less than 0.1% V(D)J recombinations.

The “info“ button further detail the causes of non-analysis (for vijdil-algo, `UNSEG`, see detail on [vidjil-algo documentation](vidjil-algo/#reads-without-detected-recombinations).
There can be several causes leading to low ratios:

### Analysis or biological causes

  - The data actually contains other germline/locus that what was searched for
    (solution: relauch the processing, or ask that we relaunch it, with the correct germline sequences).
    See [locus documentation](http://www.vidjil.org/doc/locus/) for information on the analyzable human locus with vidjil-algo,
    and contact us if you would like to analyze data from species that are not currently available.

  - There are incomplete/exceptional recombinations
    (Vidjil can analyze some of them with the process `multi+inc`, see [locus documentation](http://www.vidjil.org/doc/locus/) for details)

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
    The related clones are marked with a [W50](http://gitlab.vidjil.org/blob/dev/doc/warnings.md) warning,
    as they may, in some cases, falsely cluster reads from different clones.

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


# How can I have further support or help on a specific sample or on some sequences?

When you have questions on specific data, we advise to use the `help > get support`
link inside the web application.
This opens a mail template with reference to the sample,
and possibly with references to the selected clones.

Indeed, the address <http://app.vidjil.org/3241-25?clone=3>
reflects the sample you are studying with a given process configuration.
When you select one or several clones, the address is updated.

Note that, even knowing this address,
only the logged-in users with proper authorization can access to these data.
This includes the uploader of the data,
possibly users of the same groups if such groups were defined, and the server maintainers.

# Settings

The settings menu allows to set:

 - the clone size format     [scientific notation / percentage]
 - the sample key            [sample name / shortened name / sampling date / day since first sampling]
 - the format for clone junction [junction length / AA sequence / mixed (display AA sequence only for short junction)]
 - the format for clone alleles  [hide alleles / display alleles / mixed (display only for marginal alleles)]

These settings, together with the color option, are kept in your web browser ``localStorage'' between several sessions.

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
| `Shift-p` | open the database panel (when connected to a database)   |

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
