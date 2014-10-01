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

#define DEFAULT_GERMLINE_SYSTEM "IGH" 
#define DEFAULT_V_REP  "./germline/IGHV.fa"
#define DEFAULT_D_REP  "./germline/IGHD.fa" 
#define DEFAULT_J_REP  "./germline/IGHJ.fa"

#define DEFAULT_READS  "./data/Stanford_S22.fasta"
#define MIN_READS_WINDOW 10
#define MIN_READS_CLONE 10
#define MAX_CLONES 20
#define RATIO_READS_CLONE 0.0

#define COMMAND_WINDOWS "windows"
#define COMMAND_ANALYSIS "clones"
#define COMMAND_SEGMENT "segment"
#define COMMAND_GERMLINES "germlines"
 
enum { CMD_WINDOWS, CMD_ANALYSIS, CMD_SEGMENT, CMD_GERMLINES } ;

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
       << "  -c <command> \t" << COMMAND_WINDOWS << "\t window extracting (default)" << endl 
       << "  \t\t" << COMMAND_ANALYSIS  << "  \t clone analysis" << endl 
       << "  \t\t" << COMMAND_SEGMENT   << "  \t V(D)J segmentation (not recommended)" << endl
       << "  \t\t" << COMMAND_GERMLINES << "  \t discover all germlines" << endl
       << endl       

       << "Germline databases" << endl
       << "  -V <file>     V germline multi-fasta file" << endl
       << "  -D <file>     D germline multi-fasta file (automatically implies -d)" << endl
       << "  -J <file>     J germline multi-fasta file" << endl
       << "  -G <prefix>   prefix for V (D) and J repertoires (shortcut for -V <prefix>V.fa -D <prefix>D.fa -J <prefix>J.fa)" << endl
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

       << "Limit to keep a window" << endl
       << "  -r <nb>       minimal number of reads containing a window (default: " << MIN_READS_WINDOW << ")" << endl
       << endl

       << "Additional clustering (not output in vidjil.data and therefore not used in the browser)" << endl
       << "  -e <file>     manual clustering -- a file used to force some specific edges" << endl
       << "  -n <int>      maximum distance between neighbors for automatic clustering (default " << DEFAULT_EPSILON << "). No automatic clusterisation if =0." << endl
       << "  -N <int>      minimum required neighbors for automatic clustering (default " << DEFAULT_MINPTS << ")" << endl
       << "  -S            generate and save comparative matrix for clustering" << endl
       << "  -L            load comparative matrix for clustering" << endl
       << "  -C <string>   use custom Cost for automatic clustering : format \"match, subst, indels, homo, del_end\" (default "<<Cluster<<" )"<< endl
       << endl

       << "Limits to report a clone" << endl
       << "  -R <nb>       minimal number of reads supporting a clone (default: " << MIN_READS_CLONE << ")" << endl
       << "  -% <ratio>    minimal percentage of reads supporting a clone (default: " << RATIO_READS_CLONE << ")" << endl
       << endl

       << "Limits to segment a clone" << endl
       << "  -z <nb>       maximal number of clones to be segmented (0: no limit, do not use) (default: " << MAX_CLONES << ")" << endl
       << "  -A            reports and segments all clones (-r 0 -R 1 -% 0 -z 0), to be used only on very small datasets" << endl
       << endl

       << "Fine segmentation options (second pass, see warning in doc/README)" << endl
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
       << "Examples (see doc/README)" << endl
       << "  " << progname << "             -G germline/IGH             -d data/Stanford_S22.fasta" << endl
       << "  " << progname << " -c clones   -G germline/IGH  -r 5 -R 5  -d data/Stanford_S22.fasta" << endl
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
  int command = CMD_WINDOWS;

  int max_clones = MAX_CLONES ;
  int min_reads_window = MIN_READS_WINDOW ;
  int min_reads_clone = MIN_READS_CLONE ;
  float ratio_reads_clone = RATIO_READS_CLONE;
  // int average_deletion = 4;     // Average number of deletion in V or J

  float ratio_representative = DEFAULT_RATIO_REPRESENTATIVE;
  unsigned int max_auditionned = DEFAULT_MAX_AUDITIONED;

  // Admissible delta between left and right segmentation points
  int delta_min = DEFAULT_DELTA_MIN ; // Kmer+Fine
  int delta_max = DEFAULT_DELTA_MAX ; // Fine

  bool output_sequences_by_cluster = false;
  bool detailed_cluster_analysis = true ;
  bool output_segmented = false;
  bool output_unsegmented = false;

  string forced_edges = "" ;

  string windows_labels_file = "" ;
  string normalization_file = "" ;

  char c ;

  int options_s_k = 0 ;

  //JsonArray which contains the Levenshtein distances
  JsonArray jsonLevenshtein;

  //$$ options: getopt

  while ((c = getopt(argc, argv, "AhaG:V:D:J:k:r:R:vw:e:C:t:l:dc:m:M:N:s:p:Sn:o:Lx%:Z:z:uU")) != EOF)

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
      case 'x':
	detailed_cluster_analysis = false;
	break;
      case 'c':
        if (!strcmp(COMMAND_ANALYSIS,optarg))
          command = CMD_ANALYSIS;
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

      case 'r':
	min_reads_window = atoi(optarg);
        break;

      case '%':
	ratio_reads_clone = atof(optarg);
	break;

      case 'R':
	min_reads_clone = atoi(optarg);
        break;

      case 'z':
	max_clones = atoi(optarg);
        break;

      case 'A': // --all
	min_reads_window = 1 ;
	ratio_reads_clone = 0 ;
	min_reads_clone = 0 ;
	max_clones = 0 ;
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
  case CMD_ANALYSIS: cout << "Analysing clones" << endl; 
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

  //////////////////////////////://////////
  //         DISCOVER GERMLINES          //
  /////////////////////////////////////////
  if (command == CMD_GERMLINES)
    {
#define KMER_AMBIGUOUS "?"
#define KMER_UNKNOWN "_"

      list<const char* > f_germlines ;

      // TR
      f_germlines.push_back("germline/TRAV.fa");
      f_germlines.push_back("germline/TRAJ.fa");

      f_germlines.push_back("germline/TRBV.fa");
      f_germlines.push_back("germline/TRBD.fa");
      f_germlines.push_back("germline/TRBJ.fa");

      f_germlines.push_back("germline/TRDV.fa"); 
      f_germlines.push_back("germline/TRDD.fa");
      f_germlines.push_back("germline/TRDJ.fa");

      f_germlines.push_back("germline/TRGV.fa");
      f_germlines.push_back("germline/TRGJ.fa");

      // Ig

      f_germlines.push_back("germline/IGHV.fa");
      f_germlines.push_back("germline/IGHD.fa");
      f_germlines.push_back("germline/IGHJ.fa");

      f_germlines.push_back("germline/IGKV.fa");
      f_germlines.push_back("germline/IGKJ.fa");

      f_germlines.push_back("germline/IGLV.fa");
      f_germlines.push_back("germline/IGLJ.fa");

      // Read germline and build one unique index

      bool rc = true ;   
      IKmerStore<KmerStringAffect>  *index = KmerStoreFactory::createIndex<KmerStringAffect>(seed, rc);
      map <string, int> stats_kmer, stats_max;

      for (list<const char* >::const_iterator it = f_germlines.begin(); it != f_germlines.end(); ++it)
	{
	  Fasta rep(*it, 2, "|", cout);
	  index->insert(rep, *it);
	}

      // Initialize statistics, with two additional categories

      f_germlines.push_back(KMER_AMBIGUOUS);
      f_germlines.push_back(KMER_UNKNOWN);

      for (list<const char* >::const_iterator it = f_germlines.begin(); it != f_germlines.end(); ++it)
	{
	  stats_kmer[string(*it)] = 0 ;
	  stats_max[string(*it)] = 0 ;
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
      set<KmerStringAffect> forbidden;
      forbidden.insert(KmerStringAffect::getAmbiguous());
      forbidden.insert(KmerStringAffect::getUnknown());
      
      // Loop through all reads

      int nb_reads = 0 ;
      int total_length = 0 ;
      int s = index->getS();

      while (reads->hasNext())
	{
	  reads->next();
	  nb_reads++;
	  string seq = reads->getSequence().sequence;
	  total_length += seq.length() - s;

	  KmerAffectAnalyser<KmerStringAffect> *kaa = new KmerAffectAnalyser<KmerStringAffect>(*index, seq);

	  for (int i = 0; i < kaa->count(); i++) 
	    { 
	      KmerStringAffect ksa = kaa->getAffectation(i);

	      if (ksa.isAmbiguous())
		{
		  stats_kmer[KMER_AMBIGUOUS]++ ;
		  continue ;
		}
	      
	      if (ksa.isUnknown()) 
		{
		  stats_kmer[KMER_UNKNOWN]++ ;
		  continue ;
		}

	      stats_kmer[ksa.label]++ ;
	    }

          delete kaa;

	  CountKmerAffectAnalyser<KmerStringAffect> ckaa(*index, seq);
	  ckaa.setAllowedOverlap(k-1);

	  stats_max[ckaa.max(forbidden).label]++ ;

	}

      delete reads;

      // Display statistics

      cout << "  <== " << nb_reads << " reads" << endl ;
      cout << "\t" << " max" << "\t\t" << "        kmers" << "\n" ;
      for (list<const char* >::const_iterator it = f_germlines.begin(); it != f_germlines.end(); ++it)
	{
	  cout << setw(12) << stats_max[*it] << " " ;
	  cout << setw(6) << fixed << setprecision(2) <<  (float) stats_max[*it] / nb_reads * 100 << "%" ;

	  cout << "     " ;

	  cout << setw(12) << stats_kmer[*it] << " " ;
	  cout << setw(6) << fixed << setprecision(2) <<  (float) stats_kmer[*it] / total_length * 100 << "%" ;

	  cout << "     " << *it << endl ;
	}
      
      delete index;
      exit(0);
    }


  //////////////////////////////////
  //$$ Read sequence files

  if (!segment_D) // TODO: add other constructor to Fasta, and do not load rep_D in this case
    f_rep_D = "";

  Fasta rep_V(f_rep_V, 2, "|", cout);
  Fasta rep_D(f_rep_D, 2, "|", cout);
  Fasta rep_J(f_rep_J, 2, "|", cout);

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
  if (command == CMD_ANALYSIS || command == CMD_WINDOWS) {

    //////////////////////////////////
    cout << "# seed = " << seed << "," ;
    cout << " weight = " << seed_weight(seed) << "," ;
    cout << " span = " << seed.size() << endl ;
    cout << "# k = " << k << "," ;
    cout << " w = " << w << "," ;
    cout << " delta = [" << delta_min << "," << delta_max << "]" << endl ;


    //////////////////////////////////
    //$$ Build Kmer indexes
    cout << "Build Kmer indexes" << endl ;
    
    Germline *germline;
    germline = new Germline(rep_V, rep_D, rep_J, seed,
			    delta_min, delta_max);

    MultiGermline *multigermline;
    multigermline = new MultiGermline(germline);

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

    for (int i=0; i<STATS_SIZE; i++)
      {
	stream_segmentation_info << "   " << left << setw(20) << segmented_mesg[i] 
             << " ->" << right << setw(9) << we.getNbSegmented(static_cast<SEGMENTED>(i)) ;

	if (we.getAverageSegmentationLength(static_cast<SEGMENTED>(i)))
	  stream_segmentation_info << "      " << setw(5) << fixed << setprecision(1) 
               << we.getAverageSegmentationLength(static_cast<SEGMENTED>(i));
	
	stream_segmentation_info << endl ;
      }
    
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


    if (command == CMD_ANALYSIS) {

    //////////////////////////////////
    //$$ min_reads_window (ou label)
    cout << "Considering only windows with >= " << min_reads_window << " reads and labeled windows" << endl;

    pair<int, int> info_remove = windowsStorage->keepInterestingWindows((size_t) min_reads_window);
	 
    cout << "  ==> keep " <<  windowsStorage->size() << " windows in " << info_remove.second << " reads" ;
    cout << " (" << setprecision(3) << 100 * (float) info_remove.second / nb_total_reads << "%)  " << endl ;

    if (windowsStorage->size() == 0)
      {
	cout << "  ! No windows with current parameters." << endl;
      }
    //////////////////////////////////
    //$$ Clustering

    list <list <junction> > clones_windows;
    comp_matrix comp=comp_matrix(*windowsStorage);

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
      } 
    else
      { 
	cout << "No clustering" << endl ; 
	clones_windows  = comp.nocluster() ; /// XXX SUPPRIMER
      }

    cout << "  ==> " << clones_windows.size() << " clones" << endl ;
 
    if (clones_windows.size() == 0)
      {
	cout << "  ! No clones with current parameters." << endl;
	cout << "  ! See the 'Limits to report a clone' options (-R, -%, -z, -A)." << endl;
      }
    else // clones_windows.size() > 0
      { 

    //$$ Sort clones, number of occurrences
    //////////////////////////////////
    cout << "Sort clones by number of occurrences" << endl;

    list<pair<list <junction>, int> >sort_clones;

    for (list <list <junction> >::const_iterator it = clones_windows.begin(); it != clones_windows.end(); ++it)
      {
        list <junction>clone = *it ;

	int clone_nb_reads=0;
	
        for (list <junction>::const_iterator it2 = clone.begin(); it2 != clone.end(); ++it2)
	  clone_nb_reads += windowsStorage->getNbReads(*it2);
	  
	bool labeled = false ;
	// Is there a labeled window ?
	for (list <junction>::const_iterator iit = clone.begin(); iit != clone.end(); ++iit) {
	  if (windows_labels.find(*iit) != windows_labels.end())
	    {
	      labeled = true ;
	      break ;
	    }
	}

	  if (labeled 
	      || ((clone_nb_reads >= min_reads_clone) 
		  && (clone_nb_reads * 100.0 / nb_segmented >= ratio_reads_clone)))
          // Record the clone and its number of occurrence
          sort_clones.push_back(make_pair(clone, clone_nb_reads));
      }

    // Sort clones
    sort_clones.sort(pair_occurrence_sort<list<junction> >);

    cout << endl;

    //////////////////////////////////
    //$$ Output clones
    if (max_clones > 0)
      cout << "Output at most " << max_clones<< " clones" ;
    else
      cout << "Output all clones" ;

    cout << " with >= " << min_reads_clone << " reads and with a ratio >= " << ratio_reads_clone << endl ;

    map <string, int> clones_codes ;
    map <string, string> clones_map_windows ;

    list <Sequence> representatives ;
    list <string> representatives_labels ;

    VirtualReadScore *scorer = new KmerAffectReadScore(*(germline->index));
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

    for (list <pair<list <junction>,int> >::const_iterator it = sort_clones.begin();
         it != sort_clones.end(); ++it) {
      list<junction> clone = it->first;
      int clone_nb_reads = it->second;

    
      ++num_clone ;

      if (max_clones && (num_clone == max_clones + 1))
	  break ;

      cout << "#### " ;

      string clone_file_name = out_seqdir+ prefix_filename + CLONE_FILENAME + string_of_int(num_clone) ;
      string windows_file_name = out_seqdir+ prefix_filename + WINDOWS_FILENAME + "-" + string_of_int(num_clone) ;

      ofstream out_clone(clone_file_name.c_str());
      ofstream out_windows(windows_file_name.c_str());
      
      cout << "Clone #" << right << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone ;
      cout << " – " << setfill(' ') << setw(WIDTH_NB_READS) << clone_nb_reads << " reads" ;
      cout << " – " << setprecision(3) << 100 * (float) clone_nb_reads / nb_segmented << "%  "  ;

      cout << " – " << 100 * (float) clone_nb_reads * compute_normalization_one(norm_list, clone_nb_reads) / nb_segmented << "% " 
	  << compute_normalization_one(norm_list, clone_nb_reads) << " ";
      cout.flush();

      //////////////////////////////////

      //$$ Sort sequences by nb_reads
      list<pair<junction, int> >sort_windows;

      for (list <junction>::const_iterator it = clone.begin(); it != clone.end(); ++it) {
	int nb_reads = windowsStorage->getNbReads(*it);
        sort_windows.push_back(make_pair(*it, nb_reads));
      }
      sort_windows.sort(pair_occurrence_sort<junction>);

      //$$ Output windows 

      int num_seq = 0 ;

      for (list <pair<junction, int> >::const_iterator it = sort_windows.begin(); 
           it != sort_windows.end(); ++it) {
	num_seq++ ;

        out_windows << ">" << it->second << "--window--" << num_seq << " " << windows_labels[it->first] << endl ;
	out_windows << it->first << endl;

	if ((!detailed_cluster_analysis) && (num_seq == 1))
	  {
	    cout << "\t" << setw(WIDTH_NB_READS) << it->second << "\t";
	    cout << it->first ;
	    cout << "\t" << windows_labels[it->first] ;
	  }
      }

      if (!detailed_cluster_analysis)
	{
	  cout << endl ;
	  continue ;
	}

	
      //$$ First pass, choose one representative per cluster
      
      for (list <pair<junction, int> >::const_iterator it = sort_windows.begin(); 
           it != sort_windows.end(); ++it) {

        out_clone << ">" << it->second << "--window--" << num_seq << " " << windows_labels[it->first] << endl ;
	out_clone << it->first << endl;



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

        Sequence representative 
          = windowsStorage->getRepresentative(it->first, seed, 
                                             min_cover_representative,
                                             ratio_representative,
                                             max_auditionned);

        if (representative == NULL_SEQUENCE) {
	  clones_without_representative++ ;
	  if (verbose)
	    cout << "# (no representative sequence with current parameters)" ;

        } else {
	//$$ There is one representative, FineSegmenter
	  representative.label = string_of_int(it->second) + "--" + representative.label;
	  FineSegmenter seg(representative, rep_V, rep_J, germline->delta_min, germline->delta_max, segment_cost);
	
	if (segment_D)
	  seg.FineSegmentD(rep_V, rep_D, rep_J);
	
        // Output segmentation to .json
        json_data_segment[it->first]=seg.toJsonList(rep_V, rep_D, rep_J);
        
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

	      // Output segmentation to CLONE_FILENAME-*
              out_clone << seg ;
              out_clone << endl ;

	      // Output best V, (D) and J germlines to CLONE_FILENAME-*
	      out_clone << rep_V.read(seg.best_V) ;
	      if (segment_D) out_clone << rep_D.read(seg.best_D) ;
	      out_clone << rep_J.read(seg.best_J) ;
	      out_clone << endl;
          }


	if (output_sequences_by_cluster) // -a option, output all sequences
	  {
	    list<Sequence> &sequences = windowsStorage->getReads(it->first);
	    
	    for (list<Sequence>::const_iterator itt = sequences.begin(); itt != sequences.end(); ++itt)
	      {
		out_clone << *itt ;
	      }
	  }


        if (seg.isSegmented() 
            || it == --(sort_windows.end())) {
	  // Store the representative and its label
          representatives.push_back(representative);
          representatives_labels.push_back("#" + string_of_int(num_clone));

              // display window
              cout << endl 
		   << ">clone-"  << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << "-window"  << " " << windows_labels[it->first] << endl
		   << it->first << endl ;

	      // display representative, possibly segmented...
	      // (TODO: factorize)
	      // ... on stdout
	      cout << ">clone-"  << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << "-representative" << " " << seg.info << setfill(' ') << endl ;
	      cout << representative.sequence << endl;

	      // ... and in out_clones
	      out_clones << ">clone-"  << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << "-representative" 
			 << "-" << setfill('0') << setw(WIDTH_NB_READS) << clone_nb_reads 
			 << "-" << setprecision(3) << 100 * (float) clone_nb_reads / nb_segmented << "%"
			 << " " << seg.info << setfill(' ') << endl ;
	      out_clones << representative.sequence << endl;

              break ;
        }
        }
      }

      cout << endl ;
      out_windows.close();
      out_clone.close();
    }

    out_edges.close() ;
    out_clones.close();

    cout << "#### end of clones" << endl; 
    cout << endl;

    if (clones_without_representative > 0)
      {
	cout << clones_without_representative << " clones without representatives" ;
	cout << " (requiring " << min_cover_representative << "/" << ratio_representative << " supporting reads)" << endl ;
	cout << endl ;
      }
  
    //$$ Compare representatives of all clones

    if (detailed_cluster_analysis)
      {

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
        //Sort all windows
        windowsStorage->sort();
        //Compute all the edges
        SimilarityMatrix matrixLevenshtein = compare_windows(*windowsStorage, Levenshtein, max_clones);
        //Added distances matrix in the JsonTab
        jsonLevenshtein << JsonOutputWindowsMatrix(matrixLevenshtein);
  }


    delete scorer;
    }

    } // endif (clones_windows.size() > 0)

    
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
    
    JsonArray json_timestamp;
    json_timestamp.add(time_buffer);
    

    JsonArray jsonSortedWindows = windowsStorage->sortedWindowsToJsonArray(json_data_segment,
                                                                        norm_list,
                                                                        nb_segmented);
    
    
    JsonList *json_samples;
    json_samples=new JsonList();
    json_samples->add("number", "1");
    JsonArray json_original_names;
    json_original_names.add(f_reads);
    json_samples->add("original_names", json_original_names);
    
    json->add("vidjil_json_version", VIDJIL_JSON_VERSION);
    json->add("samples", *json_samples);
    json->add("timestamp", json_timestamp);
    json->add("commandline", stream_cmdline.str());// TODO: escape "s in argv
    json->add("segmentation_info", stream_segmentation_info.str());
    json->add("germline", germline_system);
    json->add("germline_V", f_rep_V);
    json->add("germline_J", f_rep_J);
    json->add("reads_total", json_nb_reads);
    json->add("reads_segmented", json_nb_segmented); 
    json->add("windows", jsonSortedWindows);

    //Added edges in the json output file
    //json->add("links", jsonLevenshtein);
    out_json << json->toString();
    
    delete germline ;
    delete json;
    delete windowsStorage;
    delete json_samples;

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
    

    cout << "* WARNING: vidjil was run with '-c segment' option" << endl
         << "* Vidjil purpose is to extract very quickly windows overlapping the CDR3" << endl
         << "* or to gather reads into clones (-c clones), and not to provide an accurate V(D)J segmentation." << endl
         << "* The following segmentations are slow to compute and are provided only for convenience." << endl
         << "* They should be checked with other softwares such as IgBlast, iHHMune-align or IMGT/V-QUEST." << endl
      ;

    while (reads->hasNext()) 
      {
        reads->next();
        FineSegmenter s(reads->getSequence(), rep_V, rep_J, delta_min, delta_max, segment_cost);
	if (s.isSegmented()) {
	  if (segment_D)
	  s.FineSegmentD(rep_V, rep_D, rep_J);
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
