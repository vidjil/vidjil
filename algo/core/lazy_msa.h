#include <iostream>
#include <fstream>
#include <string>
#include <list>
#include <iomanip>
#include <ostream> 
#include <sstream>


#include "dynprog.h"

using namespace std ;

class LazyMsa
{
 public:
  int sizeMax;		//nombre max de sequences pouvant etre ajoutées
  int sizeUsed;		//nombre de sequences ajoutées
  int **gapRef;		//les insertions dans la sequence de reference 
  int **link;		//liaisons entre les gaps references>autres 
  int **gapSeq;		//les insertions dans la sequence a aligner
  
  string ref;
  string *sequences;
  
  //reference: la sequence contre laquelle vont etre aligne toutes les autres
  //.sizeMax: nombre max de sequences pouvant etre alignées(sert a initialiser les tables)
  LazyMsa(int sizeMax, string reference);
  ~LazyMsa();
  
  //ajoute une sequence a aligner
  void add(string sequence);
  //retourne l'alignement entre la reference et la Xieme sequence
  void alignOne(string* align, int x); 
  //retourne l'alignement entre la reference et toute les autres
  void align(string* align); 
  
};