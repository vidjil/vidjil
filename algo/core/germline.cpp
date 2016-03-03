
#include "germline.h"
#include <fstream>
#include <ctype.h>

void Germline::init(string _code, char _shortcut,
                    int _delta_min,
                    int max_indexing)
{
  seg_method = SEG_METHOD_53 ;
  code = _code ;
  shortcut = _shortcut ;
  index = 0 ;
  this->max_indexing = max_indexing;

  affect_5 = "V" ;
  affect_4 = "" ;
  affect_3 = "J" ;

  affect_5 = string(1, toupper(shortcut)) + "-" + code + "V";
  affect_4 = string(1, 14 + shortcut) + "-" + code + "D";
  affect_3 = string(1, tolower(shortcut)) + "-" + code + "J";
     
  delta_min = _delta_min ;
}


Germline::Germline(string _code, char _shortcut,
		   int _delta_min,
                    int max_indexing)
{
  init(_code, _shortcut, _delta_min, max_indexing);
}


Germline::Germline(string _code, char _shortcut,
		   string f_rep_5, string f_rep_4, string f_rep_3,
		   int _delta_min,
                    int max_indexing)
{
  init(_code, _shortcut, _delta_min, max_indexing);

  f_reps_5.push_back(f_rep_5);
  f_reps_4.push_back(f_rep_4);
  f_reps_3.push_back(f_rep_3);

  /// no CYS104_IN_GAPPED_V / PHE118_TRP118_IN_GAPPED_J here ?
  rep_5 = Fasta(f_rep_5, 2, "|");
  rep_4 = Fasta(f_rep_4, 2, "|");
  rep_3 = Fasta(f_rep_3, 2, "|");

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}


Germline::Germline(string _code, char _shortcut,
		   list <string> _f_reps_5, list <string> _f_reps_4, list <string> _f_reps_3,
		   int _delta_min,
                    int max_indexing)
{
  init(_code, _shortcut, _delta_min, max_indexing);

  f_reps_5 = _f_reps_5 ;
  f_reps_4 = _f_reps_4 ;
  f_reps_3 = _f_reps_3 ;

  bool regular = (code.find("+") == string::npos);

  rep_5 = Fasta(2, "|", regular ? CYS104_IN_GAPPED_V : 0);
  rep_4 = Fasta(2, "|") ;
  rep_3 = Fasta(2, "|", regular ? PHE118_TRP118_IN_GAPPED_J : 0);

  for (list<string>::const_iterator it = f_reps_5.begin(); it != f_reps_5.end(); ++it)
    rep_5.add(*it);
  
  for (list<string>::const_iterator it = f_reps_4.begin(); it != f_reps_4.end(); ++it)
    rep_4.add(*it);

  for (list<string>::const_iterator it = f_reps_3.begin(); it != f_reps_3.end(); ++it)
    rep_3.add(*it);

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}


Germline::Germline(string _code, char _shortcut, 
           Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
		   int _delta_min,
                    int max_indexing)
{
  init(_code, _shortcut, _delta_min, max_indexing);

  rep_5 = _rep_5 ;
  rep_4 = _rep_4 ;
  rep_3 = _rep_3 ;

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}

Germline::Germline(string code, char shortcut, string path, json json_recom, int max_indexing)
{
    
  int delta_min = -10;
  
  if (json_recom.find("4") != json_recom.end()) {
      delta_min = 0;
  }
  
  init(code, shortcut, delta_min, max_indexing);

  bool regular = (code.find("+") == string::npos);
  
  rep_5 = Fasta(2, "|", regular ? CYS104_IN_GAPPED_V : 0) ;
  rep_4 = Fasta(2, "|") ;
  rep_3 = Fasta(2, "|", regular ? PHE118_TRP118_IN_GAPPED_J : 0) ;

  for (json::iterator it = json_recom["5"].begin();
       it != json_recom["5"].end(); ++it) 
  {
    string filename = *it;
    f_reps_5.push_back(path + filename);
    rep_5.add(path + filename);
  }
  
  if (json_recom.find("4") != json_recom.end()) {
    for (json::iterator it = json_recom["4"].begin();
        it != json_recom["4"].end(); ++it) 
    {
        string filename = *it;
        f_reps_4.push_back(path + filename);
        rep_4.add(path + filename);
    }
  }
  
  for (json::iterator it = json_recom["3"].begin();
       it != json_recom["3"].end(); ++it) 
  {
    string filename = *it;
    f_reps_3.push_back(path + filename);
    rep_3.add(path + filename);
  }

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}

void Germline::new_index(string seed)
{
  bool rc = true ;
  index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);
  index->refs = 1;

  update_index();
}

void Germline::set_index(IKmerStore<KmerAffect> *_index)
{
  index = _index;
  index->refs++ ;
}


void Germline::update_index(IKmerStore<KmerAffect> *_index)
{
  if (!_index) _index = index ;

  _index->insert(rep_5, affect_5, max_indexing);
  _index->insert(rep_4, affect_4);
  _index->insert(rep_3, affect_3, -max_indexing);
}

void Germline::mark_as_ambiguous(Germline *other)
{
  index->insert(other->rep_5, AFFECT_AMBIGUOUS_SYMBOL, max_indexing);

  if (other->affect_4.size())
    index->insert(other->rep_4, AFFECT_AMBIGUOUS_SYMBOL);

  index->insert(other->rep_3, AFFECT_AMBIGUOUS_SYMBOL, -max_indexing);
}


void Germline::override_rep5_rep3_from_labels(KmerAffect left, KmerAffect right)
{
  rep_5 = index->getLabel(left);
  rep_3 = index->getLabel(right);
}

Germline::~Germline()
{
  if (index)
    {
      if (--(index->refs) == 0)
        delete index;
    }
}

ostream &operator<<(ostream &out, const Germline &germline)
{
  out << setw(5) << left << germline.code << right << " '" << germline.shortcut << "' "
      << setw(3) << germline.delta_min
      << " ";

  if (germline.index) {
    out << " 0x" << hex << setw(2) << setfill('0') << germline.index->id << dec << setfill(' ') << " " ;
    out << fixed << setprecision(3) << setw(8) << 100 * germline.index->getIndexLoad() << "%";
    out << " l" << germline.index->getS() << " k" << germline.index->getK() << " " << germline.index->getSeed() ; // TODO: there should be a << for index
  }

  out << endl;
  return out;
}


MultiGermline::MultiGermline(bool _one_index_per_germline)
{
  index = NULL;
  one_index_per_germline = _one_index_per_germline;
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

void MultiGermline::add_germline(Germline *germline, string seed)
{
  if (one_index_per_germline)
    germline->new_index(seed);
  germlines.push_back(germline);
}

void MultiGermline::build_from_json(string path, string json_filename, int filter, int max_indexing)
{
  //parse germlines.data
  ifstream germline_data(path + "/" + json_filename);
  string content( (std::istreambuf_iterator<char>(germline_data) ),
                  (std::istreambuf_iterator<char>()    ) );

  json j = json::parse(content);
  
  //for each germline
  for (json::iterator it = j.begin(); it != j.end(); ++it) {
      
    json recom = it.value()["recombinations"];
    char shortcut = it.value()["shortcut"].dump()[1];
    string code = it.key();
    string seed = it.value()["parameters"]["seed"];

    switch (filter) {
    case GERMLINES_REGULAR:
      if (code.find("+") != string::npos) continue ;
      break ;

    case GERMLINES_INCOMPLETE:
      if (code.find("+") == string::npos) continue ;
      break ;

    default:
      break ;
    }

    map<string, string> seedMap;
    seedMap["13s"] = SEED_S13;
    seedMap["12s"] = SEED_S12;
    seedMap["10s"] = SEED_S10;
    seedMap["9s"] = SEED_9;
    
    //for each set of recombination 3/4/5
    for (json::iterator it2 = recom.begin(); it2 != recom.end(); ++it2) {
      add_germline(new Germline(code, shortcut, path + "/", *it2 , max_indexing), seedMap[seed]);
    }
  }
  
}


/* if 'one_index_per_germline' was not set, this should be called once all germlines have been loaded */
void MultiGermline::insert_in_one_index(IKmerStore<KmerAffect> *_index, bool set_index)
{
  for (list<Germline*>::const_iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      Germline *germline = *it ;

      if (germline->rep_4.size())
	germline->affect_4 = string(1, 14 + germline->shortcut) + "-" + germline->code + "D";

      germline->update_index(_index);

      if (set_index)
        germline->set_index(_index);
    }
}

void MultiGermline::build_with_one_index(string seed, bool set_index)
{
  bool rc = true ;
  index = KmerStoreFactory::createIndex<KmerAffect>(seed, rc);
  insert_in_one_index(index, set_index);
}

/* Mark k-mers common to several germlines as ambiguous */
void MultiGermline::mark_cross_germlines_as_ambiguous()
{
  string VdJa = "TRA+D";
  
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
