
# `fuse.py` : converting and merging immune repertoire data

## Merging files to follow clones in several samples

Many immune repertoire sequencing studies aim to track clones in several samples.
One can compare repertoires from several samples coming from a same person or different ones,
and detect and quantify common clones.
For example in a minimal residual disease (MRD) setup, we are interested in
following the main clones identified at diagnosis in the following samples.

Let assume that four `.vidjil` files have been produced for each sample
(namely `diag.vidjil`, `fu1.vidjil`, `fu2.vidjil`, `fu3.vidjil`), merging them will
be done in the following way:

``` bash
python tools/fuse.py --output mrd.vidjil --top 100 diag.vidjil fu1.vidjil fu2.vidjil fu3.vidjil
```

The `--top` parameter allows to choose how many top clones per sample should
be kept. The default value is 50. Here `--top 100` means that for each sample, the top 100 clones are kept
*and followed in the other samples*, even if it is not in the top 100 of the other samples.
This allows to follow and quantify targeted clones even when there have only a few reads in some samples.

The `mrd.vidjil` file can then be fed to the web client.


## Using AIRR data

The AIRR community has published [a standard representation](http://docs.airr-community.org/en/latest/datarep/overview.html#format-specification) to describe results of immune receptor repertoire analysis.
Used by an increasing number of software, this `.tsv` format allows to easily transfer immune repertoire data between pipelines.

The [AIRR output of vidjil-algo](vidjil-algo/#airr-tsv-output) enables to feed vidjil-algo output to other software.
Conversely, `fuse.py` is able to take one or several AIRR `.tsv` file(s) to get a `.vidjil` file that can be opened by the Vidjil web application:

``` bash
python tools/fuse.py --output out.vidjil sample1.tsv sample2.tsv
```
For a same analysis, you can mix `.vidjil` and AIRR files.

However, the following points should be taken into account:

- The Vidjil web application uses the `duplicate_count` value for each clone in a `.tsv` file
  as the size of each clone. This was discussed on the AIRR mailing list, but other software may use other fields.
  Note that the AIRR output of `vidjil-algo` uses the same convention. 

- Some RepSeq software (such as IgBlast) do not cluster clones at all but only analyze independently each read.
  As `fuse.py` does not add clustering information, the output of these software will be also shown unclustered in the Vidjil web application.

- More generally, RepSeq software have various definitions of clones (see [What is a clone ?](vidjil-format/#what-is-a-clone)).
  When processed with `fuse.py`, clones across several samples will be identified when they share the same `clone_id` value.
  When merging data from different samples, one must ensure that the software outputs relevant `clone_id` to mark these very same clones,
  otherwise they would appear as unrelated in the web application (but they can still be clustered there).
  This will also often be the case when merging files coming from different software.

   


