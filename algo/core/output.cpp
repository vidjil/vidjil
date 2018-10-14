
#include "output.h"


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

void Output::add_warning(string code, string msg, string level)
{
  json_add_warning(j, code, msg, level);
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
}

void SampleOutput::out(ostream &s)
{
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



void SampleOutputVidjil::out(ostream &s)
{
   json j_clones;

   for (auto it: clones)
      j_clones.push_back(it.second->toJson());

   j["clones"] = j_clones;

   s << j.dump(2);
}
