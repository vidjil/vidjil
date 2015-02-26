
#include "germline.h"
#include <ctype.h>

void Germline::init(string _code, char _shortcut,
                    int _delta_min, int _delta_max)
{
  code = _code ;
  shortcut = _shortcut ;
  index = 0 ;

  affect_5 = "V" ;
  affect_4 = "" ;
  affect_3 = "J" ;

  affect_5 = string(1, toupper(shortcut)) + "-" + code + "V";
  affect_4 = ""; // string(1, 14 + shortcut) + "-" + code + "D";
  affect_3 = string(1, tolower(shortcut)) + "-" + code + "J";
     
  delta_min = _delta_min ;
  delta_max = _delta_max ;

  stats_reads.setLabel(code);
  stats_clones.setLabel(code + "-clones");
}

Germline::Germline(string _code, char _shortcut,
		   string f_rep_5, string f_rep_4, string f_rep_3,
		   int _delta_min, int _delta_max)
{
  init(_code, _shortcut, _delta_min, _delta_max);

  f_reps_5.push_back(f_rep_5);
  f_reps_4.push_back(f_rep_4);
  f_reps_3.push_back(f_rep_3);

  rep_5 = Fasta(f_rep_5, 2, "|");
  rep_4 = Fasta(f_rep_4, 2, "|");
  rep_3 = Fasta(f_rep_3, 2, "|");
}


Germline::Germline(string _code, char _shortcut,
		   list <string> _f_reps_5, list <string> _f_reps_4, list <string> _f_reps_3,
		   int _delta_min, int _delta_max)
{
  init(_code, _shortcut, _delta_min, _delta_max);

  f_reps_5 = _f_reps_5 ;
  f_reps_4 = _f_reps_4 ;
  f_reps_3 = _f_reps_3 ;

  rep_5 = Fasta(2, "|") ;
  rep_4 = Fasta(2, "|") ;
  rep_3 = Fasta(2, "|") ;

  for (list<string>::const_iterator it = f_reps_5.begin(); it != f_reps_5.end(); ++it)
    rep_5.add(*it);
  
  for (list<string>::const_iterator it = f_reps_4.begin(); it != f_reps_4.end(); ++it)
    rep_4.add(*it);

  for (list<string>::const_iterator it = f_reps_3.begin(); it != f_reps_3.end(); ++it)
    rep_3.add(*it);
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
}

void Germline::mark_as_ambiguous(Germline *other)
{
  index->insert(other->rep_5, AFFECT_AMBIGUOUS_SYMBOL);

  if (other->affect_4.size())
    index->insert(other->rep_4, AFFECT_AMBIGUOUS_SYMBOL);

  index->insert(other->rep_3, AFFECT_AMBIGUOUS_SYMBOL);
}



Germline::~Germline()
{
  if (index)
    delete index;
}

ostream &operator<<(ostream &out, const Germline &germline)
{
  out << setw(4) << left << germline.code << right << " '" << germline.shortcut << "' "
      << setw(3) << germline.delta_min << "/" << setw(3) << germline.delta_max
      << " " << germline.index ;

  if (germline.index)
    out << " s" << germline.index->getS() << " k" << germline.index->getK() << " " << germline.index->getSeed() ; // TODO: there should be a << for index

  out << endl;
  return out;
}


MultiGermline::MultiGermline()
{
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
  
  germline = new Germline("TRG", 'G', path + "/TRGV.fa", "",                path + "/TRGJ.fa",   -10, 30);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

  germline = new Germline("IGH", 'H', path + "/IGHV.fa", path + "/IGHD.fa",  path + "/IGHJ.fa",   0, 80);
  germline->new_index("######-######");
  germlines.push_back(germline);

  germline = new Germline("TRD", 'D', path + "/TRDV.fa", path + "/TRDD.fa",  path + "/TRDJ.fa",   0, 80);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

  germline = new Germline("IGK", 'K', path + "/IGKV.fa", "",  path + "/IGKJ.fa",  -10, 20);
  germline->new_index("#####-#####");
  germlines.push_back(germline);


  germline = new Germline("TRA", 'A', path + "/TRAV.fa", "",  path + "/TRAJ.fa",  -10, 20);
  germline->new_index("#######-######");
  germlines.push_back(germline);

  germline = new Germline("TRB", 'B', path + "/TRBV.fa", path + "/TRBD.fa",  path + "/TRBJ.fa",   0, 80);
  germline->new_index("######-######");
  germlines.push_back(germline);

  germline = new Germline("IGL", 'L', path + "/IGLV.fa", "",  path + "/IGLJ.fa",  -10, 20);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

}

void MultiGermline::build_incomplete_set(string path)
{
  // Should parse 'data/germlines.data'
  Germline *germline;

  // DH-JH
  germline = new Germline("IGH+", 'h', path + "/IGHD.fa", "", path + "/IGHJ.fa",   -10, 20);
  germline->new_index("######-######");
  germlines.push_back(germline);

  // VD-JA
  germline = new Germline("VdJa", 'a', path + "/TRDV.fa", "",  path + "/TRAJ.fa",   -10, 80);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

  // DD2-DD3
  germline = new Germline("TRD+", 'd', path + "/TRDD2-01.fa", "", path + "/TRDJ.fa",   -10, 60);
  germline->new_index("#########");
  germlines.push_back(germline);
  germline = new Germline("TRD+", 'd', path + "/TRDV.fa", "", path + "/TRDD3-01.fa",   -10, 50);
  germline->new_index("#########");
  germlines.push_back(germline);
  germline = new Germline("TRD+", 'd', path + "/TRDD2-01.fa", "", path + "/TRDD3-01.fa",  -10, 50);
  germline->new_index("#########");
  germlines.push_back(germline);


  // IGK: KDE, INTRON
  germline = new Germline("IGK+", 'k', path + "/IGK-INTRON.fa", "",  path + "/IGK-KDE.fa",  -10, 80);
  germline->new_index("#####-#####");
  germlines.push_back(germline);
  germline = new Germline("IGK+", 'k', path + "/IGKV.fa", "",  path + "/IGK-KDE.fa",  -10, 80);
  germline->new_index("#####-#####");
  germlines.push_back(germline);

}


void MultiGermline::load_standard_set(string path)
{
  germlines.push_back(new Germline("TRA", 'A', path + "/TRAV.fa", "",                path + "/TRAJ.fa",   -10, 20));
  germlines.push_back(new Germline("TRB", 'B', path + "/TRBV.fa", path + "/TRBD.fa", path + "/TRBJ.fa",   -10, 20));
  germlines.push_back(new Germline("TRG", 'G', path + "/TRGV.fa", "",                path + "/TRGJ.fa",   -10, 30));
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

      if (germline->rep_4.size())
	germline->affect_4 = string(1, 14 + germline->shortcut) + "-" + germline->code + "D";

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
      out << germline->stats_reads ;
      out << germline->stats_clones ;
    }
}

/* Mark k-mers common to several germlines as ambiguous */
void MultiGermline::mark_cross_germlines_as_ambiguous()
{
  string VdJa = "VdJa";
  
  for (list<Germline*>::const_iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      Germline *germline = *it ;
      cout << *germline << ":" ;

      // Skip VdJa
      if (!(germline->code.compare(VdJa)))
        continue;
      
      for (list<Germline*>::const_iterator it2 = germlines.begin(); it2 != germlines.end(); ++it2)
      {
        Germline *germline2 = *it2 ;
        if (germline2 == germline)
          continue ;

        // Skip germlines on a same system, such as 'D' (TRD) and 'd' (TRD+)
        if (toupper(germline2->shortcut) == toupper(germline->shortcut))
          continue;

        // Skip VdJa
        if (!(germline2->code.compare(VdJa)))
          continue;
        
        germline->mark_as_ambiguous(germline2);
      }

      cout << endl;
    }
}


ostream &operator<<(ostream &out, const MultiGermline &multigermline)
{
  for (list<Germline*>::const_iterator it = multigermline.germlines.begin(); it != multigermline.germlines.end(); ++it)
    {
      Germline *germline = *it ;
      out << "   " << *germline ;
    }

  return out;
}
