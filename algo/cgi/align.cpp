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


int main(int argc, char* argv[])
{
  
  const char* fdata;
  ostringstream ost; 
  ostream * p; 
  p=&ost;
  char filename[L_tmpnam];
  tmpnam(filename);

  bool cgi_mode;
  
    if (argc <= 1){
      cgi_mode=true;
      
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
      fdata = filename;
      
    }else{
      cgi_mode=false;
      fdata = argv[1];
      p=&cout;
    }
    
    if (!cgi_mode) cout <<ost<<endl;
    Fasta fa(fdata, 1, " ", *p);
    
    
    string seq0 = fa.sequence(0);
    
    LazyMsa lm = LazyMsa(fa.size(), seq0);
    
    for (int i=1; i < fa.size(); i++){
      string seq1 = fa.sequence(i);
      lm.add(seq1);
    }
    
    string *result;
    result =new string[lm.sizeUsed+2];
    lm.align(result);
    
    if (cgi_mode){
      cout<<",\"seq\" : [\""<<result[0]<<"\""<<endl;
      for (int i=1; i<lm.sizeUsed+2; i++){
	cout<<",\""<<result[i]<<"\""<<endl;
      }
      cout<<"]}";
      
      remove(filename);
      
    }else{
      int length=60;
      int n=result[0].size();
      int j=0;
      
      while (n > 0){
	for (int i=0; i<lm.sizeUsed+2; i++){
	  
	  cout<<" >  "<<result[i].substr(j*length,length)<<"  <  "<<fa.label(i)<<endl;
	}
	cout<<endl;
	n=n-length;
	j++;
      }
      
    }
      
}



