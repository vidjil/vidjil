#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include "../core/dynprog.h"
#include "../core/fasta.h"
#include "../core/lazy_msa.h"
#include "../lib/json.hpp"

using namespace std ;
using json = nlohmann::json;

bool check_cgi_parameters(json &result) {
  char * requestMethod = getenv("REQUEST_METHOD");
  if(!requestMethod) {
    result["Error"] = "requestMethod";
    return false;
  } else if(strcmp(requestMethod, "POST") != 0) {
    result["Error"] = "requestMethod =/= post";
    return false;
  }
  char * contentType = getenv("CONTENT_TYPE");
  if(!contentType) {
    result["Error"] = "content_type";
    return false;
  }
  result["requestMethod"] = requestMethod;
  result["contentType"] = contentType;
  return true;
}

bool create_fasta_file(json &result, int fd) {
  char temp[1024];
  FILE *f;
  f = fdopen(fd,"w");
  if(f == NULL){
    result["Error"] = "opening tempfile";
    return false;
  }else{
    while(cin) {
      cin.getline(temp, 1024);
      fputs(temp, f);
      fputs("\n", f);
    }
  }
      
  fclose(f);
  return true;
}

int main(int argc, char* argv[])
{
  
  const char* fdata;
  //  ostringstream ost; 
  char filename[] = "/tmp/VidjilAlignXXXXXX";
  json result;
  bool error = false;

  bool cgi_mode;
  
    if (argc <= 1){
      cgi_mode=true;
      cout <<"Content-type: text/html"<<endl<<endl;

      error = ! check_cgi_parameters(result);
      if (! error) {
        int fd = mkstemp(filename);
        if (fd == -1) {
          result["Error"] = "Temporary file";
          error = true;
        } else {
          error = ! create_fasta_file(result, fd);
          fdata = filename;
        }
      }
    }else{
      cgi_mode=false;
      fdata = argv[1];
    }
    
    if (!cgi_mode) cout <<endl;

    if (! error) {
      Fasta fa(fdata, 1, " ", !cgi_mode);
    
    
      string seq0 = fa.sequence(0);
    
      LazyMsa lm = LazyMsa(fa.size(), seq0);
    
      for (int i=1; i < fa.size(); i++){
        string seq1 = fa.sequence(i);
        lm.add(seq1);
      }
    
      string *align_str;
      align_str =new string[lm.sizeUsed+2];
      lm.align(align_str);
    

      if (cgi_mode) {
        if (! error) {
          json alignment;
      
          for (int i=0; i<lm.sizeUsed+2; i++){
            alignment.push_back(align_str[i]);
          }
          result["seq"] = alignment;
        }

        remove(filename);
        cout << result.dump(2);
      }else{
        int length=60;
        int n=align_str[0].size();
        int j=0;
      
        while (n > 0){
          for (int i=0; i<lm.sizeUsed+2; i++){
	  
            cout<<" >  "<<align_str[i].substr(j*length,length)<<"  <  "<<fa.label(i)<<endl;
          }
          cout<<endl;
          n=n-length;
          j++;
        }
      
      }
    }
      
}



