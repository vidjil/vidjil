#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include <stdlib.h>
#include "../core/dynprog.h"
#include "../core/fasta.h"
#include "../core/msa.h"
#include "../core/lazy_msa.h"

using namespace std;


int main()
{
    string temp;
    temp=getenv("QUERY_STRING");
    
    size_t pos = 0;
    size_t pos2 = 0;
    string tok;
    string seq;
    string id;
    int size;
    int ite=0;
    string * tab;
    
    cout <<"Content-type: text/html"<<endl<<endl;
    
    //récupération nombre de séquence
    pos = temp.find(",");
    tok = temp.substr(0, pos);
    size = atoi(const_cast<char*>(tok.c_str()));
    temp.erase(0, pos + 1);
    tab=new string[size];
    
    //récupération séquence principale
    pos = temp.find(",");
    tok = temp.substr(0, pos);

    pos2 = tok.find(";");
    id = tok.substr(0, pos2);
    seq = tok.substr(pos2+1);
    tab[ite]=id;
    ite++;

    LazyMsa lm = LazyMsa(50, seq);
    temp.erase(0, pos + 1);
    
    
    //récupération des séquences suivantes
    for (int i=1 ; i<size ; i++){ 
      pos = temp.find(",");
      tok = temp.substr(0, pos);

      pos2 = tok.find(";");
      id = tok.substr(0, pos2);
      seq = tok.substr(pos2+1);
      lm.add(seq);
      tab[ite]=id;
      ite++;

      LazyMsa lm = LazyMsa(50, seq);
      temp.erase(0, pos + 1);
    }

    
    string *result;
    result =new string[lm.sizeUsed+2];
    lm.align(result);
    
    cout<<endl<<endl<< "{ \"seq\" : ["<<endl;
    for (int i=0; i<lm.sizeUsed+2; i++){
      cout<<"[\""<<tab[i]<<"\",\""<<result[i]<<"\"]"<<","<<endl;
    }
    cout<<"0]}";
  
  
}