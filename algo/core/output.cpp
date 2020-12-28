#include "output.h"

#define NULL_VAL ""

string getout(json v)
{
  if (v.is_null()) return NULL_VAL ;
  if (v.is_number()) return string_of_int(v) ;
  if (v.is_string()) return v;
  return v.dump();
}

string Output::get(string key)
{
  if (!j.count(key)) return NULL_VAL ;

  return getout(j[key]);
}
string Output::get(string key, string subkey)
{
  if (!j.count(key)) return NULL_VAL ;
  if (!j[key].count(subkey)) return NULL_VAL ;

  return getout(j[key][subkey]);
}
string Output::get(string key, string subkey, string subsubkey)
{
  if (!j.count(key)) return NULL_VAL ;
  if (!j[key].count(subkey)) return NULL_VAL ;
  if (!j[key][subkey].count(subsubkey)) return NULL_VAL ;

  return getout(j[key][subkey][subsubkey]);
}


void Output::set(string key, json val)
{
   j[key] = val ;
}

void Output::set(string key, string subkey, json val)
{
  j[key][subkey] = val ;
}

void Output::set(string key, string subkey, string subsubkey, json val)
{
  j[key][subkey][subsubkey] = val ;
}

void CloneOutput::setSeg(string subkey, json val)
{
  set(KEY_SEG, subkey, val);
}

void Output::add_warning(string code, string msg, string level, bool phony)
{
  if (phony) {
    cout << WARNING_STRING << "(" + code + ")" << " " << msg << endl;
  }
  json_add_warning(j, code, msg, level);
}


int CloneOutput::reads()
{
  return j["reads"][0];
}

string CloneOutput::getWarnings()
{
  string warnings = "" ;

  if (!j.count("warn")) return warnings ;

  for (json w: j["warn"])
  {
    warnings +=  w["code"].get<std::string>() + " ";
  }

  return warnings;
}


CloneOutput::~CloneOutput()
{
}

json CloneOutput::toJson()
{
   return j;
}




SampleOutput::SampleOutput(json init)
{
  j = init;
}

SampleOutput::~SampleOutput()
{
  for (auto it: clones)
    delete it.second;
}

void SampleOutput::out(ostream &s)
{
  UNUSED(s);
}

void SampleOutput::addClone(junction junction, CloneOutput *clone)
{
  clones[junction] = clone;
}

CloneOutput* SampleOutput::getClone(junction junction)
{
  if (clones.find(junction) != clones.end()){
    return clones[junction];
  }
  else
  {
    CloneOutput *clone = new(CloneOutput);
    addClone(junction, clone);
    clone -> set("sequence", 0); // TODO need to compute representative sequence for this case
    return clone;
  }
}

// .vidjil json output

void SampleOutputVidjil::out(ostream &s, bool with_clones)
{
   json j_clones;

   if (with_clones)
      for (auto it: clones)
         j_clones.push_back(it.second->toJson());

   j["clones"] = j_clones;

   s << j.dump(2);
}


// AIRR .tsv output

string TF_format_bool(string val)
{
  if (val == "false") return "F" ;
  if (val == "true") return "T" ;
  return val ;
}

map <string, string> CloneOutputAIRR::fields()
{
  map <string, string> fields;

  fields["locus"] = get("germline");
  fields["duplicate_count"] = string_of_int(reads());

  fields["sequence_id"] = get("id");
  fields["sequence"] = get("sequence");
  fields["v_call"] = get(KEY_SEG, "5", "name");
  fields["d_call"] = get(KEY_SEG, "4", "name");
  fields["j_call"] = get(KEY_SEG, "3", "name");
  
  fields["v_sequence_start"]    = get(KEY_SEG, "5", "start");
  fields["v_sequence_end"]      = get(KEY_SEG, "5", "stop");
  fields["d_sequence_start"]    = get(KEY_SEG, "4", "start");
  fields["d_sequence_end"]      = get(KEY_SEG, "4", "stop");
  fields["j_sequence_start"]    = get(KEY_SEG, "3", "start");
  fields["j_sequence_end"]      = get(KEY_SEG, "3", "stop");
  fields["cdr3_sequence_start"] = get(KEY_SEG, "cdr3", "start");
  fields["cdr3_sequence_end"]   = get(KEY_SEG, "cdr3", "stop");

  fields["v_support"] = get(KEY_SEG, "evalue_left", "val");
  fields["j_support"] = get(KEY_SEG, "evalue_right", "val");

  fields["cdr3_aa"] = get(KEY_SEG, "cdr3", "aa");
  fields["junction"] = NULL_VAL;
  fields["junction_aa"] = get(KEY_SEG, "junction", "aa");
  fields["productive"] = TF_format_bool(get(KEY_SEG, "junction", "productive"));
  fields["rev_comp"] = NULL_VAL;

  fields["warnings"] = getWarnings();

  return fields;
}

void SampleOutputAIRR::out(ostream &s)
{
  vector <string> fields = {
    "locus",
    "duplicate_count",
    "v_call", "d_call", "j_call",
    "sequence_id",
    "sequence",
    
    "productive",
    "junction_aa",
    "junction",
    "cdr3_aa",
    "warnings",

    "v_sequence_start", "v_sequence_end",
    "d_sequence_start", "d_sequence_end",
    "j_sequence_start", "j_sequence_end",

    "cdr3_sequence_start", "cdr3_sequence_end",

    "v_support", "j_support",

    "rev_comp",
    "sequence_alignment",
    "germline_alignment",
    "v_cigar", "d_cigar", "j_cigar",
  };


  for (string f: fields)
    s << f << "\t" ;
  s << endl ;

  for (auto it: clones)
  {
    map <string, string> clone_fields = static_cast<CloneOutputAIRR *>(it.second) -> fields();
    for (string f: fields)
      s << clone_fields[f] << "\t" ;
    s << endl;
  }
}
