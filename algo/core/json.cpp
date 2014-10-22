#include <string>
#include "json.h"
#include <sstream>
#include "labels.h"

using namespace std ;

string escapeJsonString(const string& input) {
    ostringstream ss;
    for (std::string::const_iterator iter = input.begin(); iter != input.end();  iter++) {
        switch (*iter) {
            case '\\': ss << "\\\\"; break;
            case '"': ss << "\\\""; break;
            case '/': ss << "\\/"; break;
            case '\b': ss << "\\b"; break;
            case '\f': ss << "\\f"; break;
            case '\n': ss << "\\n"; break;
            case '\r': ss << "\\r"; break;
            case '\t': ss << "\\t"; break;
            default: ss << *iter; break;
        }
    }
    return ss.str();
}


/*
 Constructeur de JsonData
 */
JsonData::JsonData(){
}

/*
 Méthode permettant de retourner le contenu d'un tampon, dans lequel on a "imprimé" un nom ainsi que ses données
 */
string JsonData::toString(){
  ostringstream stream;
  
  stream  << "\"" << name << "\" : " << data << endl;
  return stream.str();;
}

/*
 Constructeur de JsonList
 */
JsonList::JsonList(){
}

/*
 Méthode permettant d'ajouter un nouvel élément Json composé d'un nom et de ses données
 */
void JsonList::add(string n, string d){
  JsonData elem;
  
  elem.name=n;
  elem.data="\""+escapeJsonString(d)+"\"";
  l.push_back(elem);
}

/*
 Méthode permettant d'ajouter un élèment Json composé d'un nom ainsi que d'une chaîne de caractères représentant le flottant donné en paramètre
 */
void JsonList::add(string n, float d){
  JsonData elem;
  ostringstream stream;
  
  //Impression du flottant dans le buffer
  stream << d;
  elem.name=n;
  //On prend la chaîne de caractères associée à l'impression du flottant dans le buffer
  elem.data=stream.str();
  l.push_back(elem);
}

/*
 Méthode permettant d'ajouter un élèment Json composé d'un nom et d'une liste d'objets Json
 */
void JsonList::add(string n, JsonList &d){
  JsonData elem;
  
  elem.name=n;
  elem.data=d.toString();
  l.push_back(elem);
}

/*
 Méthode permettant d'ajouter un élèment Json composé d'un nom et d'un tableau d'objets Json
 */
void JsonList::add(string n, JsonArray &d){
  JsonData elem;
  
  elem.name=n;
  elem.data=d.toString();
  l.push_back(elem);
}

/*
 Méthode permettant de concaténer 2 objets JsonList
 */
void JsonList::concat(JsonList &d){
	l.insert(l.end(), d.l.begin(), d.l.end());
}

/*
 Méthode permettant de retourner le contenu d'une JsonList
 */
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

/*
 Constructeur de JsonArray
 */
JsonArray::JsonArray(){
}

/*
 Méthode permettant d'ajouter un nom d'objet
 */
void JsonArray::add(string d){
  l.push_back("\""+escapeJsonString(d)+"\"");
}

/*
 Méthode permettant d'ajouter une donnée 
 */
void JsonArray::add(float d){
  ostringstream stream;
  stream << d;
  l.push_back(stream.str());
}

/*
 Méthode permettant d'ajouter un tableau d'objets Json (type: JsonArray)
 */
void JsonArray::add(JsonArray &d){
  l.push_back(d.toString());
}

/*
 Méthode permettant d'ajouter une liste d'objets Json (type: JsonList)
 */
void JsonArray::add(JsonList &d){
  l.push_back(d.toString());
}

/*
 Méthode permettant de retourner le contenu d'un objet JsonArray
 */
string JsonArray::toString(){
  ostringstream stream;
  
  stream << " [ ";
  
  for ( list<string>::iterator i=l.begin(); i!= l.end(); ++i){
    if (i!=l.begin()) stream << ", " << endl;
    stream << (*i);
  }
  
  stream << " ] ";
  
  return stream.str();
}
