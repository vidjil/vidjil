
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

void SampleOutput::addClone(junction junction, CloneOutput *clone)
{
  clones[junction] = clone;
}
