

# Germline genes

Vidjil-algo can use [algo.md#custom-germlineg-presets](custom germline presets).
This developer documentation focuses on updating or adding the *default* germline files.

The germlines are compiled with `germline/split-germlines.py`.
They come from various sources:
 - [IMGT/GENE-DB](http://www.imgt.org/download/GENE-DB/). 
   See in particular the [data updates](http://www.imgt.org/IMGTgenedbdoc/dataupdates.html)
 - Genomic sequences through the [NCBI E-utilities API]
 - A few static files

It is advised to regularly retrieve the new sequences. 
However doing so may break some tests and requires some time and to fix things by hand.

### On a `feature-g/` branch

We first prepare germlines on a `feature-g` branch.
First you need to retrieve the new germlines.
From the `germline/` directory of Vidjil:

  - run `make get-all-data`
  - run `make diff-from-saved` to see what changed since the previous release
    Take inspiration from this diff to write an insightful commit message.
  - when we add new features/germline pre-processing, we add tests to `germline/tests`

It is also advised to work on tests on the algorithm (see below), but, at this stage, this is not enforced.

When a pipeline from a `feature-g` succeeds, a `.tar.gz` is uploaded to <www.vidjil.org/germlines>
with an id such as `2021-01-21`.

### On a `feature-a/` branch

- Put the new germline id in `germline/germline_id` (and also in `germline/homo_sapiens.g`)
- Then `make germline` will retrieve from <www.vidjil.org/germlines> the new germlines

- From the root directory, run a `make test` and possibly update the tests
  (and possibly `make diff-from-saved`)

### 10-md5-germlines.should

You also have to generate the md5 of the germline data. For that purpose:

``` bash
# To be launched in the germline directory
rm -f ../algo/tests/should-get-tests/10-md5-germline.should

echo > ../algo/tests/should-get-tests/10-md5-germline.should
echo "$ Check md5 in germline/, sequences split and processed from germline and other databases" >> ../algo/tests/should-get-tests/10-md5-germline.should
md5sum */???[VDJ].fa | sed -r 's/^/1:/;s/\s+/ /g;' | sort -k 2 >> ../algo/tests/should-get-tests/10-md5-germline.should 
echo >> ../algo/tests/should-get-tests/10-md5-germline.should

echo "$ Check md5 in germline/, other sequences" >> ../algo/tests/should-get-tests/10-md5-germline.should
md5sum */CD*.fa */???[VDJ]+{up,down}.fa */IGK-*.fa */TRDD[23]*.fa */IG*=*.fa | sed -r 's/^/1:/;s/\s+/ /g;' | sed "s/[+]/./" | sort -k 2 >> ../algo/tests/should-get-tests/10-md5-germline.should

# Then check the differences with 'git diff' and/or use 'git commit -p'
```

On some systems, `md5sum` should be replaced by `md5 -r`.
