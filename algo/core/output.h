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
protected:
  map <junction, CloneOutput*> clones;

public:
  SampleOutput(json init);
  virtual ~SampleOutput();

  void addClone(junction junction, CloneOutput *clone);

  // get a clone, or create a new one if needed
  CloneOutput* getClone(junction junction);

  json toJson();
  void out(ostream &s);
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


// Native Json .vidjil format
// See vidjil-format.md
class SampleOutputVidjil : public SampleOutput
{
public:
  void out(ostream &s);
};


#endif
