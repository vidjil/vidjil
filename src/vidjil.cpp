/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>, Marc Duez

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
#include "core/cluster-junctions.h"
#include "core/dynprog.h"
#include "core/read_score.h"
#include "core/read_chooser.h"
#include "core/msa.h"
#include "core/compare-all.h"
#include "core/teestream.h"
#include "core/html.h"
#include "core/mkdir.h"
#include "core/labels.h"
#include "core/representative.h"

#include "vidjil.h"

// RELEASE_TAG may be defined in the "release.h" file.
// If RELEASE_TAG is undefined, the version will be the git hash.
// #define RELEASE_TAG  "2013.04"
#include "release.h"

#define DEFAULT_V_REP  "./germline/TRGV.fa" // IGHV 
#define DEFAULT_D_REP  "./germline/IGHD.fa" 
#define DEFAULT_J_REP  "./germline/TRGJ.fa" // IGHJ

// #define DEFAULT_READS  "./data/Stanford_S22.fa"
#define DEFAULT_READS  "../seq/chr_pgm_50k.cut.fa"
#define MIN_READS_JUNCTION 10
#define MIN_READS_CLONE 100
#define RATIO_READS_CLONE 0.1

#define COMMAND_JUNCTIONS "junctions"
#define COMMAND_ANALYSIS "clones"
#define COMMAND_SEGMENT "segment"
 
enum { CMD_JUNCTIONS, CMD_ANALYSIS, CMD_SEGMENT } ;

#define OUT_DIR "./out/" 
#define HTML_FILENAME "clones.html"
#define CLONE_FILENAME "clone.fa-"
#define JUNCTIONS_FILENAME "junctions.fa"
#define SEQUENCES_FILENAME "sequences.fa"
#define SEGMENTED_FILENAME "segmented.vdj.fa"
#define EDGES_FILENAME "edges"
#define COMP_FILENAME "comp.data"
#define GRAPH_FILENAME "graph"


// "tests/data/leukemia.fa" 

#define DEFAULT_K      14
#define DEFAULT_W      40
#define DEFAULT_W_D    50
#define DEFAULT_SEED   (seed_contiguous(DEFAULT_K))

#define DEFAULT_DELTA_MIN  -10
#define DEFAULT_DELTA_MAX   15

#define DEFAULT_DELTA_MIN_D  0
#define DEFAULT_DELTA_MAX_D  50

#define DEFAULT_EPSILON  0
#define DEFAULT_MINPTS   10

#define DEFAULT_CLUSTER_COST  Cluster
#define DEFAULT_SEGMENT_COST   VDJ

// display
#define WIDTH_NB_READS 7
#define WIDTH_NB_CLONES 3

using namespace std ;

extern char *optarg;


extern int optind, optopt, opterr;

void usage(char *progname)
{
  cerr << "Usage: " << progname << " [options] <reads.fa>" << endl << endl;

  cerr << "Command selection" << endl
       << "  -c <command> \t" << COMMAND_JUNCTIONS << "\t junction extracting (default)" << endl 
       << "  \t\t" << COMMAND_ANALYSIS  << "  \t clone analysis" << endl 
       << "  \t\t" << COMMAND_SEGMENT   << "  \t V(D)J segmentation" << endl
       << endl       

       << "Germline databases" << endl
       << "  -V <file>     V germline multi-fasta file" << endl
       << "  -D <file>     D germline multi-fasta file (automatically implies -d)" << endl
       << "  -J <file>     J germline multi-fasta file" << endl
       << "  -G <prefix>   prefix for V (D) and J repertoires (shortcut for -V <prefix>V.fa -D <prefix>D.fa -J <prefix>J.fa)" << endl
       << endl

       << "Junction prediction" << endl
#ifndef NO_SPACED_SEEDS
       << "  -s <string>   spaced seed used for the V/J affectation (default: " << DEFAULT_SEED << ")" << endl
#endif
       << "  -k <int>      k-mer size used for the V/J affectation (default: " << DEFAULT_K << ")" << endl
       << "  -w <int>      w-mer size used for the length of the extracted junction (default: " << DEFAULT_W << ")(default with -d: " << DEFAULT_W_D << ")" << endl
       << endl

       << "Junction annotations" << endl
       << "  -l <file>     labels for some junctions -- these junctions will be kept even if some limits are not reached" << endl
       << endl

       << "Limit to keep a junction" << endl
       << "  -r <nb>       minimal number of reads containing a junction (default: " << MIN_READS_JUNCTION << ")" << endl
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
       << "  -% <ratio>    minimal percentage of reads (default: " << RATIO_READS_CLONE << ")" << endl
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
       << "# Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille" << endl 
       << endl ;

  string f_rep_V = DEFAULT_V_REP ;
  string f_rep_D = DEFAULT_D_REP ;
  string f_rep_J = DEFAULT_J_REP ;
  string f_reads = DEFAULT_READS ;
  string seed = DEFAULT_SEED ;
  string prefix_filename = "";

  string out_dir = OUT_DIR;
  
  string comp_filename = COMP_FILENAME;

  int k = DEFAULT_K ;
  int w = DEFAULT_W ;
  
  int epsilon = DEFAULT_EPSILON ;
  int minPts = DEFAULT_MINPTS ;
  Cost cluster_cost = DEFAULT_CLUSTER_COST ;
  Cost segment_cost = DEFAULT_SEGMENT_COST ;
  
  
  int save_comp = 0;
  int load_comp = 0;
  int segment_D = 0;
  
  int verbose = 0 ;
  int command = CMD_JUNCTIONS;

  int min_reads_junction = MIN_READS_JUNCTION ;
  int min_reads_clone = MIN_READS_CLONE ;
  float ratio_reads_clone = RATIO_READS_CLONE;
  // int average_deletion = 4;     // Average number of deletion in V or J

  // Admissible delta between left and right segmentation points
  int delta_min = DEFAULT_DELTA_MIN ; // Kmer+Fine
  int delta_max = DEFAULT_DELTA_MAX ; // Fine
  int delta_max_kmer = 50 ; // TODO 

  bool output_sequences_by_cluster = false;
  bool detailed_cluster_analysis = true ;

  string forced_edges = "" ;

  string junctions_labels_file = "" ;

  char c ;

  while ((c = getopt(argc, argv, "haG:V:D:J:k:r:R:vw:e:C:t:l:dc:m:M:N:s:p:Sn:o:Lx%:")) != EOF)

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
	w = DEFAULT_W_D ;
	break;
      case 'e':
	forced_edges = optarg;
	break;
      case 'l':
	junctions_labels_file = optarg; 
	break;
      case 'x':
	detailed_cluster_analysis = false;
	break;
      case 'c':
        if (!strcmp(COMMAND_ANALYSIS,optarg))
          command = CMD_ANALYSIS;
        else if (!strcmp(COMMAND_SEGMENT,optarg))
          command = CMD_SEGMENT;
        else if (!strcmp(COMMAND_JUNCTIONS,optarg))
          command = CMD_JUNCTIONS;
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
	f_rep_V = (string(optarg) + "V.fa").c_str() ;
	f_rep_D = (string(optarg) + "D.fa").c_str() ;
	f_rep_J = (string(optarg) + "J.fa").c_str() ;
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
	min_reads_junction = atoi(optarg);
        break;

      case '%':
	ratio_reads_clone = atof(optarg);
	break;

      case 'R':
	min_reads_clone = atoi(optarg);
        break;

      case 's':
#ifndef NO_SPACED_SEEDS
	seed = string(optarg);
	k = seed_weight(seed);
#else
        cerr << "The option -s is not available" << endl;
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
    
  // Check that out_dir is an existing directory or creates it
  const char *out_cstr = out_dir.c_str();

  if (mkpath(out_cstr, 0755) == -1) {
    perror("Directory creation");
    exit(2);
  }

  out_dir += "/" ;

  /// Load labels ;
  map <string, string> junctions_labels = load_map(junctions_labels_file);

  /// HTML output
  string f_html = out_dir + prefix_filename + HTML_FILENAME ;
  cout << "  ==> " << f_html << endl ;
  ios_base::openmode mode = ios::out;

  if (command == CMD_ANALYSIS) {
    // TODO: put this in #define
    string com = "cat src/html/header.html src/html/vdj.css > " ;
    if (system((com + f_html).c_str()) == -1) {
      perror("Creation of HTML file");
      exit(3);
    }
    mode |= ios::app;
  }

  // Creating stream for HTML output
  ofstream html(f_html.c_str(), mode);
  if (command == CMD_ANALYSIS) {
    html << "</style>" << endl ;
    html << "</head>" << endl ;
    
    html << "<body>" << endl ;
  }

  html << "<a class='log' href=\"javascript:inverseAfficheID('log-start')\">[show log]</a> " << endl ;
  html << "<pre class='log' id='log-start' style='display:none;'>" << endl ;

  teestream out(cout, html);

  switch(command) {
  case CMD_JUNCTIONS: cout << "Extracting junctions" << endl; 
    break;
  case CMD_ANALYSIS: cout << "Analysing clones" << endl; 
    break;
  case CMD_SEGMENT: cout << "Segmenting V(D)J" << endl;
    break;
  }

  out << "Command line: ";
  for (int i=0; i < argc; i++) {
    out << argv[i] << " ";
  }
  out << endl;

  //////////////////////////////////
  // Display time and date
  time_t rawtime;
  struct tm *timeinfo;
  char time_buffer[80];

  time (&rawtime );
  timeinfo = localtime (&rawtime);

  strftime (time_buffer, 80,"%F %T", timeinfo);

  out << "# " << time_buffer << endl ;


  //////////////////////////////////
  // Display version information or git log

#ifdef RELEASE_TAG
  out << "# version: vidjil " << RELEASE_TAG << endl ;
#else
  out << "# git: " ;
  out.flush();
  if (system("git log -1 --pretty=format:'%h (%ci)' --abbrev-commit") == -1) {
    out << "<not in a git repository>";
  }
  out << endl ;
#endif

  //////////////////////////////////
  out << "Read sequence files" << endl ;


  if (!segment_D) // TODO: add other constructor to Fasta, and do not load rep_D in this case
    f_rep_D = "";

  Fasta rep_V(f_rep_V, 2, "|", out);
  Fasta rep_D(f_rep_D, 2, "|", out);
  Fasta rep_J(f_rep_J, 2, "|", out);
  
  OnlineFasta *reads;

  try {
    reads = new OnlineFasta(f_reads, 1, " ");
  } catch (const std::ios_base::failure e) {
    out << "Error while reading reads file " << f_reads << ": " << e.what()
        << endl;
    exit(1);
  }

  out_dir += "/";


  ////////////////////////////////////////
  //           CLONE ANALYSIS           //
  ////////////////////////////////////////
  if (command == CMD_ANALYSIS || command == CMD_JUNCTIONS) {

    //////////////////////////////////
    out << "# seed = " << seed << endl ;
    out << "    weight = " << seed_weight(seed) << endl ;
    out << "    span = " << seed.size() << endl ;
    out << "# k = " << k << endl ;
    out << "# w = " << w << endl ;
    out << "# delta = [" << delta_min << "," << delta_max << "]" << endl ;


    //////////////////////////////////
    out << "Build Kmer indexes" << endl ;

    bool rc = true ;
    
    IKmerStore<KmerAffect>  *index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);
    index->insert(rep_V, "V");
    index->insert(rep_J, "J");

  
    //////////////////////////////////
    string f_segmented = out_dir + prefix_filename + SEGMENTED_FILENAME ;
    out << "  ==> " << f_segmented << endl ;
    ofstream out_segmented(f_segmented.c_str()) ;

    out << "Loop through reads, looking for junctions" ;
 

    MapKmerStore<Kmer> *junctions = new MapKmerStore<Kmer>(w);
    map <junction, list<Sequence> > seqs_by_junction ;

    int too_short_for_the_junction = 0 ;
    int nb_segmented = 0 ;
    int ok = 0 ;
    size_t nb_total_reads = 0;

    int stats_segmented[STATS_SIZE];
    for (int i=0; i<STATS_SIZE; i++)
      stats_segmented[i] = 0 ;

    while (reads->hasNext())
      {
        reads->next();
        nb_total_reads++;
        if (verbose)
          out << endl << endl << reads->getSequence().label << endl;
       
        KmerSegmenter seg(reads->getSequence(), index, delta_min, delta_max_kmer, stats_segmented, segment_cost);
        if (verbose)
	  out << seg;
	  
        if (!(ok++ % 10000))
          {
            out << "." ;
            out.flush();
          }

        if (seg.isSegmented())
          {
            nb_segmented++ ;

            junction junc = seg.getJunction(w);

            if (junc.size())
              {
                junctions->insert(junc, "bloup");
                seqs_by_junction[junc].push_back(reads->getSequence());
              }
	    else
	      too_short_for_the_junction++ ;

	    //////////////////////////////////
	    // Output segmented
	    //////////////////////////////////
	    
	    // out_segmented << reads->getSequence() ;
	    out_segmented << seg ; // Sortie du KmerSegmenter (V/N/J par left/right)
          }
      }

    out << endl;
    out << "  ==> segmented " << nb_segmented << " reads"
	<< " (" << setprecision(3) << 100 * (float) nb_segmented / nb_total_reads << "%)" 
	<< endl ;

    out << "  ==> found " << seqs_by_junction.size() << " " << w << "-junctions"
	<< " in " << (nb_segmented - too_short_for_the_junction) << " segments"
	<< " (" << setprecision(3) << 100 * (float) (nb_segmented - too_short_for_the_junction) / nb_total_reads << "%)"
	<< " inside " << nb_total_reads << " sequences" << endl ;
  

    for (int i=0; i<STATS_SIZE; i++)
      out << "   " << left << setw(20) << segmented_mesg[i] << " -> " << stats_segmented[i] << endl ;


    /// if (command == CMD_JUNCTIONS) /// on le fait meme si CMD_ANALYSIS
      {

	//////////////////////////////////
	// Sort junctions
	
	out << "Sort junctions by number of occurrences" << endl;
	list<pair <junction, int> > sort_all_junctions;
	
	for (map <junction, list<Sequence> >::const_iterator it = seqs_by_junction.begin(); 
	     it != seqs_by_junction.end(); ++it) 
	  {
	    sort_all_junctions.push_back(make_pair(it->first, it->second.size()));
	  }

	sort_all_junctions.sort(pair_occurrence_sort<junction>);

	//////////////////////////////////
	// Output junctions
	//////////////////////////////////

	string f_all_junctions = out_dir + prefix_filename + JUNCTIONS_FILENAME;
	out << "  ==> " << f_all_junctions << endl ;

	ofstream out_all_junctions(f_all_junctions.c_str());
	int num_seq = 0 ;

	for (list<pair <junction, int> >::const_iterator it = sort_all_junctions.begin(); 
	     it != sort_all_junctions.end(); ++it) 
	  {
	    num_seq++ ;
	    
	    out_all_junctions << ">" << it->second << "--junction--" << num_seq << " " << junctions_labels[it->first] << endl ;
	    out_all_junctions << it->first << endl;
	  }
	
      }


    if (command == CMD_ANALYSIS) {

    //////////////////////////////////
    out << "Considering only junctions with >= " << min_reads_junction << " reads and labeled junctions" << endl;

    int removes = 0 ;
    int nb_reads = 0 ;

    for (map <junction, list<Sequence> >::iterator it = seqs_by_junction.begin(); it != seqs_by_junction.end(); ++it)
      {
        junction junc = it->first;
      
        if (!(seqs_by_junction[junc].size() >= (size_t) min_reads_junction) && !(junctions_labels[junc].size()))
          {
            removes++ ;
            junctions->store.erase(junc);
          }
        else
          nb_reads += seqs_by_junction[junc].size() ;
      }
	 
    out << "  ==> keep " <<  seqs_by_junction.size() - removes << " junctions in " << nb_reads << " reads" ;
    out << " (" << setprecision(3) << 100 * (float) nb_reads / nb_total_reads << "%)  " << endl ;

    //////////////////////////////////


    // Clustering
    list <list <junction> > clones_junctions;
    comp_matrix comp=comp_matrix(junctions);

    if (epsilon || forced_edges.size())
      {
	out << "Cluster similar junctions" << endl ;

	if (load_comp==1) 
	  {
	    comp.load((out_dir+prefix_filename + comp_filename).c_str());
	  }
	else
	  {
	    comp.compare( out, cluster_cost);
	  }
	
	if (save_comp==1)
	  {
	    comp.save(( out_dir+prefix_filename + comp_filename).c_str());
	  }
       
	clones_junctions  = comp.cluster(forced_edges, w, out, epsilon, minPts) ;
	comp.stat_cluster(clones_junctions, out_dir + prefix_filename + GRAPH_FILENAME, out );
	comp.del();
      } 
    else
      {
	out << "No clustering" << endl ;
	clones_junctions  = comp.nocluster() ;
      }

    out << "  ==> " << clones_junctions.size() << " clones" << endl ;
 
    map<string,Kmer> z = junctions->store;
    
    // int size=z.size();

    //////////////////////////////////
    out << "Sort clones by number of occurrences" << endl;

    list<pair<list <junction>, int> >sort_clones;

    for (list <list <junction> >::const_iterator it = clones_junctions.begin(); it != clones_junctions.end(); ++it)
      {
        list <junction>clone = *it ;

        int clone_nb_reads = total_nb_reads(clone, seqs_by_junction);

	bool labeled = false ;
	// Is there a labeled junction ?
	for (list <junction>::const_iterator iit = clone.begin(); iit != clone.end(); ++iit) {
	  if (junctions_labels[*iit].size())
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

    out << "Sort" << endl ;
    // Sort clones
    sort_clones.sort(pair_occurrence_sort<list<junction> >);

    //////////////////////////////////
    out << "Output clones with >= " << min_reads_clone << " reads" << endl ;

    map <string, int> clones_codes ;
    map <string, string> clones_map_junctions ;

    list <Sequence> representatives ;
    list <string> representatives_labels ;

    VirtualReadScore *scorer = new KmerAffectReadScore(*index);
    int num_clone = 0 ;

    ofstream out_edges((out_dir+prefix_filename + EDGES_FILENAME).c_str());
    int nb_edges = 0 ;
    out << "  ==> suggested edges in " << out_dir+ prefix_filename + EDGES_FILENAME
        << endl ;

    out << endl ;

    cout << "## Output clones in " << out_dir + prefix_filename << endl ; 

    for (list <pair<list <junction>,int> >::const_iterator it = sort_clones.begin();
         it != sort_clones.end(); ++it) {
      list<junction> clone = it->first;
      int clone_nb_reads = it->second;

    
      ++num_clone ;
      cout << "#### " ;
      string clone_file_name = out_dir+ prefix_filename + CLONE_FILENAME + string_of_int(num_clone) ;
      string junctions_file_name = out_dir+ prefix_filename + JUNCTIONS_FILENAME + "-" + string_of_int(num_clone) ;
      string sequences_file_name = out_dir+ prefix_filename + SEQUENCES_FILENAME + "-" + string_of_int(num_clone) ;

      ofstream out_clone(clone_file_name.c_str());
      ofstream out_junctions(junctions_file_name.c_str());
      ofstream out_sequences;

      if (output_sequences_by_cluster) {
        out_sequences.open(sequences_file_name.c_str());
      }
      
      html << "</pre>" << endl ;

      html << "<h3>" ;
      html << "<a href=\"javascript:inverseAfficheID('detail-" << num_clone << "')\">[+]</a> " << endl ;

      out << "Clone #" << right << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone ;
      out << " – " << setfill(' ') << setw(WIDTH_NB_READS) << clone_nb_reads << " reads" ;
      out << " – " << setprecision(3) << 100 * (float) clone_nb_reads / nb_segmented << "%  "  ;
      out.flush();

      //////////////////////////////////

      list<pair<junction, int> >sort_junctions;

      for (list <junction>::const_iterator it = clone.begin(); it != clone.end(); ++it) {
	int nb_reads = seqs_by_junction[*it].size();
        sort_junctions.push_back(make_pair(*it, nb_reads));
      }
      sort_junctions.sort(pair_occurrence_sort<junction>);

      // Output junctions 

      int num_seq = 0 ;
      
      for (list <pair<junction, int> >::const_iterator it = sort_junctions.begin(); 
           it != sort_junctions.end(); ++it) {
	num_seq++ ;

        out_junctions << ">" << it->second << "--junction--" << num_seq << " " << junctions_labels[it->first] << endl ;
	out_junctions << it->first << endl;

	if ((!detailed_cluster_analysis) && (num_seq == 1))
	  {
	    out << "\t" << setw(WIDTH_NB_READS) << it->second << "\t";
	    out << it->first ;
	    out << "\t" << junctions_labels[it->first] ;
	  }
      }

      if (!detailed_cluster_analysis)
	{
	  out << endl ;
	  continue ;
	}

	
      // First pass, choose one representative per cluster

      string best_V ;
      string best_D ;
      string best_J ;
      int more_junctions = 0 ;
      
      for (list <pair<junction, int> >::const_iterator it = sort_junctions.begin(); 
           it != sort_junctions.end(); ++it) {

	// Choose one representative

        // ReadChooser chooser(seqs_by_junction[it->first], *scorer);
        // Sequence representative = chooser.getBest() ;
        KmerRepresentativeComputer repComp(seqs_by_junction[it->first], k);
        repComp.compute(true, 5, 0.5);

        if (repComp.hasRepresentative()) {
          Sequence representative = repComp.getRepresentative();
          representative.label = string_of_int(it->second) + "-" 
            + representative.label;
	
          FineSegmenter seg(representative, rep_V, rep_J, delta_min, delta_max, segment_cost);
		  
          if (segment_D)
            seg.FineSegmentD(rep_V, rep_D, rep_J);
	
          if (seg.isSegmented())

            {
              // As soon as one representative is segmented

              representatives.push_back(seg.getSequence());
              representatives_labels.push_back("#" + string_of_int(num_clone));
              cout << seg.info << endl ;

              // We need to find the junction in the representative
              size_t junction_pos = seg.getSequence().sequence.find(it->first);

              // Default
              int ww = 2*w/3 ; // /2 ;

              if (junction_pos != string::npos) {
                // for V.
                ww = seg.getLeft() - junction_pos + seg.del_V;
              } 
            

              string end_V ="";
	    
              // avoid case when V is not in the junction
              if (seg.getLeft() > (int) junction_pos)
                end_V = rep_V.sequence(seg.best_V).substr(rep_V.sequence(seg.best_V).size() - ww, 
                                                          ww - seg.del_V);

              string mid_D = "";
	    
              if (segment_D)
                mid_D = rep_D.sequence(seg.best_D).substr(seg.del_D_left, 
                                                          rep_D.sequence(seg.best_D).size() - seg.del_D_left - seg.del_D_right );
	   
              if (junction_pos != string::npos) {
                // for J.
                ww = (junction_pos + w - 1) - seg.getRight() + seg.del_J;
              }
	    
              string start_J = "";
	    
              // avoid case when J is not in the junction
              if (seg.getRight() > (int) (junction_pos + w - 1))
                start_J=rep_J.sequence(seg.best_J).substr(seg.del_J, ww);
	      
              best_V = rep_V.label(seg.best_V) ;
              if (segment_D) best_D = rep_D.label(seg.best_D) ;
              best_J = rep_J.label(seg.best_J) ;
	    
              // TODO: pad aux dimensions exactes
              string pad_N = "NNNNNNNNNNNNNNNN" ;

              // Add V, (D) and J to junctions to be aligned
	    
              out_junctions << ">" << best_V << "-junction" << endl ;
              out_junctions << end_V << pad_N << endl ;
              more_junctions++;

              if (segment_D) {
                out_junctions << ">" << best_D << "-junction" << endl ;
                out_junctions << mid_D << endl ;   
                more_junctions++ ;
              }
	    
              out_junctions << ">" << best_J << "-junction" << endl ;
              out_junctions << pad_N << start_J <<  endl ;
              more_junctions++;

              string code = seg.code ;
              int cc = clones_codes[code];

              html << " &ndash; " << code << endl ;

              if (cc)
                {
                  html << "<span class='alert'>" ;
                  out << " (similar to Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << cc << setfill(' ') << ")";

                  nb_edges++ ;
                  out_edges << clones_map_junctions[code] + " " + it->first + " "  ;
                  out_edges << code << "  " ;
                  out_edges << "Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << cc        << setfill(' ') << "  " ;
                  out_edges << "Clone #" << setfill('0') << setw(WIDTH_NB_CLONES) << num_clone << setfill(' ') << "  " ;
                  out_edges << endl ;

                  html << "</span>" ;
                }
              else
                {
                  clones_codes[code] = num_clone ;
                  clones_map_junctions[code] = it->first ;
                }

              html << "</h3>" << endl ;
              html << "<pre>" << endl ;
      
              // html (test)
              seg.html(html, segment_D) ;

              // display junction
              cout << setw(junction_pos) << " " << it->first << " " << junctions_labels[it->first] << endl ;

              break ;
            }
        }
      }

      out << endl ;
      out_junctions.close();

      html << "</pre>" << endl ;
      html << "<div  id='detail-" << num_clone << "' style='display:none;'>"
           << "<pre class='log'> "<< endl  ;

      list<string> msa;
      bool good_msa = false ;

      // TODO: do something if no sequences have been segmented !
      if (!more_junctions)
	{
	  out << "!! No segmented sequence, deleting clone" << endl ;
	  // continue ;
	} else 
        {
          msa = multiple_seq_align(junctions_file_name);
        
          // Alignment of junctions
          
          if (!msa.empty())
            {
              if (msa.size() == sort_junctions.size() + more_junctions)
                {
                  // out << "clustalw parse: success" << endl ;
                  good_msa = true ;
                }
              else
                {
                  out << "! clustalw parse: failed" << endl ;
                }
            }
        }
      

      // Second pass: output clone, all representatives      

      num_seq = 0 ;
      list <Sequence> representatives_this_clone ;
      string code_representative = "";

      for (list <pair<junction, int> >::const_iterator it = sort_junctions.begin(); 
           it != sort_junctions.end(); ++it) {

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

        out_clone << ">" << it->second << "--junction--" << num_seq << " " << junctions_labels[it->first] << endl ;
	out_clone << it->first << endl;



	// Output all sequences

	if (output_sequences_by_cluster)
	  {
	    out_sequences << ">" << it->second << "--junction--" << num_seq << " " << junctions_labels[it->first] << endl ;
	    out_sequences << it->first << endl;

	    list<Sequence> sequences = seqs_by_junction[it->first] ;
	    
	    for (list<Sequence>::const_iterator itt = sequences.begin(); itt != sequences.end(); ++itt)
	      {
		out_sequences << *itt ;
	      }
	  }

	//

        // ReadChooser chooser(seqs_by_junction[it->first], *scorer);
        // Sequence representative = chooser.getBest() ;
        KmerRepresentativeComputer repComp(seqs_by_junction[it->first], k);
        repComp.compute(true, 5, 0.5);

        if (repComp.hasRepresentative()) {
          Sequence representative = repComp.getRepresentative();
          representative.label = string_of_int(it->second) + "-" 
            + representative.label;

          cout << "**** nb = " << it->second << endl;

          FineSegmenter seg(representative, rep_V, rep_J, delta_min, delta_max, segment_cost);

          if (segment_D)
            seg.FineSegmentD(rep_V, rep_D, rep_J);
		
          if (seg.isSegmented())
            {
              representatives_this_clone.push_back(seg.getSequence());
            }

          /// TODO: et si pas isSegmented ?

          bool warning = false;

          if (num_seq <= 20) /////
            {
              out << setw(20) << representative.label << " " ;

              cout << "   " << junc ;

              // HTML pretty printing
              string junc_html ;

              if (seg.isSegmented())
                {
                  // We need to find the junction in the representative
		
                  size_t junction_pos = seg.getSequence().sequence.find(it->first);
	    
                  junc_html = spanify_alignment_pos("seg_V", seg.getLeft() - junction_pos,
                                                    "seg_n", seg.getLeftD() - junction_pos,
                                                    "seg_D", seg.getRightD() - junction_pos,
                                                    "seg_N",seg.getRight() - junction_pos,
                                                    "seg_J",
                                                    junc);

                  if (!code_representative.size())
                    code_representative = seg.code_light ;
		
                  if (code_representative.compare(seg.code_light) != 0)
                    warning = true ;
                }
              else
                {
                  junc_html = junc ; 
                }

              html << "   " << junc_html ;
              // end HTML

              out << " " << setw(WIDTH_NB_READS) << it->second << " " ;

              if (warning)
                html << "<span class='warning'>" ;

              out << (warning ? "Â§ " : "  ") ;
              out << seg.info ;

              if (warning)
                html << "</span>" ;

              out << endl ;
            }
          out_clone << seg ;
          out_clone << endl ;
        }
      }

      if (good_msa)
	{
	  cout << setw(20) << best_V << "    " << msa.back() << endl ;
	  html << setw(20) << best_V << "    " << spanify_alignment("seg_V", msa.back()) << endl ;
	  msa.pop_back();

	  if (segment_D)
	    {
	      cout << setw(20) << best_D << "    " << msa.back() << endl ;
	      html << setw(20) << best_D << "    " << spanify_alignment("seg_D", msa.back()) << endl ;
	      msa.pop_back();
	    }

	  cout << setw(20) << best_J << "    " << msa.back() << endl ;
	  html << setw(20) << best_J << "    " << spanify_alignment("seg_J", msa.back()) << endl ;
	  msa.pop_back();
	}
 
      out_clone.close();
      out << endl;
      
      // Compare representatives of this clone
      out << "Comparing representatives of this clone 2 by 2" << endl ;
      // compare_all(representatives_this_clone);
      SimilarityMatrix matrix = compare_all(representatives_this_clone, true);
      cout << RawOutputSimilarityMatrix(matrix, 90);
      html << "</pre>" << endl ;      
      html << HTMLOutputSimilarityMatrix(matrix, 90);
      html << "</div>" << endl;

    }

    out_edges.close() ;

    out << endl;
    cout << "#### end of clones" << endl; 

  
    // Compare representatives

    if (detailed_cluster_analysis)
      {
    html << "<h3>Comparison between clones</h3>" ;

    if (nb_edges)
      {
        out << "Please review the " << nb_edges << " suggested edge(s) in " << out_dir+EDGES_FILENAME << endl ;
      }

    html << "<pre>" << endl ;
    cout << "Comparing clone representatives 2 by 2" << endl ;
    SimilarityMatrix matrix = compare_all(representatives, true, 
                                          representatives_labels);
    cout << RawOutputSimilarityMatrix(matrix, 90);

    html << "</pre>";
    html << HTMLOutputSimilarityMatrix(matrix, 90);
     }


    delete scorer;


    html << "</body></html>" << endl ;
    html.close();
    }
    
    delete index ;
    delete junctions;
    
  } else if (command == CMD_SEGMENT) {
    ////////////////////////////////////////
    //       V(D)J SEGMENTATION           //
    ////////////////////////////////////////
    html << "</pre>";

    // déja déclaré ?
    //reads = OnlineFasta(f_reads, 1, " ");
    
    while (reads->hasNext()) 
      {
        reads->next();
        FineSegmenter s(reads->getSequence(), rep_V, rep_J, delta_min, delta_max, segment_cost);
	if (s.isSegmented()) {
	  if (segment_D)
	  s.FineSegmentD(rep_V, rep_D, rep_J);
          html << "<h3>" << s.code << "</h3>";
          html << "<pre>";
          s.html(html, segment_D);
          html << "</pre>";
          cout << s << endl;
        } else {
          html << "<h3>";
          out << "Unable to segment" << endl;
          html << "</h3>";
          html << "<pre>";
          out << reads->getSequence();
          html << "</pre>";
          out << endl << endl;
        }
    } 
    // html << "</body></html>" << endl ;
    html.close();

    
  } else {
    cerr << "Ooops... unknown command. I don't know what to do apart from exiting!" << endl;
  }
  

  delete reads;
}
