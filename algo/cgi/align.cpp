#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include "../core/dynprog.h"
#include "../core/fasta.h"
#include "../core/lazy_msa.h"
#include "../core/json.h"

using namespace std;

bool check_cgi_parameters(JsonList &result) {
  char * requestMethod = getenv("REQUEST_METHOD");
  if(!requestMethod) {
    result.add("Error", "requestMethod");
    return false;
  } else if(strcmp(requestMethod, "POST") != 0) {
    result.add("Error", "requestMethod =/= post");
    return false;
  }
  char * contentType = getenv("CONTENT_TYPE");
  if(!contentType) {
    result.add("Error", "content_type");
    return false;
  }
  result.add("requestMethod",requestMethod);
  result.add("contentType", contentType);
  return true;
}

bool create_fasta_file(JsonList &result, int fd) {
  char temp[1024];
  FILE *f;
  f = fdopen(fd,"w");
  if(f == NULL){
    result.add("Error", "opening tempfile");
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
  JsonList result;
  bool error = false;

  bool cgi_mode;
  
    if (argc <= 1){
      cgi_mode=true;
      cout <<"Content-type: text/html"<<endl<<endl;

      error = ! check_cgi_parameters(result);
      if (! error) {
        int fd = mkstemp(filename);
        if (fd == -1) {
          result.add("Error", "Temporary file");
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
          JsonArray alignment;
      
          for (int i=0; i<lm.sizeUsed+2; i++){
            alignment.add(align_str[i]);
          }
          result.add("seq", alignment);
        }

        remove(filename);
        cout << result.toString();
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



