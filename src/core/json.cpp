#include <string>
#include "json.h"
#include <sstream>
#include "labels.h"

using namespace std ;


JsonData::JsonData(){
}

string JsonData::toString(){
  ostringstream stream;
  
  stream  << "\"" << name << "\" : " << data << endl;
  return stream.str();;
}



JsonList::JsonList(){
}

void JsonList::add(string n, string d){
  JsonData elem;
  
  elem.name=n;
  elem.data="\""+d+"\"";
  l.push_back(elem);
}

void JsonList::add(string n, float d){
  JsonData elem;
  ostringstream stream;
  
  stream << d;
  elem.name=n;
  elem.data=stream.str();
  l.push_back(elem);
}

void JsonList::add(string n, JsonList &d){
  JsonData elem;
  
  elem.name=n;
  elem.data=d.toString();
  l.push_back(elem);
}

void JsonList::add(string n, JsonArray &d){
  JsonData elem;
  
  elem.name=n;
  elem.data=d.toString();
  l.push_back(elem);
}

string JsonList::toString(){
  ostringstream stream;
  
  stream << " { ";
  
  for ( list<JsonData>::iterator i=l.begin(); i!= l.end(); ++i){
    if (i!=l.begin()) stream << ",";
    stream << endl << "\"" << (*i).name << "\" : " << (*i).data ;
  }
  
  stream << endl << " } ";
  
  return stream.str();;
}



JsonArray::JsonArray(){
}

void JsonArray::add(string d){
  l.push_back("\""+d+"\"");
}

void JsonArray::add(float d){
  ostringstream stream;
  stream << d;
  l.push_back(stream.str());
}

void JsonArray::add(JsonArray &d){
  l.push_back(d.toString());
}

void JsonArray::add(JsonList &d){
  l.push_back(d.toString());
}

string JsonArray::toString(){
  ostringstream stream;
  
  stream << " [ ";
  
  for ( list<string>::iterator i=l.begin(); i!= l.end(); ++i){
    if (i!=l.begin()) stream << ",";
    stream << endl << (*i);
  }
  
  stream << endl << " ] ";
  
  return stream.str();
}




JsonArray json_normalization_names()
{
  JsonArray result;
  result.add("none");
  result.add("highest standard");
  result.add("all standards");
  
  return result;
}

JsonArray json_normalization( list< pair <float, int> > norm_list, int nb_reads, int nb_segmented)
{
  JsonArray result;
    
  result.add( (float) nb_reads / nb_segmented );
  result.add( (float) nb_reads * compute_normalization_one(norm_list, nb_reads) / nb_segmented  );
  result.add( (float) nb_reads * compute_normalization(norm_list, nb_reads) / nb_segmented );
  
  return result;
}
