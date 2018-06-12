/*
  This file is part of Vidjil-algo <http://www.vidjil.org>
  Copyright (C) 2011-2018 by Bonsai bioinformatics
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

#include "lib/json.hpp"

#include "vidjil.h"

// RELEASE_TAG may be defined in the "release.h" file.
// If RELEASE_TAG is undefined, the version will be the git hash.
// #define RELEASE_TAG  "2013.04"
#include "release.h"

// GIT_VERSION should be defined in "git-version.h", created by "create-git-version-h.sh", to be used outside of releases
#include "git-version.h"

#define PROGNAME "vidjil-algo"
#define VIDJIL_JSON_VERSION "2016b"

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
#define COMMAND_SEGMENT "segment"
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
#define JSON_SUFFIX ".vidjil"

#define DEFAULT_K      0
#define DEFAULT_W      50
#define DEFAULT_SEED   DEFAULT_GERMLINE_SEED

#define DEFAULT_MAX_AUDITIONED 2000
#define DEFAULT_RATIO_REPRESENTATIVE 0.5

#define DEFAULT_EPSILON  0
#define DEFAULT_MINPTS   10

#define DEFAULT_CLUSTER_COST  Cluster
#define DEFAULT_SEGMENT_COST   VDJ

#define DEFAULT_TRIM 0

#define MAX_CLONES_FOR_SIMILARITY 20

// warn
#define WARN_MAX_CLONES 100
#define WARN_PERCENT_SEGMENTED 40
#define WARN_COVERAGE 0.6
#define WARN_NUM_CLONES_SIMILAR 10

// display
#define WIDTH_NB_READS 7
#define WIDTH_NB_CLONES 3


using namespace std ;
using json = nlohmann::json;

//$$ options: usage

extern char *optarg;

extern int optind, optopt, opterr;

int usage(char *progname, bool advanced)
{
  cerr << "Usage: " << progname << " [options] <reads.fa/.fq/.gz>" << endl << endl;

  cerr << "Command selection" << endl
       << "  -c <command>"
       << "\t"     << COMMAND_CLONES    << "  \t locus detection, window extraction, clone clustering (default command, most efficient, all outputs)" << endl
       << "  \t\t" << COMMAND_WINDOWS   << "  \t locus detection, window extraction" << endl
       << "  \t\t" << COMMAND_SEGMENT   << "  \t detailed V(D)J designation (not recommended)" << endl
       << "  \t\t" << COMMAND_GERMLINES << "  \t statistics on k-mers in different germlines" << endl
       << endl ;

  if (advanced)
  cerr << "Input" << endl
       << "  -# <string>   separator for headers in the reads file (default: '" << DEFAULT_READ_HEADER_SEPARATOR << "')" << endl
       << endl ;

  cerr << "Germline presets (at least one -g or -V/(-D)/-J option must be given for all commands except -c " << COMMAND_GERMLINES << ")" << endl
       << "  -g <.g file>(:filter)" << endl
       << "                multiple locus/germlines, with tuned parameters." << endl
       << "                Common values are '-g germline/homo-sapiens.g' or '-g germline/mus-musculus.g'" << endl
       << "                The list of locus/recombinations can be restricted, such as in '-g germline/homo-sapiens.g:IGH,IGK,IGL'" << endl
       << "  -g <path>     multiple locus/germlines, shortcut for '-g <path>/" << DEFAULT_MULTI_GERMLINE_FILE << "'" << endl
       << "                processes human TRA, TRB, TRG, TRD, IGH, IGK and IGL locus, possibly with some incomplete/unusal recombinations" << endl
       << "  -V <file>     custom V germline multi-fasta file" << endl
       << "  -D <file>     custom D germline multi-fasta file (and resets -m and -w options), will segment into V(D)J components" << endl
       << "  -J <file>     custom J germline multi-fasta file" << endl
       << endl

       << "Locus/recombinations" << endl
       << "  -d            try to detect several D (experimental)" << endl
       << "  -2            try to detect unexpected recombinations (must be used with -g)" << endl
       << endl ;

  if (advanced)
  cerr << "Experimental options (do not use)" << endl
       << "  -I            ignore k-mers common to different germline systems (experimental, must be used with -g, do not use)" << endl
       << "  -1            use a unique index for all germline systems (experimental, must be used with -g, do not use)" << endl
       << "  -4            try to detect unexpected recombinations with translocations (experimental, must be used with -g, do not use)" << endl
       << "  -!            keep unsegmented reads as clones, taking for junction the complete sequence, to be used on very small datasets (for example -!AX 20)" << endl
       << endl

       << "Window prediction" << endl
#ifndef NO_SPACED_SEEDS
       << "  (use either -s or -k option, but not both)" << endl
       << "  (all these options, except -w, are overriden when using -g)" << endl
       << "  -s <string>   spaced seed used for the V/J affectation" << endl
       << "                (default: #####-#####, ######-######, #######-#######, depends on germline)" << endl
#endif
       << "  -k <int>      k-mer size used for the V/J affectation (default: 10, 12, 13, depends on germline)" << endl
#ifndef NO_SPACED_SEEDS
       << "                (using -k option is equivalent to set with -s a contiguous seed with only '#' characters)" << endl
#endif
       << "  -w <int>      w-mer size used for the length of the extracted window (default: " << DEFAULT_W << ") ('" << NO_LIMIT << "': use all the read, no window clustering)" << endl
       << "  -e <float>    maximal e-value for determining if a V-J segmentation can be trusted (default: " << THRESHOLD_NB_EXPECTED << ")" << endl
       << "  -t <int>      trim V and J genes (resp. 5' and 3' regions) to keep at most <int> nt (default: " << DEFAULT_TRIM << ") (0: no trim)" << endl
       << endl

       << "Labeled sequences (windows related to these sequences will be kept even if -r/-% thresholds are not reached)" << endl
       << "  -W <sequence> label the given sequence" << endl
       << "  -l <file>     label a set of sequences given in <file>" << endl
       << "  -F            filter -- keep only the windows related to the labeled sequences" << endl
       << endl ;

  cerr << "Limits to report a clone (or a window)" << endl
       << "  -r <nb>       minimal number of reads supporting a clone (default: " << DEFAULT_MIN_READS_CLONE << ")" << endl
       << "  -% <ratio>    minimal percentage of reads supporting a clone (default: " << DEFAULT_RATIO_READS_CLONE << ")" << endl
       << endl

       << "Limits to further analyze some clones" << endl
       << "  -y <nb>       maximal number of clones computed with a consensus sequence ('" << NO_LIMIT << "': no limit) (default: " << DEFAULT_MAX_REPRESENTATIVES << ")" << endl
       << "  -z <nb>       maximal number of clones to be analyzed with a full V(D)J designation ('" << NO_LIMIT << "': no limit, do not use) (default: " << DEFAULT_MAX_CLONES << ")" << endl
       << "  -A            reports and segments all clones (-r 0 -% 0 -y " << NO_LIMIT << " -z " << NO_LIMIT << "), to be used only on very small datasets (for example -AX 20)" << endl
       << "  -x <nb>       maximal number of reads to process ('" << NO_LIMIT << "': no limit, default), only first reads" << endl
       << "  -X <nb>       maximal number of reads to process ('" << NO_LIMIT << "': no limit, default), sampled reads" << endl
       << endl ;

  if (advanced)
  cerr << "Fine segmentation options (second pass)" << endl
       << "  -f <string>   use custom Cost for fine segmenter : format \"match, subst, indels, del_end, homo\" (default "<< DEFAULT_SEGMENT_COST <<" )"<< endl
       << "  -E <float>    maximal e-value for determining if a D segment can be trusted (default: " << THRESHOLD_NB_EXPECTED_D << ")" << endl
       << "  -Z <nb>       use custom filter with threshold to reduce calculation time" << endl
       << endl;

  cerr << "Clone analysis (second pass)" << endl
       << "  -3            CDR3/JUNCTION detection (requires gapped V/J germlines)" << endl
       << endl ;

  if (advanced)
  cerr << "Additional clustering (experimental)" << endl
       << "  -= <file>     manual clustering -- a file used to force some specific edges" << endl
       << "  -n <int>      maximum distance between neighbors for automatic clustering (default " << DEFAULT_EPSILON << "). No automatic clusterisation if =0." << endl
       << "  -N <int>      minimum required neighbors for automatic clustering (default " << DEFAULT_MINPTS << ")" << endl
       << "  -S            generate and save comparative matrix for clustering" << endl
       << "  -L            load comparative matrix for clustering" << endl
       << "  -C <string>   use custom Cost for automatic clustering : format \"match, subst, indels, del_end, homo\" (default "<< DEFAULT_CLUSTER_COST <<" )"<< endl
       << endl ;

  cerr << "Detailed output per read (generally not recommended, large files, but may be used for filtering, as in -uu -X 1000)" << endl
       << "  -U            output segmented reads (in " << SEGMENTED_FILENAME << " file)" << endl
       << "  -u            output unsegmented reads, gathered by unsegmentation cause, except for very short and 'too few V/J' reads (in *" << UNSEGMENTED_DETAIL_FILENAME << " files)" << endl
       << "  -uu           output unsegmented reads, gathered by unsegmentation cause, all reads (in *" << UNSEGMENTED_DETAIL_FILENAME << " files) (use only for debug)" << endl
       << "  -uuu          output unsegmented reads, all reads, including a " << UNSEGMENTED_FILENAME << " file (use only for debug)" << endl

       << "  -K            output detailed k-mer affectation on all reads (in " << AFFECTS_FILENAME << " file) (use only for debug, for example -KX 100)" << endl
       << endl
 
       << "Output" << endl
       << "  -o <dir>      output directory (default: " << DEFAULT_OUT_DIR << ")" <<  endl
       << "  -b <string>   output basename (by default basename of the input file)" << endl
    
       << "  -a            output all sequences by cluster (" << CLONE_FILENAME << "*), to be used only on small datasets" << endl
       << "  -v            verbose mode" << endl
       << endl        

       << "  -h            help" << endl
       << "  -H            help, including experimental and advanced options" << endl
       << "The full help is available in the doc/algo.org file."
       << endl

       << endl 
       << "Examples (see doc/algo.org)" << endl
       << "  " << progname << " -c clones   -g germline/homo-sapiens.g   -2 -3 -r 1  demo/Demo-X5.fa           # (basic usage, detect the locus for each read," << endl
       << "                                                                                               #  cluster reads and report clones starting from the first read (-r 1)," << endl
       << "                                                                                               #  including unexpected recombinations (-2), assign V(D)J genes and try to detect the CDR3s (-3))" << endl
       << "  " << progname << " -c clones   -g germline/homo-sapiens.g:IGH    -3     demo/Stanford_S22.fasta   # (restrict to complete recombinations on the IGH locus)" << endl
       << "  " << progname << " -c clones   -g germline/homo-sapiens.g   -2 -3 -z 20 demo/LIL-L4.fastq.gz      # (basic usage, output detailed V(D)J analysis on the first 20 clones)" << endl
       << "  " << progname << " -c windows  -g germline/homo-sapiens.g   -y 0 -uu -U demo/LIL-L4.fastq.gz      # (splits all the reads into (large) files depending on the detection of V(D)J recombinations)" << endl
       << "  " << progname << " -c segment  -g germline/homo-sapiens.g   -2 -3 -X 50 demo/Stanford_S22.fasta   # (full analysis of each read, only for debug/testing, here on 50 sampled reads)" << endl
       << "  " << progname << " -c germlines -g germline/homo-sapiens.g              demo/Stanford_S22.fasta   # (statistics on the k-mers)" << endl
    ;
  return 1;
}


int atoi_NO_LIMIT(char *optarg)
{
  return strcmp(NO_LIMIT, optarg) ? atoi(optarg) : NO_LIMIT_VALUE ;
}
double atof_NO_LIMIT(char *optarg)
{
  return strcmp(NO_LIMIT, optarg) ? atof(optarg) : NO_LIMIT_VALUE ;
}

int main (int argc, char **argv)
{
  cout << "# " << PROGNAME << " -- V(D)J recombinations analysis <http://www.vidjil.org/>" << endl
       << "# Copyright (C) 2011-2018 by the Vidjil team" << endl
       << "# Bonsai bioinformatics at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille" << endl 
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

  //$$ options: defaults

  list <string> f_reps_V ;
  list <string> f_reps_D ;
  list <string> f_reps_J ;
  list <pair <string, string>> multi_germline_paths_and_files ;

  string read_header_separator = DEFAULT_READ_HEADER_SEPARATOR ;
  string f_reads = DEFAULT_READS ;
  string seed = DEFAULT_SEED ;
  bool seed_changed = false;
  string f_basename = "";

  string out_dir = DEFAULT_OUT_DIR;
  
  string comp_filename = COMP_FILENAME;

  int wmer_size = DEFAULT_W ;

  IndexTypes indexType = KMER_INDEX;

  int epsilon = DEFAULT_EPSILON ;
  int minPts = DEFAULT_MINPTS ;
  Cost cluster_cost = DEFAULT_CLUSTER_COST ;
  Cost segment_cost = DEFAULT_SEGMENT_COST ;
  bool detect_CDR3 = false;
  
  int save_comp = 0;
  int load_comp = 0;
  
  int verbose = 0 ;
  int command = CMD_CLONES;

  int max_representatives = DEFAULT_MAX_REPRESENTATIVES ;
  int max_clones = DEFAULT_MAX_CLONES ;
  int min_reads_clone = DEFAULT_MIN_READS_CLONE ;
  float ratio_reads_clone = DEFAULT_RATIO_READS_CLONE;
  // int average_deletion = 4;     // Average number of deletion in V or J

  int max_reads_processed = NO_LIMIT_VALUE;
  int max_reads_processed_sample = NO_LIMIT_VALUE;

  float ratio_representative = DEFAULT_RATIO_REPRESENTATIVE;
  unsigned int max_auditionned = DEFAULT_MAX_AUDITIONED;

  int trim_sequences = DEFAULT_TRIM;

  bool trim_sequences_changed = false;
  
  bool output_sequences_by_cluster = false;
  bool output_segmented = false;
  bool output_unsegmented = false;
  bool output_unsegmented_detail = false;
  bool output_unsegmented_detail_full = false;
  bool output_affects = false;
  bool keep_unsegmented_as_clone = false;

  bool several_D = false;

  bool multi_germline = false;
  bool multi_germline_mark = false;
  bool multi_germline_one_index_per_germline = true;
  bool multi_germline_unexpected_recombinations_12 = false;
  bool multi_germline_unexpected_recombinations_1U = false;

  string forced_edges = "" ;

  map <string, string> windows_labels ;
  string windows_labels_file = "" ;
  bool only_labeled_windows = false ;

  char c ;

  int options_s_k = 0 ;

  double expected_value = THRESHOLD_NB_EXPECTED;
  double expected_value_D = THRESHOLD_NB_EXPECTED_D;

  //json which contains the Levenshtein distances
  json jsonLevenshtein;
  bool jsonLevenshteinComputed = false ;

  //$$ options: getopt


  while ((c = getopt(argc, argv, "A!x:X:hHadI124g:V:D:J:k:r:vw:e:E:C:f:W:l:Fc:N:s:b:Sn:o:L%:y:z:uUK3E:t:#:q")) != EOF)

    switch (c)
      {
      case 'h':
        return usage(argv[0], false);

      case 'H':
        return usage(argv[0], true);
      case 'c':
        if (!strcmp(COMMAND_CLONES,optarg))
          command = CMD_CLONES;
        else if (!strcmp(COMMAND_SEGMENT,optarg))
          command = CMD_SEGMENT;
        else if (!strcmp(COMMAND_WINDOWS,optarg))
          command = CMD_WINDOWS;
        else if (!strcmp(COMMAND_GERMLINES,optarg))
          command = CMD_GERMLINES;
        else {
          cerr << "Unknwown command " << optarg << endl;
	  return usage(argv[0], false);
        }
        break;

      case 'q':
        indexType = AC_AUTOMATON;
        break;

      // Input
      case '#':
        read_header_separator = string(optarg);
        break;

      // Germline

      case 'V':
	f_reps_V.push_back(optarg);
	break;

      case 'D':
	f_reps_D.push_back(optarg);
	break;
        
      case 'J':
	f_reps_J.push_back(optarg);
	break;

      case 'g':
	multi_germline = true;
        {
          string arg = string(optarg);
          struct stat buffer;
          if (stat(arg.c_str(), &buffer) == 0)
            {
              if( buffer.st_mode & S_IFDIR )
                {
                  // argument is a directory
                  multi_germline_paths_and_files.push_back(make_pair(arg, DEFAULT_MULTI_GERMLINE_FILE)) ;
                  break ;
                }
            }

          // argument is not a directory (and basename can include ':' with a filter)
          multi_germline_paths_and_files.push_back(make_pair(extract_dirname(arg), extract_basename(arg, false)));
          break ;
        }

      case 'd':
        several_D = true;
        break;

      case 'I':
        multi_germline_mark = true;
	break;

      case '1':
        multi_germline_one_index_per_germline = false ;
        break;

      case '2':
        multi_germline_unexpected_recombinations_12 = true ;
        break;

      case '4':
        multi_germline_unexpected_recombinations_1U = true ;
        break;

	break;

      // Algorithm

      case 's':
#ifndef NO_SPACED_SEEDS
	seed = string(optarg);
        seed_changed = true;
	options_s_k++ ;
#else
        cerr << "To enable the option -s, please compile without NO_SPACED_SEEDS" << endl;
#endif
        break;

      case 'k':
        {
          int kmer_size = atoi(optarg);
          seed = seed_contiguous(kmer_size);
          seed_changed = true;
        }
	options_s_k++ ;
        break;

      case 'w':
	wmer_size = atoi_NO_LIMIT(optarg);
        break;

      case '!':
        keep_unsegmented_as_clone = true;
        break;

      case 'e':
        expected_value = atof_NO_LIMIT(optarg);
        break;

      case 'E':
        expected_value_D = atof_NO_LIMIT(optarg);
        break;

      // Output 

      case 'o':
        out_dir = optarg ;
        break;

      case 'b':
        f_basename = optarg;
        break;

      case 'a':
	output_sequences_by_cluster = true;
	break;

      case 't':
        trim_sequences = atoi(optarg);
        trim_sequences_changed = true;
        break;

      case 'v':
	verbose += 1 ;
	break;

      // Limits

      case '%':
	ratio_reads_clone = atof(optarg);
	break;

      case 'r':
	min_reads_clone = atoi(optarg);
        break;

      case 'y':
	max_representatives = atoi_NO_LIMIT(optarg);
        break;

      case 'z':
	max_clones = atoi_NO_LIMIT(optarg);
        if ((max_representatives < max_clones) && (max_representatives != NO_LIMIT_VALUE))
          max_representatives = max_clones ;
        break;

      case 'A': // --all
	ratio_reads_clone = 0 ;
	min_reads_clone = 1 ;
	max_representatives = NO_LIMIT_VALUE ;
	max_clones = NO_LIMIT_VALUE ;
	break ;

      case 'X':
        max_reads_processed_sample = atoi_NO_LIMIT(optarg);
        break;

      case 'x':
        max_reads_processed = atoi_NO_LIMIT(optarg);
        break;

      // Labels

      case 'W':
        windows_labels[string(optarg)] = string("-W");
        break;

      case 'l':
	windows_labels_file = optarg; 
	break;

      case 'F':
        only_labeled_windows = true;
        break;

      // Clustering

      case '=':
	forced_edges = optarg;
	break;
	
      case 'n':
	epsilon = atoi(optarg);
        break;

      case 'N':
	minPts = atoi(optarg);
        break;
	
      case 'S':
	save_comp=1;
        break;

      case 'L':
	load_comp=1;
        break;
	
      case 'C':
	cluster_cost=strToCost(optarg, Cluster);
        break;
	
      // Fine segmentation
      case '3':
        detect_CDR3 = true;
        break;
        
      case 'f':
	segment_cost=strToCost(optarg, VDJ);
        break;

      case 'u':
        output_unsegmented = output_unsegmented_detail_full ;       // -uuu
        output_unsegmented_detail_full = output_unsegmented_detail; // -uu
        output_unsegmented_detail = true;                           // -u
        break;
      case 'U':
        output_segmented = true;
        break;
      case 'K':
        output_affects = true;
        break;
      }


  //$$ options: post-processing+display


  if (!multi_germline && (!f_reps_V.size() || !f_reps_J.size()))
    {
      cerr << ERROR_STRING << "At least one germline must be given with -g or -V/(-D)/-J." << endl ;
      return 1;
    }

  if (options_s_k > 1)
    {
      cerr << ERROR_STRING << "Use at most one -s or -k option." << endl ;
      return 1;
    }

  string out_seqdir = out_dir + "/seq/" ;

  if (verbose)
    cout << "# verbose " << verbose << endl ;

  if (optind == argc)
    {
      cout << "# using default sequence file: " << f_reads << endl ;
    }
  else if (optind+1 == argc)
    {
      f_reads = argv[optind] ; 
    }
  else
    {
      cerr << ERROR_STRING << "Wrong number of arguments." << endl ;
      return 1;
    }

  size_t min_cover_representative = (size_t) (min_reads_clone < (int) max_auditionned ? min_reads_clone : max_auditionned) ;

  // Default seeds

#ifdef NO_SPACED_SEEDS
  if (! seed_changed)
    {
      cerr << ERROR_STRING << PROGNAME << " was compiled with NO_SPACED_SEEDS: please provide a -k option." << endl;
      return 1;
  }
#endif
	  

#ifndef NO_SPACED_SEEDS
  // Check seed buffer  
  if (seed.size() >= MAX_SEED_SIZE)
    {
      cerr << ERROR_STRING << "Seed size is too large (MAX_SEED_SIZE)." << endl ;
      return 1;
    }
#endif


  if ((wmer_size< 0) && (wmer_size!= NO_LIMIT_VALUE))
    {
      cerr << ERROR_STRING << "Too small -w. The window size should be positive" << endl;
      return 1;
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
	   << "* WARNING: " << PROGNAME << " was run with '-c segment' option" << endl ;
    }
  
  if (max_clones == NO_LIMIT_VALUE || max_clones > WARN_MAX_CLONES || command == CMD_SEGMENT)
    {
      cout << "* " << PROGNAME << " efficientl extracts windows overlapping the CDR3" << endl
           << "* to cluster reads into clones ('-c clones')." << endl
           << "* Computing accurate V(D)J designations for many sequences ('-c segment' or large '-z' values)" << endl
           << "* is slow and should be done only on small datasets or for testing purposes." << endl
	   << "* More information is provided in the 'doc/algo.org' file." << endl 
	   << endl ;
    }


  /////////////////////////////////////////
  //            JSON OUTPUT              //
  /////////////////////////////////////////

  string f_json = out_dir + f_basename + JSON_SUFFIX ;

  ostringstream stream_cmdline;
  for (int i=0; i < argc; i++) stream_cmdline << argv[i] << " ";

  json j = {
    {"vidjil_json_version", VIDJIL_JSON_VERSION},
    {"samples", {
        {"number", 1},
        {"original_names", {f_reads}},
        {"run_timestamp", {time_buffer}},
        {"producer", {soft_version}},
        {"commandline", {stream_cmdline.str()}}
      }}
  };


  /////////////////////////////////////////
  //            LOAD GERMLINES           //
  /////////////////////////////////////////

  if (command == CMD_GERMLINES)
    {
      multi_germline = true ;
      multi_germline_one_index_per_germline = false ;
    }

  MultiGermline *multigermline = new MultiGermline(indexType, multi_germline_one_index_per_germline);

    {
      cout << "Load germlines and build Kmer indexes" << endl ;
    
      if (multi_germline)
	{
          for (pair <string, string> path_file: multi_germline_paths_and_files)
            {
              try {
                multigermline->build_from_json(path_file.first, path_file.second, GERMLINES_REGULAR,
                                               FIRST_IF_UNCHANGED("", seed, seed_changed),
                                               FIRST_IF_UNCHANGED(0, trim_sequences, trim_sequences_changed));
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
                                  seed, trim_sequences);

          germline->new_index(indexType);

	  multigermline->insert(germline);
	}
    }

    cout << endl ;

    if (!multi_germline_one_index_per_germline) {
      multigermline->build_with_one_index(seed, true);
    }

      if (multi_germline_unexpected_recombinations_12 || multi_germline_unexpected_recombinations_1U) {
        if (!multigermline->index) {
          multigermline->build_with_one_index(seed, false);
        }
      }

      if (multi_germline_unexpected_recombinations_12) {
        Germline *pseudo = new Germline(PSEUDO_UNEXPECTED, PSEUDO_UNEXPECTED_CODE, "", trim_sequences);
        pseudo->seg_method = SEG_METHOD_MAX12 ;
        pseudo->set_index(multigermline->index);
        multigermline->germlines.push_back(pseudo);
      }

      if (multi_germline_unexpected_recombinations_1U) {
        Germline *pseudo_u = new Germline(PSEUDO_UNEXPECTED, PSEUDO_UNEXPECTED_CODE, "", trim_sequences);
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
                                       FIRST_IF_UNCHANGED(0, trim_sequences, trim_sequences_changed));
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
  } catch (const invalid_argument e) {
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
      
      delete multigermline;

      return 0;
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
                                                expected_value, nb_reads_for_evalue);
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
        json_add_warning(j, "W20", "Very few V(D)J recombinations found: " + fixed_string_of_float(ratio_segmented, 2) + "%");
        stream_segmentation_info << "  ! There are not so many CDR3 windows found in this set of reads." << endl ;
        stream_segmentation_info << "  ! Please check the unsegmentation causes below and refer to the documentation." << endl ;
      }

    we.out_stats(stream_segmentation_info);
    
    cout << stream_segmentation_info.str();
      map <junction, json> json_data_segment ;
    

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

	if (load_comp==1) 
	  {
	    comp.load((out_dir+f_basename + "." + comp_filename).c_str());
	  }
	else
	  {
	    comp.compare( cout, cluster_cost);
	  }
	
	if (save_comp==1)
	  {
	    comp.save(( out_dir+f_basename + "." + comp_filename).c_str());
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
	cout << "  ! See the 'Limits to report a clone' options (-r, -%, -z, -A)." << endl;
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

      //$$ If max_representatives is reached, we stop here but still outputs the window

      if ((max_representatives >= 0) && (num_clone >= max_representatives + 1)
          && ! windowsStorage->isInterestingJunction(it->first))
	{
	  out_clones << window_str << endl ;
	  continue;
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

        
        json json_clone;
        json_clone["sequence"] = kseg->getSequence().sequence;
        json_clone["_coverage"] = { repComp.getCoverage() };
        json_clone["_average_read_length"] = { windowsStorage->getAverageLength(it->first) };
        json_clone["_coverage_info"] = {repComp.getCoverageInfo()};
        //From KmerMultiSegmenter
        json_clone["seg"] = kseg->toJson();

        if (repComp.getQuality().length())
        json_clone["seg"]["quality"] = {
            {"start", 1},
            {"stop", kseg->getSequence().sequence.length()},
            {"seq", repComp.getQuality()}
        };

        if (repComp.getCoverage() < WARN_COVERAGE)
          json_add_warning(json_clone, "W51", "Low coverage: " + fixed_string_of_float(repComp.getCoverage(), 3));
        
        if (label.length())
          json_clone["label"] = label ;

        //$$ If max_clones is reached, we stop here but still outputs the representative

        if ((max_clones >= 0) && (num_clone >= max_clones + 1)
            && ! windowsStorage->isInterestingJunction(it->first))

          {
            cout << representative << endl ;
            out_clones << representative << endl ;
            json_data_segment[it->first] = json_clone;
            continue;
          }


        // FineSegmenter
        size_t nb_fine_segmented = (size_t) max_clones; // When -1, it will become the max value.
        nb_fine_segmented = MIN(nb_fine_segmented, sort_clones.size());
        FineSegmenter seg(representative, segmented_germline, segment_cost, expected_value, nb_fine_segmented);
	
        if (segmented_germline->seg_method == SEG_METHOD_543)
	  seg.FineSegmentD(segmented_germline, several_D, expected_value_D, nb_fine_segmented);

        if (detect_CDR3)
          seg.findCDR3();

          
	// Output representative, possibly segmented... 
	// to stdout, CLONES_FILENAME, and CLONE_FILENAME-*
	cout << seg << endl ;
	out_clone << seg << endl ;
	out_clones << seg << endl ;
    
        
        // From FineSegmenter
        if (seg.code.length() > 0)
          json_clone["name"] = seg.code;
        json json_fseg = seg.toJson();
        for (json::iterator it = json_fseg.begin(); it != json_fseg.end(); ++it) {
          json_clone["seg"][it.key()] = it.value();
        }

        if (seg.isSegmented())
	  {
	      // Check for identical code, outputs to out_edge
              string code = seg.code ;
              int cc = clones_codes[code];

              if (cc)
                {
                  cout << " (similar to Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << cc << setfill(' ') << ")";
                  json_add_warning(json_clone, "W53", "Similar to another clone " + code,
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

        json_data_segment[it->first] = json_clone;
        
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

    //$$ .json output: json_data_segment
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

    json jsonSortedWindows = windowsStorage->sortedWindowsToJson(json_data_segment);
    
    json reads_germline;
    for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it){
        Germline *germline = *it ;
        reads_germline[germline->code] = {we.getNbReadsGermline(germline->code)};
    }


    // Complete main json output
    j["diversity"] = jsonDiversity ;
    j["samples"]["log"] = { stream_segmentation_info.str() } ;
    j["reads"] = {
            {"total", {nb_total_reads}},
            {"segmented", {nb_segmented}},
            {"germline", reads_germline}
    } ;
    j["clones"] = jsonSortedWindows ;
    j["germlines"] = json_germlines ;

    j["germlines"]["ref"] = multigermline->ref ;
    j["germlines"]["species"] = multigermline->species ;
    j["germlines"]["species_taxon_id"] = multigermline->species_taxon_id ;

    if (epsilon || forced_edges.size()){
        j["clusters"] = comp.toJson(clones_windows);
    }
    
    //Added edges in the json output file
    if (jsonLevenshteinComputed)
    j["similarity"] = jsonLevenshtein;


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
    //       V(D)J SEGMENTATION           //
    ////////////////////////////////////////

    json json_clones ;

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
        
        FineSegmenter s(seq, germline, segment_cost, expected_value, nb_reads_for_evalue);

        json json_clone;
        json_clone["id"] = seq.label;
        json_clone["sequence"] = seq.sequence;
        json_clone["reads"] = { 1 };
        json_clone["top"] = 0;
        Germline *g ;

            if (s.isSegmented()) 
              {
                nb_segmented++ ;

                if (germline->seg_method == SEG_METHOD_543)
                  s.FineSegmentD(germline, several_D, expected_value_D, nb_reads_for_evalue);

                if (detect_CDR3)
                  s.findCDR3();

                json_clone["name"] = s.code;
                json_clone["seg"] = s.toJson();
                g = germline ;
              }
        else
          {
            g = not_segmented ;
          }

        json_clone["germline"] = g->code;
        nb_segmented_by_germline[g->code]++ ;

        json_clones += json_clone;

        cout << s << endl;        
      }

    // Finish .json preparation
    j["clones"] = json_clones;
    j["reads"]["segmented"] = { nb_segmented } ;
    j["reads"]["total"] = { nb } ;

    multigermline->insert(not_segmented);
    for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it){
      Germline *germline = *it ;
      if (nb_segmented_by_germline[germline->code])
        j["reads"]["germline"][germline->code] = { nb_segmented_by_germline[germline->code] } ;
    }

  } else {
    cerr << "Ooops... unknown command. I don't know what to do apart from exiting!" << endl;
    return 1;
  }
  
  //$ Output json
  cout << "  ==> " << f_json << "\t(data file for the web application)" << endl ;
  ofstream out_json(f_json.c_str()) ;

  out_json << j.dump(2);

  //$$ Clean
  delete multigermline ;
  delete reads;
}

//$$ end
