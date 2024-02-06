[![](https://gitlab.inria.fr/vidjil/vidjil/badges/dev/build.svg)](https://gitlab.inria.fr/vidjil/vidjil/tree/dev)
[![](http://img.shields.io/badge/license-GPLv3+-green.svg)](http://opensource.org/licenses/GPL-3.0)
[<https://landscape.io/github/vidjil/vidjil/master/landscape.svg?style=flat>](https://landscape.io/github/vidjil/vidjil)

V(D)J recombinations in lymphocytes are essential for immunological
diversity. They are also useful markers of pathologies, and in
leukemia, are used to quantify the minimal residual disease during
patient follow-up.
High-throughput sequencing (NGS/HTS) now enables the deep sequencing
of a lymphoid population with dedicated [Rep-Seq](http://omictools.com/rep-seq-c424-p1.html) methods and softwares.

The Vidjil platform contains three components.
Vidjil-algo processes high-througput sequencing data to **extract V(D)J
junctions and gather them into clones**. Vidjil-algo starts
from a set of reads and detects "windows" overlapping the actual CDR3.
This is based on an fast and reliable seed-based heuristic and allows
to output all sequenced clones. The analysis is extremely fast
because, in the first phase, no alignment is performed with database
germline sequences.

The Vidjil **web application** is made for the interactive visualization and
analysis of clones and their tracking along the time in a MRD setup or
in a immunological study. The web application can visualize data processed by
the Vidjil algorithm or by other V(D)J analysis pipelines, and
enables to explore further cluterings proposed
by software and/or done manually done by the user.
The web application can be linked to a **sample, experiment and patient database**
able to store sequencing data and metadata, to run RepSeq software
and to save annotations directly from the web application, with authentication.
Clinicians or researchers in immunology or hematology
can manage, upload, analyze and annotate their runs directly on the web applicaiton.

# Vidjil components

## Vidjil-algo

  - Stable releases can be downloaded from <http://bioinfo.lille.inria.fr/vidjil> and <http://www.vidjil.org/releases>
  - Development code is under *algo/*
  - Documentation, compilation and installation instructions: *doc/vidjil-algo.md*

## The web application

  - Public test server at <https://app.vidjil.org/> (demo login: `demo@vidjil.org`, password: `vidjil`)
  - Please contact us if you would like to test your data and have a full account on the web server
  - We offer hosting solutions for [healthcare compliance](http://www.vidjil.org/doc/healthcare/)
  - Development code is under *browser/* and *server/* (a `make` in those directories
    will get the necessary files)
  - Documentation is in *doc/*, it is also available from <http://www.vidjil.org/doc>

# Code and license

Vidjil is open-source, released under GNU GPLv3 license.
You are welcome to redistribute it under [certain conditions](http://git.vidjil.org/blob/master/LICENSE).
This software is for research use only and comes with no warranty.

The development code is available on <http://gitlab.vidjil.org/>.
Bug reports, issues and patches are welcome.

# Donations

We welcome Bitcoin donations to [13u12m6LxVhesKEpS6T5wpYN19LHpwk8xt](bitcoin:13u12m6LxVhesKEpS6T5wpYN19LHpwk8xt).
Thank you for your support \!

# The Vidjil team

Vidjil is developed and maintained by
the [Bonsai bioinformatics lab](http://cristal.univ-lille.fr/bonsai) at CRIStAL (UMR CNRS 9189, Université Lille)
and the [VidjilNet consortium](http://www.vidjil.net) at Inria.
See [doc/credits.md](doc/credits.md) for the full list of contributors, collaborators, and funders.

Contact: Marc Duez, Florian Thonier, [Mathieu Giraud and Mikaël Salson](mailto:contact@vidjil.org).

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

The Vidjil platform has been utilised in [35+ publications](doc/credits.md#some-publications-using-vidjil) in oncology, hematology, and immunology.
