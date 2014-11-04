
#include "germline.h"

void Germline::init(string _code, char _shortcut,
                    int _delta_min, int _delta_max)
{
  code = _code ;
  shortcut = _shortcut ;
  index = 0 ;

  affect_5 = "V" ;
  affect_4 = "" ;
  affect_3 = "J" ;
  
  delta_min = _delta_min ;
  delta_max = _delta_max ;

  stats.setLabel(code);
}

Germline::Germline(string _code, char _shortcut,
		   string f_rep_5, string f_rep_4, string f_rep_3,
		   int _delta_min, int _delta_max)
{
  init(_code, _shortcut, _delta_min, _delta_max);

  f_reps_5.push_back(f_rep_5);
  f_reps_4.push_back(f_rep_4);
  f_reps_3.push_back(f_rep_3);

  rep_5 = Fasta(f_rep_5, 2, "|", cout);
  rep_4 = Fasta(f_rep_4, 2, "|", cout);
  rep_3 = Fasta(f_rep_3, 2, "|", cout);
}


Germline::Germline(string _code, char _shortcut,
		   list <string> _f_reps_5, list <string> _f_reps_4, list <string> _f_reps_3,
		   int _delta_min, int _delta_max)
{
  init(_code, _shortcut, _delta_min, _delta_max);

  f_reps_5 = _f_reps_5 ;
  f_reps_4 = _f_reps_4 ;
  f_reps_3 = _f_reps_3 ;

  for (list<string>::const_iterator it = f_reps_5.begin(); it != f_reps_5.end(); ++it)
    rep_5 = Fasta(*it, 2, "|", cout); // TODO: something like 'rep_5 += ...'
  
  for (list<string>::const_iterator it = f_reps_4.begin(); it != f_reps_4.end(); ++it)
    rep_4 = Fasta(*it, 2, "|", cout);

  for (list<string>::const_iterator it = f_reps_3.begin(); it != f_reps_3.end(); ++it)
    rep_3 = Fasta(*it, 2, "|", cout);
}


Germline::Germline(string _code, char _shortcut, 
           Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
		   int _delta_min, int _delta_max)
{
  init(_code, _shortcut, _delta_min, _delta_max);

  rep_5 = _rep_5 ;
  rep_4 = _rep_4 ;
  rep_3 = _rep_3 ;
}

void Germline::new_index(string seed)
{
  bool rc = true ;
  index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);

  update_index();
}

void Germline::use_index(IKmerStore<KmerAffect> *_index)
{
  index = _index;

  update_index();
}


void Germline::update_index()
{
  index->insert(rep_5, affect_5);

  if (affect_4.size())
    index->insert(rep_4, affect_4);

  index->insert(rep_3, affect_3);

  cout << "  --- index " << index << " updated " << affect_5 << "/" << affect_4 << "/" << affect_3 << endl;
}

Germline::~Germline()
{
  if (index)
    delete index;
}

ostream &operator<<(ostream &out, const Germline &germline)
{
  out << germline.code << " '" << germline.shortcut << "' "
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
  germline = new Germline("TRG", 'G',
              rep_5, rep_4, rep_3,
			  delta_min, delta_max);

  germlines.push_back(germline);
}

MultiGermline::~MultiGermline() {
  for (list<Germline*>::const_iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      delete *it ;
    }
}

void MultiGermline::insert(Germline *germline)
{
  germlines.push_back(germline);
}

void MultiGermline::build_default_set(string path)
{
  // Should parse 'data/germlines.data'
  Germline *germline;
  
  germline = new Germline("TRG", 'G', path + "/TRGV.fa", "",                path + "/TRGJ.fa",   -10, 20);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

  germline = new Germline("IGH", 'H', path + "/IGHV.fa", path + "/IGHD.fa",  path + "/IGHJ.fa",   0, 80);
  germline->new_index("######-######");
  germlines.push_back(germline);


  germline = new Germline("TRA", 'A', path + "/TRAV.fa", "",  path + "/TRAJ.fa",  -10, 20);
  germline->new_index("#######-######");
  germlines.push_back(germline);

  germline = new Germline("TRB", 'B', path + "/TRBV.fa", path + "/TRBD.fa",  path + "/TRBJ.fa",   0, 80);
  germline->new_index("######-######");
  germlines.push_back(germline);

  germline = new Germline("TRD", 'D', path + "/TRDV.fa", path + "/TRDD.fa",  path + "/TRDJ.fa",   0, 80);
  germline->new_index("#####-#####");
  germlines.push_back(germline);


  germline = new Germline("IGK", 'K', path + "/IGKV.fa", "",  path + "/IGKJ.fa",  -10, 20);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

  germline = new Germline("IGL", 'L', path + "/IGLV.fa", "",  path + "/IGLJ.fa",  -10, 20);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

}


void MultiGermline::load_standard_set(string path)
{
  germlines.push_back(new Germline("TRA", 'A', path + "/TRAV.fa", "",                path + "/TRAJ.fa",   -10, 20));
  germlines.push_back(new Germline("TRB", 'B', path + "/TRBV.fa", path + "/TRBD.fa", path + "/TRBJ.fa",   -10, 20));
  germlines.push_back(new Germline("TRG", 'G', path + "/TRGV.fa", "",                path + "/TRGJ.fa",   -10, 20));
  germlines.push_back(new Germline("TRD", 'D', path + "/TRDV.fa", path + "/TRDD.fa", path + "/TRDJ.fa",     0, 80));

  germlines.push_back(new Germline("IGH", 'H', path + "/IGHV.fa", path + "/IGHD.fa", path + "/IGHJ.fa",     0, 80));
  germlines.push_back(new Germline("IGK", 'K', path + "/IGKV.fa", "",                path + "/IGKJ.fa",   -10, 20));
  germlines.push_back(new Germline("IGL", 'L', path + "/IGLV.fa", "",                path + "/IGLJ.fa",   -10, 20));
}

void MultiGermline::insert_in_one_index(IKmerStore<KmerAffect> *_index)
{
  for (list<Germline*>::const_iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      Germline *germline = *it ;
      germline->affect_5 = string(1, germline->shortcut) + "-" + germline->code + "V";
      if (germline->rep_4.size())
	germline->affect_4 = string(1, 14 + germline->shortcut) + "-" + germline->code + "D";
      germline->affect_3 = string(1, tolower(germline->shortcut)) + "-" + germline->code + "J";
      germline->use_index(_index) ;
    }
}

void MultiGermline::build_with_one_index(string seed)
{
  bool rc = true ;
  index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);
  insert_in_one_index(index);
}

void MultiGermline::out_stats(ostream &out)
{
  for (list<Germline*>::const_iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      Germline *germline = *it ;
      out << germline->stats ;
    }
}
