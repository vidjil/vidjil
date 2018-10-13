#ifndef OUTPUT_H
#define OUTPUT_H

#include <string>
#include <fstream>
#include <iostream>
#include "windows.h"
#include "tools.h"
#include "../lib/json.hpp"

#define KEY_SEG "seg"

using namespace std;
using json = nlohmann::json;

class Output
{
protected:
  json j;
  
public:
  void set(string key, json val);
  void set(string key, string subkey, json val);
  void set(string key, string subkey, string subsubkey, json val);
  void add_warning(string code, string msg, string level);
};


class CloneOutput : public Output
{
public:
  void setSeg(string subkey, json val);

  json toJson();
};


class SampleOutput : public Output
{
private:
  map <junction, CloneOutput*> clones;

public:
  SampleOutput(json init);

  void addClone(junction junction, CloneOutput *clone);

  json toJson();
};


/*
class CloneOutputFormatter
{

}

class CloneOutputFormatterCSV(CloneOutputFormatter)
{

}

class CloneOutputFormatterJson(CloneOutputFormatter)
{

}
*/

/*

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
