
#include "germline.h"
#include "automaton.hpp"
#include <fstream>
#include <ctype.h>

void Germline::init(string _code, char _shortcut,
                    string seed,
                    int max_indexing)
{
  seg_method = SEG_METHOD_53 ;
  code = _code ;
  shortcut = _shortcut ;
  index = 0 ;
  this->max_indexing = max_indexing;
  this->seed = seed;
  if (this->seed.size() == 0)
    this->seed = DEFAULT_GERMLINE_SEED;

  affect_5 = "V" ;
  affect_4 = "" ;
  affect_3 = "J" ;

  affect_5 = string(1, toupper(shortcut)) + "-" + code + "V";
  affect_4 = string(1, 14 + shortcut) + "-" + code + "D";
  affect_3 = string(1, tolower(shortcut)) + "-" + code + "J";
  pair_automaton = buildACAutomatonToFilterBioReader(rep_5, seed);
}


Germline::Germline(string _code, char _shortcut,
		   string seed, int max_indexing)
{
  init(_code, _shortcut, seed, max_indexing);
}


Germline::Germline(string _code, char _shortcut,
		   string f_rep_5, string f_rep_4, string f_rep_3,
		   string seed, int max_indexing)
{

  f_reps_5.push_back(f_rep_5);
  f_reps_4.push_back(f_rep_4);
  f_reps_3.push_back(f_rep_3);

  /// no CYS104_IN_GAPPED_V / PHE118_TRP118_IN_GAPPED_J here ?
  rep_5 = BioReader(f_rep_5, 2, "|");
  rep_4 = BioReader(f_rep_4, 2, "|");
  rep_3 = BioReader(f_rep_3, 2, "|");
  
  init(_code, _shortcut, seed, max_indexing);

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}


Germline::Germline(string _code, char _shortcut,
		   list <string> _f_reps_5, list <string> _f_reps_4, list <string> _f_reps_3,
		   string seed, int max_indexing)
{

  f_reps_5 = _f_reps_5 ;
  f_reps_4 = _f_reps_4 ;
  f_reps_3 = _f_reps_3 ;

  bool regular = (code.find("+") == string::npos);

  rep_5 = BioReader(2, "|", regular ? CYS104_IN_GAPPED_V : 0);
  rep_4 = BioReader(2, "|") ;
  rep_3 = BioReader(2, "|", regular ? PHE118_TRP118_IN_GAPPED_J : 0);

  for (list<string>::const_iterator it = f_reps_5.begin(); it != f_reps_5.end(); ++it)
    rep_5.add(*it);
  
  init(_code, _shortcut, seed, max_indexing);
  
  for (list<string>::const_iterator it = f_reps_4.begin(); it != f_reps_4.end(); ++it)
    rep_4.add(*it);

  for (list<string>::const_iterator it = f_reps_3.begin(); it != f_reps_3.end(); ++it)
    rep_3.add(*it);

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}


Germline::Germline(string _code, char _shortcut, 
           BioReader _rep_5, BioReader _rep_4, BioReader _rep_3,
                   string seed, int max_indexing)
{
  rep_5 = _rep_5 ;
  rep_4 = _rep_4 ;
  rep_3 = _rep_3 ;
  
  init(_code, _shortcut, seed, max_indexing);

  if (rep_4.size())
    seg_method = SEG_METHOD_543 ;
}

Germline::Germline(string code, char shortcut, string path, json json_recom,
                   string seed, int max_indexing)
{

  bool regular = (code.find("+") == string::npos);
  
  rep_5 = BioReader(2, "|", regular ? CYS104_IN_GAPPED_V : 0) ;
  rep_4 = BioReader(2, "|") ;
  rep_3 = BioReader(2, "|", regular ? PHE118_TRP118_IN_GAPPED_J : 0) ;

  for (json::iterator it = json_recom["5"].begin();
       it != json_recom["5"].end(); ++it) 
  {
    string filename = *it;
    f_reps_5.push_back(path + filename);
    rep_5.add(path + filename);
  }
  
  init(code, shortcut, seed, max_indexing);
  
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

  // SEG_METHOD_ONE
  if (json_recom.find("1") != json_recom.end())
    {
      seg_method = SEG_METHOD_ONE ;
      for (json::iterator it = json_recom["1"].begin();
           it != json_recom["1"].end(); ++it)
        {
          string filename = *it;
          f_reps_4.push_back(path + filename);
          rep_4.add(path + filename);
        }
    }
}

int Germline::getMaxIndexing(){
  return this->max_indexing;
}

void Germline::finish() {
  if (index)
    index->finish_building();
}

void Germline::new_index(IndexTypes type)
{
  assert(! seed.empty());

  bool rc = true ;
  index = KmerStoreFactory<KmerAffect>::createIndex(type, seed, rc);
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

  _index->insert(rep_5, affect_5, max_indexing, seed);
  _index->insert(rep_4, affect_4, 0, seed);
  _index->insert(rep_3, affect_3, -max_indexing, seed);
}

void Germline::mark_as_ambiguous(Germline *other)
{
  index->insert(other->rep_5, AFFECT_AMBIGUOUS_SYMBOL, max_indexing, seed);

  if (other->affect_4.size())
    index->insert(other->rep_4, AFFECT_AMBIGUOUS_SYMBOL, 0, seed);

  index->insert(other->rep_3, AFFECT_AMBIGUOUS_SYMBOL, -max_indexing, seed);
}

void Germline::override_rep5_rep3_from_labels(KmerAffect left, KmerAffect right)
{
  rep_5 = index->getLabel(left);
  rep_3 = index->getLabel(right);
}

Germline::~Germline()
{
  if(pair_automaton){
    if(pair_automaton->first){
      delete pair_automaton->first;
    }
    if(pair_automaton->second){
      delete pair_automaton->second;
    }
    delete pair_automaton;
  }
  if (index)
    {
      if (--(index->refs) == 0)
        delete index;
    }
}

ostream &operator<<(ostream &out, const Germline &germline)
{
  out << setw(5) << left << germline.code << right << " '" << germline.shortcut << "' "
      << " ";

  size_t seed_span = germline.seed.size();
  size_t seed_w = seed_weight(germline.seed);

  if (germline.index) {
    out << " 0x" << hex << setw(2) << setfill('0') << germline.index->id << dec << setfill(' ') << " " ;
    out << fixed << setprecision(3) << setw(8)
        << 100 * germline.index->getIndexLoad(KmerAffect(germline.affect_5, 1, seed_span)) << "%" << " "
        << 100 * germline.index->getIndexLoad(KmerAffect(germline.affect_3, 1, seed_span)) << "%";
    out << " l" << germline.seed.length() << " k" << seed_w << " " << germline.seed ;
  }

  out << endl;
  return out;
}


MultiGermline::MultiGermline(IndexTypes indexType, bool _one_index_per_germline):indexType(indexType)
{
  ref = "custom germlines" ;
  species = "custom germlines" ;
  species_taxon_id = 0 ;
  index = NULL;
  one_index_per_germline = _one_index_per_germline;
}

MultiGermline::~MultiGermline() {
  if (index && --(index->refs) == 0) {
    delete index;
  }
  for (list<Germline*>::iterator it = germlines.begin(); it != germlines.end(); ++it)
    {
      delete *it ;
    }
}

void MultiGermline::insert(Germline *germline)
{
  germlines.push_back(germline);
}

void MultiGermline::add_germline(Germline *germline)
{
  if (one_index_per_germline)
    germline->new_index(indexType);
  germlines.push_back(germline);
}

void MultiGermline::build_from_json(string path, string json_filename_and_filter, int filter,
                                    string default_seed, int default_max_indexing)
{

  //extract json_filename and systems_filter
  string json_filename = json_filename_and_filter;
  string systems_filter = "";

  size_t pos_lastcolon = json_filename_and_filter.find_last_of(':');
  if (pos_lastcolon != std::string::npos) {
    json_filename = json_filename_and_filter.substr(0, pos_lastcolon);
    systems_filter = "," + json_filename_and_filter.substr(pos_lastcolon+1) + "," ;
  }


  //open and parse .g file
  json germlines ;

  try {
    ifstream germline_data(path + "/" + json_filename);

    string content( (std::istreambuf_iterator<char>(germline_data) ),
                    (std::istreambuf_iterator<char>()    ) );

    germlines = json::parse(content);

  } catch (const invalid_argument e) {
    cerr << ERROR_STRING << "Vidjil cannot open .g file " << path + "/" + json_filename << ": " << e.what() << endl;
    exit(1);
  }

  ref = germlines["ref"].get<std::string>();
  species = germlines["species"].get<std::string>();
  species_taxon_id = germlines["species_taxon_id"];

  path += "/" + germlines["path"].get<std::string>();

  json j = germlines["systems"];
  
  //for each germline
  for (json::iterator it = j.begin(); it != j.end(); ++it) {
    int max_indexing = default_max_indexing;
      
    json json_value = it.value();
    json recom = json_value["recombinations"];
    char shortcut = json_value["shortcut"].dump()[1];
    string code = it.key();
    json json_parameters = json_value["parameters"];
    string seed = json_parameters["seed"];

    if (default_max_indexing == 0) {
      if (json_parameters.count("trim_sequences") > 0) {
        max_indexing = json_parameters["trim_sequences"];
      }
    }

    if (systems_filter.size())
      {
        // match 'TRG' inside 'IGH,TRG'
        // TODO: code a more flexible match, regex ?
        if (systems_filter.find("," + code + ",") == string::npos)
          continue ;
      }

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

    seed = (default_seed.size() == 0) ? seedMap[seed] : default_seed;
    
    //for each set of recombination 3/4/5
    for (json::iterator it2 = recom.begin(); it2 != recom.end(); ++it2) {
      add_germline(new Germline(code, shortcut, path + "/", *it2,
                                seed, max_indexing));
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
  index = KmerStoreFactory<KmerAffect>::createIndex(indexType, seed, rc);
  index->refs = 1;
  insert_in_one_index(index, set_index);
}

void MultiGermline::finish() {
  if (index) {
    index->finish_building();
  }
  for (auto germline: germlines) {
    germline->finish();
  }
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
  out << multigermline.species << " (" << multigermline.species_taxon_id << ")" << endl ;

  for (list<Germline*>::const_iterator it = multigermline.germlines.begin(); it != multigermline.germlines.end(); ++it)
    {
      Germline *germline = *it ;
      out << "   " << *germline ;
    }

  return out;
}
