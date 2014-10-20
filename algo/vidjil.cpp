/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013, 2014 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>, Marc Duez <marc.duez@lifl.fr>

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
#include "core/teestream.h"
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

#define VIDJIL_JSON_VERSION "2014.09"

//$$ #define (mainly default options)

#define DEFAULT_MULTIGERMLINE "germline"
#define DEFAULT_GERMLINE_SYSTEM "IGH" 
#define DEFAULT_V_REP  "./germline/IGHV.fa"
#define DEFAULT_D_REP  "./germline/IGHD.fa" 
#define DEFAULT_J_REP  "./germline/IGHJ.fa"

#define DEFAULT_READS  "./data/Stanford_S22.fasta"
#define MIN_READS_WINDOW 10
#define MIN_READS_CLONE 10
#define DEFAULT_MAX_REPRESENTATIVES 100
#define MAX_CLONES 20
#define RATIO_READS_CLONE 0.0
#define NO_LIMIT "all"

#define COMMAND_WINDOWS "windows"
#define COMMAND_CLONES "clones"
#define COMMAND_SEGMENT "segment"
#define COMMAND_GERMLINES "germlines"
 
enum { CMD_WINDOWS, CMD_CLONES, CMD_SEGMENT, CMD_GERMLINES } ;

#define OUT_DIR "./out/" 
#define CLONES_FILENAME "clones.vdj.fa"
#define CLONE_FILENAME "clone.fa-"
#define WINDOWS_FILENAME "windows.fa"
#define SEGMENTED_FILENAME "segmented.vdj.fa"
#define UNSEGMENTED_FILENAME "unsegmented.fa"
#define EDGES_FILENAME "edges"
#define COMP_FILENAME "comp.data"
#define JSON_SUFFIX ".data"

// "tests/data/leukemia.fa" 

#define DEFAULT_K      0
#define DEFAULT_W      40
#define DEFAULT_W_D    60
#define DEFAULT_SEED   ""

#define DEFAULT_DELTA_MIN  -10
#define DEFAULT_DELTA_MAX   20

#define DEFAULT_DELTA_MIN_D  0
#define DEFAULT_DELTA_MAX_D  80

#define DEFAULT_MAX_AUDITIONED 2000
#define DEFAULT_RATIO_REPRESENTATIVE 0.5
#define MIN_COVER_REPRESENTATIVE_RATIO_MIN_READS_CLONE 1.0

#define DEFAULT_EPSILON  0
#define DEFAULT_MINPTS   10

#define DEFAULT_CLUSTER_COST  Cluster
#define DEFAULT_SEGMENT_COST   VDJ

// warn
#define WARN_MAX_CLONES 100
#define WARN_PERCENT_SEGMENTED 40

// display
#define WIDTH_NB_READS 7
#define WIDTH_NB_CLONES 3
#define WIDTH_WINDOW_POS 14+WIDTH_NB_CLONES

using namespace std ;

//$$ options: usage

extern char *optarg;

extern int optind, optopt, opterr;

void usage(char *progname)
{
  cerr << "Usage: " << progname << " [options] <reads.fa>" << endl << endl;

  cerr << "Command selection" << endl
       << "  -c <command> \t" << COMMAND_WINDOWS << "  \t window extracting" << endl 
       << "  \t\t" << COMMAND_CLONES  << "  \t clone gathering (default)" << endl 
       << "  \t\t" << COMMAND_SEGMENT   << "  \t V(D)J segmentation (not recommended)" << endl
       << "  \t\t" << COMMAND_GERMLINES << "  \t discover all germlines" << endl
       << endl       

       << "Germline databases" << endl
       << "  -V <file>     V germline multi-fasta file" << endl
       << "  -D <file>     D germline multi-fasta file (automatically implies -d)" << endl
       << "  -J <file>     J germline multi-fasta file" << endl
       << "  -G <prefix>   prefix for V (D) and J repertoires (shortcut for -V <prefix>V.fa -D <prefix>D.fa -J <prefix>J.fa)" << endl
       << "  -g <path>     multiple germlines (experimental)" << endl
       << endl

       << "Window prediction" << endl
#ifndef NO_SPACED_SEEDS
       << "  (use either -s or -k option, but not both)" << endl
       << "  -s <string>   spaced seed used for the V/J affectation" << endl
       << "                (default: #####-#####, ######-######, #######-#######, depends on germline)" << endl
#endif
       << "  -k <int>      k-mer size used for the V/J affectation (default: 10, 12, 13, depends on germline)" << endl
#ifndef NO_SPACED_SEEDS
       << "                (using -k option is equivalent to set with -s a contiguous seed with only '#' characters)" << endl
#endif
       << "  -w <int>      w-mer size used for the length of the extracted window (default: " << DEFAULT_W << ")(default with -d: " << DEFAULT_W_D << ")" << endl
       << endl

       << "Window annotations" << endl
       << "  -l <file>     labels for some windows -- these windows will be kept even if some limits are not reached" << endl
       << endl

       << "Additional clustering (not output in vidjil.data and therefore not used in the browser)" << endl
       << "  -e <file>     manual clustering -- a file used to force some specific edges" << endl
       << "  -n <int>      maximum distance between neighbors for automatic clustering (default " << DEFAULT_EPSILON << "). No automatic clusterisation if =0." << endl
       << "  -N <int>      minimum required neighbors for automatic clustering (default " << DEFAULT_MINPTS << ")" << endl
       << "  -S            generate and save comparative matrix for clustering" << endl
       << "  -L            load comparative matrix for clustering" << endl
       << "  -C <string>   use custom Cost for automatic clustering : format \"match, subst, indels, homo, del_end\" (default "<<Cluster<<" )"<< endl
       << endl

       << "Limits to report a clone (or a window)" << endl
       << "  -r <nb>       minimal number of reads supporting a clone (default: " << MIN_READS_CLONE << ")" << endl
       << "  -% <ratio>    minimal percentage of reads supporting a clone (default: " << RATIO_READS_CLONE << ")" << endl
       << endl

       << "Limits to further analyze some clones" << endl
       << "  -y <nb>       maximal number of clones computed with a representative ('" << NO_LIMIT << "': no limit) (default: " << DEFAULT_MAX_REPRESENTATIVES << ")" << endl
       << "  -z <nb>       maximal number of clones to be segmented ('" << NO_LIMIT << "': no limit, do not use) (default: " << MAX_CLONES << ")" << endl
       << "  -A            reports and segments all clones (-r 0 -% 0 -y " << NO_LIMIT << " -z " << NO_LIMIT << "), to be used only on very small datasets" << endl
       << endl

       << "Fine segmentation options (second pass, see warning in doc/algo.org)" << endl
       << "  -d            segment into V(D)J components instead of VJ " << endl
       << "  -m <int>      minimal admissible delta between segmentation points (default: " << DEFAULT_DELTA_MIN << ") (default when -d is used: " << DEFAULT_DELTA_MIN_D << ")" << endl
       << "  -M <int>      maximal admissible delta between segmentation points (default: " << DEFAULT_DELTA_MAX << ") (default when -d is used: " << DEFAULT_DELTA_MAX_D << ")" << endl
       << "  -f <string>   use custom Cost for fine segmenter : format \"match, subst, indels, homo, del_end\" (default "<<VDJ<<" )"<< endl
       << endl

       << "Debug" << endl
       << "  -U            output segmented (" << SEGMENTED_FILENAME << ") sequences" << endl
       << "  -u            output unsegmented (" << UNSEGMENTED_FILENAME << ") sequences" << endl
       << "                and display detailed k-mer affectation both on segmented and on unsegmented sequences" << endl
       << "Output" << endl
       << "  -o <dir>      output directory (default: " << OUT_DIR << ")" <<  endl
       << "  -p <string>   prefix output filenames by the specified string" << endl
    
       << "  -a            output all sequences by cluster (" << CLONE_FILENAME << "*), to be used only on small datasets" << endl
       << "  -x            do not compute representative sequences" << endl
       << "  -v            verbose mode" << endl
       << endl        

       << "The full help is available in the doc/algo.org file."
       << endl

       << endl 
       << "Examples (see doc/algo.org)" << endl
       << "  " << progname << " -c clones   -G germline/IGH  -r 5       -d data/Stanford_S22.fasta" << endl
       << "  " << progname << " -c segment  -G germline/IGH             -d data/Stanford_S22.fasta   # (only for testing)" << endl
       << "  " << progname << " -c germlines                               data/Stanford_S22.fasta" << endl
    ;
  exit(1);
}

int main (int argc, char **argv)
{
  cout << "# Vidjil -- V(D)J recombinations analysis <http://www.vidjil.org/>" << endl
       << "# Copyright (C) 2011, 2012, 2013, 2014 by the Vidjil team" << endl
       << "# Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille" << endl 
       << endl
       << "# Vidjil is free software, and you are welcome to redistribute it" << endl
       << "# under certain conditions -- see http://git.vidjil.org/blob/master/doc/LICENSE" << endl
       << "# No lymphocyte was harmed in the making of this software," << endl
       << "# however this software is for research use only and comes with no warranty." << endl
       << endl ;

  //$$ options: defaults

  string germline_system = DEFAULT_GERMLINE_SYSTEM ;
  string f_rep_V = DEFAULT_V_REP ;
  string f_rep_D = DEFAULT_D_REP ;
  string f_rep_J = DEFAULT_J_REP ;
  string f_reads = DEFAULT_READS ;
  string seed = DEFAULT_SEED ;
  string prefix_filename = "";

  string out_dir = OUT_DIR;
  
  string comp_filename = COMP_FILENAME;

  int k = DEFAULT_K ;
  int w = 0 ;
  int default_w = DEFAULT_W ;

  int epsilon = DEFAULT_EPSILON ;
  int minPts = DEFAULT_MINPTS ;
  Cost cluster_cost = DEFAULT_CLUSTER_COST ;
  Cost segment_cost = DEFAULT_SEGMENT_COST ;
  
  
  int save_comp = 0;
  int load_comp = 0;
  int segment_D = 0;
  
  int verbose = 0 ;
  int command = CMD_CLONES;

  int max_representatives = DEFAULT_MAX_REPRESENTATIVES ;
  int max_clones = MAX_CLONES ;
  int min_reads_clone = MIN_READS_CLONE ;
  float ratio_reads_clone = RATIO_READS_CLONE;
  // int average_deletion = 4;     // Average number of deletion in V or J

  float ratio_representative = DEFAULT_RATIO_REPRESENTATIVE;
  unsigned int max_auditionned = DEFAULT_MAX_AUDITIONED;

  // Admissible delta between left and right segmentation points
  int delta_min = DEFAULT_DELTA_MIN ; // Kmer+Fine
  int delta_max = DEFAULT_DELTA_MAX ; // Fine

  bool output_sequences_by_cluster = false;
  bool output_segmented = false;
  bool output_unsegmented = false;
  bool multi_germline = false;
  string multi_germline_file = DEFAULT_MULTIGERMLINE;

  string forced_edges = "" ;

  string windows_labels_file = "" ;
  string normalization_file = "" ;

  char c ;

  int options_s_k = 0 ;

  //JsonArray which contains the Levenshtein distances
  JsonArray jsonLevenshtein;

  //$$ options: getopt

  while ((c = getopt(argc, argv, "Ahag:G:V:D:J:k:r:vw:e:C:t:l:dc:m:M:N:s:p:Sn:o:L%:Z:y:z:uU")) != EOF)

    switch (c)
      {
      case 'h':
        usage(argv[0]);
      case 'a':
	output_sequences_by_cluster = true;
	break;
      case 'd':
	segment_D = 1 ;
	delta_min = DEFAULT_DELTA_MIN_D ;
	delta_max = DEFAULT_DELTA_MAX_D ;
	default_w = DEFAULT_W_D ;
	break;
      case 'e':
	forced_edges = optarg;
	break;
      case 'l':
	windows_labels_file = optarg; 
	break;
      case 'Z':
	normalization_file = optarg; 
	break;

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
	  usage(argv[0]);
        }
        break;
      case 'v':
	verbose += 1 ;
	break;

      // Germline

      case 'V':
	f_rep_V = optarg;
	germline_system = "custom" ;
	break;

      case 'D':
	f_rep_D = optarg;
        segment_D = 1;
	break;
        
      case 'J':
	f_rep_J = optarg;
	germline_system = "custom" ;
	break;

      case 'g':
	multi_germline = true;
	multi_germline_file = string(optarg);
	break;
	
      case 'G':
	germline_system = string(optarg);
	f_rep_V = (germline_system + "V.fa").c_str() ;
	f_rep_D = (germline_system + "D.fa").c_str() ;
	f_rep_J = (germline_system + "J.fa").c_str() ;
	// TODO: if VDJ, set segment_D // NO, bad idea, depends on naming convention
	break;

      // Algorithm

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

      case 'o':
        out_dir = optarg ;
        break;

      case 'p':
        prefix_filename = optarg;
        break;

      // Limits

      case '%':
	ratio_reads_clone = atof(optarg);
	break;

      case 'r':
	min_reads_clone = atoi(optarg);
        break;

      case 'y':
	if (!strcmp(NO_LIMIT, optarg))
	  {
	    max_representatives = -1;
	    break;
	  }
	max_representatives = atoi(optarg);
        break;

      case 'z':
	if (!strcmp(NO_LIMIT, optarg))
	  {
	    max_clones = -1;
	    break;
	  }
	max_clones = atoi(optarg);
        break;

      case 'A': // --all
	ratio_reads_clone = 0 ;
	min_reads_clone = 1 ;
	max_representatives = -1 ;
	max_clones = -1 ;
	break ;
    
      // Seeds

      case 's':
#ifndef NO_SPACED_SEEDS
	seed = string(optarg);
	k = seed_weight(seed);
	options_s_k++ ;
#else
        cerr << "To enable the option -s, please compile without NO_SPACED_SEEDS" << endl;
#endif
        break;
	
      // Clustering
	
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
	
      case 't':
	segment_cost=strToCost(optarg, VDJ);
        break;

      case 'u':
        output_unsegmented = true;
        break;
      case 'U':
        output_segmented = true;
        break;
      }

  // If there was no -w option, then w is either DEFAULT_W or DEFAULT_W_D
  if (w == 0)
    w = default_w ;

  
  if (options_s_k > 1)
    {
      cout << "use at most one -s or -k option." << endl ;
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
      cout << "wrong number of arguments." << endl ;
      exit(1);
    }

  //$$ options: post-processing+display

  size_t min_cover_representative = (size_t) (MIN_COVER_REPRESENTATIVE_RATIO_MIN_READS_CLONE * min_reads_clone) ;

  // Default seeds

#ifndef NO_SPACED_SEEDS
  if (k == DEFAULT_K)
    {
      if (germline_system.find("TRA") != string::npos)
	seed = "#######-######" ;

      else if ((germline_system.find("TRB") != string::npos)
	       || (germline_system.find("IGH") != string::npos))
	seed = "######-######" ; 
      else // TRD, TRG, IGK, IGL
	seed = "#####-#####" ; 

      k = seed_weight(seed);
    }
#else
  {
    cout << "Vidjil was compiled with NO_SPACED_SEEDS: please provide a -k option." << endl;
    exit(1) ;
  }
#endif
	  

#ifndef NO_SPACED_SEEDS
  // Check seed buffer  
  if (seed.size() >= MAX_SEED_SIZE)
    {
      cout << "Seed size is too large (MAX_SEED_SIZE). Aborting." << endl ;
      exit(1);
    }
#endif

  // Check that out_dir is an existing directory or creates it
  const char *out_cstr = out_dir.c_str();

  if (mkpath(out_cstr, 0755) == -1) {
    perror("Directory creation");
    exit(2);
  }

  const char *outseq_cstr = out_seqdir.c_str();
  if (mkpath(outseq_cstr, 0755) == -1) {
    perror("Directory creation");
    exit(2);
  }

  out_dir += "/" ;

  /// Load labels ;
  map <string, string> windows_labels = load_map(windows_labels_file);

  map <string, pair <string, float> > normalization = load_map_norm(normalization_file);


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

#ifdef RELEASE_TAG
  cout << "# version: vidjil " << RELEASE_TAG << endl ;
#else
  cout << "# development version" << endl ;
#endif

#ifdef GIT_VERSION
  cout << "# git: " << GIT_VERSION << endl ;
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

  MultiGermline *multigermline = new MultiGermline();

  if (command == CMD_GERMLINES || command == CMD_CLONES || command == CMD_WINDOWS) 
    {
      cout << "Build Kmer indexes" << endl ;
    
      if (multi_germline)
	{
	  multigermline->build_default_set(multi_germline_file);
	}
      else if (command == CMD_GERMLINES)
	{
	  multigermline->load_standard_set(multi_germline_file);
	  multigermline->build_with_one_index(seed);
	}
      else
	{
	  // Custom germline
	  Fasta rep_V(f_rep_V, 2, "|", cout);
	  Fasta rep_D(f_rep_D, 2, "|", cout);
	  Fasta rep_J(f_rep_J, 2, "|", cout);
	  
	  Germline *germline;
	  germline = new Germline(germline_system, 'X',
				  rep_V, rep_D, rep_J, 
				  delta_min, delta_max);
	  germline->new_index(seed);

	  multigermline->insert(germline);
	}
    }

  //////////////////////////////://////////
  //         DISCOVER GERMLINES          //
  /////////////////////////////////////////
  if (command == CMD_GERMLINES)
    {
#define KMER_AMBIGUOUS "?"
#define KMER_UNKNOWN "_"

      map <char, int> stats_kmer, stats_max;
      IKmerStore<KmerAffect> *index = multigermline->index ;

      // Initialize statistics, with two additional categories
      index->labels.push_back(make_pair(KmerAffect::getAmbiguous(), KMER_AMBIGUOUS));
      index->labels.push_back(make_pair(KmerAffect::getUnknown(), KMER_UNKNOWN));
      
      for (list< pair <KmerAffect, string> >::const_iterator it = index->labels.begin(); it != index->labels.end(); ++it)
	{
	  char key = affect_char(it->first.affect) ;
	  stats_kmer[key] = 0 ;
	  stats_max[key] = 0 ;
	}


      // Open read file (copied frow below)

      OnlineFasta *reads;

      try {
	reads = new OnlineFasta(f_reads, 1, " ");
      } catch (const std::ios_base::failure e) {
	cout << "Error while reading reads file " << f_reads << ": " << e.what()
	     << endl;
	exit(1);
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

	  KmerAffectAnalyser<KmerAffect> *kaa = new KmerAffectAnalyser<KmerAffect>(*index, seq);

	  for (int i = 0; i < kaa->count(); i++) 
	    { 
	      KmerAffect ksa = kaa->getAffectation(i);
	      stats_kmer[affect_char(ksa.affect)]++ ;
	    }

          delete kaa;

	  CountKmerAffectAnalyser<KmerAffect> ckaa(*index, seq);
	  ckaa.setAllowedOverlap(k-1);

	  stats_max[affect_char(ckaa.max(forbidden).affect)]++ ;

	}

      delete reads;

      // Display statistics

      cout << "  <== " << nb_reads << " reads" << endl ;
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


  //////////////////////////////////
  //$$ Read sequence files

  if (!segment_D) // TODO: add other constructor to Fasta, and do not load rep_D in this case
    f_rep_D = "";


  OnlineFasta *reads;

  try {
    reads = new OnlineFasta(f_reads, 1, " ");
  } catch (const std::ios_base::failure e) {
    cout << "Error while reading reads file " << f_reads << ": " << e.what()
        << endl;
    exit(1);
  }

  out_dir += "/";

  ////////////////////////////////////////
  //           CLONE ANALYSIS           //
  ////////////////////////////////////////
  if (command == CMD_CLONES || command == CMD_WINDOWS) {

    //////////////////////////////////
    cout << "# seed = " << seed << "," ;
    cout << " weight = " << seed_weight(seed) << "," ;
    cout << " span = " << seed.size() << endl ;
    cout << "# k = " << k << "," ;
    cout << " w = " << w << "," ;
    cout << " delta = [" << delta_min << "," << delta_max << "]" << endl ;


    //////////////////////////////////
    //$$ Kmer Segmentation

    cout << endl;
    cout << "Loop through reads, looking for windows" << endl ;

    ofstream *out_segmented = NULL;
    ofstream *out_unsegmented = NULL;
 
    WindowExtractor we;
 
    if (output_segmented) {
      string f_segmented = out_dir + prefix_filename + SEGMENTED_FILENAME ;
      cout << "  ==> " << f_segmented << endl ;
      out_segmented = new ofstream(f_segmented.c_str());
      we.setSegmentedOutput(out_segmented);
    }

    if (output_unsegmented) {
      string f_unsegmented = out_dir + prefix_filename + UNSEGMENTED_FILENAME ;
      cout << "  ==> " << f_unsegmented << endl ;
      out_unsegmented = new ofstream(f_unsegmented.c_str());
      we.setUnsegmentedOutput(out_unsegmented);
    }


    WindowsStorage *windowsStorage = we.extract(reads, multigermline, w, windows_labels);
    windowsStorage->setIdToAll();
    size_t nb_total_reads = we.getNbReads();


    //$$ Display statistics on segmentation causes

        
    ostringstream stream_segmentation_info;

    int nb_segmented_including_too_short = we.getNbSegmented(TOTAL_SEG_AND_WINDOW) 
      + we.getNbSegmented(TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW);

    stream_segmentation_info << "  ==> segmented " << nb_segmented_including_too_short << " reads"
	<< " (" << setprecision(3) << 100 * (float) nb_segmented_including_too_short / nb_total_reads << "%)" 
	<< endl ;

    // nb_segmented is the main denominator for the following (but will be normalized)
    int nb_segmented = we.getNbSegmented(TOTAL_SEG_AND_WINDOW);
    float ratio_segmented = 100 * (float) nb_segmented / nb_total_reads ;

    stream_segmentation_info << "  ==> found " << windowsStorage->size() << " " << w << "-windows"
	<< " in " << nb_segmented << " segments"
	<< " (" << setprecision(3) << ratio_segmented << "%)"
	<< " inside " << nb_total_reads << " sequences" << endl ;
  
    // warn if there are too few segmented sequences
    if (ratio_segmented < WARN_PERCENT_SEGMENTED)
      {
        stream_segmentation_info << "  ! There are not so many CDR3 windows found in this set of reads." << endl ;
        stream_segmentation_info << "  ! If this is unexpected, check the germline (-G) and try to change seed parameters (-k)." << endl ;
      }

    stream_segmentation_info << "                                  #      av. length" << endl ;

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

	string f_all_windows = out_dir + prefix_filename + WINDOWS_FILENAME;
	cout << "  ==> " << f_all_windows << endl ;

	ofstream out_all_windows(f_all_windows.c_str());
        windowsStorage->printSortedWindows(out_all_windows);

	//$$ Normalization
	list< pair <float, int> > norm_list = compute_normalization_list(windowsStorage->getMap(), normalization, nb_segmented);



    //////////////////////////////////
    //$$ min_reads_clone (ou label)

    int min_reads_clone_ratio = (int) (ratio_reads_clone * nb_segmented / 100.0);
    cout << "Considering only labeled windows and windows with >= " << min_reads_clone << " reads"
	 << " and with a ratio >= " << ratio_reads_clone << " (" << min_reads_clone_ratio << ")" << endl ;

    int min_reads_clone_final = max(min_reads_clone, min_reads_clone_ratio);

    pair<int, int> info_remove = windowsStorage->keepInterestingWindows((size_t) min_reads_clone_final);
	 
    cout << "  ==> keep " <<  windowsStorage->size() << " windows in " << info_remove.second << " reads" ;
    cout << " (" << setprecision(3) << 100 * (float) info_remove.second / nb_total_reads << "%)  " << endl ;

    if (windowsStorage->size() == 0)
      {
	cout << "  ! No windows with current parameters." << endl;
      }

    //////////////////////////////////
    //$$ Clustering
    windowsStorage->sort();
    list<pair <junction, int> > sort_clones = windowsStorage->getSortedList();
    cout << "  ==> " << sort_clones.size() << " clones" << endl ;
    
    list <list <junction> > clones_windows;
    comp_matrix comp=comp_matrix(sort_clones);
      
    if (command == CMD_CLONES) {

    if (epsilon || forced_edges.size())
      {
	cout << "Cluster similar windows" << endl ;

	if (load_comp==1) 
	  {
	    comp.load((out_dir+prefix_filename + comp_filename).c_str());
	  }
	else
	  {
	    comp.compare( cout, cluster_cost);
	  }
	
	if (save_comp==1)
	  {
	    comp.save(( out_dir+prefix_filename + comp_filename).c_str());
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
    int clones_without_representative = 0 ;

    ofstream out_edges((out_dir+prefix_filename + EDGES_FILENAME).c_str());
    int nb_edges = 0 ;
    cout << "  ==> suggested edges in " << out_dir+ prefix_filename + EDGES_FILENAME
        << endl ;

    string f_clones = out_dir + prefix_filename + CLONES_FILENAME ;
    cout << "  ==> " << f_clones << "   \t(main result file)" << endl ;
    ofstream out_clones(f_clones.c_str()) ;

    cout << "  ==> " << out_seqdir + prefix_filename + CLONE_FILENAME + "*" << "\t(detail, by clone)" << endl ; 
    cout << endl ;


    for (list <pair<junction,int> >::const_iterator it = sort_clones.begin();
         it != sort_clones.end(); ++it) {
      junction win = it->first;
      int clone_nb_reads = it->second;

    
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
		<< " – " << 100 * (float) clone_nb_reads * compute_normalization_one(norm_list, clone_nb_reads) / nb_segmented << "% " 
		 << compute_normalization_one(norm_list, clone_nb_reads) << " " ;
      string clone_id_human = oss_human.str();

      // Window label
      string window_str = ">" + clone_id + "--window" + " " + windows_labels[it->first] + '\n' + it->first + '\n' ;


      //$$ If max_representatives is reached, we stop here but still outputs the window

      if ((max_representatives >= 0) && (num_clone >= max_representatives + 1))
	{
	  out_clones << window_str << endl ;
	  continue;
	}


      cout << clone_id_human << endl ;
      last_num_clone_on_stdout = num_clone ;

      //$$ Open CLONE_FILENAME

      string clone_file_name = out_seqdir+ prefix_filename + CLONE_FILENAME + string_of_int(num_clone) ;
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

        Sequence representative = NULL_SEQUENCE ;

	  representative 
          = windowsStorage->getRepresentative(it->first, seed, 
                                             min_cover_representative,
                                             ratio_representative,
                                             max_auditionned);

        if (representative == NULL_SEQUENCE) {
	  clones_without_representative++ ;
	  if (verbose)
	    cout << "# (no representative sequence with current parameters)" ;

        } else {
	//$$ There is one representative

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
	
	if (segment_D)
	  seg.FineSegmentD(segmented_germline);
	
	// Output representative, possibly segmented... 
	// to stdout, CLONES_FILENAME, and CLONE_FILENAME-*
	cout << seg << endl ;
	out_clone << seg << endl ;
	out_clones << seg << endl ;

        // Output segmentation to .json
        json_data_segment[it->first]=seg.toJsonList(segmented_germline);
        
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
	      if (segment_D) out_clone << segmented_germline->rep_4.read(seg.best_D) ;
	      out_clone << segmented_germline->rep_3.read(seg.best_J) ;
	      out_clone << endl;
	   } // end if (seg.isSegmented())

	} // end if (there is a representative)



	if (output_sequences_by_cluster) // -a option, output all sequences
	  {
	    list<Sequence> &sequences = windowsStorage->getReads(it->first);
	    
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

    if (clones_without_representative > 0)
      {
	cout << clones_without_representative << " clones without representatives" ;
	cout << " (requiring " << min_cover_representative << "/" << ratio_representative << " supporting reads)" << endl ;
	cout << endl ;
      }
  
    //$$ Compare representatives of all clones

    if (nb_edges)
      {
        cout << "Please review the " << nb_edges << " suggested edge(s) in " << out_dir+EDGES_FILENAME << endl ;
      }

    cout << "Comparing clone representatives 2 by 2" << endl ;
    list<Sequence> first_representatives = keep_n_first<Sequence>(representatives,
                                                                  LIMIT_DISPLAY);
    SimilarityMatrix matrix = compare_all(first_representatives, true, 
                                          representatives_labels);
    cout << RawOutputSimilarityMatrix(matrix, 90);
        //Compute all the edges
        cout << "Compute distances" << endl ;
        SimilarityMatrix matrixLevenshtein = compare_windows(*windowsStorage, Levenshtein, max_clones);
        //Added distances matrix in the JsonTab
        jsonLevenshtein << JsonOutputWindowsMatrix(matrixLevenshtein);

     // delete scorer;

    } // endif (clones_windows.size() > 0)

    } // end if (command == CMD_CLONES) 

    //$$ .json output: json_data_segment
    string f_json = out_dir + prefix_filename + "vidjil" + JSON_SUFFIX ; // TODO: retrieve basename from f_reads instead of "vidjil"
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
    
    JsonArray json_log;
    json_log.add(stream_segmentation_info.str());
    
    JsonArray json_cmdline;
    json_cmdline.add(stream_cmdline.str());// TODO: escape "s in argv

    JsonArray jsonSortedWindows = windowsStorage->sortedWindowsToJsonArray(json_data_segment,
                                                                        norm_list,
                                                                        nb_segmented);
    
    //samples field
    JsonList *json_samples;
    json_samples=new JsonList();
    json_samples->add("number", 1);
    json_samples->add("original_names", json_original_names);
    json_samples->add("timestamp", json_timestamp);
    json_samples->add("log", json_log);
    json_samples->add("commandline", json_cmdline);
    
    //reads field
    JsonList *json_reads;
    json_reads=new JsonList();
    json_reads->add("total", json_nb_reads);
    json_reads->add("segmented", json_nb_segmented); 
    JsonList *json_reads_germlineList;
    json_reads_germlineList = new JsonList();
    
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
    json->add("germline", germline_system);
    json->add("clones", jsonSortedWindows);
    
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

    // déja déclaré ?
    //reads = OnlineFasta(f_reads, 1, " ");
    

    Fasta rep_V(f_rep_V, 2, "|", cout);
    Fasta rep_D(f_rep_D, 2, "|", cout);
    Fasta rep_J(f_rep_J, 2, "|", cout);

    Germline *germline;

    germline = new Germline(germline_system, 'X',
			    rep_V, rep_D, rep_J,
			    delta_min, delta_max);

    while (reads->hasNext()) 
      {
        reads->next();
        FineSegmenter s(reads->getSequence(), germline, segment_cost);
	if (s.isSegmented()) {
	  if (segment_D)
	  s.FineSegmentD(germline);
          cout << s << endl;
        } else {
          cout << "Unable to segment" << endl;
          cout << reads->getSequence();
          cout << endl << endl;
        }
    }     
    
  } else {
    cerr << "Ooops... unknown command. I don't know what to do apart from exiting!" << endl;
  }
  

  delete reads;
}

//$$ end
