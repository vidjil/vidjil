# Analyzed human locus

The Vidjil web application displays multi-locus data, as long as this information
is provided in the `.vidjil` file computed by the analysis program.
Vidjil-algo currently analyzes the following locus,
selecting the best locus for each read.
The configuration of analyzed locus is done in the `germline/homo-sapiens.g` preset.

|                      |         | complete recombinations                        |           | incomplete/special recombinations |
| -------------------- | ------- | ---------------------------------------------- | --------- | --------------------------------- |
|                      | **TRA** | Va-Ja                                          |           |                                   |
|                      | **TRB** | Vb-(Db)-Jb                                     | **TRB+**  | Db-Jb                             |
|                      | **TRD** | Vd-(Dd)-Jd                                     | **TRD+**  | Vd-Dd3, Dd2-(Dd)-Jd, Dd2-Dd3      |
|                      |         |                                                | **TRA+D** | Vd-(Dd)-Ja, Dd-Ja                 |
|                      | **TRG** | Vg-Jg                                          |           |                                   |
|                      | **IGH** | Vh-(Dh)-Jh                                     | **IGH+**  | Dh-Jh                             |
|                      | **IGL** | Vl-Jl                                          |           |                                   |
|                      | **IGK** | Vk-Jk                                          | **IGK+**  | Vk-KDE, INTRON-KDE                |
| vidjil-algo option   |         | `-g germline/homo-sapiens.g:TRA,TRB,TRD,TRG`   |           | `-g germline/homo-sapiens.g`      |
|                      |         | `-g germline/homo-sapiens.g:IGH,IGL,IGK`       |           |                                   |
| server configuration |         | `multi`                                        |           | `multi+inc`                       |

The detection of complete recombinations is reliable and should work provided that the reads
are long enough (especially the J region).

The detection of incomplete/special recombinaisons is more challenging and may fail in some cases.
In particular, as D genes may be very short, detecting TRD+ (Dd2/Dd3) and IGH+ (Dh-Jh) recombinations
require to have reads with fairly conserved D genes or up/downstream regions.

Finally, the `-2` command line option and the `multi+inc+xxx` server configuration try to
detect unexpected or chimeric recombinations between genes of different germlines or on different
strands (such as PCR dimers or +V/-V recombinations).
These recombinations, tagged as `xxx`, can be technological artefacts or unusual biological recombinations.
