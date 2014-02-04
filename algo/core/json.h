#ifndef JSON_H
#define JSON_H

#include <string>
#include <list>
#include "labels.h"

using namespace std ;

class JsonData
{
  public:
  string name;
  string data;
  
  JsonData();
  string toString();
};

class JsonList;

class JsonArray
{
  public:
  list<string> l;
  
  JsonArray();
  void add(string d);
  void add(float d);
  void add(JsonList &d);
  void add(JsonArray &d);
  string toString();
};

class JsonList
{
  public:
  list<JsonData> l;
  
  JsonList();
  void add(string n, string d);
  void add(string n, float d);
  void add(string n, JsonList &d);
  void add(string n, JsonArray &d);
  string toString();
};

JsonArray json_normalization_names();
JsonArray json_normalization( list< pair <float, int> > norm_list, int nb_reads, int nb_segmented);

#endif
