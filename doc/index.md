
## Vidjil &ndash; Documentation
*The Vidjil team (Mathieu, Mikaël, Aurélien, Florian, Marc, Ryan and Tatiana)*

**[Vidjil](http://www.vidjil.org) is an open-source platform for the analysis of high-throughput
sequencing data from lymphocytes.** [V(D)J recombinations](http://en.wikipedia.org/wiki/V\(D\)J_recombination) in lymphocytes are
essential for immunological diversity. They are also useful markers of
pathologies, and in leukemia, are used to quantify the minimal residual
disease during patient follow-up.
With adapted [library preparation and sequencing](locus.md),
high-throughput sequencing (NGS/HTS) now
enables the deep sequencing of a lymphoid population with dedicated [Rep-Seq](http://omictools.com/rep-seq-c424-p1.html)
methods and software.

### Web application, user documentation

  - Tutorial "Mastering the Vidjil web application": [english](./tutorial/mastering-vidjil.html) ([pdf](./tutorial/mastering-vidjil.pdf)), [français](./tutorial/mastering-vidjil-fr.html)
    ([pdf](./tutorial/mastering-vidjil-fr.pdf)). Start by this tutorial to have an overview of Vidjil.
  - Web platform [user manual](user.md)
  - [Demo access](http://app.vidjil.org/) to the patient, experiment and sample server

### Quality documentation and open data

  - [Software Quality and Human Processes](quality.md)
  - [Public datasets](http://www.vidjil.org/data/) supporting Vidjil publications

### Algorithm and server documentation

  - [Vidjil-algo documentation](vidjil-algo.md), usage from the command-line
  - [Server administration](admin.md), configuration and administration features available from the web application
  - [Docker/Server installation and maintenance](server.md), server installation, configuration and maintenance from the command line

### Developer documentation

  - [Encoding clones with V(D)J recombinations](vidjil-format.md), specification of the `.vidjil` file format
  - Specification of the [.should-vdj](should-vdj.org) format for encoding curated V(D)J designations
  - List of implemented [warnings](warnings.md), list of default [tags](tags.org)
  - Developer documentation: [Vidjil-algo](dev-algo.md), web application: [client](dev-client.md), [server](dev-server.md)

These documentations and additional developer and maintainer documentation
are available from the [doc/](http://gitlab.vidjil.org/tree/master/doc) directory in the source files.

### Further help

Further help can always be asked to <contact@vidjil.org>. We can also arrange
phone or video meeting.
