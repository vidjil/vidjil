
#include "germline.h"

Germline::Germline(Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
		   string seed,
		   int _delta_min, int _delta_max)
{
  // code = 'TRG' ;
  // shortcut = 'G' ;
  // description = "" ;

  // affect_5 = KmerAffect("", "V", 0) ;
  // affect_3 = KmerAffect("", "J", 0) ;

  rep_5 = _rep_5 ;
  rep_4 = _rep_4 ;
  rep_3 = _rep_3 ;

  delta_min = _delta_min ;
  delta_max = _delta_max ;

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


MultiGermline::MultiGermline(Germline *germline)
{
  germlines.push_back(germline);
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




