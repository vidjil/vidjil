
#include "germline.h"

Germline::Germline(string _code, char _shortcut,
		   string f_rep_5, string f_rep_4, string f_rep_3,
		   string seed,
		   int _delta_min, int _delta_max)
{
  code = _code ;
  shortcut = _shortcut ;

  rep_5 = Fasta(f_rep_5, 2, "|", cout);
  rep_4 = Fasta(f_rep_4, 2, "|", cout);
  rep_3 = Fasta(f_rep_3, 2, "|", cout);

  delta_min = _delta_min ;
  delta_max = _delta_max ;

  build_index(seed);

  stats.setLabel(code);
}


Germline::Germline(Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
		   string seed,
		   int _delta_min, int _delta_max)
{
  code = "X" ;
  shortcut = 'X' ;
  description = "x" ;

  // affect_5 = KmerAffect("", "V", 0) ;
  // affect_3 = KmerAffect("", "J", 0) ;

  rep_5 = _rep_5 ;
  rep_4 = _rep_4 ;
  rep_3 = _rep_3 ;

  delta_min = _delta_min ;
  delta_max = _delta_max ;

  build_index(seed);

  stats.setLabel(code);
}

void Germline::build_index(string seed)
{
  bool rc = true ;
  index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);

  index->insert(rep_5, "V"); // affect_5);
  index->insert(rep_3, "J"); // affect_3);
}

Germline::~Germline()
{
  delete index;
}

ostream &operator<<(ostream &out, const Germline &germline)
{
  out << germline.shortcut << " (" << germline.description << ") "
      << germline.delta_min << "/" << germline.delta_max << endl ;

  return out;
}


MultiGermline::MultiGermline()
{
}


MultiGermline::MultiGermline(string f_germlines_json)
{
  // Should parse 'data/germlines.data'

  string f_rep_5 = "germline/TRGV.fa";
  string f_rep_4 = "";
  string f_rep_3 = "germline/TRGJ.fa";
  string seed = "#####-#####";
  int delta_min = -10 ;
  int delta_max = 20 ;

  Fasta rep_5(f_rep_5, 2, "|", cout);
  Fasta rep_4(f_rep_4, 2, "|", cout);
  Fasta rep_3(f_rep_3, 2, "|", cout);

  Germline *germline;
  germline = new Germline(rep_5, rep_4, rep_3,
			  seed,
			  delta_min, delta_max);

  germlines.push_back(germline);
}


void MultiGermline::insert(Germline *germline)
{
  germlines.push_back(germline);
}

void MultiGermline::load_default_set()
{
  germlines.push_back(new Germline("TRG", 'G', "germline/TRGV.fa", "",                 "germline/TRGJ.fa", "#####-#####",   -10, 20));
  germlines.push_back(new Germline("IGH", 'H', "germline/IGHV.fa", "germline/IGHD.fa", "germline/IGHJ.fa", "######-######",   0, 80));
}


void MultiGermline::out_stats(ostream &out)
{
  for (list<Germline*>::const_iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      Germline *germline = *it ;
      out << germline->stats ;
    }
}
