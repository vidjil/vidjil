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
#define MAXLEN 500
#define EXTRA 5
#define MAXINPUT MAXLEN+EXTRA+2
#define DATAFILE "data.txt"

using namespace std;


int main()
{
    
    char *lenstr;
    long len;
    char filename[L_tmpnam];
    tmpnam(filename);

    
    cout <<"Content-type: text/html"<<endl<<endl;
    cout<< "{"<<endl;
    
    char * requestMethod = getenv("REQUEST_METHOD");
    cout<<"\"requestMethod\" : \""<<requestMethod<<"\""<<endl;
    if(!requestMethod) {
      cout<<",\"Error\": \"requestMethod\"}"<<endl;
      return 0;
    }
    if(strcmp(requestMethod, "POST") != 0) {
      cout<<",\"Error\": \"requestMethod =/= post\"}"<<endl;
      return 0;
    }
    char * contentType = getenv("CONTENT_TYPE");
    if(!contentType) {
      cout<<",\"Error\": \"content_type\"}"<<endl;
      return 0;
    }
      cout<<",\"contentType\": \""<<contentType<<"\""<<endl;

    char temp[1024];
    FILE *f;
    f = fopen(filename,"w");
    if(f == NULL){
      cout<<",\"Error\": \"save\""<<filename<<"}"<<endl;

      return 0;
    }else{
      while(cin) {
	cin.getline(temp, 1024);
	fputs(temp, f);
	fputs("\n", f);
      }
    }
    
    fclose(f);
    
    DynProg::DynProgMode dpMode = DynProg::Global;
    Cost dpCost = VDJ;
    ostringstream ost; 
    

    const char* fdata = filename;
    
    Fasta fa(fdata, 1, " ", ost);
    string seq0 = fa.sequence(0);
    
      LazyMsa lm = LazyMsa(50, seq0);
    
    for (int i=1; i < fa.size(); i++){
      string seq1 = fa.sequence(i);
      
      lm.add(seq1);
    }
    
    string *result;
    result =new string[lm.sizeUsed+2];
    lm.align(result);
    
     cout<<",\"seq\" : [\""<<result[0]<<"\""<<endl;
    for (int i=1; i<lm.sizeUsed+2; i++){
      cout<<",\""<<result[i]<<"\""<<endl;
    }
    cout<<"]}";
    
    remove(filename);

      
}