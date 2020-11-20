
## Vidjil &ndash; Documentation
*The Vidjil team (Mathieu, Mikaël, Aurélien, Florian, Marc, Ryan and Tatiana)*

**[Vidjil](http://www.vidjil.org) is an open-source platform for the analysis of high-throughput
sequencing data from lymphocytes.** [V(D)J recombinations](http://en.wikipedia.org/wiki/V\(D\)J_recombination) in lymphocytes are
essential for immunological diversity. They are also useful markers of
pathologies, and in leukemia, are used to quantify the minimal residual
disease during patient follow-up.
With adapted [library preparation and sequencing](locus.md),
high-throughput sequencing (NGS/HTS) now
enables the deep sequencing of a lymphoid population with dedicated
sequencing methods and software, called either Rep-Seq or AIRR-Seq.

### Life scientist
  - Tutorial "Mastering the Vidjil web application":
    [english](http://www.vidjil.org/doc/tutorial/mastering-vidjil.html)
    ([pdf](http://www.vidjil.org/doc/tutorial/mastering-vidjil.pdf))
    <!-- [français](http://www.vidjil.org/doc/tutorial/mastering-vidjil-fr.html)
    ([pdf](http://www.vidjil.org/doc/tutorial/mastering-vidjil-fr.pdf))  -->
    🔗.
    Start by this tutorial to have an overview of Vidjil.
  - Web platform [user manual](user.md). This is the main user manual of the Vidjil platform.
  - [Libraries and recombinations](locus.md), documentation on library preparation and sequencing as well on detected immune recombinations
  - [Demo access](http://app.vidjil.org/) 🔗 to the patient, experiment and sample public test server
  - [Hosting options](healthcare.md) and healthcare compliance

### Bioinformatician
  - [Vidjil-algo documentation](vidjil-algo.md), usage from the command-line
  - [fuse.py](tools.md), converting and merging immune repertoire data
  - Specification of the [.vidjil format](vidjil-format.md) to encode immune repertoires with clones with V(D)J recombinations
  - Specification of the [warnings](warnings.md), list of default [tags](tags.org)
  - Specification of the [.should-vdj.fa tests](should-vdj.md) for encoding and testing curated V(D)J designations

### Server administrator
  - [Server administration (web)](admin.md), configuration and administration features available from the web application
  - [Server installation and maintenance (docker)](server.md), server installation, configuration and maintenance from the command line

### Quality, open data, roadmap, credits
  - [Software and developement quality](quality.md), including software engineering methods and human and team processes
  - Bioinformatics, technical, and administrative [Roadmap](roadmap.md)
  - [Public datasets](http://www.vidjil.org/data/) 🔗 supporting Vidjil publications
  - [Credits, references](credits.md)

### Further developer documentation

These documentations and additional developer and maintainer documentation
are available from the [doc/](http://gitlab.vidjil.org/tree/master/doc) directory in the source files,
including development notes on Vidjil-algo (`dev-algo.md`)
and on the web application client (`dev-client.md`) and the server (`dev-server.md`).

### Further help

Further help can always be asked to <contact@vidjil.org>. We can also arrange
phone or video meeting.
