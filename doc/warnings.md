***Warnings in .vidjil files***

These warnings are found in `.vidjil` files and alert the user on some unusual result.
They will be displayed in the Vidjil web application. Some warnings are related to individual clones or reads,
whereas some others are related to the dataset or the programs used. They can be produced by vidjil-algo
or by any RepSeq program or script willing to inform the user.

The following list is a work-in-progress, with links to gitlab issues in Vidjil.
Warnings which were implemented ([x]) have a fixed code that should not be changed for backward compatibility.


**Generic errors**
- [ ] W0x Outdated program
- [ ]     Outdated germlines  
- [ ]     Strange parameters: xxxx xxxx
- [ ] W0z Unknown error


**Output of apre-process** ~"server-pre-process" 

- [ ] W10 Few assembled reads  #2243  
- [ ] W1z Other pre-processing warning/error


**Output of an analysis, global warnings**

- [x] W20 Very few V(D)J recombinations found (0.7%)
- [ ] W2x Sequences with known adapters #1669
- [ ] W2x CDR3 detection without gapped germlines   #2187   (ou bien par clone ?)


**Output of an analysis, warnings on some clones**

*Read quality*
- [ ] W40 Low quality  #1544 

*Clone quality (KmerSegmenter in vidjil-algo)*
- [x] W50 Short or shifted window in vidjil-algo
- [x] W51 Low coverage (0.112)
- [ ]     Bad e-value (0.xxx)  #1437/#1566/#1889 
- [x] W53 Similar to another clone      
- [ ]     Possible strand ambiguity 

*Strange recombination (FineSegmenter in vidjil-algo), V and J genes*
- [ ]     Potential co-linear genome match (pos xxxxxx) #1664 #1629 
- [ ] W61 Non-recombined D7-27/J1 sequence  #2232
- [ ]     Potential di-mer #2820 
- [ ]     Very large deletion (xxx bp) #2909
- [ ]     Unexpected recombination
- [ ]     High probability clone ?
- [ ] W6z Unexpected error in V(D)J analysis (FineSegmenter failed)

*Strange recombination (FineSegmenter in vidjil-algo), D gene, N regions*
- [ ] W7x Mutations near breakpoint #1412 
- [ ]     Palindromic sequence ?
- [ ]     D with bad e-value ? 


**Comparisons between several samples or patients (such as with clonedb)**
- [ ] W8x Potential contamination or public clone #1744 
- [ ]     Known public clone 

