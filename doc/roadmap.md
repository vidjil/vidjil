# Roadmap

The development of the Vidjil platform is tracked with [gitlab](http://gitlab.vidjil.org).
As of 2020, there are more than 1500 [open issues](http://gitlab.vidjil.org/issues), 
but also more than 1500 closed issues.
Issues can be either in English or in French.

This roadmap is focused on user-facing features, even if many items involve more backend changes,
and links to actual issues in our gitlab with more technical content.
The roadmap is regularly updated and discussed with our users and collaborators,
in particular at each Vidjil Workshop.

Items generally go through the following stages:

 - **Research**, **Planning**: discussion on the issues and on the strategy.
    Take days, months... or years.
    This is the default stage for all items that are not currently developed or scheduled for development.
 - **Development**: software, test and documentation engineering.
    Going to this stage (or schedule to going here) means that we identified enough time to work on it.
    Take between weeks and months
 - **Beta**: available for selected users, feedback with these users. Contact us if you are interested.
    Usually 1 to 3 months
 - **Availability**: available for everyone, with appropriate documentation, part of the current [release](releases.md).

These stages can be 
pending and not scheduled (no icon), 
pending and scheduled (⏳), 
in progress (🚧), 
or finished (✅).


# Bioinformatics roadmap

The following points mix bioinformatics research, often in collaboration with hematologists or immunologists,
with software engineering. 


## Better tools for full repertoire analysis

 - Show distributions of the full repertoire #3902
    + **Availability: Q2 2020** ✅

 - Implement better repertoire comparisons #3857 #3855

 - Build another dedicated tool for full repertoire comparison (app-stats)
    + **Development: ongoing in 2020-21** 🚧 @flothoni
    + Beta: Q2 2021

## Better tools for MRD analysis

 - Run custom scripts for MRD #3838
    + **Beta: Q4 2020** for #3846  ✅ @flothoni @meidanis
    + Availability: Q1 2021, contact us to set up your MRD scenarios

 - Better display MRD data in the web platform


## Analysis of data with UMI, single-cell and/or paired chains

 - Provide more tools to analyze UMI data (demultiplexing to handle UMI) #2309
    + **Development: since 2020** 🚧 @flothoni
    + Beta: Q2 2021
 - Provide specific tools to analyze single cell data and/or paired chains data #2344
 
## Better sequence analysis

 - Show more sequence features (such as FR1...) in the sequence aligner #2135
    + **Development: Q4 2020** 🚧 @duez
    + Beta: Q1 2021**

 - Improve links to third-service analyses: ArrestSubsets #3917 ✅, VDJdb #1880

 - Improve the alignment between sequences #3332

 - Estimate clone lengths according to different primer sets #2043
    + Development: Q1 2021 ⏳ @flothoni

## Server: statistics, including quality control, on a set of samples

 - Provide statistics given a set on samples #3171

 - Provide a quality control, for example on a run #2175
    + **Development: since Q3 2019** 🚧 @mikael-s @duez
    + Beta: Q1 2021


## Improved and extended analysis of some recombinations

These points are not in the roadmap with fixed dates.

 - Extend set of recombinations
 - Find generalized recombinations, even unexpected #1400 #2818
 - Work on clone phylogenies
 - Work on noisy data, such as third-generation sequencers

Perspectives depends on collaboration.
These points are *ongoing research* 🚧 in the Bonsai team with selected collaborators.
For some of these points, we are open to new partners.
They often imply core algorithmic work on Vidjil-algo, often combined with updates on the web application.
Contact us if you are interested and/or if you have/plan to have such data.

 
# Technical roadmap

These software engineering tasks may of course influence biological studies.
They often require development or refactor work.
 
## User preferences and presets

 - Allow the user to store preferences #878
    + **Availability: Q3 2020** ✅

 - "My Account": Better view on usage stats and on processes
    + **Availability: Q4 2020** ✅
 
 - Create presets for specific studies or diseases #2836

## Improved data import/export and interoperability

 - Improve upload of multiple files with batch creation of patients/runs/sets #2878
    + **Availibility : Q3 2020** ✅

 - Improve AIRR support and AIRR integrations #3591 #morefields

 - Export all clones #3842
    + **Availability: Q2 2020** ✅

  - Better API documentation
    + Development: Q1 2021 ⏳ @magiraud

 - More integration with IMGT/HighV-Quest
    + Ongoing collaboration with IMGT

 - More flexible exports (reports, image) #2233
    + Development: Q2 2021 ⏳ @duez


       
## Speed

 - Speed-up vidjil-algo, especially for full designation of every clone #920
    + 2018: 10x speed-up of V(D)J designation  ✅
    + 2020-21: ongoing work on Aho-Corasick automaton 🚧

 - Speed-up the web client, especially when 10+ samples and/or 1000+ clones are displayed #3903 #2196 #2462
    + Q4 2020, ... 🚧

 - Speed-up the web server, especially when handling 1000+ samples #3169
    + Q4 2020, ... 🚧

These points are always ongoing:
We often work on backend changes that eventually improve the efficiency on the platform.

## Improved ergonomy of the web platform

 - Make the web client be fully responsive (works on tablet, and better work on various resolutions) #1740
    + Development: since 2020 🚧 @magiraud

 - Develop new view(s) to browse large immune repertoires #1975

 - Comparing 10+ samples
    + Improve ergonomy with the current view #4105: Q2 2020  ✅
    + New view(s) for comparing many samples #3895

 - Redesign the interface, improve the design #2245 #4600
    + Development (sequence analyzer): Q4 2020-Q1 2021 🚧 @duez
    + Development (clone information)
    + Brainstorming on new view: Q2-Q3 2021 ⏳

 - Refactor the axis framework:
    + 2020 ✅
    + New axes: Q2 2021 ⏳ @flothoni

 - Improve the URLs
    + **Availability: Q3-Q4 2020** ✅



# Human and administrative roadmap

 - Make the [VidjilNet Consortium](http://www.vidjil.net) grow
    + Expand the community, make more members join
    + Setup health-data (HDS, RGPD) provider: Q3 2020 ✅
    + Regularly take into account user requests

 - Organize regularly Vidjil Workshops
    + Workshops organized in 
      [2016](http://www.vidjil.org/workshop-2016),
      [2017](http://www.vidjil.org/workshop-2017),
      [2019](http://www.vidjil.org/workshop-2019), 
      special edition [2020](http://vidjil.org/workshop-2020) ✅,
      [2021](http://vidjil.org/workshop-2021) 🚧

 - Help the hospitals to get certification
    + First documents in 2020 for french COFRAC 🚧

