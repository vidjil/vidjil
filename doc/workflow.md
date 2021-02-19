
# Post-sequencer workflow before upload to a Vidjil server

This help is intended for bioinformaticians preparing workflows after their sequencer output.
See also considerations on [libraries and recombinations](locus.md).

## File formats

It is recommended to upload `.fastq.gz` files to the Vidjil server.
Indeed, vidjil-algo takes into account the quality information in the output of the representative sequence.

When the base quality is not available, it is also possible to upload `fa.gz` files.
Note that vidjil-algo (and the Vidjil server) also accept uncompressed `.fastq` or `.fa` files
and even `.bam` files (but the added information of `.bam` files is not taken into account,
so uploading such files is not optimal).


## Local pre-filtering of large datasets

On large capture or RNA-seq datasets, very few reads, are expected to have V(D)J recombinations, typically as few as 0.01%, 0.001%, or even 0.0001%. Vidjil-algo was designed to efficiently find such a few needles in a stack of needles.

Large files may be hard to upload and to store. 
To save bandwidth and disk space, it is thus advised to locally pre-process reads 
to merge them (when applicable) and to filter them, with a first iteration of Vidjil-algo, 
before uploading to a Vidjil server. 
This filtering will produce much smaller files that could also be used by other software.

We offer two versions:

- The latest stable version, `vidjil-algo-latest`, which is in production for clinical applications.
- Tha alpha version, `vidjil-algo-alpha`, that provides at least 5× speed-up on multiple locus filtering.
Sensibility should be equivalent or even better than with the stable version.
Work is underway to release this version for production.

### Installation

**Install `vidjil-algo`**

 - Requirements ([more documentation](vidjil-algo.md#installation)): on a recent Ubuntu system, `sudo apt-get install zlib1g-dev`
 - Download and extract <http://www.vidjil.org/releases/vidjil-algo-latest.tar.gz>  or <http://www.vidjil.org/releases/vidjil-algo-alpha.tar.gz>
 - Inside `vidjil-algo-...` directory, build it with `make`
   (it boths compile `vijdil-algo` and fetches the `germline/` directory, with germlines genes repertoires created from IMGT and NCBI)

**Install `flash2`**

  - Download and extract <https://github.com/dstreett/FLASH2/archive/master.zip>
  - Inside `FLASH2-master` directory, build it with `make`

You may copy `vidjil-algo` and `flash2`  binaries to folders available from your `$PATH`.

### Usage

`flash2` outputs several files: merged reads, unmerged reads from R1 file, unmerged reads from R2, and histogram.
You can concatenate merged reads and one of the unmerged files 
to keep the same number of reads that in the inital fastq file
(as the [pre-processing](user.md#pre-processing) on the Vidjil server). 
The following command line thus keeps `out.notCombined_1`, from R1, 
supposing that R1 reads are "more centered" on the V(D)J junction than R2 reads.

Starting from `R1.fastq` and `R2.fastq` (`flash2` only works with `.fastq` files):

 - Merge:  `flash2   R1.fastq R2.fastq -M 300 -t 4 -z`   (`-t 4` : run on 4 threads)
 - Concatenate the files you want to keep, as for example  `cat out.extendedFrags.fastq  out.notCombined_1.fastq.gz > merged-reads.fastq.gz`
 - Filter:  `vidjil-algo --filter-reads --gz -g germline/homo-sapiens.g merged-reads.fastq.gz`
   (`germline/` is the path to the gene repertoires directory, in `vidjil-algo-.../`)

The resulting `merged-reads.detected.vdj.fa.gz` file can be uploaded on any Vidjil server,
or re-analyzed with `vidjil-algo` or with other software.

Once the filtering has begun, interrupting `vidjil-algo` with `Ctrl-C` (`SIGINT`) gracefully stops execution while still producing (partial) files.
It can be used to check how the filtering works before a full run.
