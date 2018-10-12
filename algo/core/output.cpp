
#include "output.h"


void CloneOutput::set(string key, json val)
{
   j[key] = val ;
}

void CloneOutput::set(string key, string subkey, json val)
{
  j[key][subkey] = val ;
}

void CloneOutput::add_warning(string code, string msg, string level)
{
  json_add_warning(j, code, msg, level);
}

json CloneOutput::toJson()
{
   return j;
}
