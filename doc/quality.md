

# Software and development quality in Vidjil
 
Quality relies both on **software engineering methods** (agile development, systematic testing, continuous integration and delivery) and on **human and team processes**. We plan to be as efficient as possible while keeping a friendly and open attitude.

This document details our current quality assurance policy.
The Vidjil user manual and more technical information for the developers are found on <http://www.vidjil.org/doc>.
Moreover, within the [VidjilNet](http://www.vidjil.net) consortium,
we offer additional support and documents for certification processes.

We develop Vidjil with *systematic testing and continuous integration*.
As of 2020, we have **2700+ tests** spanning all components of the platform.
We always want to extend the test coverage and to improve our development policy. We aim to provide

 - regular stable releases of the platform, including new features of the algorithm vidjil-algo
 - deliver continuously the web application, but also provide regular releases

# Vidjil-algo

## Roadmap

We develop an algorithm to process high-throughput sequencing data to detect sequences with V(D)J recombinations as well as incomplete or uncommon recombinations. We gather these sequences into clonotypes. We use and improve state-of-the-art text algorithms (spaced seeds, automata, bit parallelism, indexing structures...) to provide efficient analytical methods. As far as possible, we do not compute full alignments. We always plan to improve the algorithm, improving accuracy and speed and providing more pertinent analysis for immunology and hematology. We benchmark and improve the algorithm on carefully curated sequences.

The original algorithm was published in [BMC Genomics 2014], and extension to several loci as well as incomplete recombinations have been described in [PLOS One 2016]. Vidjil-algo was evaluated as very reliable. As of 2020, we are still working in improving again the efficiency of the algorithm and use more efficient algorithms for seed patterns evaluation.

## Tests

Each new feature or release is carefully tested and goes through the following tests:

 - *Unit tests.* [150+ tests](http://gitlab.vidjil.org/-/tree/dev/algo/tests/unit-tests) on the behaviour of minimal algorithmic bricks.
 - *Functional tests.* 850+ tests in [100+ tests sets](http://gitlab.vidjil.org/-/tree/dev/algo/tests/should-get-tests). We check that the command-line vidjil-algo has the expected behaviour in various conditions and options.
 - *Functional tests on curated sequences.* [500+ sequences](http://gitlab.vidjil.org/-/tree/dev/algo/tests/should-vdj-tests) with curated V(D)J designations. We check that the algorithm gives an expected result. Specific complex sequences that are known to fail are tagged in the dataset.
 - *Functional tests on full datasets.*
        We run tests on datasets we distribute on <http://www.vidjil.org/data> (LIL-L3, LIL-L4, T-ALL diagnosis and relapse) 
        as well as on other public datasets (Stanford S22).
        Some of these last tests are currently manual. There will be always some human control on these tests,
        but we will nevertheless soon add a part of automation to check more things.
    

# Vidjil web application

## Roadmap

We develop the web application (both client and server) to wrap or to link several software to pre-process, process, or post-process RepSeq data. 

Developed in Javascript with jQuery and d3.js, the web client is made for the visualization, inspection and analysis of clonotypes and their tracking along the time in a MRD setup or in a immunological study. It visualizes data processed by vidjil-algo or any RepSeq clonotype gathering software as soon as they output a compliant JSON format (documented on <http://vidjil.org/doc/vidjil-format>). This gives some modularity to users if they need to combine Vidjil-algo results with other data, coming from either personal an analysis or other software or scripts.

A sample database links the web application and the algorithmic part, allowing users to upload sequence files and manage their jobs directly from the web application. When uploading files, the user can choose some predefined preprocess to be launch on her data. A server, implemented in Python with the web2py framework (<http://web2py.com>), queues the job requests, allowing many jobs to be scheduled without overloading the server.

## Tests

 - *Web client unit tests.*. [700+ tests](http://gitlab.vidjil.org/-/tree/dev/browser/tests/QUnit/testFiles) on atomic functions of the web application
 - *Web client functional tests.* [350+ tests](http://gitlab.vidjil.org/-/tree/dev/browser/tests/functional) web automation with Watir. We test several versions of Firefox and Chrome. They are automatically launched on the web application, loading data and testing common features (clustering, renaming, tagging, sending to other sites, generating reports, etc.).
 - *Web server unit tests* [80+ tests](http://gitlab.vidjil.org/-/tree/dev/server/web2py/applications/vidjil/tests/unit) on atomic functions of the web server
 - *Web server functional tests* [140+ tests](http://gitlab.vidjil.org/-/tree/dev/server/web2py/applications/vidjil/tests/functional) simulating actual data exchange and queries to the web server throughout its API
 - *Hosting monitoring.*  We monitor our public server as well as remote maintened servers.
 

# Sofware engeneering methods

## Continuous integration, continuous or qualified delivery

Continuous integration (CI) consists in systematically testing the modification brought to the code (either on the algorithm or on the web application). This is used since 2017, and the test coverage regularly improves.

Continuous delivery (CD) consists in systematically deploying new releases when the tests succeed. We aim at reaching this point on the public test server (app.vidjil.org). As of 2020, we have automated delivery that is still triggered by the core developpers.

However, on production servers used in routine analysis, we do not use CD but rather qualified delivery. In collaboration with members of the consortium, we identify releases to be deployed. Some consortium members have also they own qualification tests to double-check new releases, and we provide to them additional qualification documents, for example for certification purposes.

## Tracking issues

Both bug reports and feature requests are followed on our public bugtracker, <http://gitlab.vidjil.org>.

 - Most issues are public. Issues with confidential content, including support for the members,
   are limited to the core developer team.
 - Most of the discussion takes place in the issue. To better track code history, we do not rely on e-mail discussions but rather put the content on the issue tracker.
 - We document each code modification (commits and branches) and link each of them to the related issues
 
 
# Human and Team processes
 
## User relations

 - There are at least two channels to join us : <support@vidjil.org> or the issue tracker. We can also arrange audio meetings.
 - We answer to each request: Even if we cannot solve the request, we acknowledge the request and create issues when needed.
 
 - We have quarterly audio meetings with active members of our community
 - We organize every 18 months meetings with our users (March 2015, November 2017, March 2019, September 2020, see <http://www.vidjil.org>)

Members of the VidjilNet consortium have access to the support with guaranteed response time.


## Team organization

The Vidjil Team works remotely, in Lille, Rennes, and in other places in the world.

Interactions between the developers are frequent:

 - daily interactions through the issue tracker (avoiding, when possible, e-mails)
 - weekly meeting between each developer and one of the architects
 - weekly conference call (all the team)
 - quarterly 2-days physical meetings (all the team)
 

## Developer relations

The Vidjil platform aims to interact with other RepSeq software.
We both use and propose APIs to work within a ecosystem of RepSeq software. 
We contribute to open formats to exchange RepSeq data.


# Maintenance and hosting

We maintain a public test server, <http://app.vidjil.org>, open to everyone and free to use.
This server is only for test and should not be used for clinical purposes.

Throughout the VidjilNet consortium, we propose two options for production servers with clinical and patient data:

 - remote maintenance of self-hosted instance of the platform in hospitals or other centers
 - shared hosting (HDS, hébergement de données de santé), complying with French and EU regulations.

## Backups and incidents

Incidents, either on our side, or due to the hosting operator, can always happen. However our goal is to ensure that no results or analyses could be lost.
Since October 2014, we lost once 1.5 days of data analyzed by our users on the public server
(0.5 day in 2016, 1.0 day in November 2017).
No loss of data occurred in 2018 neither in 2019.
We have improved our backup strategy to lower the likelihood of such an event.

On the public test server, the backup strategy is as follows:

 - Twice a month, the full database, results and analyses
 - Four times a day (1:00 CEST, 10:00 CEST, 14:00 CEST, 18:00 CEST), the full database, and the diff between the last full backup for the results and analyses
 - Original sequences files (such as .fastq) are not backuped (and the users are informed)
 - Backups are stored on an external secured server
 

