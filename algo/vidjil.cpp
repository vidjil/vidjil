/*
  This file is part of Vidjil-algo <http://www.vidjil.org>
  Copyright (C) 2011-2019 by VidjilNet consortium and Bonsai bioinformatics
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil-algo" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil-algo" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil-algo". If not, see <http://www.gnu.org/licenses/>
*/

//$$ #include

#include<algorithm>
#include<utility>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <cstring>
#include <time.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#include "core/check-compiler.h"
#include "core/tools.h"
#include "core/json.h"
#include "core/germline.h"
#include "core/kmerstore.h"
#include "core/fasta.h"
#include "core/bioreader.hpp"
#include "core/segment.h"
#include "core/windows.h"
#include "core/cluster-junctions.h"
#include "core/dynprog.h"
#include "core/read_score.h"
#include "core/read_chooser.h"
#include "core/compare-all.h"
#include "core/mkdir.h"
#include "core/labels.h"
#include "core/list_utils.h"
#include "core/windowExtractor.h"
#include "core/output.h"

#include "lib/CLI11.hpp"
#include "lib/json.hpp"
#include "lib/CLI11_json.hpp"

#include "vidjil.h"

// RELEASE_TAG may be defined in the "release.h" file.
// If RELEASE_TAG is undefined, the version will be the git hash.
// #define RELEASE_TAG  "2013.04"
#include "release.h"

// GIT_VERSION should be defined in "git-version.h", created by "create-git-version-h.sh", to be used outside of releases
#include "git-version.h"

#define PROGNAME "vidjil-algo"
#define VIDJIL_JSON_VERSION "2016b"
#define DOCUMENTATION "doc/vidjil-algo.md"

//$$ #define (mainly default options)

#define DEFAULT_MULTI_GERMLINE_PATH "germline/"
#define DEFAULT_MULTI_GERMLINE_FILE "homo-sapiens.g"

#define DEFAULT_READ_HEADER_SEPARATOR " "
#define DEFAULT_READS  "./demo/Stanford_S22.fasta"
#define DEFAULT_MIN_READS_CLONE 5
#define DEFAULT_MAX_REPRESENTATIVES 100
#define DEFAULT_MAX_CLONES 100
#define DEFAULT_RATIO_READS_CLONE 0.0
#define NO_LIMIT "all"

#define COMMAND_WINDOWS "windows"
#define COMMAND_CLONES "clones"
#define COMMAND_SEGMENT "designations"
#define COMMAND_GERMLINES "germlines"
 
enum { CMD_WINDOWS, CMD_CLONES, CMD_SEGMENT, CMD_GERMLINES } ;

#define DEFAULT_OUT_DIR "./out/" 

// Fixed filenames/suffixes
#define CLONES_FILENAME ".vdj.fa"
#define CLONE_FILENAME "clone.fa-"
#define WINDOWS_FILENAME ".windows.fa"
#define SEGMENTED_FILENAME ".segmented.vdj.fa"
#define UNSEGMENTED_FILENAME ".unsegmented.vdj.fa"
#define UNSEGMENTED_DETAIL_FILENAME ".fa"
#define AFFECTS_FILENAME ".affects"
#define EDGES_FILENAME ".edges"
#define COMP_FILENAME "comp.vidjil"
#define AIRR_SUFFIX ".tsv"
#define JSON_SUFFIX ".vidjil"

#define DEFAULT_K      0
#define DEFAULT_W      50

#define DEFAULT_MAX_AUDITIONED 2000
#define DEFAULT_RATIO_REPRESENTATIVE 0.5
#define DEFAULT_MIN_COVER_REPRESENTATIVE 3 // At least 3 reads to support a
                                           // representative (consisting of at
                                           // least
                                           // DEFAULT_RATIO_REPRESENTATIVE of
                                           // the clone's reads)

#define DEFAULT_KMER_THRESHOLD 1

#define DEFAULT_EPSILON  0
#define DEFAULT_MINPTS   10

#define DEFAULT_CLUSTER_COST  Cluster
#define DEFAULT_SEGMENT_COST   VDJ

#define DEFAULT_TRIM 0

#define MAX_CLONES_FOR_SIMILARITY 20

// warn
#define WARN_MAX_CLONES 5000
#define WARN_PERCENT_SEGMENTED 40
#define WARN_COVERAGE 0.6
#define WARN_NUM_CLONES_SIMILAR 10

// display
#define WIDTH_NB_READS 7
#define WIDTH_NB_CLONES 3
#define PAD_HELP "\n                              "

using namespace std ;
using json = nlohmann::json;

//$$ options: usage

extern char *optarg;

extern int optind, optopt, opterr;

string usage_examples(char *progname)
{
  stringstream ss;
  ss
       << "Examples (see " DOCUMENTATION ")" << endl
       << "  " << progname << " -c clones       -g germline/homo-sapiens.g   -2 -3 -r 1  demo/Demo-X5.fa           # (basic usage, detect the locus for each read," << endl
       << "                                                                                               #  cluster reads and report clones starting from the first read (-r 1)," << endl
       << "                                                                                               #  including unexpected recombinations (-2), assign V(D)J genes and try to detect the CDR3s (-3))" << endl
       << "  " << progname << " -c clones       -g germline/homo-sapiens.g:IGH    -3     demo/Stanford_S22.fasta   # (restrict to complete recombinations on the IGH locus)" << endl
       << "  " << progname << " -c clones       -g germline/homo-sapiens.g   -2 -3 -z 20 demo/LIL-L4.fastq.gz      # (basic usage, output detailed V(D)J analysis on the first 20 clones)" << endl
       << "  " << progname << " -c windows      -g germline/homo-sapiens.g   -y 0 -uu -U demo/LIL-L4.fastq.gz      # (splits all the reads into (large) files depending on the detection of V(D)J recombinations)" << endl
       << "  " << progname << " -c designations -g germline/homo-sapiens.g   -2 -3 -X 50 demo/Stanford_S22.fasta   # (full analysis of each read, here on 50 sampled reads)" << endl
       << "  " << progname << " -c germlines    -g germline/homo-sapiens.g               demo/Stanford_S22.fasta   # (statistics on the k-mers)" << endl
    ;

  return ss.str();
}

inline std::string failure_message_doc(const CLI::App *app, const CLI::Error &e) {
    std::string header = ERROR_STRING + std::string(e.what()) + "\n";
    header += "For more information, ";
    if(app->get_help_ptr() != nullptr)
        header += "run with " + app->get_help_ptr()->get_name() + " or ";
    header += "see " DOCUMENTATION ".\n";
    return header;
}

int atoi_NO_LIMIT(const char *optarg)
{
  return strcmp(NO_LIMIT, optarg) ? atoi(optarg) : NO_LIMIT_VALUE ;
}
double atof_NO_LIMIT(const char *optarg)
{
  return strcmp(NO_LIMIT, optarg) ? atof(optarg) : NO_LIMIT_VALUE ;
}

string string_NO_LIMIT(string s)
{
  if (!strcmp(NO_LIMIT, s.c_str()))
    return NO_LIMIT_VALUE_STRING ;

  return s;
}



int main (int argc, char **argv)
{
  cout << "# " << PROGNAME << " -- V(D)J recombinations analysis <http://www.vidjil.org/>" << endl
       << "# Copyright (C) 2011-2019 by the Vidjil team" << endl
       << "# Bonsai bioinformatics at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille" << endl 
       << "# VidjilNet consortium" << endl 
       << endl
       << "# " << PROGNAME << " is free software, and you are welcome to redistribute it" << endl
       << "# under certain conditions -- see http://git.vidjil.org/blob/master/doc/LICENSE" << endl
       << "# No lymphocyte was harmed in the making of this software," << endl
       << "# however this software is for research use only and comes with no warranty." << endl
       << endl
       << "# Please cite http://biomedcentral.com/1471-2164/15/409 if you use " << PROGNAME << "." << endl
       << endl ;

  //////////////////////////////////
  // Display version information or git log

  string soft_version = PROGNAME ;
  soft_version += " " ;
#ifdef RELEASE_TAG
  cout << "# version: " PROGNAME << " " << RELEASE_TAG << endl ;
  soft_version.append(RELEASE_TAG);
#else
  cout << "# development version" << endl ;
#ifdef GIT_VERSION
  cout << "# git: " << GIT_VERSION << endl ;
  soft_version.append("dev ");
  soft_version.append(GIT_VERSION);
#endif
#endif

  CLI::App app{"# vidjil-algo -- V(D)J recombinations analysis", argv[0]};
  app.config_formatter(std::make_shared<ConfigJSON>());
  app.get_formatter()->label("REQUIRED", "");
  app.get_formatter()->label("Positionnals", "");
  app.failure_message(failure_message_doc);

  //$$ options: defaults
  float ratio_representative = DEFAULT_RATIO_REPRESENTATIVE;
  unsigned int max_auditionned = DEFAULT_MAX_AUDITIONED;
  // int average_deletion = 4;     // Average number of deletion in V or J

  //$$ options: definition with CLI11
  string group = "";

  // ----------------------------------------------------------------------------------------------------------------------
  string f_reads = DEFAULT_READS ;
  app.add_option("reads_file", f_reads, R"Z(reads file, in one of the following formats:
                                  - FASTA (.fa/.fasta, .fa.gz/.fasta.gz)
                                  - FASTQ (.fq/.fastq, .fq.gz/.fastq.gz)
                                  - BAM (.bam)
                              Paired-end reads should be merged before given as an input to vidjil-algo.
                 )Z")
    -> required() -> type_name("");


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Command selection";

  string cmd = COMMAND_CLONES;
  app.add_option("-c", cmd, "command"
                 "\n  \t\t" COMMAND_CLONES    "  \t locus detection, window extraction, clone clustering (default command, most efficient, all outputs)"
                 "\n  \t\t" COMMAND_WINDOWS   "  \t locus detection, window extraction"
                 "\n  \t\t" COMMAND_SEGMENT   "  \t detailed V(D)J designation, without prior clustering (not as efficient)"
                 "\n  \t\t" COMMAND_GERMLINES "  \t statistics on k-mers in different germlines")
    -> group(group) -> type_name("COMMAND");

  // ----------------------------------------------------------------------------------------------------------------------
  group = "Input" ;

  app.set_config("--config", "", "read a (.json) config.vidjil file with options") -> type_name("FILE")
    -> group(group) -> level();

  string read_header_separator = DEFAULT_READ_HEADER_SEPARATOR ;
  app.add_option("--header-sep", read_header_separator, "separator for headers in the reads file", false)
    -> group(group) -> level() -> type_name("CHAR='" DEFAULT_READ_HEADER_SEPARATOR "'");

  int max_reads_processed = NO_LIMIT_VALUE;
  int max_reads_processed_sample = NO_LIMIT_VALUE;

  app.add_option("--first-reads,-x", max_reads_processed,
                 "maximal number of reads to process ('" NO_LIMIT "': no limit, default), only first reads")
    -> group(group) -> transform(string_NO_LIMIT);

  app.add_option("--sampled-reads,-X", max_reads_processed_sample,
                 "maximal number of reads to process ('" NO_LIMIT "': no limit, default), sampled reads")
    -> group(group) -> transform(string_NO_LIMIT);


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Germline presets (at least one -g or -V/(-D)/-J option must be given)";

  vector <string> multi_germlines ;
  app.add_option("--germline,-g", multi_germlines, R"Z(
         -g <.g FILE>(:FILTER)
                    multiple locus/germlines, with tuned parameters.
                    Common values are '-g germline/homo-sapiens.g' or '-g germline/mus-musculus.g'
                    The list of locus/recombinations can be restricted, such as in '-g germline/homo-sapiens.g:IGH,IGK,IGL'
         -g PATH
                    multiple locus/germlines, shortcut for '-g PATH/)Z" DEFAULT_MULTI_GERMLINE_FILE R"Z(',
                    processes human TRA, TRB, TRG, TRD, IGH, IGK and IGL locus, possibly with incomplete/unusal recombinations)Z")
    -> group(group) -> type_name("GERMLINES");

  vector <string> v_reps_V ;
  vector <string> v_reps_D ;
  vector <string> v_reps_J ;
   
  app.add_option("-V", v_reps_V,
                 "custom V germline multi-fasta file(s)")
    -> group(group) -> type_name("FILE");


  app.add_option("-D", v_reps_D,
                 "custom D germline multi-fasta file(s), analyze into V(D)J components")
    -> group(group) -> type_name("FILE");

  app.add_option("-J", v_reps_J,
                 "custom V germline multi-fasta file(s)")
    -> group(group) -> type_name("FILE");


  bool multi_germline_unexpected_recombinations_12 = false;
  app.add_flag("-2", multi_germline_unexpected_recombinations_12, "try to detect unexpected recombinations") -> group(group);


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Recombination detection (\"window\" prediction, first pass)";
  group += "\n    (use either -s or -k option, but not both)";
  group += "\n    (using -k option is equivalent to set with -s a contiguous seed with only '#' characters)" ;
  group += "\n    (all these options, except -w, are overriden when using -g)";

  int options_s_k = 0 ;

  IndexTypes indexType = AC_AUTOMATON;
  app.add_flag_function("--plain-index",
                        [&](size_t n) { UNUSED(n); indexType = KMER_INDEX; },
                        "use a plain index (pre-2019 method) instead of the recommended Aho-Corasick-like automaton")
    -> group(group) -> level();

  string seed = DEFAULT_SEED ;
  bool seed_changed = false;
  app.add_option("--kmer,-k",
                 [&](CLI::results_t res) {
                   int kmer_size ;
                   bool worked = CLI::detail::lexical_cast(res[0], kmer_size);
                   if (worked) {
                     seed = seed_contiguous(kmer_size);
                     seed_changed = true;
                     options_s_k++ ;
                   }
                   return worked;
                 },
                 "k-mer size used for the V/J affectation (default: 10, 12, 13, depends on germline)")
    -> group(group) -> level() -> type_name("INT");

  int wmer_size = DEFAULT_W ;
  app.add_option("--window,-w", wmer_size,
                 "w-mer size used for the length of the extracted window ('" NO_LIMIT "': use all the read, no window clustering)")
    -> group(group) -> level() -> transform(string_NO_LIMIT);


  double expected_value = THRESHOLD_NB_EXPECTED;
  app.add_option("--e-value,-e", expected_value,
                 "maximal e-value for determining if a V-J segmentation can be trusted", true)
    -> group(group) -> level() -> transform(string_NO_LIMIT);

  int trim_sequences = DEFAULT_TRIM;
  bool trim_sequences_changed = false;
  app.add_option("--trim",
                 [&](CLI::results_t res) {
                   CLI::detail::lexical_cast(res[0], trim_sequences);
                   trim_sequences_changed = true;
                   return true;
                 },
                 // trim_sequences,
                 "trim V and J genes (resp. 5' and 3' regions) to keep at most <INT> nt  (0: no trim)")
    -> group(group) -> level() -> type_name("INT");

  app.add_option("--seed,-s",
                 [&](CLI::results_t res) {
                   seed = res[0] ;
                   options_s_k++ ;
                   seed_changed = true;
                   return true;
                 },
                 "seed, possibly spaced, used for the V/J affectation (default: depends on germline), given either explicitely or by an alias"
                 PAD_HELP + string_of_map(seedMap, " ")
                 )
    -> group(group) -> level() -> type_name("SEED=" DEFAULT_SEED);


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Recombination detection, experimental options (do not use)";

  bool multi_germline_mark = false;
  bool multi_germline_one_unique_index = false;
  bool multi_germline_unexpected_recombinations_1U = false;

  app.add_flag("-I", multi_germline_mark,
               "ignore k-mers common to different germline systems (experimental, do not use)")
    -> group(group) -> level();

  app.add_flag("-1", multi_germline_one_unique_index,
               "use a unique index for all germline systems (experimental, do not use)")
    -> group(group) -> level();

  app.add_flag("-4", multi_germline_unexpected_recombinations_1U,
               "try to detect unexpected recombinations with translocations (experimental, do not use)")
    -> group(group) -> level();

  bool keep_unsegmented_as_clone = false;
  app.add_flag("--not-analyzed-as-clones", keep_unsegmented_as_clone,
               "consider not analyzed reads as clones, taking for junction the complete sequence, to be used on very small datasets (for example --not-analyzed-as-clones -AX 20)")
    -> group(group) -> level();


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Labeled sequences (windows related to these sequences will be kept even if -r/--ratio thresholds are not reached)";

  vector <string> windows_labels_explicit ;
  string windows_labels_file = "" ;
  string windows_labels_json = "" ;

  app.add_option("--label", windows_labels_explicit, "label the given sequence(s)") -> group(group) -> level() -> type_name("SEQUENCE");
  app.add_option("--label-file", windows_labels_file, "label a set of sequences given in <file>") -> group(group) -> level() -> type_name("FILE");
  app.add_option("--label-json", windows_labels_json, "read a (.json) label.vidjil (experimental)") -> type_name("FILE")
      -> group(group) -> level();

  bool only_labeled_windows = false ;
  app.add_flag("--label-filter", only_labeled_windows, "filter -- keep only the windows related to the labeled sequences") -> group(group) -> level();


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Limits to report and to analyze clones (second pass)";
  int max_clones_id = NO_LIMIT_VALUE ;
  int min_reads_clone = DEFAULT_MIN_READS_CLONE ;
  float ratio_reads_clone = DEFAULT_RATIO_READS_CLONE;

  app.add_option("--min-reads,-r", min_reads_clone, "minimal number of reads supporting a clone", true) -> group(group);
  app.add_option("--min-ratio", ratio_reads_clone, "minimal percentage of reads supporting a clone", true) -> group(group);
  app.add_option("--max-clones", max_clones_id, "maximal number of output clones ('" NO_LIMIT "': no maximum, default)", false) -> group(group);

  int max_clones = DEFAULT_MAX_CLONES ;
  int max_representatives = DEFAULT_MAX_REPRESENTATIVES ;

  app.add_option("--max-consensus,-y", max_representatives,
                 "maximal number of clones computed with a consensus sequence ('" NO_LIMIT "': no limit)", true)
    -> group(group) -> transform(string_NO_LIMIT);

  app.add_option("--max-designations,-z",
                 [&max_clones, &max_representatives](CLI::results_t res) {
                   max_clones = atoi_NO_LIMIT(res[0].c_str());
                   if ((max_representatives < max_clones) && (max_representatives != NO_LIMIT_VALUE))
                     max_representatives = max_clones ;
                   return true;
                   // TODO: return false on bad input
                 },
                 "maximal number of clones to be analyzed with a full V(D)J designation ('" NO_LIMIT "': no limit, do not use)")
    -> group(group) -> type_name("INT=" + string_of_int(max_clones));

  app.add_flag_function("--all", [&](size_t n) {
      UNUSED(n);
      ratio_reads_clone = 0 ;
      min_reads_clone = 1 ;
      max_representatives = NO_LIMIT_VALUE ;
      max_clones = NO_LIMIT_VALUE ;
    },
    "reports and analyzes all clones"
    PAD_HELP "(--min-reads 1 --min-ratio 0 --max-clones " NO_LIMIT" --max-consensus " NO_LIMIT " --max-designations " NO_LIMIT "),"
    PAD_HELP "to be used only on small datasets (for example --all -X 1000)")
    -> group(group);

  VirtualReadScore *readScorer = &DEFAULT_READ_SCORE;
  ReadQualityScore readQualityScore;
  app.add_flag_function("--consensus-on-longest-sequences",
                        [&readScorer, &readQualityScore](size_t n) {
                          UNUSED(n);
                          readScorer = &readQualityScore;
                        }, "for large clones, use a sample of the longest and highest quality reads to compute the consensus sequence (instead of a random sample)")
    ->group(group) -> level();

  // ----------------------------------------------------------------------------------------------------------------------
  group = "Clone analysis (second pass)";

  Cost segment_cost = DEFAULT_SEGMENT_COST ;
  app.add_option("--analysis-cost",
                 [&segment_cost](CLI::results_t res) {
                   segment_cost = strToCost(res[0].c_str(), VDJ); 
                   return true;
                 },
                 "use custom Cost for clone analysis: format \"match, subst, indels, del_end, homo\" (default " + string_of_cost(DEFAULT_SEGMENT_COST) + ")")
    -> group(group) -> level() -> type_name("COST");

  double expected_value_D = THRESHOLD_NB_EXPECTED_D;
  app.add_option("--analysis-e-value-D,-E", expected_value_D,
                 "maximal e-value for determining if a D segment can be trusted", true)
    -> group(group) -> level();

  int kmer_threshold = DEFAULT_KMER_THRESHOLD;
  app.add_option("--analysis-filter", kmer_threshold,
                 "typical number of V genes, filtered by k-mer comparison, to compare to the read ('" NO_LIMIT "': all genes)", true)
    -> group(group) -> transform(string_NO_LIMIT) -> level();

  bool several_D = false;
  app.add_flag("-d,--several-D", several_D, "try to detect several D (experimental)") -> group(group);

  bool detect_CDR3 = false;
  app.add_flag("-3,--cdr3", detect_CDR3, "CDR3/JUNCTION detection (requires gapped V/J germlines)")
    -> group(group);

  int alternative_genes = 0;
  app.add_option("--alternative-genes", alternative_genes, "number of alternative V(D)J genes to show beyond the most similar one", true)
    -> group(group) -> level();
  // ----------------------------------------------------------------------------------------------------------------------
  group = "Additional clustering (third pass, experimental)" ;

  int epsilon = DEFAULT_EPSILON ;
  int minPts = DEFAULT_MINPTS ;
  app.add_option("--cluster-epsilon", epsilon, "minimum required neighbors for automatic clustering. No automatic clusterisation if =0.", true) -> group(group) -> level();
  app.add_option("--cluster-N", minPts, "minimum required neighbors for automatic clustering", true) -> group(group) -> level();

  bool save_comp = false;
  bool load_comp = false;
  app.add_flag("--cluster-save-matrix", save_comp, "generate and save comparative matrix for clustering") -> group(group) -> level();
  app.add_flag("--cluster-load-matrix", load_comp, "load comparative matrix for clustering") -> group(group) -> level();

  string forced_edges = "" ;
  app.add_option("--cluster-forced-edges", forced_edges, "manual clustering -- a file used to force some specific edges") -> group(group) -> level() -> type_name("FILE");

  Cost cluster_cost = DEFAULT_CLUSTER_COST ;
  app.add_option("--cluster-cost",
                 [&cluster_cost](CLI::results_t res) {
                   cluster_cost = strToCost(res[0].c_str(), Cluster);
                   return true;
                 },
                 "use custom Cost for automatic clustering : format \"match, subst, indels, del_end, homo\" (default " + string_of_cost(DEFAULT_CLUSTER_COST) + ")")
    -> group(group) -> level() -> type_name("COST");

  
  // ----------------------------------------------------------------------------------------------------------------------
  group = "Detailed output per read (generally not recommended, large files, but may be used for filtering, as in -uu -X 1000)";

  bool output_segmented = false;
  app.add_flag("--out-analyzed,-U", output_segmented,
               "output analyzed reads (in " SEGMENTED_FILENAME " file)")
    -> group(group);

  bool output_unsegmented = false;
  bool output_unsegmented_detail = false;
  bool output_unsegmented_detail_full = false;

  app.add_flag_function("--out-unanalyzed,-u", [&](size_t n) {
      output_unsegmented = (n >= 3);             // -uuu
      output_unsegmented_detail_full = (n >= 2); // -uu
      output_unsegmented_detail = (n >= 1);      // -u
    }, R"Z(
        -u          output unanalyzed reads, gathered by cause, except for very short and 'too few V/J' reads (in *)Z" UNSEGMENTED_DETAIL_FILENAME R"Z( files)
        -uu         output unanalyzed reads, gathered by cause, all reads (in *)Z" UNSEGMENTED_DETAIL_FILENAME R"Z( files) (use only for debug)
        -uuu        output unanalyzed reads, all reads, including a )Z" UNSEGMENTED_FILENAME R"Z( file (use only for debug))Z")
    -> group(group);

  bool output_sequences_by_cluster = false;
  app.add_flag("--out-reads", output_sequences_by_cluster, "output all reads by clones (" CLONE_FILENAME "*), to be used only on small datasets") -> group(group);

  bool output_affects = false;
  app.add_flag("--out-affects,-K", output_affects,
               "output detailed k-mer affectation for each read (in " AFFECTS_FILENAME " file) (use only for debug, for example -KX 100)")
    -> group(group) -> level();


  // ----------------------------------------------------------------------------------------------------------------------
  group = "Output";

  string out_dir = DEFAULT_OUT_DIR;
  string f_basename = "";

  app.add_option("--dir,-o", out_dir, "output directory", true) -> group(group) -> type_name("PATH");
  app.add_option("--base,-b", f_basename, "output basename (by default basename of the input file)") -> group(group) -> type_name("STRING");


  int verbose = 0 ;
  app.add_flag_function("--verbose,-v", [&](size_t n) { verbose += n ; }, "verbose mode") -> group(group);

  bool __only_on_exit__clean_memory; // Do not use except on exit, see #3729
  app.add_flag("--clean-memory", __only_on_exit__clean_memory, "clean memory on exit") -> group(group) -> level();

  // ----------------------------------------------------------------------------------------------------------------------
  group = "Presets";

  app.add_option("--grep-reads",
    [&only_labeled_windows,&windows_labels_explicit,&output_sequences_by_cluster](CLI::results_t res) {
      only_labeled_windows = true;
      windows_labels_explicit.push_back(res[0].c_str());
      output_sequences_by_cluster = true;
      return true;
    },
    "output, by clone, reads related to the given window sequence, even when they are below the thresholds"
    PAD_HELP "(equivalent to --label SEQUENCE -label-filter --out-reads)")
    -> group(group) -> level() -> type_name("SEQUENCE");

  // ----------------------------------------------------------------------------------------------------------------------
  group = "Help";
  app.set_help_flag("--help,-h", "help")
    -> group(group);

  app.add_flag_function("--help-advanced,-H", [&](size_t n) { UNUSED(n); throw CLI::CallForAdvancedHelp() ; },
                        "help, including advanced and experimental options"
                        "\n                              "
                        "The full help is available in " DOCUMENTATION ".")
    -> group(group);


  // Deprecated options
  bool deprecated = false;

#define DEPRECATED(options, text) app.add_flag_function((options), [&](size_t n) { UNUSED(n); deprecated = true ; return app.exit(CLI::ConstructionError((text), 1));}) -> level(3);

  DEPRECATED("-t", "'-t' is deprecated, please use '--trim'");
  DEPRECATED("-A", "'-A' is deprecated, please use '--all'");
  DEPRECATED("-a", "'-a' is deprecated, please use '--out-reads'");
  DEPRECATED("-l", "'-l' is deprecated, please use '--label'");

  // ----------------------------------------------------------------------------------------------------------------------
  app.footer(usage_examples(argv[0]));

  //$$ options: parsing
  CLI11_PARSE(app, argc, argv);

  //$$ options: post-processing+display

  int command = CMD_CLONES;
  if (cmd == COMMAND_CLONES)
    command = CMD_CLONES;
  else if (cmd == COMMAND_SEGMENT)
    command = CMD_SEGMENT;
  else if (cmd == COMMAND_WINDOWS)
    command = CMD_WINDOWS;
  else if (cmd == COMMAND_GERMLINES)
    command = CMD_GERMLINES;
  else if (cmd == "segment")
    return app.exit(CLI::ConstructionError("'-c segment' is deprecated, please use '-c designations'", 1));
  else {
    return app.exit(CLI::ConstructionError("Unknown command " + cmd, 1));
  }
  if (deprecated) return 1 ;

  list <string> f_reps_V(v_reps_V.begin(), v_reps_V.end());
  list <string> f_reps_D(v_reps_D.begin(), v_reps_D.end());
  list <string> f_reps_J(v_reps_J.begin(), v_reps_J.end());


  list <pair <string, string>> multi_germline_paths_and_files ;
  bool multi_germline = false;

  for (string arg: multi_germlines)
    {
      multi_germline = true;

      struct stat buffer;
      if (stat(arg.c_str(), &buffer) == 0)
        {
          if( buffer.st_mode & S_IFDIR )
            {
              // argument is a directory
              multi_germline_paths_and_files.push_back(make_pair(arg, DEFAULT_MULTI_GERMLINE_FILE)) ;
              continue ;
            }
        }

      // argument is not a directory (and basename can include ':' with a filter)
      multi_germline_paths_and_files.push_back(make_pair(extract_dirname(arg), extract_basename(arg, false)));
    }


  if (!multi_germline && (!f_reps_V.size() || !f_reps_J.size()))
    {
      return app.exit(CLI::ConstructionError("At least one germline must be given with -g or -V/(-D)/-J.", 1));
    }

  if (options_s_k > 1)
    {
      return app.exit(CLI::ConstructionError("Use at most one -s or -k option.", 1));
    }

  map <string, string> windows_labels ;

  for(string lab : windows_labels_explicit)
    windows_labels[lab] = string("--label");
  
  string out_seqdir = out_dir + "/seq/" ;

  if (verbose)
    cout << "# verbose " << verbose << endl ;

  if (f_reads == DEFAULT_READS)
    {
      cout << "# using default sequence file: " << f_reads << endl ;
    }

  size_t min_cover_representative = (size_t) min(min_reads_clone, DEFAULT_MIN_COVER_REPRESENTATIVE);

  // Check seed buffer  
  if (seed.size() >= MAX_SEED_SIZE)
    {
      return app.exit(CLI::ConstructionError("Seed size is too large (MAX_SEED_SIZE).", 1));
    }

  if ((wmer_size< 0) && (wmer_size!= NO_LIMIT_VALUE))
    {
      return app.exit(CLI::ConstructionError("Too small -w. The window size should be positive.", 1));
    }

  // Check that out_dir is an existing directory or creates it
  const char *out_cstr = out_dir.c_str();

  if (mkpath(out_cstr, 0755) == -1) {
    cerr << ERROR_STRING << "Directory creation: " << out_dir << endl; perror("");
    return 2;
  }

  const char *outseq_cstr = out_seqdir.c_str();
  if (mkpath(outseq_cstr, 0755) == -1) {
    cerr << ERROR_STRING << "Directory creation: " << out_seqdir << endl; perror("");
    return 2;
  }

  // Compute basename if not given as an option
  if (f_basename == "") {
    f_basename = extract_basename(f_reads);
  }

  out_dir += "/" ;

  /// Load labels ;
  load_into_map(windows_labels, windows_labels_file, "-l");
  json j_labels = load_into_map_from_json(windows_labels, windows_labels_json);

  switch(command) {
  case CMD_WINDOWS: cout << "Extracting windows" << endl; 
    break;
  case CMD_CLONES: cout << "Analysing clones" << endl; 
    break;
  case CMD_SEGMENT: cout << "Segmenting V(D)J" << endl;
    break;
  case CMD_GERMLINES: cout << "Discovering germlines" << endl;
    break;
  }

  cout << "Command line: ";
  for (int i=0; i < argc; i++) {
    cout << argv[i] << " ";
  }
  cout << endl;

  // Dump configuration
  json j_config = json::parse(app.config_to_str(true, true));
  if (!j_labels.empty())
    j_config["labels"] = j_labels;

  //////////////////////////////////
  // Display time and date
  time_t rawtime;
  struct tm *timeinfo;
  char time_buffer[80];

  time (&rawtime );
  timeinfo = localtime (&rawtime);

  strftime (time_buffer, 80,"%F %T", timeinfo);

  cout << "# " << time_buffer << endl ;


  //////////////////////////////////
  // Warning for non-optimal use

  if (max_clones == NO_LIMIT_VALUE || max_clones > WARN_MAX_CLONES)
    {
      cout << endl
	   << "* WARNING: " << PROGNAME << " was run with '-A' option or with a large '-z' option" << endl ;
    }
  
  if (command == CMD_SEGMENT)
    {
      cout << endl
	   << "* WARNING: " << PROGNAME << " was run with '-c" COMMAND_SEGMENT "' option" << endl ;
    }
  
  if (max_clones == NO_LIMIT_VALUE || max_clones > WARN_MAX_CLONES || command == CMD_SEGMENT)
    {
      cout << "* " << PROGNAME << " efficiently extracts windows overlapping the CDR3" << endl
           << "* to cluster reads into clones ('-c clones')." << endl
           << "* Computing accurate V(D)J designations for many sequences ('-c " COMMAND_SEGMENT "' or large '-z' values)" << endl
           << "* is not as efficient as the default '-c " COMMAND_CLONES "' command." << endl
	   << "* More information is provided in " DOCUMENTATION "." << endl
	   << endl ;
    }


  //

  //json which contains the Levenshtein distances
  json jsonLevenshtein;
  bool jsonLevenshteinComputed = false ;


  /////////////////////////////////////////
  //            JSON OUTPUT              //
  /////////////////////////////////////////

  string f_airr = out_dir + f_basename + AIRR_SUFFIX ;
  string f_json = out_dir + f_basename + JSON_SUFFIX ;

  ostringstream stream_cmdline;
  for (int i=0; i < argc; i++) stream_cmdline << argv[i] << " ";

  SampleOutput output({
    {"vidjil_json_version", VIDJIL_JSON_VERSION},
    {"samples", {
        {"number", 1},
        {"original_names", {f_reads}},
        {"run_timestamp", {time_buffer}},
        {"producer", {soft_version}},
        {"commandline", {stream_cmdline.str()}}
      }}
  });


  /////////////////////////////////////////
  //            LOAD GERMLINES           //
  /////////////////////////////////////////

  if (command == CMD_GERMLINES)
    {
      multi_germline = true ;
      multi_germline_one_unique_index = true ;
    }

  MultiGermline *multigermline = new MultiGermline(indexType, !multi_germline_one_unique_index);

    {
      cout << "Load germlines and build Kmer indexes" << endl ;
    
      if (multi_germline)
	{
          for (pair <string, string> path_file: multi_germline_paths_and_files)
            {
              try {
                multigermline->build_from_json(path_file.first, path_file.second, GERMLINES_REGULAR,
                                               FIRST_IF_UNCHANGED("", seed, seed_changed),
                                               FIRST_IF_UNCHANGED(0, trim_sequences, trim_sequences_changed), (kmer_threshold != NO_LIMIT_VALUE));
              } catch (std::exception& e) {
                cerr << ERROR_STRING << PROGNAME << " cannot properly read " << path_file.first << "/" << path_file.second << ": " << e.what() << endl;
                delete multigermline;
                return 1;
              }
            }
	}
      else
	{
	  // Custom germline
	  Germline *germline;
	  germline = new Germline("custom", 'X',
                                  f_reps_V, f_reps_D, f_reps_J,
                                  seed, trim_sequences, (kmer_threshold != NO_LIMIT_VALUE));

          germline->new_index(indexType);

	  multigermline->insert(germline);
	}
    }

    cout << endl ;

    if (multi_germline_one_unique_index) {
      multigermline->build_with_one_index(seed, true);
    }

      if (multi_germline_unexpected_recombinations_12 || multi_germline_unexpected_recombinations_1U) {
        if (!multigermline->index) {
          multigermline->build_with_one_index(seed, false);
        }
      }

      if (multi_germline_unexpected_recombinations_12) {
        Germline *pseudo = new Germline(PSEUDO_UNEXPECTED, PSEUDO_UNEXPECTED_CODE, "", trim_sequences, (kmer_threshold != NO_LIMIT_VALUE));
        pseudo->seg_method = SEG_METHOD_MAX12 ;
        pseudo->set_index(multigermline->index);
        multigermline->germlines.push_back(pseudo);
      }

      if (multi_germline_unexpected_recombinations_1U) {
        Germline *pseudo_u = new Germline(PSEUDO_UNEXPECTED, PSEUDO_UNEXPECTED_CODE, "", trim_sequences, (kmer_threshold != NO_LIMIT_VALUE));
        pseudo_u->seg_method = SEG_METHOD_MAX1U ;
        // TODO: there should be more up/downstream regions for the PSEUDO_UNEXPECTED germline. And/or smaller seeds ?
        pseudo_u->set_index(multigermline->index);
        multigermline->germlines.push_back(pseudo_u);
    }

      // Should come after the initialization of regular (and possibly pseudo) germlines
    {
      for (pair <string, string> path_file: multi_germline_paths_and_files)
        multigermline->build_from_json(path_file.first, path_file.second, GERMLINES_INCOMPLETE,
                                       FIRST_IF_UNCHANGED("", seed, seed_changed),
                                       FIRST_IF_UNCHANGED(0, trim_sequences, trim_sequences_changed), (kmer_threshold != NO_LIMIT_VALUE));
      if ((! multigermline->one_index_per_germline) && (command != CMD_GERMLINES)) {
        multigermline->insert_in_one_index(multigermline->index, true);
      }
    }

    if (multi_germline_mark)
      multigermline->mark_cross_germlines_as_ambiguous();

    multigermline->finish();
    cout << "Germlines loaded: " ;
    cout << *multigermline ;
    cout << endl ;

    // Number of reads for e-value computation
    unsigned long long nb_reads_for_evalue = (expected_value > NO_LIMIT_VALUE) ? nb_sequences_in_file(f_reads, true) : 1 ;

    
  //////////////////////////////////
  //$$ Read sequence files

    int only_nth_read = 1 ;
    if (max_reads_processed_sample != NO_LIMIT_VALUE)
      {
        only_nth_read = nb_sequences_in_file(f_reads) / max_reads_processed_sample;
        if (only_nth_read == 0)
          only_nth_read = 1 ;

        max_reads_processed = max_reads_processed_sample ;

        if (only_nth_read > 1)
          cout << "Processing every " << only_nth_read
               << (only_nth_read == 2 ? "nd" : (only_nth_read == 3 ? "rd" : "th"))
               << " read" << endl ;
      }

  OnlineBioReader *reads;

  try {
    reads = OnlineBioReaderFactory::create(f_reads, 1, read_header_separator, max_reads_processed, only_nth_read);
  } catch (const invalid_argument &e) {
    cerr << ERROR_STRING << PROGNAME << " cannot open reads file " << f_reads << ": " << e.what() << endl;
    return 1;
  }

  out_dir += "/";


  //////////////////////////////://////////
  //         DISCOVER GERMLINES          //
  /////////////////////////////////////////
  if (command == CMD_GERMLINES)
    {
      map <char, int> stats_kmer, stats_max;
      IKmerStore<KmerAffect> *index = multigermline->index ;

      // Initialize statistics, with two additional categories
      index->labels.push_back(make_pair(KmerAffect::getAmbiguous(), BIOREADER_AMBIGUOUS));
      index->labels.push_back(make_pair(KmerAffect::getUnknown(), BIOREADER_UNKNOWN));
      
      for (list< pair <KmerAffect, BioReader> >::const_iterator it = index->labels.begin(); it != index->labels.end(); ++it)
	{
	  char key = affect_char(it->first.affect) ;
	  stats_kmer[key] = 0 ;
	  stats_max[key] = 0 ;
	}
      
      // init forbidden for .max()
      set<KmerAffect> forbidden;
      forbidden.insert(KmerAffect::getAmbiguous());
      forbidden.insert(KmerAffect::getUnknown());
      
      // Loop through all reads

      int nb_reads = 0 ;
      int total_length = 0 ;
      int s = index->getS();

      int kmer_size = seed_weight(seed);

      while (reads->hasNext())
	{
	  reads->next();
	  nb_reads++;
	  string seq = reads->getSequence().sequence;
	  total_length += seq.length() - s + 1;

	  KmerAffectAnalyser *kaa = new KmerAffectAnalyser(*index, seq);

	  for (int i = 0; i < kaa->count(); i++) 
	    { 
	      KmerAffect ksa = kaa->getAffectation(i);
	      stats_kmer[affect_char(ksa.affect)]++ ;
	    }

          delete kaa;

	  CountKmerAffectAnalyser ckaa(*index, seq);
	  ckaa.setAllowedOverlap(kmer_size-1);

	  stats_max[affect_char(ckaa.max(forbidden).affect)]++ ;

	}

      delete reads;

      // Display statistics

      cout << "  <== "
	   << nb_reads << " reads, "
	   << total_length << " kmers"
	   << endl ;
      cout << "\t" << " max" << "\t\t" << "        kmers" << "\n" ;

      for (list< pair <KmerAffect, BioReader> >::const_iterator it = index->labels.begin(); it != index->labels.end(); ++it)
	{
          if (it->first.getStrand() == -1)
            continue ;

	  char key = affect_char(it->first.affect) ;
	  
	  cout << setw(12) << stats_max[key] << " " ;
	  cout << setw(6) << fixed << setprecision(2) <<  (float) stats_max[key] / nb_reads * 100 << "%" ;

	  cout << "     " ;

	  cout << setw(12) << stats_kmer[key] << " " ;
	  cout << setw(6) << fixed << setprecision(2) <<  (float) stats_kmer[key] / total_length * 100 << "%" ;

	  cout << "     " << key << " " << it->second.name << endl ;
	}
      
      if (__only_on_exit__clean_memory) { delete multigermline; } return 0;
    }


  ////////////////////////////////////////
  //           CLONE ANALYSIS           //
  ////////////////////////////////////////
  if (command == CMD_CLONES || command == CMD_WINDOWS) {

    //////////////////////////////////
    //$$ Kmer Segmentation

    cout << endl;
    cout << "Loop through reads, ";

    if (wmer_size != NO_LIMIT_VALUE)
      cout << "looking for windows up to " << wmer_size << "bp" << endl;
    else
      cout << "considering all analyzed reads as windows" << endl;

    ofstream *out_segmented = NULL;
    ofstream *out_unsegmented = NULL;
    ofstream *out_unsegmented_detail[STATS_SIZE];
    ofstream *out_affects = NULL;
 
    WindowExtractor we(multigermline);
    if (! output_sequences_by_cluster)
      we.setMaximalNbReadsPerWindow(max_auditionned);
 
    if (output_segmented) {
      string f_segmented = out_dir + f_basename + SEGMENTED_FILENAME ;
      cout << "  ==> " << f_segmented << endl ;
      out_segmented = new ofstream(f_segmented.c_str());
      we.setSegmentedOutput(out_segmented);
    }

    if (output_unsegmented) {
      string f_unsegmented = out_dir + f_basename + UNSEGMENTED_FILENAME ;
      cout << "  ==> " << f_unsegmented << endl ;
      out_unsegmented = new ofstream(f_unsegmented.c_str());
      we.setUnsegmentedOutput(out_unsegmented);
    }

    if (output_unsegmented_detail) {
      for (int i=STATS_FIRST_UNSEG; i<STATS_SIZE; i++)
        {
          // Sanitize segmented_mesg[i]
          string s = segmented_mesg[i] ;
          replace(s.begin(), s.end(), '?', '_');
          replace(s.begin(), s.end(), ' ', '_');
          replace(s.begin(), s.end(), '/', '_');
          replace(s.begin(), s.end(), '<', '_');
          replace(s.begin(), s.end(), '\'', '_');

          string f_unsegmented_detail = out_dir + f_basename + "." + s + UNSEGMENTED_DETAIL_FILENAME ;
          cout << "  ==> " << f_unsegmented_detail << endl ;
          out_unsegmented_detail[i] = new ofstream(f_unsegmented_detail.c_str());
        }

      we.setUnsegmentedDetailOutput(out_unsegmented_detail, output_unsegmented_detail_full);
    }


    if (output_affects) {
      string f_affects = out_dir + f_basename + AFFECTS_FILENAME ;
      cout << "  ==> " << f_affects << endl ;
      out_affects = new ofstream(f_affects.c_str());
      we.setAffectsOutput(out_affects);
    }

    WindowsStorage *windowsStorage = we.extract(reads, wmer_size,
                                                windows_labels, only_labeled_windows,
                                                keep_unsegmented_as_clone,
                                                expected_value, nb_reads_for_evalue,
                                                readScorer);
    windowsStorage->setIdToAll();
    size_t nb_total_reads = we.getNbReads();


    //$$ Display statistics on segmentation causes

        
    ostringstream stream_segmentation_info;

    int nb_segmented_including_too_short = we.getNbSegmented(TOTAL_SEG_AND_WINDOW) 
      + we.getNbSegmented(UNSEG_TOO_SHORT_FOR_WINDOW);

    stream_segmentation_info << "  ==> junction detected in " << nb_segmented_including_too_short << " reads"
	<< " (" << setprecision(3) << 100 * (float) nb_segmented_including_too_short / nb_total_reads << "%)" 
	<< endl ;

    // nb_segmented is the main denominator for the following
    int nb_segmented = we.getNbSegmented(TOTAL_SEG_AND_WINDOW);
    float ratio_segmented = 100 * (float) nb_segmented / nb_total_reads ;

    stream_segmentation_info << "  ==> found " << windowsStorage->size() << " windows in " ;
    stream_segmentation_info << nb_segmented << " reads"
	<< " (" << setprecision(3) << ratio_segmented << "% of " <<  nb_total_reads << " reads)" << endl ;
  
    // warn if there are too few segmented sequences
    if (ratio_segmented < WARN_PERCENT_SEGMENTED)
      {
        output.add_warning("W20", "Very few V(D)J recombinations found: " + fixed_string_of_float(ratio_segmented, 2) + "%", LEVEL_WARN);
        stream_segmentation_info << "  ! There are not so many CDR3 windows found in this set of reads." << endl ;
        stream_segmentation_info << "  ! Please check the causes below and refer to " DOCUMENTATION "." << endl ;
      }

    we.out_stats(stream_segmentation_info);
    
    cout << stream_segmentation_info.str();

	//////////////////////////////////
	//$$ Sort windows
	
        cout << "Sort windows by number of occurrences" << endl;
        windowsStorage->sort();

	//////////////////////////////////
	//$$ Output windows
	//////////////////////////////////

	string f_all_windows = out_dir + f_basename + WINDOWS_FILENAME;
	cout << "  ==> " << f_all_windows << endl << endl ;

	ofstream out_all_windows(f_all_windows.c_str());
        windowsStorage->printSortedWindows(out_all_windows);


    //$$ compute, display and store diversity measures
    json jsonDiversity = windowsStorage->computeDiversity(nb_segmented);

    //////////////////////////////////
    //$$ min_reads_clone (ou label)

    int min_reads_clone_ratio = (int) (ratio_reads_clone * nb_segmented / 100.0);
    cout << "Considering ";

    if (only_labeled_windows)
      cout << "only labeled windows" ;

    if (!only_labeled_windows)
      cout << "labeled windows"
           << " and windows with >= " << min_reads_clone << " reads"
           << " and with a ratio >= " << ratio_reads_clone << " (" << min_reads_clone_ratio << ")" ;

    cout << endl ;

    int min_reads_clone_final = max(min_reads_clone, min_reads_clone_ratio);

    pair<int, size_t> info_remove = windowsStorage->keepInterestingWindows((size_t) min_reads_clone_final);
	 
    cout << "  ==> keep " <<  windowsStorage->size() << " windows in " << info_remove.second << " reads" ;
    cout << " (" << setprecision(3) << 100 * (float) info_remove.second / nb_total_reads << "%)  " << endl ;

    if (windowsStorage->size() == 0)
      {
	cout << "  ! No windows with current parameters." << endl;
      }

    //////////////////////////////////
    //$$ Clustering
    windowsStorage->sort();
    list<pair <junction, size_t> > sort_clones = windowsStorage->getSortedList();
    cout << "  ==> " << sort_clones.size() << " clones" << endl ;
    
    list <list <junction> > clones_windows;
    comp_matrix comp=comp_matrix(sort_clones);
      
    if (epsilon || forced_edges.size())
      {
	cout << "Cluster similar windows" << endl ;

	if (load_comp)
	  {
	    comp.load((out_dir+f_basename + "." + COMP_FILENAME).c_str());
	  }
	else
	  {
	    comp.compare( cout, cluster_cost);
	  }
	
	if (save_comp)
	  {
	    comp.save(( out_dir+f_basename + "." + COMP_FILENAME).c_str());
	  }
       
	clones_windows  = comp.cluster(forced_edges, wmer_size, cout, epsilon, minPts) ;
	comp.stat_cluster(clones_windows, cout );
	comp.del();
	cout << "  ==> " << clones_windows.size() << " clusters (" << f_json << ")" << endl ;
      } 
    else
      { 
	cout << "No clustering" << endl ; 
      }


    //$$ Further analyze some clones (-z)
    if (command == CMD_CLONES) {

    // TODO: output clones_windows (.data, other places ?)

    // TODO: Are these constraints checked somewhere ? keepInterestingWindows ?
    // if (labeled 
    //     || ((clone_nb_reads >= min_reads_clone) 
    //		  && (clone_nb_reads * 100.0 / nb_segmented >= ratio_reads_clone)))

    if (sort_clones.size() == 0)
      {
	cout << "  ! No clones with current parameters." << endl;
	cout << "  ! See the 'Limits to report a clone' options (-r, --ratio, -z, -A)." << endl;
      }
    else
      {

    cout << endl;

    //////////////////////////////////
    //$$ Output clones

    if (max_clones == 0)
      cout << "No detailed clone analysis" ;
    else if (max_clones > 0)
      cout << "Detailed analysis of at most " << max_clones<< " clone" << (max_clones > 1 ? "s" : "") ;
    else
      cout << "Detailed analysis of all clones" ;
    cout << endl ;

    map <string, int> clones_codes ;
    map <string, string> clones_map_windows ;

    list <Sequence> representatives ;
    list <string> representatives_labels ;

    // VirtualReadScore *scorer = new KmerAffectReadScore(*(germline->index));
    int last_num_clone_on_stdout = 0 ;
    int num_clone = 0 ;

    ofstream out_edges((out_dir+f_basename + EDGES_FILENAME).c_str());
    int nb_edges = 0 ;
    cout << "  ==> suggested edges in " << out_dir+ f_basename + EDGES_FILENAME
        << endl ;

    string f_clones = out_dir + f_basename + CLONES_FILENAME ;
    cout << "  ==> " << f_clones << "   \t(main result file)" << endl ;
    ofstream out_clones(f_clones.c_str()) ;

    cout << "  ==> " << out_seqdir + CLONE_FILENAME + "*" << "\t(detail, by clone)" << endl ; 
    cout << endl ;


    for (list <pair<junction,size_t> >::const_iterator it = sort_clones.begin();
         it != sort_clones.end(); ++it) {
      junction win = it->first;
      size_t clone_nb_reads = it->second;

    
      ++num_clone ;

      Germline *segmented_germline = windowsStorage->getGermline(it->first);
      
      //$$ Computing labels

      // Clone label
      ostringstream oss;
      oss << "clone-"  << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone
	  << "--" << segmented_germline->code
	  << "--" << setfill('0') << setw(WIDTH_NB_READS) << clone_nb_reads 
	  << "--" << setprecision(3) << 100 * (float) clone_nb_reads / nb_segmented << "%" ;
      string clone_id = oss.str();


      // Clone label -- Human readable information (is it really useful ?)
      ostringstream oss_human;
      oss_human << "#### Clone #" << right << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone 
		<< " – " << setfill(' ') << setw(WIDTH_NB_READS) << clone_nb_reads << " reads" 
		<< " – " << setprecision(3) << 100 * (float) clone_nb_reads / nb_segmented << "%  "  
	;
      string clone_id_human = oss_human.str();

      // Window label
      string label = windowsStorage->getLabel(it->first);
      string window_str = ">" + clone_id + "--window" + " " + label + '\n' + it->first + '\n' ;



      // interesting junctions are always handled
      if (!windowsStorage->isInterestingJunction(it->first))
      {

        // If max_clones is reached, we stop here
        if ((max_clones_id >= 0) && (num_clone >= max_clones_id + 1))
          { cout << "STOP" << endl ;
            continue ;
          }

        // If max_representatives is reached, we stop here but still outputs the window
        if ((max_representatives >= 0) && (num_clone >= max_representatives + 1))
          {
            out_clones << window_str << endl ;
            continue;
          }
      }


      cout << clone_id_human << endl ;
      last_num_clone_on_stdout = num_clone ;

      //$$ Open CLONE_FILENAME

      string clone_file_name = out_seqdir+ CLONE_FILENAME + string_of_int(num_clone) ;
      ofstream out_clone(clone_file_name.c_str());


      //$$ Output window
      cout << window_str ;
      out_clone << window_str ;

	//$$ Compute a representative sequence
	// Display statistics on auditionned sequences
	if (verbose)
	{
	  int total_length = 0 ;
          list<Sequence> auditioned = windowsStorage->getSample(it->first, max_auditionned);
	  for (list<Sequence>::const_iterator it = auditioned.begin(); it != auditioned.end(); ++it) 
	    total_length += (*it).sequence.size() ;
	  
	  cout << auditioned.size() << " auditioned sequences, avg length " << total_length / auditioned.size() << endl ;
	}

        KmerRepresentativeComputer repComp
          = windowsStorage->getRepresentativeComputer(it->first, "",
                                             min_cover_representative,
                                             ratio_representative,
                                             max_auditionned);

        Sequence representative = repComp.getRepresentative();

	  // Store the representative and its label
          representatives.push_back(representative);
          representatives_labels.push_back(string_of_int(num_clone));
	  representative.label = clone_id + "--" + representative.label;

	  
        // Re-launch also a KmerMultiSegmenter, for control purposes (affectations, evalue)
        KmerMultiSegmenter kmseg(representative, multigermline, 0, expected_value, nb_reads_for_evalue);
        KmerSegmenter *kseg = kmseg.the_kseg ;
        if (verbose)
          cout << "KmerSegmenter: " << kseg->getInfoLine() << endl;


        CloneOutput *clone  = new CloneOutput();
        output.addClone(it->first, clone);
        clone->set("sequence", kseg->getSequence().sequence);
        clone->set("_coverage", { repComp.getCoverage() });
        clone->set("_average_read_length", { windowsStorage->getAverageLength(it->first) });
        clone->set("_coverage_info", {repComp.getCoverageInfo()});
        //From KmerMultiSegmenter
        kseg->toOutput(clone);

        if (repComp.getQuality().length())
        clone->set("seg", "quality", {
            {"start", 1},
            {"stop", kseg->getSequence().sequence.length()},
            {"seq", repComp.getQuality()}
        });

        if (repComp.getCoverage() < WARN_COVERAGE)
          clone->add_warning("W51", "Low coverage: " + fixed_string_of_float(repComp.getCoverage(), 3), LEVEL_WARN);

        if (label.length())
          clone->set("label", label) ;

        //$$ If max_clones is reached, we stop here but still outputs the representative

        if ((max_clones >= 0) && (num_clone >= max_clones + 1)
            && ! windowsStorage->isInterestingJunction(it->first))

          {
            cout << representative << endl ;
            out_clones << representative << endl ;
            continue;
          }


        // FineSegmenter
        size_t nb_fine_segmented = (size_t) max_clones; // When -1, it will become the max value.
        nb_fine_segmented = MIN(nb_fine_segmented, sort_clones.size());
        FineSegmenter seg(representative, segmented_germline, segment_cost, expected_value, nb_fine_segmented, kmer_threshold, alternative_genes);

        if (segmented_germline->seg_method == SEG_METHOD_543)
	  seg.FineSegmentD(segmented_germline, several_D, expected_value_D, nb_fine_segmented);

        if (detect_CDR3)
          seg.findCDR3();

          
	// Output representative, possibly segmented... 
	// to stdout, CLONES_FILENAME, and CLONE_FILENAME-*
	cout << seg << endl ;
	out_clone << seg << endl ;
	out_clones << seg << endl ;
    
        seg.toOutput(clone);

        if (seg.isSegmented())
	  {
	      // Check for identical code, outputs to out_edge
              string code = seg.code ;
              int cc = clones_codes[code];

              if (cc)
                {
                  cout << " (similar to Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << cc << setfill(' ') << ")";
                  clone->add_warning("W53", "Similar to another clone " + code,
                                   num_clone <= WARN_NUM_CLONES_SIMILAR ? LEVEL_WARN : LEVEL_INFO);

                  nb_edges++ ;
                  out_edges << clones_map_windows[code] + " " + it->first + " "  ;
                  out_edges << code << "  " ;
                  out_edges << "Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << cc        << setfill(' ') << "  " ;
                  out_edges << "Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << setfill(' ') << "  " ;
                  out_edges << endl ;                }
              else
                {
                  clones_codes[code] = num_clone ;
                  clones_map_windows[code] = it->first ;
                }

	      // Output best V, (D) and J germlines to CLONE_FILENAME-*
              if ((segmented_germline->seg_method == SEG_METHOD_53) || (segmented_germline->seg_method == SEG_METHOD_543))
                out_clone << ">" << seg.box_V->ref_label << endl << seg.box_V->ref << endl ;
              if ((segmented_germline->seg_method == SEG_METHOD_543) || (segmented_germline->seg_method == SEG_METHOD_ONE))
                out_clone << ">" << seg.box_D->ref_label << endl << seg.box_D->ref << endl ;
              if ((segmented_germline->seg_method == SEG_METHOD_53) || (segmented_germline->seg_method == SEG_METHOD_543))
                out_clone << ">" << seg.box_J->ref_label << endl << seg.box_J->ref << endl ;
	      out_clone << endl;
	   } // end if (seg.isSegmented())

        seg.checkWarnings(clone);
        
	if (output_sequences_by_cluster) // -a option, output all sequences
	  {
	    list<Sequence> sequences = windowsStorage->getReads(it->first);
	    
	    for (list<Sequence>::const_iterator itt = sequences.begin(); itt != sequences.end(); ++itt)
	      {
		out_clone << *itt ;
	      }
	  }
	
	cout << endl ;
      out_clone.close();
    } // end for clones
	
    out_edges.close() ;
    out_clones.close();

    if (num_clone > last_num_clone_on_stdout)
      {
	cout << "#### Clones " 
	     << "#" << setfill('0') << setw(WIDTH_NB_CLONES) << last_num_clone_on_stdout + 1 << " to "
	     << "#" << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << "..." << endl ;
      }
    cout << "#### end of clones" << endl; 
    cout << endl;

    //$$ Compare representatives of all clones

    if (nb_edges)
      {
        cout << "Please review the " << nb_edges << " suggested edge(s) in " << out_dir+EDGES_FILENAME << endl ;
      }

    cout << "Comparing clone consensus sequences 2 by 2" << endl ;
    list<Sequence> first_representatives = keep_n_first<Sequence>(representatives,
                                                                  LIMIT_DISPLAY);
    SimilarityMatrix matrix = compare_all(first_representatives,
                                          representatives_labels);
    cout << RawOutputSimilarityMatrix(matrix, 90);

    if (sort_clones.size() > 0 && max_clones > 0) {
    //Compute all the edges
    cout << "Compute distances" << endl ;
    SimilarityMatrix matrixLevenshtein = compare_windows(*windowsStorage, Levenshtein,
                                                         sort_clones.size() > MAX_CLONES_FOR_SIMILARITY ? MAX_CLONES_FOR_SIMILARITY : sort_clones.size());
    //Added distances matrix in the JsonTab
    jsonLevenshtein << JsonOutputWindowsMatrix(matrixLevenshtein);
    jsonLevenshteinComputed = true ;
    }
    
     // delete scorer;

    } // endif (clones_windows.size() > 0)

    } // end if (command == CMD_CLONES) 

    //$$ .json output
    cout << endl ;
    
    //json custom germline
    json json_germlines;
    json_germlines = {
        {"custom", {
            {"shortcut", "X"},
            {"3", json::array()},
            {"4", json::array()},
            {"5", json::array()}
        }}
    };

    for (list<string>::iterator it = f_reps_V.begin(); it != f_reps_V.end(); it++){
        json_germlines["custom"]["3"].push_back(*it);
    }
    for (list<string>::iterator it = f_reps_D.begin(); it != f_reps_D.end(); it++){
        json_germlines["custom"]["4"].push_back(*it);
    }
    for (list<string>::iterator it = f_reps_J.begin(); it != f_reps_J.end(); it++){
        json_germlines["custom"]["5"].push_back(*it);
    }
    
    //Added edges in the json output file
    //json->add("links", jsonLevenshtein);
    //out_json << json->toString();

    windowsStorage->clearSequences();
    windowsStorage->sortedWindowsToOutput(&output, max_clones_id);
    
    json reads_germline;
    for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it){
        Germline *germline = *it ;
        reads_germline[germline->code] = {we.getNbReadsGermline(germline->code)};
    }


    // Complete main output
    output.set("config", j_config);
    output.set("diversity", jsonDiversity);
    output.set("samples", "log", { stream_segmentation_info.str() }) ;
    output.set("reads", {
            {"total", {nb_total_reads}},
            {"segmented", {nb_segmented}},
            {"germline", reads_germline}
    });
    output.set("germlines", json_germlines);
    output.set("germlines", "ref", multigermline->ref);
    output.set("germlines", "species", multigermline->species) ;
    output.set("germlines", "species_taxon_id", multigermline->species_taxon_id) ;

    if (epsilon || forced_edges.size()){
        output.set("clusters", comp.toJson(clones_windows));
    }
    
    //Added edges in the json output file
    if (jsonLevenshteinComputed)
      output.set("similarity", jsonLevenshtein);


    //$$ Clean

    delete windowsStorage;


    if (output_segmented)
      delete out_segmented;
    if (output_unsegmented)
      delete out_unsegmented;
    if (output_affects)
      delete out_affects;

    if (output_unsegmented_detail)
      for (int i=STATS_FIRST_UNSEG; i<STATS_SIZE; i++)
        delete out_unsegmented_detail[i];


  } else if (command == CMD_SEGMENT) {
    //$$ CMD_SEGMENT
    ////////////////////////////////////////
    //       V(D)J DESIGNATION            //
    ////////////////////////////////////////

    int nb = 0;
    int nb_segmented = 0 ;
    map <string, int> nb_segmented_by_germline ;

    Germline *not_segmented = new Germline(PSEUDO_NOT_ANALYZED, PSEUDO_NOT_ANALYZED_CODE);

    while (reads->hasNext()) 
      {
        nb++;
        reads->next();

        Sequence seq = reads->getSequence() ;
        KmerMultiSegmenter kmseg(reads->getSequence(), multigermline, NULL); //  out_unsegmented);
        KmerSegmenter *seg = kmseg.the_kseg ;
        Germline *germline = seg->segmented_germline ;

        FineSegmenter s(seq, germline, segment_cost, expected_value, nb_reads_for_evalue, kmer_threshold, alternative_genes);

        string id = string_of_int(nb, 6);
        CloneOutput *clone = new CloneOutput();
        output.addClone(id, clone);
        clone->set("id", id);
        clone->set("name", seq.label);
        clone->set("sequence", seq.sequence);
        clone->set("reads", { 1 });
        clone->set("top", 0);
        Germline *g ;

            if (s.isSegmented()) 
              {
                nb_segmented++ ;

                if (germline->seg_method == SEG_METHOD_543)
                  s.FineSegmentD(germline, several_D, expected_value_D, nb_reads_for_evalue);

                if (detect_CDR3)
                  s.findCDR3();

                g = germline ;
              }
        else
          {
            g = not_segmented ;
          }

        s.toOutput(clone);
        clone->set("germline", g->code);
        nb_segmented_by_germline[g->code]++ ;

        cout << s << endl;        
      }

    // Finish output preparation
    output.set("reads", "segmented", { nb_segmented }) ;
    output.set("reads", "total", { nb }) ;

    multigermline->insert(not_segmented);
    for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it){
      Germline *germline = *it ;
      if (nb_segmented_by_germline[germline->code])
        output.set("reads", "germline", germline->code, { nb_segmented_by_germline[germline->code] });
    }

  } else {
    cerr << "Ooops... unknown command. I don't know what to do apart from exiting!" << endl;
    return 1;
  }

  //$ Output statistics on filter()
  if (verbose && (kmer_threshold != NO_LIMIT_VALUE)) {
    cout << "Statistics on clone analysis (-Z):" << endl;
    for(list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it){
      FilterWithACAutomaton *f =  (*it)->getFilter_5();
      if (f)
        if (f->filtered_sequences_nb)
          cout << "\t" << (*it)->code << "\t" << *f;
    }
    cout << endl;
  }

  //$ Output AIRR .tsv
  cout << "  ==> " << f_airr << "   \t(AIRR output)" << endl;
  ofstream out_airr(f_airr.c_str());
  static_cast<SampleOutputAIRR *>(&output) -> out(out_airr);

  //$ Output .vidjil json
  cout << "  ==> " << f_json << "\t(data file for the Vidjil web application)" << endl ;
  ofstream out_json(f_json.c_str()) ;
  SampleOutputVidjil *outputVidjil = static_cast<SampleOutputVidjil *>(&output);

  outputVidjil->out(out_json);

  //$$ Clean
  if (__only_on_exit__clean_memory) { delete multigermline ; delete reads; } return 0 ;
}

//$$ end
