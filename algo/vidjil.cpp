/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011, 2012, 2013, 2014, 2015 by Bonsai bioinformatics 
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
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

#include "core/tools.h"
#include "core/json.h"
#include "core/germline.h"
#include "core/kmerstore.h"
#include "core/fasta.h"
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

#include "vidjil.h"

// RELEASE_TAG may be defined in the "release.h" file.
// If RELEASE_TAG is undefined, the version will be the git hash.
// #define RELEASE_TAG  "2013.04"
#include "release.h"

// GIT_VERSION should be defined in "git-version.h", created by "create-git-version-h.sh", to be used outside of releases
#include "git-version.h"

#define VIDJIL_JSON_VERSION "2014.10"

//$$ #define (mainly default options)

#define DEFAULT_MULTIGERMLINE "germline"

#define DEFAULT_READS  "./data/Stanford_S22.fasta"
#define DEFAULT_MIN_READS_CLONE 5
#define DEFAULT_MAX_REPRESENTATIVES 100
#define DEFAULT_MAX_CLONES 20
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
#define AFFECTS_FILENAME ".affects"
#define EDGES_FILENAME ".edges"
#define COMP_FILENAME "comp.vidjil"
#define JSON_SUFFIX ".vidjil"

// "tests/data/leukemia.fa" 

#define DEFAULT_K      0
#define DEFAULT_W      50
#define DEFAULT_SEED   ""

#define DEFAULT_DELTA_MIN  -10
#define DEFAULT_DELTA_MAX   20

#define DEFAULT_DELTA_MIN_D  0
#define DEFAULT_DELTA_MAX_D  80

#define DEFAULT_MAX_AUDITIONED 2000
#define DEFAULT_RATIO_REPRESENTATIVE 0.5

#define DEFAULT_EPSILON  0
#define DEFAULT_MINPTS   10

#define DEFAULT_CLUSTER_COST  Cluster
#define DEFAULT_SEGMENT_COST   VDJ

#define DEFAULT_TRIM 100

// error
#define ERROR_STRING "[error] "

// warn
#define WARN_MAX_CLONES 100
#define WARN_PERCENT_SEGMENTED 40

// display
#define WIDTH_NB_READS 7
#define WIDTH_NB_CLONES 3


using namespace std ;

//$$ options: usage

extern char *optarg;

extern int optind, optopt, opterr;

void usage(char *progname, bool advanced)
{
  cerr << "Usage: " << progname << " [options] <reads.fa/.fq/.gz>" << endl << endl;

  cerr << "Command selection" << endl
       << "  -c <command>"
       << "\t"     << COMMAND_CLONES    << "  \t locus detection, window extraction, clone gathering (default command, most efficient, all outputs)" << endl
       << "  \t\t" << COMMAND_WINDOWS   << "  \t locus detection, window extraction" << endl
       << "  \t\t" << COMMAND_SEGMENT   << "  \t detailed V(D)J segmentation (not recommended)" << endl
       << "  \t\t" << COMMAND_GERMLINES << "  \t statistics on k-mers in different germlines" << endl
       << endl       

       << "Germline databases (one -V/(-D)/-J, or -G, or -g option must be given for all commands except -c " << COMMAND_GERMLINES << ")" << endl
       << "  -V <file>     V germline multi-fasta file" << endl
       << "  -D <file>     D germline multi-fasta file (and resets -m, -M and -w options), will segment into V(D)J components" << endl
       << "  -J <file>     J germline multi-fasta file" << endl
       << "  -G <prefix>   prefix for V (D) and J repertoires (shortcut for -V <prefix>V.fa -D <prefix>D.fa -J <prefix>J.fa) (basename gives germline code)" << endl
       << "  -g <path>     multiple germlines (in the path <path>, takes TRA, TRB, TRG, TRD, IGH, IGK and IGL and sets window prediction parameters)" << endl
       << "  -i            multiple germlines, also incomplete rearrangements (must be used with -g)" << endl
       << endl ;

  if (advanced)
  cerr << "Experimental options (do not use)" << endl
       << "  -I            ignore k-mers common to different germline systems (experimental, must be used with -g, do not use)" << endl
       << "  -1            use a unique index for all germline systems (experimental, must be used with -g, do not use)" << endl
       << "  -2            try to detect unexpected recombinations (experimental, must be used with -g, do not use)" << endl
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
       << "  -m <int>      minimal admissible delta between last V and first J k-mer (default: " << DEFAULT_DELTA_MIN << ") (default with -D: " << DEFAULT_DELTA_MIN_D << ")" << endl
       << "  -M <int>      maximal admissible delta between last V and first J k-mer (default: " << DEFAULT_DELTA_MAX << ") (default with -D: " << DEFAULT_DELTA_MAX_D << ")" << endl
       << "  -w <int>      w-mer size used for the length of the extracted window (default: " << DEFAULT_W << ")" << endl
       << "  -e <float>    maximal e-value for determining if a segmentation can be trusted (default: " << THRESHOLD_NB_EXPECTED << ")" << endl
       << "  -t <int>      trim V and J genes (resp. 5' and 3' regions) to keep at most <int> nt (default: " << DEFAULT_TRIM << ")" << endl
       << endl

       << "Labeled windows (these windows will be kept even if -r/-% thresholds are not reached)" << endl
       << "  -W <window>   label the given window" << endl
       << "  -l <file>     label a set of windows given in <file>" << endl
       << "  -F            filter -- keep only the labeled windows" << endl
       << endl ;

  cerr << "Limits to report a clone (or a window)" << endl
       << "  -r <nb>       minimal number of reads supporting a clone (default: " << DEFAULT_MIN_READS_CLONE << ")" << endl
       << "  -% <ratio>    minimal percentage of reads supporting a clone (default: " << DEFAULT_RATIO_READS_CLONE << ")" << endl
       << endl

       << "Limits to further analyze some clones" << endl
       << "  -y <nb>       maximal number of clones computed with a representative ('" << NO_LIMIT << "': no limit) (default: " << DEFAULT_MAX_REPRESENTATIVES << ")" << endl
       << "  -z <nb>       maximal number of clones to be segmented ('" << NO_LIMIT << "': no limit, do not use) (default: " << DEFAULT_MAX_CLONES << ")" << endl
       << "  -A            reports and segments all clones (-r 0 -% 0 -y " << NO_LIMIT << " -z " << NO_LIMIT << "), to be used only on very small datasets (for example -AX 20)" << endl
       << "  -x <nb>       maximal number of reads to process ('" << NO_LIMIT << "': no limit, default), only first reads" << endl
       << "  -X <nb>       maximal number of reads to process ('" << NO_LIMIT << "': no limit, default), sampled reads" << endl
       << endl ;

  if (advanced)
  cerr << "Fine segmentation options (second pass, see warning in doc/algo.org)" << endl
       << "  -f <string>   use custom Cost for fine segmenter : format \"match, subst, indels, homo, del_end\" (default "<<VDJ<<" )"<< endl
       << "  -3            CDR3 detection (experimental)" << endl
       << endl

       << "Additional clustering (experimental)" << endl
       << "  -E <file>     manual clustering -- a file used to force some specific edges" << endl
       << "  -n <int>      maximum distance between neighbors for automatic clustering (default " << DEFAULT_EPSILON << "). No automatic clusterisation if =0." << endl
       << "  -N <int>      minimum required neighbors for automatic clustering (default " << DEFAULT_MINPTS << ")" << endl
       << "  -S            generate and save comparative matrix for clustering" << endl
       << "  -L            load comparative matrix for clustering" << endl
       << "  -C <string>   use custom Cost for automatic clustering : format \"match, subst, indels, homo, del_end\" (default "<<Cluster<<" )"<< endl
       << endl ;

  cerr << "Detailed output per read (not recommended, large files)" << endl
       << "  -U            output segmented reads (in " << SEGMENTED_FILENAME << " file)" << endl
       << "  -u            output unsegmented reads (in " << UNSEGMENTED_FILENAME << " file)" << endl
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
       << "  " << progname << " -c clones   -G germline/IGH  -r 5          data/Stanford_S22.fasta" << endl
       << "  " << progname << " -c clones   -g germline      -r 5          data/Stanford_S22.fasta   # (detect the locus for each read)" << endl
       << "  " << progname << " -c windows  -g germline      -u -U         data/Stanford_S22.fasta   # (detect the locus, splits the reads into two (large) files)" << endl
       << "  " << progname << " -c segment  -G germline/IGH                data/Stanford_S22.fasta   # (only for testing)" << endl
       << "  " << progname << " -c germlines                               data/Stanford_S22.fasta" << endl
    ;
  exit(1);
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
  cout << "# Vidjil -- V(D)J recombinations analysis <http://www.vidjil.org/>" << endl
       << "# Copyright (C) 2011, 2012, 2013, 2014, 2015 by the Vidjil team" << endl
       << "# Bonsai bioinformatics at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille" << endl 
       << endl
       << "# Vidjil is free software, and you are welcome to redistribute it" << endl
       << "# under certain conditions -- see http://git.vidjil.org/blob/master/doc/LICENSE" << endl
       << "# No lymphocyte was harmed in the making of this software," << endl
       << "# however this software is for research use only and comes with no warranty." << endl
       << endl
       << "# Please cite http://biomedcentral.com/1471-2164/15/409 if you use Vidjil." 
       << endl ;

  //$$ options: defaults

  string germline_system = "" ;
  
  list <string> f_reps_V ;
  list <string> f_reps_D ;
  list <string> f_reps_J ;

  string f_reads = DEFAULT_READS ;
  string seed = DEFAULT_SEED ;
  string f_basename = "";

  string out_dir = DEFAULT_OUT_DIR;
  
  string comp_filename = COMP_FILENAME;

  int k = DEFAULT_K ;
  int w = DEFAULT_W ;

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

  int max_reads_processed = -1;
  int max_reads_processed_sample = -1;

  float ratio_representative = DEFAULT_RATIO_REPRESENTATIVE;
  unsigned int max_auditionned = DEFAULT_MAX_AUDITIONED;

  // Admissible delta between left and right segmentation points
  int delta_min = DEFAULT_DELTA_MIN ; // Kmer+Fine
  int delta_max = DEFAULT_DELTA_MAX ; // Fine
  int trim_sequences = DEFAULT_TRIM;

  bool output_sequences_by_cluster = false;
  bool output_segmented = false;
  bool output_unsegmented = false;
  bool output_affects = false;
  bool keep_unsegmented_as_clone = false;

  bool multi_germline = false;
  bool multi_germline_incomplete = false;
  bool multi_germline_mark = false;
  bool multi_germline_one_index_per_germline = true;
  bool multi_germline_unexpected_recombinations = false;
  string multi_germline_file = DEFAULT_MULTIGERMLINE;

  string forced_edges = "" ;

  map <string, string> windows_labels ;
  string windows_labels_file = "" ;
  bool only_labeled_windows = false ;

  char c ;

  int options_s_k = 0 ;

  double expected_value = THRESHOLD_NB_EXPECTED;

  //JsonArray which contains the Levenshtein distances
  JsonArray jsonLevenshtein;

  //$$ options: getopt


  while ((c = getopt(argc, argv, "A!x:X:hHaiI12g:G:V:D:J:k:r:vw:e:C:f:W:l:Fc:m:M:N:s:b:Sn:o:L%:y:z:uUK3E:t:")) != EOF)

    switch (c)
      {
      case 'h':
        usage(argv[0], false);

      case 'H':
        usage(argv[0], true);

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
	  usage(argv[0], false);
        }
        break;


      // Germline

      case 'V':
	f_reps_V.push_back(optarg);
	germline_system = "custom" ;
	break;

      case 'D':
	f_reps_D.push_back(optarg);
	delta_min = DEFAULT_DELTA_MIN_D ;
	delta_max = DEFAULT_DELTA_MAX_D ;
	break;
        
      case 'J':
	f_reps_J.push_back(optarg);
	germline_system = "custom" ;
	break;

      case 'g':
	multi_germline = true;
	multi_germline_file = string(optarg);
	germline_system = "multi" ;
	break;

      case 'i':
	multi_germline_incomplete = true;
	break;

      case 'I':
        multi_germline_mark = true;
	break;

      case '1':
        multi_germline_one_index_per_germline = false ;
        break;

      case '2':
        multi_germline_unexpected_recombinations = true ;
        break;

      case 'G':
	germline_system = string(optarg);
	f_reps_V.push_back((germline_system + "V.fa").c_str()) ;
        // Takes D only if it exists
        {
          struct stat buffer; 
          string putative_f_rep_D = germline_system + "D.fa" ;
          if (stat(putative_f_rep_D.c_str(), &buffer) == 0)
            {
              f_reps_D.push_back(putative_f_rep_D.c_str()) ;
              delta_min = DEFAULT_DELTA_MIN_D ;
              delta_max = DEFAULT_DELTA_MAX_D ;
            }
        }
	f_reps_J.push_back((germline_system + "J.fa").c_str()) ;
	germline_system = extract_basename(germline_system);

	break;

      // Algorithm

      case 's':
#ifndef NO_SPACED_SEEDS
	seed = string(optarg);
	k = seed_weight(seed);
	options_s_k++ ;
#else
        cerr << "To enable the option -s, please compile without NO_SPACED_SEEDS" << endl;
#endif
        break;

      case 'k':
	k = atoi(optarg);
	seed = seed_contiguous(k);
	options_s_k++ ;
        break;

      case 'w':
	w = atoi(optarg);
        break;

      case 'm':
	delta_min = atoi(optarg);
        break;

      case 'M':
	delta_max = atoi(optarg);
        break;

      case '!':
        keep_unsegmented_as_clone = true;
        break;

      case 'e':
        expected_value = atof_NO_LIMIT(optarg);
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
        break;

      case 'A': // --all
	ratio_reads_clone = 0 ;
	min_reads_clone = 1 ;
	max_representatives = -1 ;
	max_clones = -1 ;
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

      case 'E':
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
        output_unsegmented = true;
        break;
      case 'U':
        output_segmented = true;
        break;
      case 'K':
        output_affects = true;
        break;
      }


  //$$ options: post-processing+display


  if (!germline_system.size() && (command != CMD_GERMLINES))
    {
      cerr << ERROR_STRING << "At least one germline must be given with -V/(-D)/-J, or -G, or -g." << endl ;
      exit(1);
    }

  if (options_s_k > 1)
    {
      cerr << ERROR_STRING << "Use at most one -s or -k option." << endl ;
      exit(1);
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
      exit(1);
    }

  size_t min_cover_representative = (size_t) (min_reads_clone < (int) max_auditionned ? min_reads_clone : max_auditionned) ;

  // Default seeds

#ifndef NO_SPACED_SEEDS
  if (k == DEFAULT_K)
    {
      if (germline_system.find("TRA") != string::npos)
	seed = SEED_S13 ;

      else if ((germline_system.find("TRB") != string::npos)
	       || (germline_system.find("IGH") != string::npos))
	seed = SEED_S12 ;
      else // TRD, TRG, IGK, IGL, custom, multi
	seed = SEED_S10 ;

      k = seed_weight(seed);
    }
#else
  {
    cerr << ERROR_STRING << "Vidjil was compiled with NO_SPACED_SEEDS: please provide a -k option." << endl;
    exit(1) ;
  }
#endif
	  

#ifndef NO_SPACED_SEEDS
  // Check seed buffer  
  if (seed.size() >= MAX_SEED_SIZE)
    {
      cerr << ERROR_STRING << "Seed size is too large (MAX_SEED_SIZE)." << endl ;
      exit(1);
    }
#endif


  if (w < seed_weight(seed))
    {
      cerr << ERROR_STRING << "Too small -w. The window size should be at least equal to the seed size (" << seed_weight(seed) << ")." << endl;
      exit(1);
    }

  // Check that out_dir is an existing directory or creates it
  const char *out_cstr = out_dir.c_str();

  if (mkpath(out_cstr, 0755) == -1) {
    cerr << ERROR_STRING << "Directory creation: " << out_dir << endl; perror("");
    exit(2);
  }

  const char *outseq_cstr = out_seqdir.c_str();
  if (mkpath(outseq_cstr, 0755) == -1) {
    cerr << ERROR_STRING << "Directory creation: " << out_seqdir << endl; perror("");
    exit(2);
  }

  // Compute basename if not given as an option
  if (f_basename == "") {
    f_basename = extract_basename(f_reads);
  }

  out_dir += "/" ;

  /// Load labels ;
  load_into_map(windows_labels, windows_labels_file);

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
  // Display version information or git log

  string soft_version = "vidjil ";
#ifdef RELEASE_TAG
  cout << "# version: vidjil " << RELEASE_TAG << endl ;
  soft_version.append(RELEASE_TAG);
#else
  cout << "# development version" << endl ;
#ifdef GIT_VERSION
  cout << "# git: " << GIT_VERSION << endl ;
  soft_version.append("dev ");
  soft_version.append(GIT_VERSION);
#endif
#endif

  //////////////////////////////////
  // Warning for non-optimal use

  if (max_clones == -1 || max_clones > WARN_MAX_CLONES)
    {
      cout << endl
	   << "* WARNING: vidjil was run with '-A' option or with a large '-z' option" << endl ;
    }
  
  if (command == CMD_SEGMENT)
    {
      cout << endl
	   << "* WARNING: vidjil was run with '-c segment' option" << endl ;
    }
  
  if (max_clones == -1 || max_clones > WARN_MAX_CLONES || command == CMD_SEGMENT)
    {
      cout << "* Vidjil purpose is to extract very quickly windows overlapping the CDR3" << endl
	   << "* and to gather reads into clones (-c clones), and not to provide an accurate V(D)J segmentation." << endl
	   << "* The following segmentations are slow to compute and are provided only for convenience." << endl
	   << "* They should be checked with other softwares such as IgBlast, iHHMune-align or IMGT/V-QUEST." << endl 
	   << "* More information is provided in the 'doc/algo.org' file." << endl 
	   << endl ;
    }

  /////////////////////////////////////////
  //            LOAD GERMLINES           //
  /////////////////////////////////////////

  if (command == CMD_GERMLINES)
    {
      multi_germline = true ;
      multi_germline_one_index_per_germline = false ;
    }

  MultiGermline *multigermline = new MultiGermline(multi_germline_one_index_per_germline);

    {
      cout << "Load germlines and build Kmer indexes" << endl ;
    
      if (multi_germline)
	{
	  multigermline->build_default_set(multi_germline_file, trim_sequences);
	}
      else
	{
	  // Custom germline
	  Germline *germline;
	  germline = new Germline(germline_system, 'X',
                                  f_reps_V, f_reps_D, f_reps_J, 
                                  delta_min, delta_max, trim_sequences);

          germline->new_index(seed);

	  multigermline->insert(germline);
	}
    }

    cout << endl ;

    if (!multi_germline_one_index_per_germline) {
      multigermline->build_with_one_index(seed, true);
    }

      if (multi_germline_unexpected_recombinations) {
        if (!multigermline->index) {
          multigermline->build_with_one_index(seed, false);
        }

        Germline *pseudo = new Germline(PSEUDO_GERMLINE_MAX12, 'x', -10, 80, trim_sequences);
        pseudo->index = multigermline->index ;
        multigermline->germlines.push_back(pseudo);
    }

      // Should come after the initialization of regular (and possibly pseudo) germlines
    if (multi_germline_incomplete) {
      multigermline->one_index_per_germline = true; // Starting from now, creates new indexes
      multigermline->build_incomplete_set(multi_germline_file, trim_sequences);
    }

    if (multi_germline_mark)
      multigermline->mark_cross_germlines_as_ambiguous();
    
    cout << "Germlines loaded" << endl ;
    cout << *multigermline ;
    cout << endl ;

    // Number of reads for e-value computation
    int nb_reads_for_evalue = (expected_value > NO_LIMIT_VALUE) ? nb_sequences_in_fasta(f_reads, true) : 1 ;

    
  //////////////////////////////////
  //$$ Read sequence files
 
  OnlineFasta *reads;

  try {
    reads = new OnlineFasta(f_reads, 1, " ");
  } catch (const invalid_argument e) {
    cerr << ERROR_STRING << "Vidjil cannot open reads file " << f_reads << ": " << e.what() << endl;
    exit(1);
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
      index->labels.push_back(make_pair(KmerAffect::getAmbiguous(), AFFECT_AMBIGUOUS_SYMBOL));
      index->labels.push_back(make_pair(KmerAffect::getUnknown(), AFFECT_UNKNOWN_SYMBOL));
      
      for (list< pair <KmerAffect, string> >::const_iterator it = index->labels.begin(); it != index->labels.end(); ++it)
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
	  ckaa.setAllowedOverlap(k-1);

	  stats_max[affect_char(ckaa.max(forbidden).affect)]++ ;

	}

      delete reads;

      // Display statistics

      cout << "  <== "
	   << nb_reads << " reads, "
	   << total_length << " kmers"
	   << endl ;
      cout << "\t" << " max" << "\t\t" << "        kmers" << "\n" ;

      for (list< pair <KmerAffect, string> >::const_iterator it = index->labels.begin(); it != index->labels.end(); ++it)
	{
	  char key = affect_char(it->first.affect) ;
	  
	  cout << setw(12) << stats_max[key] << " " ;
	  cout << setw(6) << fixed << setprecision(2) <<  (float) stats_max[key] / nb_reads * 100 << "%" ;

	  cout << "     " ;

	  cout << setw(12) << stats_kmer[key] << " " ;
	  cout << setw(6) << fixed << setprecision(2) <<  (float) stats_kmer[key] / total_length * 100 << "%" ;

	  cout << "     " << key << " " << it->second << endl ;
	}
      
      delete index;
      exit(0);
    }


  ////////////////////////////////////////
  //           CLONE ANALYSIS           //
  ////////////////////////////////////////
  if (command == CMD_CLONES || command == CMD_WINDOWS) {

    //////////////////////////////////
    //$$ Kmer Segmentation

    int only_nth_read = 1 ;
    if (max_reads_processed_sample > 0)
      {
        only_nth_read = nb_sequences_in_fasta(f_reads) / max_reads_processed_sample;
        max_reads_processed = max_reads_processed_sample ;
        cout << "Processing every " << only_nth_read << "th read" << endl ;
      }

    cout << endl;
    cout << "Loop through reads, looking for windows" << endl ;

    ofstream *out_segmented = NULL;
    ofstream *out_unsegmented = NULL;
    ofstream *out_affects = NULL;
 
    WindowExtractor we;
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

    if (output_affects) {
      string f_affects = out_dir + f_basename + AFFECTS_FILENAME ;
      cout << "  ==> " << f_affects << endl ;
      out_affects = new ofstream(f_affects.c_str());
      we.setAffectsOutput(out_affects);
    }

    WindowsStorage *windowsStorage = we.extract(reads, multigermline, w,
                                                windows_labels, only_labeled_windows,
                                                max_reads_processed, only_nth_read, keep_unsegmented_as_clone,
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

    stream_segmentation_info << "  ==> found " << windowsStorage->size() << " " << w << "-windows"
	<< " in " << nb_segmented << " reads"
	<< " (" << setprecision(3) << ratio_segmented << "% of " <<  nb_total_reads << " reads)" << endl ;
  
    // warn if there are too few segmented sequences
    if (ratio_segmented < WARN_PERCENT_SEGMENTED)
      {
        stream_segmentation_info << "  ! There are not so many CDR3 windows found in this set of reads." << endl ;
        stream_segmentation_info << "  ! Please check the unsegmentation causes below and refer to the documentation." << endl ;
      }

    cout << "Build clone stats" << endl;
    windowsStorage->fillStatsClones();
    
    multigermline->out_stats(stream_segmentation_info);
    stream_segmentation_info << endl;
    we.out_stats(stream_segmentation_info);
    
    cout << stream_segmentation_info.str();
      map <junction, JsonList> json_data_segment ;
    

	//////////////////////////////////
	//$$ Sort windows
	
        cout << "Sort windows by number of occurrences" << endl;
        windowsStorage->sort();

	//////////////////////////////////
	//$$ Output windows
	//////////////////////////////////

	string f_all_windows = out_dir + f_basename + WINDOWS_FILENAME;
	cout << "  ==> " << f_all_windows << endl ;

	ofstream out_all_windows(f_all_windows.c_str());
        windowsStorage->printSortedWindows(out_all_windows);


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
      
    if (command == CMD_CLONES) {

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
       
	clones_windows  = comp.cluster(forced_edges, w, cout, epsilon, minPts) ;
	comp.stat_cluster(clones_windows, cout );
	comp.del();
	cout << "  ==> " << clones_windows.size() << " clusters" << endl ;
      } 
    else
      { 
	cout << "No clustering" << endl ; 
      }


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

    if (max_clones > 0)
      cout << "Detailed analysis of at most " << max_clones<< " clones" ;
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
      string window_str = ">" + clone_id + "--window" + " " + windowsStorage->getLabel(it->first) + '\n' + it->first + '\n' ;

      //$$ If max_representatives is reached, we stop here but still outputs the window

      if ((max_representatives >= 0) && (num_clone >= max_representatives + 1))
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
          = windowsStorage->getRepresentativeComputer(it->first, seed,
                                             min_cover_representative,
                                             ratio_representative,
                                             max_auditionned);

        Sequence representative = repComp.getRepresentative();

	  // Store the representative and its label
          representatives.push_back(representative);
          representatives_labels.push_back(string_of_int(num_clone));
	  representative.label = clone_id + "--" + representative.label;

	  
	  //$$ If max_clones is reached, we stop here but still outputs the representative

	  if ((max_clones >= 0) && (num_clone >= max_clones + 1))
	    {
	      out_clones << representative << endl ;
	      continue;
	    }


	  // FineSegmenter
	  FineSegmenter seg(representative, segmented_germline, segment_cost);
	
          if (segmented_germline->rep_4.size())
	  seg.FineSegmentD(segmented_germline);

          if (detect_CDR3)
            seg.findCDR3();

          
	// Output representative, possibly segmented... 
	// to stdout, CLONES_FILENAME, and CLONE_FILENAME-*
	cout << seg << endl ;
	out_clone << seg << endl ;
	out_clones << seg << endl ;


        // Prepare .json data segment
        JsonList json_clone;
        JsonList json_seg;

        JsonArray json_coverage;
        json_coverage.add(repComp.getCoverage());
        json_clone.add("_coverage", json_coverage);

        JsonArray json_coverage_info;
        json_coverage_info.add(repComp.getCoverageInfo());
        json_clone.add("_coverage_info", json_coverage_info);

        // From FineSegmenter
        json_clone.add("sequence", seg.getSequence().sequence);
        
        if (seg.isSegmented())
          json_clone.add("name", seg.code_short);

        seg.toJsonList(&json_seg);

        // Re-launch also a KmerMultiSegmenter, for control purposes (affectations, evalue)
        KmerMultiSegmenter kmseg(seg.getSequence(), multigermline, 0, expected_value, nb_reads_for_evalue);
        KmerSegmenter *kseg = kmseg.the_kseg ;
        kseg->toJsonList(&json_seg);
        if (verbose)
          cout << "KmerSegmenter: " << kseg->getInfoLine() << endl;

        // Save .json data segment
        json_clone.add("seg", json_seg);
        json_data_segment[it->first] = json_clone;


        if (seg.isSegmented())
	  {
	      // Check for identical code, outputs to out_edge
              string code = seg.code ;
              int cc = clones_codes[code];

              if (cc)
                {
                  cout << " (similar to Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << cc << setfill(' ') << ")";

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
	      out_clone << segmented_germline->rep_5.read(seg.best_V) ;
	      if (segmented_germline->rep_4.size()) out_clone << segmented_germline->rep_4.read(seg.best_D) ;
	      out_clone << segmented_germline->rep_3.read(seg.best_J) ;
	      out_clone << endl;
	   } // end if (seg.isSegmented())


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

    cout << "Comparing clone representatives 2 by 2" << endl ;
    list<Sequence> first_representatives = keep_n_first<Sequence>(representatives,
                                                                  LIMIT_DISPLAY);
    SimilarityMatrix matrix = compare_all(first_representatives,
                                          representatives_labels);
    cout << RawOutputSimilarityMatrix(matrix, 90);
    /*
        //Compute all the edges
        cout << "Compute distances" << endl ;
        SimilarityMatrix matrixLevenshtein = compare_windows(*windowsStorage, Levenshtein, max_clones);
        //Added distances matrix in the JsonTab
        jsonLevenshtein << JsonOutputWindowsMatrix(matrixLevenshtein);
    */
     // delete scorer;

    } // endif (clones_windows.size() > 0)

    } // end if (command == CMD_CLONES) 

    //$$ .json output: json_data_segment
    string f_json = out_dir + f_basename + JSON_SUFFIX ;
    cout << "  ==> " << f_json << "\t(data file for the browser)" << endl ;
    ofstream out_json(f_json.c_str()) ;
    
    JsonList *json;
    json=new JsonList();

    // Version/timestamp/git info

    ostringstream stream_cmdline;
    for (int i=0; i < argc; i++) stream_cmdline << argv[i] << " ";
    
    JsonArray json_nb_reads;
    json_nb_reads.add(nb_total_reads);

    JsonArray json_nb_segmented;
    json_nb_segmented.add(nb_segmented);
    
    JsonArray json_original_names;
    json_original_names.add(f_reads);
    
    JsonArray json_timestamp;
    json_timestamp.add(time_buffer);
    
    JsonArray json_soft;
    json_soft.add(soft_version);
    
    JsonArray json_log;
    json_log.add(stream_segmentation_info.str());
    
    JsonArray json_cmdline;
    json_cmdline.add(stream_cmdline.str());// TODO: escape "s in argv

    JsonArray jsonSortedWindows = windowsStorage->sortedWindowsToJsonArray(json_data_segment);
    
    //samples field
    JsonList *json_samples;
    json_samples=new JsonList();
    json_samples->add("number", 1);
    json_samples->add("original_names", json_original_names);
    json_samples->add("run_timestamp", json_timestamp);
    json_samples->add("producer", json_soft);
    json_samples->add("log", json_log);
    json_samples->add("commandline", json_cmdline);
    
    //reads field
    JsonList *json_reads;
    json_reads=new JsonList();
    json_reads->add("total", json_nb_reads);
    json_reads->add("segmented", json_nb_segmented); 
    JsonList *json_reads_germlineList;
    json_reads_germlineList = new JsonList();
    
    //germlines field
    JsonList *json_germlines;
    json_germlines=new JsonList();
    JsonList *json_custom_germline;
    json_custom_germline = new JsonList();
    
    json_custom_germline->add("shortcut", "X");
    JsonArray json_3;
    JsonArray json_4;
    JsonArray json_5;
    for (list<string>::iterator it = f_reps_V.begin(); it != f_reps_V.end(); it++){
        json_3.add(*it);
    }
    for (list<string>::iterator it = f_reps_D.begin(); it != f_reps_D.end(); it++){
        json_4.add(*it);
    }
    for (list<string>::iterator it = f_reps_J.begin(); it != f_reps_J.end(); it++){
        json_5.add(*it);
    }
    json_custom_germline->add("3", json_3);
    json_custom_germline->add("4", json_4);
    json_custom_germline->add("5", json_5);
    json_germlines->add("custom", *json_custom_germline);
    
    if (multi_germline)
      {
        for (list<Germline*>::const_iterator it = multigermline->germlines.begin(); it != multigermline->germlines.end(); ++it)
          {
            Germline *germline = *it ;
            JsonArray json_reads_germline;
            json_reads_germline.add(we.getNbReadsGermline(germline->code));
            json_reads_germlineList->add(germline->code, json_reads_germline);
          }
      }
    else
      {
        json_reads_germlineList->add(germline_system, json_nb_segmented);
      }
    json_reads->add("germline", *json_reads_germlineList); 
    
    json->add("vidjil_json_version", VIDJIL_JSON_VERSION);
    json->add("samples", *json_samples);
    json->add("reads", *json_reads);
    json->add("clones", jsonSortedWindows);
    json->add("germlines", *json_germlines);
    
    
    if (epsilon || forced_edges.size()){
      JsonArray json_clusters = comp.toJson(clones_windows);
      json->add("clusters", json_clusters );
    }

    //Added edges in the json output file
    //json->add("links", jsonLevenshtein);
    out_json << json->toString();
    
    delete json;
    delete json_samples;
    delete json_reads;
    delete json_reads_germlineList;
    delete json_germlines;
    delete json_custom_germline;

    delete multigermline ;
    delete windowsStorage;


    if (output_segmented)
      delete out_segmented;
    if (output_unsegmented)
      delete out_unsegmented;

  } else if (command == CMD_SEGMENT) {
    //$$ CMD_SEGMENT
    ////////////////////////////////////////
    //       V(D)J SEGMENTATION           //
    ////////////////////////////////////////

    while (reads->hasNext()) 
      {
        reads->next();

        Sequence seq = reads->getSequence() ;
        KmerMultiSegmenter kmseg(reads->getSequence(), multigermline, NULL); //  out_unsegmented);
        KmerSegmenter *seg = kmseg.the_kseg ;
        Germline *germline = seg->segmented_germline ;
        
            FineSegmenter s(seq, germline, segment_cost);

            if (s.isSegmented()) 
              {
                if (germline->rep_4.size())
                  s.FineSegmentD(germline);

                if (detect_CDR3)
                  s.findCDR3();
              }

        cout << s << endl;        
      }
    
  } else {
    cerr << "Ooops... unknown command. I don't know what to do apart from exiting!" << endl;
  }
  

  delete reads;
}

//$$ end
