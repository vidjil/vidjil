#ifndef OUTPUT_H
#define OUTPUT_H

#include <string>
#include <fstream>
#include <iostream>
#include "tools.h"
#include "../lib/json.hpp"


#define KEY_SEG "seg"

using namespace std;
using json = nlohmann::json;

class CloneOutput
{
private:
  json j;
  
public:
  void set(string key, json val);
  void set(string key, string subkey, json val);
  void add_warning(string code, string msg, string level);
  
  json toJson();
};


/*
class SampleOutput
{

}

class SampleOutputFormatter
{

}

class SampleOutputFormatterCSV(SampleOutputFormatter)
{

}

class SampleOutputFormatterJson(SampleOutputFormatter)
{

}

*/

#endif
