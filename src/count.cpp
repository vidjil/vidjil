#include<algorithm>
#include<utility>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <cstring>
#include <time.h>
#include <map>
#include <libgen.h>

#include "core/tools.h"
#include "core/cluster-junctions.h"
#include "core/fasta.h"
#include "core/dynprog.h"
#include "core/teestream.h"
#include "core/html.h"
#include "core/mkdir.h"

#define WIDTH 7

#define DEFAULT_READS  "../../../seq/chr_pgm_50k.cut.fa"
#define DEFAULT_PATTERN "CTGTGCCACCTGGGCCTTATTATAAGAAAC"
#define DEFAULT_THRESHOLD -8
#define DEFAULT_THRESHOLD_JUNCTIONS -4
#define DEFAULT_MAX_DISPLAY_JUNCTIONS 10

#define DEFAULT_CUT "./cuts.fa"
 
#define OUT_DIR "./counts/" 
#define F_COUNT "./counts.txt"

using namespace std ;

extern char *optarg;
extern int optind, optopt, opterr;

void usage() 
{
  cerr << "[options] pattern reads1 [reads2...]" << endl << endl;
  cerr << "Options: " << endl
       << "\t-c" << endl
       << "\t\tcumulative counts" << endl
       << "\t-r <int>" << endl
       << "\t\treference for computing the percentages (otherwise, number of sequences)" << endl
       << "\t-T <int>" << endl
       << "\t\tthreshold (for displaying the counts)" << endl
       << "\t-T <int>" << endl
       << "\t\tthreshold (for storing the junctions)" << endl
       << "\t-j <int>" << endl
       << "\t\tmaximum number of junctions to display" << endl
       << "\t-b \tdisplay only the number of matches on the (b)oth strands (and not +/-)" << endl
       << "\t-d <directory>" << endl
       << "\t\toutput directory used for storing the results (default: " << OUT_DIR << ")" <<  endl
       << "\t-o <output file>" << endl
       << "\t\toutput filename that will be used for storing the results (default: " << F_COUNT << ")" << endl
       << "\t-v\tverbose mode" << endl ;

  exit(1);
}

int main (int argc, char **argv)
{
  string pattern = DEFAULT_PATTERN ;
  string f_reads = DEFAULT_READS ;

  int threshold = DEFAULT_THRESHOLD ;
  int threshold_junctions = DEFAULT_THRESHOLD_JUNCTIONS ;
  int max_display_junctions = DEFAULT_MAX_DISPLAY_JUNCTIONS ;
  int reference = 0 ;
  bool reference_option = false ;

  string out_dir = OUT_DIR;
  string f_count = F_COUNT;
  int verbose = 0 ;
  bool only_total = false ;
  bool cumulative_counts = false ;
  bool default_file = false;
  int optind_files;

  char c ;
  while ((c = getopt(argc, argv, "T:t:bhvd:o:j:cr:")) != EOF)

    switch (c)
      {
      case 'h':
        cerr << "Usage: " << argv[0]<< " " ;
        usage();

      case 'v':
	verbose += 1 ;
	break;

      case 'd':
        out_dir = optarg;
        break;

      case 'o':
        f_count = optarg;
        break;

      case 'T':
	threshold_junctions = -atoi(optarg);
        break;

      case 't':
	threshold = -atoi(optarg);
        break;

      case 'j':
	max_display_junctions = -atoi(optarg);
        break;

      case 'r':
	reference_option = true ;
	reference = atoi(optarg);
        break;
	
      case 'c':
	cumulative_counts = true;
	break;
	
      case 'b':
	only_total = true;
        break;
      }

  if (verbose)
    cerr << "# verbose " << verbose << endl ;

  if (optind+1 <= argc) {
    pattern = argv[optind] ;
    optind_files = optind+1;
  } else {
    cerr << "# using default pattern: " << pattern << endl ;
    optind_files = optind;
  }

  if (optind_files+1 > argc) {
    cerr << "# using default sequence file: " << f_reads << endl ;
    default_file = true;
  }

  // Creating output directory
  if (mkpath(out_dir.c_str(), 0755) == -1) {
    perror("Directory creation");
    exit(3);
  }
  f_count = out_dir+"/"+f_count;

  cerr << "  ==> " << f_count << endl ;
  ofstream count_file(f_count.c_str());
  teestream out(cout, count_file);

  cerr << "Command line: ";
  for (int i=0; i < argc; i++) {
    cerr << argv[i] << " ";
  }
  cerr << endl;

  //////////////////////////////////
  string pattern_rev = revcomp(pattern);

  //////////////////////////////////
  time_t rawtime;
  struct tm *timeinfo;
  char time_buffer[80];

  time (&rawtime );
  timeinfo = localtime (&rawtime);

  strftime (time_buffer, 80,"%F %T", timeinfo);

  cerr << "# " << time_buffer << endl ;

  //////////////////////////////////

  for (int num_file=0; 
       default_file || optind_files + num_file < argc; 
       num_file++)
    {
      if (default_file) {
        default_file = false;
        // Keep default value for f_reads
      } else {
        f_reads = argv[optind+1+num_file] ;
      }

  //////////////////////////////////
  cerr << "Read sequence file" << endl ;

  Fasta reads(f_reads, 1, " ", out);
  out << endl;

  if (reference_option)
    {
      cerr << "# reference (given with -r option): " << reference << endl ;
    }
  else
    {
      reference = reads.size();
      cerr << "# reference (number of sequences): " << reference << endl ;
    }

  string tag = "";
  if (optind + 3 <= argc)
    {
      char *ch = strdup(f_reads.c_str());
      // Affichage du nom de la seq s'il y en a au moins 2
      tag = "\t" + string(basename(ch));
    }

  // const Cost countCost = Levensthein ; 
  const Cost countCost = Cost(0, -2, -2, 0, -1);
  out << "# using cost " << countCost << endl ;

  ////////////////////////////////////////
  //        COUNT THE PATTERNS          //
  ////////////////////////////////////////

  int ok = 0 ;

  map <int, int> counts ;
  map <int, int> counts_rev ;
  
  map<pair<int, junction>, int> counts_junctions;

  for(int i = 0 ; i < reads.size() ; i++)
    {
      if (!(ok++ % 10000))
	{
	  cerr << "." ;
	  cerr.flush();
	}

      if (verbose)
	cerr << endl << endl << reads.label(i) << endl;


      // +
      DynProg dp = DynProg(pattern, reads.sequence(i), DynProg::SemiGlobal, countCost);
      int score = dp.compute();
      counts[score]++ ;

      if (verbose)      
	cout << "\t best score: " <<  score << " @" << dp.best_j << "  " << dp.SemiGlobal_extract_best() << endl ;

      if (score >= threshold_junctions)
	{
	  string junc = dp.SemiGlobal_extract_best() ;
	  counts_junctions[make_pair(score, junc)]++ ;
	}
      
      // -
      DynProg dp_rev = DynProg(pattern_rev, reads.sequence(i), DynProg::SemiGlobal, countCost);
      int score_rev = dp_rev.compute();
      counts_rev[score_rev]++ ;
    }
  
  
  cerr << endl;

  out << "Scores distribution" ;

  // Cumulative
  if (cumulative_counts)
    {
      out << " (cumulative)" ; 
      for (int i=0; i >= threshold; i--)
	{
	  counts[i-1] += counts[i] ;
	  counts_rev[i-1] += counts_rev[i] ;
	}
    }


  // Legend
  out << endl ;
  out << "  " << setw(3) << "" << "  " ;

  if (only_total)
    out << setw(WIDTH) << "+/-" ; 
  else 
    out << setw(WIDTH) << "+" << setw(WIDTH) << "-" ;

  out << setw(10) << "%" << endl ;

  // Display counts
  for (map <int, int>::const_iterator it = counts.begin();  it != counts.end(); ++it) 
    {
      int key = it->first ;

      if (key < threshold)
	continue ;

      out << "  " << setw(3) << key << " |" ;

      if (only_total)
	{
	  out << setw(WIDTH) << counts[key] + counts_rev[key] ;
	}
      else
	{
	  out << setw(WIDTH) << counts[key] ;
	  out << setw(WIDTH) << counts_rev[key] ;
	}

      out << setw(10) << setprecision(3) << ((float) (counts[key] + counts_rev[key])) / reference * 100 ;

      out << tag << endl ;
    }

  out << endl ;


  //////////////////////////////////
  // Sort junctions

  list<pair <pair<int, junction>, int> > sort_junctions;

  // il y a surment un meilleur moyen de transformer un map en list :)
  for (map<pair<int, junction>, int>::const_iterator it = counts_junctions.begin(); 
       it != counts_junctions.end(); ++it) 
	{
	  sort_junctions.push_back(make_pair(it->first, it->second));
	}
	 
  sort_junctions.sort(pair_occurrence_sort<pair<int, junction> >);

  int nb = 0;
  int nb_others = 0;

  out << "Junctions distribution (only on +)" << endl ;
       // Display junctions
  for (list<pair <pair<int, junction>, int> >::const_iterator it = sort_junctions.begin(); 
       it != sort_junctions.end(); ++it) 
    {
      pair<int, junction> key = it->first ;
      int score = key.first ;
      string junc = key.second ;

      if (nb++ <= max_display_junctions)
	{
	  out << "  " << setw(3) << score << " |" 
	      << setw(WIDTH) << counts_junctions[key] 
	    // << setw(10) << setprecision(3) << ((float) counts_junctions[key] / reference * 100) << "%" 
	      << " # " 
	      << setw(score - threshold_junctions + 1) << " " // decalage pour joli affichage
	      << junc << tag << endl ;
	}
      else
	nb_others +=  counts_junctions[key]  ;
    }
	 
    if (nb_others)
      out << "  ... +" << setw(WIDTH) << nb_others << " other junctions within the "
	  << threshold_junctions << " threshold" << tag << endl ;

  } // for num_file
  //////////////////////////////////
}
