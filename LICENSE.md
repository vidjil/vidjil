
# Vidjil: open-source and licenses

Vidjil is open-source, released under GNU GPLv3+ license.
You are welcome to redistribute it under [certain conditions](http://git.vidjil.org/blob/master/doc/LICENSE).
This software is for research use only and comes with no warranty.

The development code is available on <http://gitlab.vidjil.org/>.
Bug reports, issues and patches are welcome.

# Licenses for third-party software and databases

Vidjil provide ready-to-use docker containers for a full client/server web application.
See instructions on <http://www.vidjil.org/doc/server/#docker-installation>.
The containers include third-party software and libraries under open-source licenses.

Moreover, they allow to download and use germline sequences and other sequences originating from both NCBI and IMGT/GENE-DB.
For this, you should in particular comply to IMGT conditions (free for academic and non-profit usage).

## vidjil-algo

### Software and libraries included in Vidjil repository

**CLI11**               : Command line parser for C++11

* @version          2.1.2 (2021-10-18)
* @author           Henry Schreiner, Philip Top, and collaborators
* @link             <https://github.com/CLIUtils/CLI11>
* @license          BSD

**gzstream**           : iostream classes wrapping the zlib compression library

* @version          1.7 (2003, last available version as of 2022)
* @author           Deepak Bandyopadhyay, Lutz Kettner
* @link             <http://www.cs.unc.edu/Research/compgeom/gzstream/>
* @license          LGPL

**json**                : JSON for Modern C++

* @version          3.10.5 (2022-01-03)
* @author           Niels Lohmann
* @link             <https://github.com/nlohmann/json>
* @license          MIT

**unbam (htslib)**      : Extract of htslib to only read BAM files

* @version          ?? (<⁼ 2017)
* @link             <http://www.htslib.org/>
* @license          Modified BSD

## vidjil-client

### Software and libraries included in Vidjil repository

**bioseq.js**           : fast and lightweight javascript library for affine-gap local and banded global pairwise alignment (Smith-Waterman)

* @version          d8adcf1 (2019-08-08)
* @author           Heng Li (lh3)
* @link             <https://github.com/lh3/bioseq-js>
* @license          MIT

**d3-v3**		        : framework svg

* @version          5.14.1 (2019)
* @author           Michael Bostock
* @link             <http://d3js.org/>
* @license          BSD

**jQuery**		        : fast, small, and feature-rich JavaScript library

* @version          3.3.1 (2018-01-20)
* @author           John Resig and jQuery team
* @link             <http://jquery.org>
* @license          MIT
* @compatibility    IE 9+, Chrome (x-1)+, Firefox (x-1)+, Safari (x-1)+, Opera x+
x is "current version" at time of release
=> 2.1.1:
=> 3.x:

**file.js**  		    : load/save cross-navigator

* @version          (<= 2014)
* @author           Eli Grey
* @link             <http://eligrey.com>
* @license          MIT

**jstree**              : distant file explorator

* @version          3.3.3 (2016-10-31)
* @author           Ivan Bozhanov
* @link             <https://www.jstree.com/>
* @license          MIT

**less**  		        : dynamic stylesheet

* @version          less-1.5.0
* @author           Alexis Sellier
* @link             <self@cloudhead.net> / <http://lesscss.org/>
* @license          Apache v2

**qunit.js**            : Unit testing

* @version          2.9.1 (2019-01-07)
* @author           QUnit team (Trent Willis et al)
* @link             <http://qunitjs.com/>
* @license          MIT

**qunit-tap.js**        : TAP Output Producer Plugin for QUnit

* @version          1.5.1 (2016-06-20)
* @author           Takuto Wada
* @link             <https://github.com/twada/qunit-tap>
* @license          MIT/GPLv2

**require.js**  	    : JavaScript file and module loader

* @version          2.3.6 (2018-08-27)
* @author           The Dojo Foundation All Rights Reserved.
* @link             <http://jrburke.com>, <http://requirejs.org/>
* @license          MIT
* @compatibility    IE 6+, Firefox 2+, Safari 3.2+, Chrome 3+, Opera 10+


**seedrandom.js**       : A replacement of Math.random of javascript that allow to get fixed seed
* @author           David Bau + external contributor
* @version          3.0.5
* @link             <https://github.com/davidbau/seedrandom>
* @license          BSD


**svgExport.js**        : Export SVG to PNG

* @author           Nikita Rokotyan, adapted by the Vidjil Team
* @version          retrieven on 2018-09-14
* @link             <http://bl.ocks.org/Rokotyan/0556f8facbaf344507cdc45dc3622177>
* @license          MIT

**tsne.js**             : Implementation of TSNE algorithm, adapted by the Vidjil Team for randomseed

* @version          2d62a1c4 (2015-10-13)
* @author           Andrej Karpathy
* @link             <https://github.com/karpathy/tsnejs>
* @license          MIT

**select2.js**          : Select2 is a jQuery-based replacement for select boxes

* @version          5c38f18 (2021-11-16)
* @author           Kevin Brown, Igor Vaynberg, and Select2 contributors
* @link             <https://github.com/select2/select2>
* @license          MIT

### Base docker image

**nginx:1.15.0**        : docker image used as base for vidjil-client docker image

* @license          BSD

### Additional packages installed in the image

**wget**

* @license  GPLv3
* @link     <https://www.gnu.org/software/wget/>

**make**

* @license  GPLv3
* @link     <https://www.gnu.org/software/make/>

**unzip**

* @license  BSD like
* @link     <ftp://ftp.info-zip.org/pub/infozip/UnZip.html>

**git**

* @license  GPLv2
* @link     <https://git-scm.com/about>

**curl**

* @license  MIT/X like
* @link     <https://curl.se/docs/copyright.html>

**fcgiwrap**

* @license  MIT
* @link     <https://github.com/gnosek/fcgiwrap>


## vidjil-server

### Software and libraries included in Vidjil repository

**web2py**              : python CMS

* @author           Massimo Di Pierro & al
* @link             <http://www.web2py.com/init/default/license>
* @license          LGPLv3

### Base docker image

**ubuntu 18.04**        : docker image used as base for vidjil-server docker image

* @license          <https://ubuntu.com/licensing>

### Additional packages installed in the image

**wget**

* @license  GPLv3
* @link     <https://www.gnu.org/software/wget/>

**make**

* @license  GPLv3
* @link     <https://www.gnu.org/software/make/>

**unzip**

* @license  BSD like
* @link     ftp://ftp.info-zip.org/pub/infozip/UnZip.html

**git**

* @license  GPLv2
* @link     <https://git-scm.com/about>

**curl**

* @license  MIT/X like
* @link     <https://curl.se/docs/copyright.html>

**fcgiwrap**

* @license  MIT
* @link     <https://github.com/gnosek/fcgiwrap>

**cron**

* @license  GPLv2+
* @link     <http://changelogs.ubuntu.com/changelogs/pool/main/c/cron/cron_3.0pl1-136ubuntu2/copyright>

**python**

* @license  open/GPL compatible
* @link     <https://docs.python.org/3/license.html>

**ipython**

* @license  BSD3
* @link     <https://github.com/ipython/ipython/blob/master/LICENSE>

**python-cffi**

* @license  MIT
* @link     <https://pypi.org/project/cffi/>

**python-ijson**

* @license  BSD
* @link     <https://pypi.org/project/ijson/>

**python-enum34**

* @license  BSD
* @link     <https://pypi.org/project/enum34/>

**python-requests**

* @license  Apache License 2.0
* @link     <https://pypi.org/project/requests/>

**gosu**

* @license  Apache License 2.0
* @link     <https://github.com/tianon/gosu/blob/master/LICENSE>

**libyajl2**

* @license  ISC
* @link     <https://metadata.ftp-master.debian.org/changelogs//main/y/yajl/yajl_2.1.0-2_copyright>

**gnupg**

* @license  GPLv3
* @link     <https://gnupg.org/>

**apt-utils**

* @license  GPLv2+
* @link     <https://packages.ubuntu.com/bionic/apt-utils>

**pyuwsgi**

* @license  GPLv2
* @link     <https://pypi.org/project/pyuwsgi/>


## Germline/sequence databases

Both vidjil-algo and vidjil-client may use sequences from any germline database.
We provide tools to download these sequences in the `germline/` directory.
You should ensure that you comply with the provisions of the databases you download and use.

**NCBI**

* @license  NCBI itself places no restrictions on the use or distribution of the data contained therein. However NCBI cannot provide comment or unrestricted permission concerning the use, copying, or distribution of the information contained in the molecular databases.
* @link     <https://www.ncbi.nlm.nih.gov/home/about/policies/>

**IMGT/GENE-DB**

* @license  CC BY-NC-ND 4.0 for academic users and not-profit organizations
* @link     <http://www.imgt.org/about/termsofuse.php#conditions>
