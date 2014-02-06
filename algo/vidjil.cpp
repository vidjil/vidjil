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
#include "core/kmerstore.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/windows.h"
#include "core/cluster-junctions.h"
#include "core/dynprog.h"
#include "core/read_score.h"
#include "core/read_chooser.h"
#include "core/msa.h"
#include "core/compare-all.h"
#include "core/teestream.h"
#include "core/mkdir.h"
#include "core/labels.h"
#include "core/representative.h"
#include "core/list_utils.h"

#include "vidjil.h"

// RELEASE_TAG may be defined in the "release.h" file.
// If RELEASE_TAG is undefined, the version will be the git hash.
// #define RELEASE_TAG  "2013.04"
#include "release.h"

//$$ #define (mainly default options)

#define DEFAULT_GERMLINE_SYSTEM "TRG" 
#define DEFAULT_V_REP  "./germline/TRGV.fa" // IGHV 
#define DEFAULT_D_REP  "./germline/IGHD.fa" 
#define DEFAULT_J_REP  "./germline/TRGJ.fa" // IGHJ

// #define DEFAULT_READS  "./data/Stanford_S22.fa"
#define DEFAULT_READS  "../bonsai/vdj/seq/chr_pgm_50k.cut.fa"
#define MIN_READS_WINDOW 10
#define MIN_READS_CLONE 10
#define MAX_CLONES 20
#define RATIO_READS_CLONE 0.1

#define COMMAND_WINDOWS "windows"
#define COMMAND_ANALYSIS "clones"
#define COMMAND_SEGMENT "segment"
 
enum { CMD_WINDOWS, CMD_ANALYSIS, CMD_SEGMENT } ;

#define OUT_DIR "./out/" 
#define CLONE_FILENAME "clone.fa-"
#define WINDOWS_FILENAME "windows.fa"
#define SEQUENCES_FILENAME "sequences.fa"
#define SEGMENTED_FILENAME "segmented.vdj.fa"
#define UNSEGMENTED_FILENAME "unsegmented.fa"
#define EDGES_FILENAME "edges"
#define COMP_FILENAME "comp.data"
#define GRAPH_FILENAME "graph"
#define JSON_SUFFIX ".data"

// "tests/data/leukemia.fa" 

#define DEFAULT_K      10
#define DEFAULT_W      40
#define DEFAULT_W_D    60
#define DEFAULT_SEED   "#####-#####"

#define DEFAULT_DELTA_MIN  -10
#define DEFAULT_DELTA_MAX   15

#define DEFAULT_DELTA_MIN_D  0
#define DEFAULT_DELTA_MAX_D  50

#define HISTOGRAM_SIZE_AUDITIONED 500
#define DEFAULT_MAX_AUDITIONED 2000
#define DEFAULT_RATIO_REPRESENTATIVE 0.5
#define DEFAULT_MIN_COVER_REPRESENTATIVE 5

#define DEFAULT_EPSILON  0
#define DEFAULT_MINPTS   10

#define DEFAULT_CLUSTER_COST  Cluster
#define DEFAULT_SEGMENT_COST   VDJ

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
       << "  \t\t" << COMMAND_SEGMENT   << "  \t V(D)J segmentation" << endl
       << endl       

       << "Germline databases" << endl
       << "  -V <file>     V germline multi-fasta file" << endl
       << "  -D <file>     D germline multi-fasta file (automatically implies -d)" << endl
       << "  -J <file>     J germline multi-fasta file" << endl
       << "  -G <prefix>   prefix for V (D) and J repertoires (shortcut for -V <prefix>V.fa -D <prefix>D.fa -J <prefix>J.fa)" << endl
       << endl

       << "Window prediction" << endl
#ifndef NO_SPACED_SEEDS
       << "  -s <string>   spaced seed used for the V/J affectation (default: " << DEFAULT_SEED << ")" << endl
#endif
       << "  -k <int>      k-mer size used for the V/J affectation (default: " << DEFAULT_K << ")" << endl
       << "  -w <int>      w-mer size used for the length of the extracted window (default: " << DEFAULT_W << ")(default with -d: " << DEFAULT_W_D << ")" << endl
       << endl

       << "Window annotations" << endl
       << "  -l <file>     labels for some windows -- these windows will be kept even if some limits are not reached" << endl
       << endl

       << "Limit to keep a window" << endl
       << "  -r <nb>       minimal number of reads containing a window (default: " << MIN_READS_WINDOW << ")" << endl
       << endl

       << "Clusterisation" << endl
       << "  -e <file>     manual clusterisation -- a file used to force some specific edges" << endl
       << "  -n <int>      maximum distance between neighbors for automatic clusterisation (default " << DEFAULT_EPSILON << "). No automatic clusterisation if =0." << endl
       << "  -N <int>      minimum required neighbors for automatic clusterisation (default " << DEFAULT_MINPTS << ")" << endl
       << "  -S            generate and save comparative matrix for clustering" << endl
       << "  -L            load comparative matrix for clustering" << endl
       << "  -C <string>   use custom Cost for automatic clustering : format \"match, subst, indels, homo, del_end\" (default "<<Cluster<<" )"<< endl
       << endl

       << "Limits to report a clone" << endl
       << "  -R <nb>       minimal number of reads supporting a clone (default: " << MIN_READS_CLONE << ")" << endl
       << "  -% <ratio>    minimal percentage of reads supporting a clone (default: " << RATIO_READS_CLONE << ")" << endl
       << "  -z <nb>       maximal number of clones reported (default: " << MAX_CLONES << ")" << endl
       << endl

       << "Fine segmentation options" << endl
       << "  -d            segment into V(D)J components instead of VJ " << endl
       << "  -m <int>      minimal admissible delta between segmentation points (default: " << DEFAULT_DELTA_MIN << ") (default when -d is used: " << DEFAULT_DELTA_MIN_D << ")" << endl
       << "  -M <int>      maximal admissible delta between segmentation points (default: " << DEFAULT_DELTA_MAX << ") (default when -d is used: " << DEFAULT_DELTA_MAX_D << ")" << endl
       << "  -f <string>   use custom Cost for fine segmenter : format \"match, subst, indels, homo, del_end\" (default "<<VDJ<<" )"<< endl
       << endl

       << "Output" << endl
       << "  -o <dir>      output directory (default: " << OUT_DIR << ")" <<  endl
       << "  -p <string>   prefix output filenames by the specified string" << endl
    
       << "  -a            output all sequences by cluster (" << SEQUENCES_FILENAME << ")" << endl
       << "  -x            no detailed analysis of each cluster" << endl
       << "  -v            verbose mode" << endl
       << endl        

       << endl 
       << "Examples (see doc/README)" << endl
       << "  " << progname << "             -G germline/IGH  -d  data/Stanford_S22.fasta" << endl
       << "  " << progname << " -c clones   -G germline/IGH  -d  data/Stanford_S22.fasta" << endl
       << "  " << progname << " -c segment  -G germline/IGH  -d  data/Stanford_S22.fasta" << endl
    ;
  exit(1);
}

int main (int argc, char **argv)
{
  cout << "# Vidjil -- V(D)J recombinations analysis <http://bioinfo.lifl.fr/vidjil>" << endl
       << "# Copyright (C) 2011, 2012, 2013, 2014 by the Vidjil team" << endl
       << "# Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille" << endl 
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

  size_t min_cover_representative = DEFAULT_MIN_COVER_REPRESENTATIVE;
  float ratio_representative = DEFAULT_RATIO_REPRESENTATIVE;
  unsigned int max_auditionned = DEFAULT_MAX_AUDITIONED;

  // Admissible delta between left and right segmentation points
  int delta_min = DEFAULT_DELTA_MIN ; // Kmer+Fine
  int delta_max = DEFAULT_DELTA_MAX ; // Fine
  int delta_max_kmer = 50 ; // TODO 

  bool output_sequences_by_cluster = false;
  bool detailed_cluster_analysis = true ;
  bool very_detailed_cluster_analysis = false ;

  string forced_edges = "" ;

  string windows_labels_file = "" ;
  string normalization_file = "" ;

  char c ;

  //$$ options: getopt

  while ((c = getopt(argc, argv, "haG:V:D:J:k:r:R:vw:e:C:t:l:dc:m:M:N:s:p:Sn:o:Lx%:Z:z:")) != EOF)

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
	break;

      case 'D':
	f_rep_D = optarg;
        segment_D = 1;
	break;
        
      case 'J':
	f_rep_J = optarg;
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
      case 's':
#ifndef NO_SPACED_SEEDS
	seed = string(optarg);
	k = seed_weight(seed);
#else
        cerr << "To enable the option -s, please compile without NO_SPACED_SEEDS" << endl;
#endif
        break;
	
      // Clusterisation
	
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
      }

  // If there was no -w option, then w is either DEFAULT_W or DEFAULT_W_D
  if (w == 0)
    w = default_w ;

  
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
  cout << "# git: " ;
  cout.flush();
  if (system("git log -1 --pretty=format:'%h (%ci)' --abbrev-commit") == -1) {
    cout << "<not in a git repository>";
  }
  cout << endl ;
#endif

  //////////////////////////////////
  //$$ Read sequence files

  cout << "Read sequence files" << endl ;


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
    cout << "# seed = " << seed << endl ;
    cout << "    weight = " << seed_weight(seed) << endl ;
    cout << "    span = " << seed.size() << endl ;
    cout << "# k = " << k << endl ;
    cout << "# w = " << w << endl ;
    cout << "# delta = [" << delta_min << "," << delta_max << "]" << endl ;


    //////////////////////////////////
    //$$ Build Kmer indexes
    cout << "Build Kmer indexes" << endl ;

    bool rc = true ;
    
    IKmerStore<KmerAffect>  *index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);
    index->insert(rep_V, "V");
    index->insert(rep_J, "J");

  
    //////////////////////////////////
    //$$ Kmer Segmentation

    string f_segmented = out_dir + prefix_filename + SEGMENTED_FILENAME ;
    cout << "  ==> " << f_segmented << endl ;
    ofstream out_segmented(f_segmented.c_str()) ;

#ifdef OUT_UNSEGMENTED
    string f_unsegmented = out_dir + prefix_filename + UNSEGMENTED_FILENAME ;
    cout << "  ==> " << f_unsegmented << endl ;
    ofstream out_unsegmented(f_unsegmented.c_str()) ;
#else
    ofstream out_unsegmented;
#endif

    cout << "Loop through reads, looking for windows" ;
 

    WindowsStorage windowsStorage(windows_labels);

    int ok = 0 ;
    size_t nb_total_reads = 0;

    int stats_segmented[STATS_SIZE];
    int stats_length[STATS_SIZE];
    for (int i=0; i<STATS_SIZE; i++)
      {
	stats_segmented[i] = 0; 
	stats_length[i] = 0 ;
      }

    while (reads->hasNext())
      {
        reads->next();
        nb_total_reads++;
        if (verbose)
          cout << endl << endl << reads->getSequence().label << endl;
       
        KmerSegmenter seg(reads->getSequence(), index, delta_min, delta_max_kmer, 
			  stats_segmented, stats_length,
			  segment_cost, out_unsegmented);
        if (verbose)
	  cout << seg;
	  
        if (!(ok++ % 10000))
          {
            cout << "." ;
            cout.flush();
          }

        if (seg.isSegmented())
          {
            junction junc = seg.getJunction(w);

            if (junc.size())
              {
		stats_segmented[TOTAL_SEG_AND_WINDOW]++ ;
		stats_length[TOTAL_SEG_AND_WINDOW] += seg.getSequence().sequence.length() ;
                windowsStorage.add(junc, reads->getSequence());
              }
	    else
	      {
		stats_segmented[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW]++ ;
		stats_length[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW] += seg.getSequence().sequence.length() ;
	      }

	    //////////////////////////////////
	    // Output segmented
	    //////////////////////////////////
	    
	    out_segmented << seg ; // Sortie du KmerSegmenter (V/N/J par left/right)
          }
      }

    cout << endl;


    //$$ Display statistics on segmentation causes


    int nb_segmented_including_too_short = stats_segmented[TOTAL_SEG_AND_WINDOW] + stats_segmented[TOTAL_SEG_BUT_TOO_SHORT_FOR_THE_WINDOW] ;

    cout << "  ==> segmented " << nb_segmented_including_too_short << " reads"
	<< " (" << setprecision(3) << 100 * (float) nb_segmented_including_too_short / nb_total_reads << "%)" 
	<< endl ;

    // nb_segmented is the main denominator for the following (but will be normalized)
    int nb_segmented = stats_segmented[TOTAL_SEG_AND_WINDOW] ;

    cout << "  ==> found " << windowsStorage.size() << " " << w << "-windows"
	<< " in " << nb_segmented << " segments"
	<< " (" << setprecision(3) << 100 * (float) nb_segmented / nb_total_reads << "%)"
	<< " inside " << nb_total_reads << " sequences" << endl ;
  
    cout << "                                  #      av. length" << endl ;

    for (int i=0; i<STATS_SIZE; i++)
      {
	cout << "   " << left << setw(20) << segmented_mesg[i] 
	    << " ->" << right << setw(9) << stats_segmented[i] ;

	if (stats_length[i])
	  cout << "      " << setw(5) << fixed << setprecision(1) << (float) stats_length[i] / stats_segmented[i] ;
	
	cout << endl ;
      }
    
      map <junction, JsonList> json_data_segment ;
    

	//////////////////////////////////
	//$$ Sort windows
	
        cout << "Sort windows by number of occurrences" << endl;
        windowsStorage.sort();

	//////////////////////////////////
	//$$ Output windows
	//////////////////////////////////

	string f_all_windows = out_dir + prefix_filename + WINDOWS_FILENAME;
	cout << "  ==> " << f_all_windows << endl ;

	ofstream out_all_windows(f_all_windows.c_str());
        windowsStorage.printSortedWindows(out_all_windows);

	//$$ Normalization
	list< pair <float, int> > norm_list = compute_normalization_list(windowsStorage.getMap(), normalization, nb_segmented);


    if (command == CMD_ANALYSIS) {

    //////////////////////////////////
    //$$ min_reads_window (ou label)
    cout << "Considering only windows with >= " << min_reads_window << " reads and labeled windows" << endl;

    pair<int, int> info_remove = windowsStorage.keepInterestingWindows((size_t) min_reads_window);
	 
    cout << "  ==> keep " <<  windowsStorage.size() << " windows in " << info_remove.second << " reads" ;
    cout << " (" << setprecision(3) << 100 * (float) info_remove.second / nb_total_reads << "%)  " << endl ;

    //////////////////////////////////
    //$$ Clustering

    list <list <junction> > clones_windows;
    comp_matrix comp=comp_matrix(windowsStorage);

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
	comp.stat_cluster(clones_windows, out_dir + prefix_filename + GRAPH_FILENAME, cout );
	comp.del();
      } 
    else
      {
	cout << "No clustering" << endl ;
	clones_windows  = comp.nocluster() ;
      }

    cout << "  ==> " << clones_windows.size() << " clones" << endl ;
 
    //$$ Sort clones, number of occurrences
    //////////////////////////////////
    cout << "Sort clones by number of occurrences" << endl;

    list<pair<list <junction>, int> >sort_clones;

    for (list <list <junction> >::const_iterator it = clones_windows.begin(); it != clones_windows.end(); ++it)
      {
        list <junction>clone = *it ;

	int clone_nb_reads=0;
	
        for (list <junction>::const_iterator it2 = clone.begin(); it2 != clone.end(); ++it2)
	  clone_nb_reads += windowsStorage.getNbReads(*it2);
	  
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

    cout << "Sort" << endl ;
    // Sort clones
    sort_clones.sort(pair_occurrence_sort<list<junction> >);

    //////////////////////////////////
    //$$ Output clones
    cout << "Output at most " << max_clones<< " clones with >= " << min_reads_clone << " reads and with a ratio >= " << ratio_reads_clone << endl ;

    map <string, int> clones_codes ;
    map <string, string> clones_map_windows ;

    list <Sequence> representatives ;
    list <string> representatives_labels ;

    VirtualReadScore *scorer = new KmerAffectReadScore(*index);
    int num_clone = 0 ;

    ofstream out_edges((out_dir+prefix_filename + EDGES_FILENAME).c_str());
    int nb_edges = 0 ;
    cout << "  ==> suggested edges in " << out_dir+ prefix_filename + EDGES_FILENAME
        << endl ;

    cout << endl ;

    cout << "## output clones in " << out_dir + prefix_filename << endl ; 

    for (list <pair<list <junction>,int> >::const_iterator it = sort_clones.begin();
         it != sort_clones.end(); ++it) {
      list<junction> clone = it->first;
      int clone_nb_reads = it->second;

    
      ++num_clone ;

      if (num_clone == (max_clones + 1))
	  break ;

      cout << "#### " ;

      string clone_file_name = out_seqdir+ prefix_filename + CLONE_FILENAME + string_of_int(num_clone) ;
      string windows_file_name = out_seqdir+ prefix_filename + WINDOWS_FILENAME + "-" + string_of_int(num_clone) ;
      string sequences_file_name = out_seqdir+ prefix_filename + SEQUENCES_FILENAME + "-" + string_of_int(num_clone) ;

      ofstream out_clone(clone_file_name.c_str());
      ofstream out_windows(windows_file_name.c_str());
      ofstream out_sequences;

      if (output_sequences_by_cluster) {
        out_sequences.open(sequences_file_name.c_str());
      }
      
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
	int nb_reads = windowsStorage.getNbReads(*it);
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

      string best_V ;
      string best_D ;
      string best_J ;
      int more_windows = 0 ;
      
      for (list <pair<junction, int> >::const_iterator it = sort_windows.begin(); 
           it != sort_windows.end(); ++it) {

        out_clone << ">" << it->second << "--window--" << num_seq << " " << windows_labels[it->first] << endl ;
	out_clone << it->first << endl;

	// Choose one representative inside a list of "auditionned sequences"
	list <Sequence> auditioned_sequences;

	{
	  // Compute histogram with length distribution
	  int length_distribution[HISTOGRAM_SIZE_AUDITIONED];

	  for (int i=0; i<HISTOGRAM_SIZE_AUDITIONED; i++)
	    length_distribution[i] = 0 ;

	  list<Sequence> seqs = windowsStorage.getReads(it->first);
	  for (list<Sequence>::const_iterator it = seqs.begin(); it != seqs.end(); ++it) 
	    {
	      int length = (*it).sequence.size();
	      if (length >= HISTOGRAM_SIZE_AUDITIONED)
		length = HISTOGRAM_SIZE_AUDITIONED-1 ;
	      length_distribution[length]++ ;
	    }

	  /* Display histogram */
	  // for (int i=0; i<HISTOGRAM_SIZE_AUDITIONED; i++)
	  //  if (length_distribution[i])
	  //    cout << i << " -> " << length_distribution[i] << endl ;


	  // Compute "auditionned_min_size"
	  int to_be_auditionned = max_auditionned ;
	  unsigned int auditionned_min_size ;

	  for (auditionned_min_size=HISTOGRAM_SIZE_AUDITIONED-1; auditionned_min_size>0; auditionned_min_size--)
	    {
	      to_be_auditionned -= length_distribution[auditionned_min_size] ;
	      if (to_be_auditionned < 0) 
		break ;
	    }

	  if (verbose)
	  cout << " --> auditionned_min_size : " << auditionned_min_size << endl ;

	   // Build "auditionned_sequences"

	  for (list<Sequence>::const_iterator it = seqs.begin(); it != seqs.end(); ++it) 
	    {
	      if ((*it).sequence.size() >= auditionned_min_size)
		{
		  auditioned_sequences.push_back(*it);
		  if (auditioned_sequences.size() == max_auditionned)
		    break ;
		}
	    }
	}

	// Display statistics on auditionned sequences
	if (verbose)
	{
	  int total_length = 0 ;

	  for (list<Sequence>::const_iterator it = auditioned_sequences.begin(); it != auditioned_sequences.end(); ++it) 
	    total_length += (*it).sequence.size() ;
	  
	  cout << auditioned_sequences.size() << " auditioned sequences, avg length " << total_length / auditioned_sequences.size() << endl ;
	}

        KmerRepresentativeComputer repComp(auditioned_sequences, seed);
        repComp.compute(true, min_cover_representative, ratio_representative);
	

	//$$ There is one representative, FineSegmenter
        if (repComp.hasRepresentative()) {
	  
          Sequence representative = repComp.getRepresentative();
          representative.label = string_of_int(it->second) + "-" 
            + representative.label;
	  FineSegmenter seg(representative, rep_V, rep_J, delta_min, delta_max, segment_cost);
	
	if (segment_D)
	  seg.FineSegmentD(rep_V, rep_D, rep_J);
	
        //cout << seg.toJson();
        json_data_segment[it->first]=seg.toJsonList(rep_V, rep_D, rep_J);
        
        if (seg.isSegmented())
	  {
	    
	    // As soon as one representative is segmented
	    
	    representatives.push_back(seg.getSequence());
            representatives_labels.push_back("#" + string_of_int(num_clone));

              // We need to find the window in the representative
              size_t window_pos = seg.getSequence().sequence.find(it->first);

              // Default
              int ww = 2*w/3 ; // /2 ;

              if (window_pos != string::npos) {
                // for V.
                ww = seg.getLeft() - window_pos + seg.del_V;
              } 
            

              string end_V ="";
	    
              // avoid case when V is not in the window
              if (seg.getLeft() > (int) window_pos)
                end_V = rep_V.sequence(seg.best_V).substr(rep_V.sequence(seg.best_V).size() - ww, 
                                                          ww - seg.del_V);

              string mid_D = "";
	    
              if (segment_D)
                mid_D = rep_D.sequence(seg.best_D).substr(seg.del_D_left, 
                                                          rep_D.sequence(seg.best_D).size() - seg.del_D_left - seg.del_D_right );
	   
              if (window_pos != string::npos) {
                // for J.
                ww = (window_pos + w - 1) - seg.getRight() + seg.del_J;
              }
	    
              string start_J = "";
	    
              // avoid case when J is not in the window
              if (seg.getRight() > (int) (window_pos + w - 1))
                start_J=rep_J.sequence(seg.best_J).substr(seg.del_J, ww);
	      
              best_V = rep_V.label(seg.best_V) ;
              if (segment_D) best_D = rep_D.label(seg.best_D) ;
              best_J = rep_J.label(seg.best_J) ;
	    
              // TODO: pad aux dimensions exactes
              string pad_N = "NNNNNNNNNNNNNNNN" ;

              // Add V, (D) and J to windows to be aligned
	    
              out_windows << ">" << best_V << "-window" << endl ;
              out_windows << end_V << pad_N << endl ;
              more_windows++;

              if (segment_D) {
                out_windows << ">" << best_D << "-window" << endl ;
                out_windows << mid_D << endl ;   
                more_windows++ ;
              }
	    
              out_windows << ">" << best_J << "-window" << endl ;
              out_windows << pad_N << start_J <<  endl ;
              more_windows++;

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

              out_clone << seg ;
              out_clone << endl ;
          }

        if (seg.isSegmented() 
            || it == --(sort_windows.end())) {
              // display window
              cout << endl 
		   << ">clone-"  << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << "-window"  << " " << windows_labels[it->first] << endl
		   << it->first << endl ;

	      // display representative, possibly segmented
	      cout << ">clone-"  << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << "-representative" << " " << seg.info << setfill(' ') << endl ;

	      cout << representative.sequence << endl;
              break ;
        }
        }
      }

      cout << endl ;
      out_windows.close();

      if (!very_detailed_cluster_analysis)
	{
	  continue ;
	}


      //$$ Very detailed cluster analysis (with sequences)

      list<string> msa;
      bool good_msa = false ;

      // TODO: do something if no sequences have been segmented !
      if (!more_windows)
	{
	  cout << "!! No segmented sequence, deleting clone" << endl ;
	  // continue ;
	} else 
        {
          msa = multiple_seq_align(windows_file_name);
        
          // Alignment of windows
          
          if (!msa.empty())
            {
              if (msa.size() == sort_windows.size() + more_windows)
                {
                  // cout << "clustalw parse: success" << endl ;
                  good_msa = true ;
                }
              else
                {
                  cout << "! clustalw parse: failed" << endl ;
                }
            }
        }
      
      //$$ Second pass: output clone, all representatives      

      num_seq = 0 ;
      list <Sequence> representatives_this_clone ;
      string code_representative = "";

      for (list <pair<junction, int> >::const_iterator it = sort_windows.begin(); 
           it != sort_windows.end(); ++it) {

	num_seq++ ;

	string junc ;
	
	if (!good_msa)
	  {
	    junc = it->first ;
	  }
	else
	  {
	    junc = msa.back();
	    msa.pop_back();
	  }


	// Output all sequences

	if (output_sequences_by_cluster)
	  {
	    out_sequences << ">" << it->second << "--window--" << num_seq << " " << windows_labels[it->first] << endl ;
	    out_sequences << it->first << endl;

	    list<Sequence> sequences = windowsStorage.getReads(it->first);
	    
	    for (list<Sequence>::const_iterator itt = sequences.begin(); itt != sequences.end(); ++itt)
	      {
		out_sequences << *itt ;
	      }
	  }

	list <Sequence> auditioned_sequences;

	if (windowsStorage.getNbReads(it->first)<max_auditionned){
	  auditioned_sequences=windowsStorage.getReads(it->first);
	}else{

	  list <Sequence>::const_iterator it2;
	  it2=windowsStorage.getReads(it->first).begin();
	  
	  for (int i=0 ; i<(int) max_auditionned; i++){
	    auditioned_sequences.push_back(*it2);
	    it2++;
	  }
	}
	
        KmerRepresentativeComputer repComp(auditioned_sequences, seed);
        repComp.compute(true, min_cover_representative, ratio_representative);

        if (repComp.hasRepresentative()) {
          Sequence representative = repComp.getRepresentative();
          representative.label = string_of_int(it->second) + "-" 
            + representative.label;

          FineSegmenter seg(representative, rep_V, rep_J, delta_min, delta_max, segment_cost);

          if (segment_D)
            seg.FineSegmentD(rep_V, rep_D, rep_J);
		
          //cout << seg.toJson();
          json_data_segment[it->first]=seg.toJsonList(rep_V, rep_D, rep_J);

          if (seg.isSegmented())
	  {
	    representatives_this_clone.push_back(seg.getSequence());
	  }

          /// TODO: et si pas isSegmented ?

          bool warning = false;

          if (num_seq <= 20) /////
            {
              cout << setw(20) << representative.label << " " ;
              cout << "   " << junc ;
              cout << " " << setw(WIDTH_NB_READS) << it->second << " " ;
              cout << (warning ? "Â§ " : "  ") ;
              cout << seg.info ;
              cout << endl ;
            }
        }
      }
      
      //$$ Display msa
      if (good_msa)
	{
	  cout << setw(20) << best_V << "    " << msa.back() << endl ;
	  msa.pop_back();

	  if (segment_D)
	    {
	      cout << setw(20) << best_D << "    " << msa.back() << endl ;
	      msa.pop_back();
	    }

	  cout << setw(20) << best_J << "    " << msa.back() << endl ;
	  msa.pop_back();
	}
 
      out_clone.close();
      cout << endl;
      
      //$$ Compare representatives of this clone
      cout << "Comparing representatives of this clone 2 by 2" << endl ;
      // compare_all(representatives_this_clone);
      SimilarityMatrix matrix = compare_all(representatives_this_clone, true);
      cout << RawOutputSimilarityMatrix(matrix, 90);
    }

    out_edges.close() ;

    cout << endl;
    cout << "#### end of clones" << endl; 

  
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

     }


    delete scorer;
    }
    
    //$$ .json output: json_data_segment
    string f_json = out_dir + prefix_filename + "vidjil" + JSON_SUFFIX ; // TODO: retrieve basename from f_reads instead of "vidjil"
    cout << "  ==> " << f_json << endl ;
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
	
	JsonArray json_normalization_factor;
    json_normalization_factor.add( (float)  compute_normalization_one(norm_list, nb_segmented));
	
    //JsonArray normalization_names = json_normalization_names();
    //JsonArray normalization_res1 = json_normalization(norm_list, 1, nb_segmented);
    //JsonArray normalization_res5 = json_normalization(norm_list, 5, nb_segmented);
    
    json->add("timestamp", time_buffer);
    json->add("commandline", stream_cmdline.str());// TODO: escape "s in argv
    json->add("germline", germline_system);
    json->add("reads_total", json_nb_reads);
    json->add("reads_segmented", json_nb_segmented); 
	json->add("normalization_factor", json_normalization_factor ); 
	
    //json->add("normalizations", normalization_names);
    //json->add("resolution1", normalization_res1);
    //json->add("resolution5", normalization_res5);

    JsonArray jsonSortedWindows = windowsStorage.sortedWindowsToJsonArray(json_data_segment,
                                                                          norm_list,
                                                                          nb_segmented);
    json->add("windows", jsonSortedWindows);
    out_json << json->toString();
    
    delete index ;
    delete json;
  } else if (command == CMD_SEGMENT) {
    //$$ CMD_SEGMENT
    ////////////////////////////////////////
    //       V(D)J SEGMENTATION           //
    ////////////////////////////////////////

    // déja déclaré ?
    //reads = OnlineFasta(f_reads, 1, " ");
    
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
