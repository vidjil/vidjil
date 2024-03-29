## Encoding clones with V(D)J recombinations with `.vidjil` files

The following [.json](http://en.wikipedia.org/wiki/JSON) format (2016b) allows to
encode a set of clones (formally, clonotypes) with V(D)J immune recombinations,
possibly with user annotations.

In Vidjil, this format is used by both the `.analysis` and the `.vidjil` files.
The `.vidjil` file represents the actual data on clones (and that can
reach megabytes, or even more), usually produced by processing reads by some RepSeq software.
(for example with detailed information on the 100 or 1000 top clones).
The `.analysis` file describes customizations done by the user
(or by some automatic pre-processing) on the Vidjil web application. The web application
can load or save such files (and possibly from/to the patient/sample database).
It is intended to be very small (a few kilobytes).
All settings in the `.analysis` file override the settings that could be
present in the `.vidjil` file.

## What is a clone ?

There are several definitions of what may be a clonotype,
depending on different RepSeq software or studies.
This format accept any kind of definition:
Clonotypes are identified by a `id` string that may be an arbitrary identifier such as `clone-072a`.
Software computing clonotypes may choose some relevant identifiers:

  - `CGAGAGGTTACTATGATAGTAGTGGTTATTACGGGGTAGGGCAGTACTAC`, Vidjil algorithm, 50 nt window centered on the CDR3
  - `CARPRDWNTYYYYGMDVW`, a CDR3 AA sequence
  - `CARPRDWNTYYYYGMDVW IGHV3-11*00 IGHJ6*00`, a CDR3 AA sequence with additional V/J gene information (MiXCR)
  - the 'clone sequence' as computed by the ARReST in `.clntab` files (processed by `fuse.py`)
  - see also 'IMGT clonotype (AA) or (nt)'

## Examples

### `.vidjil` file – one sample

This is an almost minimal `.vidjil` file, describing clones in one sample.
The `seg` element is optional: clones without `seg` elements will be shown on the grid with '?/?'.
The `_average_read_length` is also optional, but allows to plot GENSCAN-like plots more precisely than getting only the length of the sequence.
All other elements are required. The `reads.germlines` list can have only one element the case of data on a unique locus.
There is here one clone on the `TRG` locus with a designation (`name`) `TRGV5*01 5/CC/0 TRGJ1*02`.
Note that this `name` is just used to name the clone.
The actual values used for X- and Y- axis in the V/J grid plot are `seg.5.name` and `seg.3.name` fields.
Note that other elements could be added by some program (such as `tag`, to identify some clones,
or `clusters`, to further cluster some clones, see below).

<!-- tangle: analysis-example1.vidjil -->
``` javascript
{
    "producer": "program xyz version xyz",
    "timestamp": "2014-10-01 12:00:11",
    "vidjil_json_version": "2016b",

    "samples": {
         "number": 1, 
         "original_names": ["T8045-BC081-Diag.fastq"]
    },

    "reads" : {
        "total" :           [ 437164 ] ,
        "segmented" :       [ 335662 ] ,
        "germline" : {
            "TRG" :         [ 250000 ] ,
            "IGH" :         [ 85662  ]
        },
        "clones": {
          "TRG" :         [ 2500 ],
          "IGH" :         [ 856  ]
        }
    },

    "clones": [
        {
            "id": "clone-001",
            "name": "TRGV5*01 5/CC/0 TRGJ1*02",
            "sequence": "CTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGCCTTATTATAAGAAACTCTTTGGCAGTGGAAC",
    "reads" : [ 243241 ],
            "_average_read_length": [ 119.3 ],
            "germline": "TRG",
            "top": 1,
            "seg":
            {
        "5": {"name": "TRGV5*01",  "start": 1,   "stop": 87, "delRight":5},
        "3": {"name": "TRGJ1*02",  "start": 89,  "stop": 118,   "delLeft":0},
                "cdr3": { "start": 78, "stop": 105, "seq": "gccacctgggccttattataagaaactc" }
    }

        }
    ]
}
```

### `.vidjil` file – several related samples

This a `.vidjil` file obtained by merging with `fuse.py` two `.vidjil` files corresponding to two samples.
Clones that are from different files but that have a same `id` are gathered (see 'What is a clone?', above).
It is the responsibility of the program generating the initial `.vidjil` files to choose these `id` to
do a correct gathering.

<!-- tangle: analysis-example2.vidjil -->
``` javascript
{
    "producer": "program xyz version xyz / fuse.py version xyz",
    "timestamp": "2014-10-01 14:00:11",
    "vidjil_json_version": "2016b",

    "samples": {
         "number": 2, 
         "original_names": ["T8045-BC081-Diag.fastq", "T8045-BC082-fu1.fastq"],
         "timestamp": [
           "2019-12-17 17:49:22",
           "2019-12-27 17:50:04"
         ]
    },

    "reads" : {
        "total" :           [ 437164, 457810 ] ,
        "segmented" :       [ 335662, 410124 ] ,
        "germline" : {
            "TRG" :         [ 250000, 300000 ] ,
            "IGH" :         [ 85662,   10124 ]
        },
        "clones": {
          "TRG" :         [ 2500, 3000 ] ,
          "IGH" :         [ 856,   101 ]
        }
    },

    "clones": [
        {
            "id": "clone-001",
            "sequence": "CTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGCCTTATTATAAGAAACTCTTTGGCAGTGGAAC",
            "reads" : [ 243241, 14717 ],
            "germline": "TRG",
            "top": 1,
            "seg":
            {
                "5": {"name": "TRGV5*01",  "start": 1,  "stop": 87,  "delRight": 5},
                "3": {"name": "TRGJ1*02",  "start": 89, "stop": 118, "delLeft":  0},
                "quality": {
                  "start": 1,
                  "stop": 118,
                  "seq": "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!TAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGCCTTATTATAAGA!!!!!!!!!!!!!!!!!!!"
                }
           }
        },
        {
            "id": "clone2",
            "sequence": "GATACA",
            "reads": [ 153, 10221 ],
            "germline": "TRG",
            "top": 2
        },
        {
            "id": "clone3",
            "sequence": "ATACAGA",
            "reads": [ 521, 42 ],
            "germline": "TRG",
            "top": 3,
            "seg":
            {
                "5": {"start": 1, "stop": 100},
                "3": {"start": 101, "stop": 200}
            }
        },
        {
            "id": "seqedited_in_analysis",
            "name": "name_seqedited_in_analysis",
            "sequence": "AAAAATTTTTAAAAATTTTTAAAAATTTTT",
            "reads": [ 521, 42 ],
            "germline": "TRG",
            "top": 4,
            "seg":
              {
                  "cdr3": {"start": 10, "stop": 20}
              }
        },
        {
            "id": "clone5",
            "name": "clone_showOnlyOneSample",
            "sequence": "GATACAaaaaaccccc",
            "reads": [ 1021, 0 ],
            "germline": "TRG",
            "top": 5
        },
        {
            "id": "clone_cluster1",
            "name": "clone_cluster1",
            "sequence": "GATACAaaaaaccccc",
            "reads": [ 1021, 0 ],
            "germline": "TRG",
            "top": 6
        },
        {
            "id": "clone_cluster2",
            "name": "clone_cluster2",
            "sequence": "AAAAATTTTTAAAAATTTTTAAAAATTTTT",
            "reads": [ 521, 42 ],
            "germline": "TRG",
            "top": 7,
            "seg":
              {
                  "cdr3": {"start": 10, "stop": 20}
              }
        }
    ]
}
```

#### `.vidjil` file - pre process data

If a pre process has been used to produce a file in the pipeline its data can be fused into the .vidjil file.

``` javascript
{
    "producer": "program xyz version xyz",
    "timestamp": "2014-10-01 12:00:11",
    "vidjil_json_version": "2016b",

    "samples": {
         "number": 1,
         "original_names": ["T8045-BC081-Diag.fastq"],
         "pre_process": {
             "stats": {
                 ...
             },
             "parameters": {
                 ...
             }
         }
    },

    "reads" : {
        "total" :           [ 437164 ] ,
        "segmented" :       [ 335662 ] ,
        "germline" : {
            "TRG" :         [ 250000 ] ,
            "IGH" :         [ 85662  ]
        },
        "clones": {
          "TRG" :         [ 2500 ],
          "IGH" :         [ 856  ]
        },
        "merged" :          [ 437164 ]
    },

    "clones": [
        {
            "id": "clone-001",
            "name": "TRGV5*01 5/CC/0 TRGJ1*02",
            "sequence": "CTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGCCTTATTATAAGAAACTCTTTGGCAGTGGAAC",
    "reads" : [ 243241 ],
            "_average_read_length": [ 119.3 ],
            "germline": "TRG",
            "top": 1,
            "seg":
            {
        "5": {"name": "TRGV5*01",  "start": 1,   "stop": 87, "delRight":5},
        "3": {"name": "TRGJ1*02",  "start": 89,  "stop": 118,   "delLeft":0},
                "cdr3": { "start": 78, "stop": 105, "seq": "gccacctgggccttattataagaaactc" }
    }

        }
    ]
}
```

### `.analysis` file

This file reflects the annotations a user could have done within the Vidjil web application or some other tool.
She has manually set sample names (`names`), tagged (`tag`, `tags`), named (`name`) and clustered (`clusters`)
some clones, and added external data (`data`).

<!-- tangle: analysis-example2.analysis -->
``` javascript
{
    "producer": "user Bob, via Vidjil webapp",
    "timestamp": "2014-10-01 12:00:11",
    "vidjil_json_version": "2016b",

    "samples": {
    "id": [
      "T8045-BC081-Diag.fastq",
      "T8045-BC082-fu1.fastq"
    ],
         "number": 2, 
         "names": ["diag", "fu1"],
         "order": [1, 0],
         "stock_order": [1, 0]
    },

    "clones": [
        {
            "id": "clone-001",
            "name": "Main ALL clone",
            "tag": "0"
        },
        {
            "id": "spikeE",
            "label": "spike",
            "sequence": "ATGACTCTGGAGTCTATTACTGTGCCACCTGGGATGTGAGTATTATAAGAAAC",
            "tag": "3",
            "expected": "0.1"
        },
        {
            "id": "seqedited_in_analysis",
            "segEdited": true,
            "germline": "TRG",
            "sequence": "GGGGGCCCCCGGGGGCCCCCGGGGGCCCCCGGGGGCCCCCAAAAATTTTTAAAAATTTTTAAAAATTTTT",
            "reads": [ 521, 42 ],
            "seg":
              {
                  "cdr3": {"start": 50, "stop": 60}
              }
        },
        {
            "id": "seqedited_new_locus",
            "segEdited": true,
            "germline": "IGH+",
            "name": "clone_with_new_locus"
        }

    ],

    "clusters": [
        [ "clone3", "clone2"],
        [ "clone_cluster2", "clone_cluster1"],
        [ "clone-5", "clone-10", "clone-179" ]
    ],

    "data": {
         "qPCR": [0.83, 0.024],
         "spikeZ": [0.01, 0.02]
    },

    "tags": {
        "names": {
            "0" : "main clone",
            "3" : "spike",
            "5" : "custom tag"
        },
        "hide": [4, 5]
    }
}
```

The `stock_order` and `order` fields define the order in which the points should be considered.

* `stock_order` contains the order for all the existing samples and thus remembers positions of each samples, hidden or not.
* `order` only remembers the currently shown samples.

In the example above we should first consider the second point (whose `name`
is *fu1)* and the point to be considered in second should be the first one in
the file (whose `name` is *diag*).
If `order` value was `[1]`, only the second sample would be shown and the first would be hidden.
In such a case `stock_order` should still contain two values.

The `clusters` field indicate clones (by their `id`) that have been further clustered.
Usually, these clones were defined in a related `.vidjil` file (as *clone2* and *clone3*,
see the `.vidjil` file in the previous section). If these clones do not exist, the clusters are
just ignored. The first item of the cluster is considered as the
representative clone of the cluster.

## Detailed specification

### Generic information for traceability \[required\]

``` javascript
"producer": "my-repseq-software -z -k (v. 123)",    // arbitrary string, user/software/version/options producing this file [required]
"timestamp": "2014-10-01 12:00:11",                 // last modification date [required]
"vidjil_json_version": "2016b",                     // version of the .json format  [required]
```

## Statistics: the `reads` element \[.vidjil only, required\]

The number of reads with detected recombinations (`segmented`)
may be higher than the sum of the read number of all clones,
when one choose to report only the 'top' clones (`-t` option for fuse).

``` javascript
{
    "total" : [],          // total number of reads per sample (with samples.number elements)
    "segmented" : [],      // number of reads with detected recombinations per sample (with samples.number elements)
    "germline" : {         // number of reads with detected recombinations per sample/germline (with samples.number elements)
        "TRG" : [],
        "IGH" : []
    }
}
```

### `samples` element \[required\]

``` javascript
{
  "number": 2,      // number of samples [required]

  "original_names": [],  // original sample names (with samples.number elements) [required]

  "names": [],      // custom sample names (with samples.number elements) [optional]
                    // These names are editable and will be used on the graphs

  "order": [],      // custom sample order (lexicographic order by default) [optional]


  // traceability on each sample (with sample.number elements)
  "producer": [],
  "timestamp": [],
  "log": []
}
```

### `clones` list, with read count, tags, V(D)J designation and other sequence features

Each element in the `clones` list describes properties of a clone.

In a `.vidjil` file, this is the main part, describing all clones.
In the `.analysis` file, this section is intended to describe some specific clones.

``` javascript
 {
   "id": "",        // clone identifier, must be unique [required] [see above, 'What is a clone ?']
                    // the clone identifier in the .vidjil file and in .analysis file must match

   "germline": ""   // [required for .vidjil]
                    // (should match a germline defined in germline/germline.data)

   "name": "",      // clone custom name [optional]
                    // (the default name, in .vidjil, is computed from V/D/J information)

   "label": "",     // clone labels, separed by spaces [optional]
                    // These labels may add some information entered with a controled vocabulary

   "sequence": "",  // reference nt sequence [required for .vidjil]
                    // (for .analysis, not really used now in the web application,
                    //  for special clones/sequences that are known,
                    //  such as standard/spikes or know patient clones)

   "tag": "",       // tag id from 0 to 7 (see below) [optional]

   "expected": ""   // expected abundance of this clone (between 0 and 1) [optional]
                    // this will create a normalization option in the 
                    // settings web application menu

   "seg":           // detailed V(D)J designation/segmentation and other sequences features or values [optional]
                    // on the web application, clones that are not detected will be shown on the grid with '?/?'
                    // positions are related to the 'sequence'
                    // names of V/D/J genes should match the ones in files referenced in germline/germline.data
                    // Positions on the sequence start at 1.
     {
        "5": {"name": "IGHV5*01", "start": 1, "stop": 120,  "delRight": 5},    // V (or 5') segment
        "4": {"name": "IGHD1*01", "start": 124, "stop": 135, "info": "unsure designation",  "delRight": 5, "delLeft": 0},  // D (or middle) segment
                    // Recombination with several D may use "4a", "4b"...
        "3": {"name": "IGHJ3*02", "start": 136, "stop": 171,  "delLeft": 5},  // J (or 3') segment

                    // Any feature to be highlighted in the sequence.
                    // All those fields are optional (though some minor feature may not properly work in the client)
                    //  - "start"/"stop" : positions on the clone sequence (starting at 1)
                    //  - "delLeft/delRight" : a numerical value . It is the numbers of nucleotides deleted during the rearrangment. DelRight are compatible with V/5 and D/4 segments, delLeft is compatible with D/4 and J/3 segments.
                    //  - "seq" : a sequence
                    //  - "val" : a numerical value
                    //  - "info" : a textual vlaue

        "somefeature": { "start": 56, "stop": 61, "seq": "ACTGTA", "val": 145.7, "info": "analyzed with xyz" },

                    // Numerical or textual features concerning all the sequence or its analysis (such as 'evalue')
                    // can be provided by omitting "start" and "stop" elements.
        "someotherfeature": {"val": 0.004521},
        "anotherfeature": {"info": "VH CDR3 stereotypy"},

                    // JUNCTION//CDR3 should be stored that way (in fields called "junction" or "cdr3"),
                    // Its productivity must be stored in a boolean field called "productive".
                    // When the sequence is not productive, the "unproductive" field may contain the reason (mainly "stop-codon" or "out-of-frame")
                    // "seq" field should not be filled for cdr3 or junction (it is extracted from the sequence itself).
                    // However a "aa" field may be used to give the amino-acid translation of the cdr3 or junction.
        "junction": { "start": 41, "stop": 82, "aa": "CATWDRKNYYKKLF", "productive": false, "unproductive": "stop-codon" },
     }


   "reads": [],      // number of reads in this clones [.vidjil only, required] 
                     // (with samples.number elements)

   "_average_read_length": [],
                     // Average read length of the reads clustered in this clone.
                     // This value allows to draw a genescan-like plot.
                     // (with samples.number elements)

   "top": 0,         // (not documented now) [required] threshold to display/hide the clone
   "stats": []       // (not documented now) [.vidjil only] (with sample.number elements)


}
```


### `distributions`: providing statistics on full clonal populations

In some situations, one would like to represent whole distributions of clones
according to "axes" such as V/J distribution or length.
It is possible to specify in the `.vidjil` file such `"distributions"`
without detailing the full list of clones, hence keeping a relatively small file
and enabling fast post-processing or visualizations.

In the example below, 5 clones (totaling 6 reads) have a length of 223.
Distributions can be on several axes, like both V/J (here seg3/seg5).

``` javascript
{
    "distributions":
    {
        "keys": ["clones", "reads"],
        "repertoires": {
            "sample_42": [
                {
                    "axes": ["lenSeqAverage"],
                    "values": { "223": [5, 6], "232": [1, 7], "260": [5, 20] }
                },
                {
                    "axes": ["seg3", "seg5"],
                    "values": {
                         "IGHJ3": {"IGHV4-39": [5, 20]},
                         "IGHJ4": {"IGHV3-23": [1, 7], "IGHV3-64": [1, 1]},
                         "IGHJ6": {"IGHV1-24": [2, 3], "IGHV1-8": [2, 2]}
                       }
                }]
              }
       }
     }
   }
```

Distributions from a `.vidjil` files can be computed by `tools/fuse.py`, 
giving the desired list of distributions
through the `-d` option. For the above example, run:

```bash
python fuse.py -d lenSeqAverage -d seg3,seg5 sample_42.vidjil
```

The command `fuse.py -l` yields the list of available axes,
but currently only `lenSeqAverage` and `seq3,seq5` are supported.
Adding axes can be done trough in `get_values()` in `tools/fuse.py`.
Note that axes should also be added to `browser/js/axis_conf.js` to be displayed in the client.


### `germlines` list \[optional\]\[work in progress, to be documented\]

Extend the `germline.data` default file with a custom germline.

``` javascript
"germlines" : {
    "custom" : {
        "shortcut": "B",
        "5": ["TRBV.fa"],
        "4": ["TRBD.fa"],
        "3": ["TRBJ.fa"]
    }
}
```

### `MRD data` \[optional\]\[work in progress, to be documented\]

Vidjil offers support for the use of spike-ins to serve as a yardstick
to obtain copy numbers from read counts, with the goal of estimating
Minimal Residual Disease (MRD) values.  To use this feature, users
should:

  - add spike-ins in known copy numbers in their lab preps
  - inform `vidjil-algo` the sequences and copy numbers of these spike-ins
  - add a pre-processing step in the analysis configuration to insert
    the normalized values (MRD estimations) into the `vidjil` file

The web application can then take the info from the `vidjil` file and
display it.

To inform `vidjil-algo` of the spike-in sequences and copy numbers, a
file in JSON format must be created, as in the following example:

```javascript
{
  "config": {
    "labels": [
      {
        "name": "spike-1",
        "copies": "10",
        "sequence": "GGAACTGGGCCTGGGGATACGGAAATATCGGTACACCGATAAAC",
        "family": "TRDV1"
      },
      {
        "name": "spike-2",
        "copies": "40",
        "sequence": "GGGAATACCTCGGTGCGGTGGGGGATCCCAAGACCCCCCTCTACACCGATAA",
        "family": "TRDV1"
      },
      {
        "name": "spike-3",
        "copies": "160",
        "sequence": "GCTCTTGGGGTGCATCAGTCCATGACCCACCGATAAACTCATC",
        "family": "TRDV1"
      }
    ]
  }
}
```

and given to `vidjil-algo` by means of the flag `--label-json
spikes.json`.  Notice that the family of each spike-in must be
informed as well, because it has been determined that performing the
procedure within a family yields better results
(https://doi.org/10.1111/bjh.16571).

For the pre-processing step, Vidjil offers a script called
`spike-normalization.py`, so one can add a line such as the following
one to the `Fuse command:` field in the analysis config:

```javascript
-t 100 --pre spike_normalization.py
```

The `spike-normalization.py` script is responsible for collecting read
counts for the spike-ins, combining them with their copy numbers, and
computing normalized values from the read counts of other clones in
the same family.  If a family does not have at least 3 spike-ins, or
if its linear regression's Person R2 coefficient is below 0.8, a
universal normalization is used instead.  The universal normalization
takes into consideration all spike-ins from all families.

With this, the Vidjil web interface will show a normalized value,
intended as an estimate of the MRD value, instead of the usual read
percentage for each clone.  To switch between displaying normalized
values or read percentages, the corresponding option in the setting
menu can be used.

Only clones from the prevalent germline, that is, the germline with
more reads in the sample, are normalized by this process.

The information flow of normalization is as follows.  The
post-analysis script `tools/spike-normalization.py` writes multiple
data fields in the `vidjil` file.  Part of the info is set into an
`mrd` field, and contains data for each sample.  
```javascript
"mrd": {
  "coefficients": {
    "IGHV5": 0.15380390002746497,
    "UNI": 0.15380390002746497,
    "IGHV1": 0.15380390002746497
  },
  "UNI_R2": [
    0.964285714285714
  ],
  "ampl_coeff": [
    64.89233726998077
  ],
  "prevalent": [
    "IGK"
  ]
}
```

The item `coefficients`, one per family, contains the coefficients that
multiplied by a read count will yield a normalized value.  Here, `UNI`
stands for the universal coefficient, based on all spike-ins.  Field
`UNI_R2` shows the Pearson R2 coefficient of the linear regression for
the universal coefficient.  Field `ampl_coeff` contains the ratio
between the total number of reads captured by Vidjil and spike-in
reads.  Although not used in calculations, it is an important
parameter to assess the quality of the sample.  If spike-ins reads
make up too large a fraction of the entire collection, this can lead
to distortions.  Finally, `prevalent` indicates the prevalent germline
in the sample.

The remaining set of fields is set into each clone, under key `mrd`,
and are arrays containing one value per time point.

```javascript
"clones": [
  {
    ...
    "mrd": {
      "R2": [ 0.95 ],
      "copy_number": [ 41.37324910738808 ],
      "family": [ "UNI" ],
      "norm_coeff": [ 0.11118547904332683 ]
    },
    "normalized_reads": [ 195.50763372699805 ]
  }
]
```

Here, field `R2` indicates the Pearson R2 coefficient for the linear
regression used in this clone; `copy_number` is the estimated copy
number of this clone, obtained by mutiplying this clone's coefficient
by its read count; `family` is the clone family; and
`normalized_reads` is the estimated value of MRD for this clone.

TODO: COMMENTS?

### Further clustering of clones: the `clusters` list \[optional\]

Each element in the 'clusters' list describe a list of clones that are 'merged'.
In the web application, it will be still possible to see them or to unmerge them.
The first clone of each line is used as a representative for the cluster.

### `data` list \[optional\]\[work in progress, to be documented\]

Each element in the `data` list is a list of values (of size samples.number)
showing additional data for each sample, as for example qPCR levels or spike information.

In the browser, it will be possible to display these data and to normalize
against them (not implemented now).

### Tagging some clones: `tags` list \[optional\]

The `tags` list describe the custom tag names as well as tags that should be hidden by default.
The default tag names are defined in [../browser/js/vidjil-style.js](http://gitlab.vidjil.org/-/blob/master/browser/js/vidjil-style.js).

``` javascript
"key" : "value"  // "key" is the tag id from 0 to 7 and "value" is the custom tag name attributed
```
