#include<algorithm>
#include<utility>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <cstring>
#include <time.h>

#include "core/tools.h"
#include "core/fasta.h"
#include "core/dynprog.h"
#include "core/teestream.h"
#include "core/html.h"
#include "core/cut-pcr.h"

#define DEFAULT_READS  "../../../seq/chr_pgm_100seq.fa"
#define DEFAULT_PRIMERS  "../../../seq/amorces-pcr4.fa"

#define DEFAULT_CUT "./cuts.fa"
 
#define OUT_DIR "./cuts/" 
#define f_html "./cuts/out.html"

#define MAX_MISMATCHES 4


using namespace std ;

extern char *optarg;
extern int optind, optopt, opterr;

void usage() 
{
  cerr << "[options] <reads.fa>" << endl << endl;
  cerr << "Options: " << endl
       << "\t-P <file>" << endl
       << "\t\tprimer multi-fasta file" << endl
       << "\t-d <directory>" << endl
       << "\t\toutput directory used for storing the results (default: " << OUT_DIR << ")" <<  endl
       << "\t-v\tverbose mode" << endl ;

  exit(1);
}

int main (int argc, char **argv)
{
  string f_reads = DEFAULT_READS ;
  string f_primers = DEFAULT_PRIMERS ;
  string f_cut = DEFAULT_CUT ;

  string out_dir = OUT_DIR;
  int verbose = 0 ;


  char c ;
  while ((c = getopt(argc, argv, "hV:J:k:r:R:vw:e:d:c:m:M:s:")) != EOF)

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
      }

  if (verbose)
    cerr << "# verbose " << verbose << endl ;

  if (optind == argc)
    {
      cerr << "# using default sequence file: " << f_reads << endl ;
    }
  else if (optind+1 == argc)
    {
      f_reads = argv[optind] ; 
    }
  else
    {
      cerr << "wrong number of arguments." << endl ;
      exit(1);
    }

  
  ofstream html(f_html);
  teestream out(cout, html);

  cerr << "Command line: ";
  for (int i=0; i < argc; i++) {
    cerr << argv[i] << " ";
  }
  cerr << endl;

  //////////////////////////////////
  time_t rawtime;
  struct tm *timeinfo;
  char time_buffer[80];

  time (&rawtime );
  timeinfo = localtime (&rawtime);

  strftime (time_buffer, 80,"%F %T", timeinfo);

  cerr << "# " << time_buffer << endl ;

  //////////////////////////////////
  cerr << "Read primers" << endl ;
  Fasta base_primers(f_primers, 1, " ", cerr);


  // For each primer, add revcomp
  vector<Sequence> primers;
  for (int p = 0 ; p<base_primers.size() ; p++)
    {
      Sequence primer;      
      primer.sequence = base_primers.sequence(p);
      primer.label = "+" ;
      primer.label_full = base_primers.label(p);
      primers.push_back(primer);

      Sequence primer_revcomp;      
      primer_revcomp.sequence = revcomp(primer.sequence);
      primer_revcomp.label = "-" ;
      primer_revcomp.label_full = primer.label_full;
      primers.push_back(primer_revcomp);
    }


  //////////////////////////////////
  cerr << "Read sequence files" << endl ;

  Fasta reads(f_reads, 1, " ", cerr);


  out_dir += "/";


  //////////////////////////////////  
  // cerr << "  ==> " << f_cut << endl ;
  ofstream cut_file(f_cut.c_str());

  const Cost cutCost = VDJ ; 
  const int cutRelativeThreshold = -cutCost.match * MAX_MISMATCHES ;
  // a reflechir...

  cerr << "# using cost " << cutCost << endl ;
  cerr << "# relative threshold " << cutRelativeThreshold << endl ;

  ////////////////////////////////////////
  //            CUT THE READS           //
  ////////////////////////////////////////

  int ok = 0 ;
  map <string, int> stats ;

  for(int i = 0 ; i < reads.size() ; i++)
    {
      if (!(ok++ % 10000))
	{
	  cerr << "." ;
	  cerr.flush();
	}

      if (verbose)
	cerr << endl << endl << reads.label(i) << endl;

      cut(reads.read(i), primers, verbose, stats, 
	  cutCost, cutRelativeThreshold); //  cut_file);
    }
  
    cerr << endl;
  
    //////////////////////////////////
    // Display stats
    cerr << "Primers occurrences" << endl ;
    for (unsigned p = 0 ; p<primers.size() ; p++)
      {       
	cerr << "\t" << setw(7) << stats[primers[p].sequence] ;
	cerr << "  " << primers[p].label 
	     << " " << primers[p].label_full  ;

	if (p % 2)
	  cerr << endl ;
      }

}
