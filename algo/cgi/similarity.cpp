#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include "../core/dynprog.h"
#include "../core/fasta.h"
#include "../core/lazy_msa.h"
#include "../core/similarityMatrix.h"
#include "../core/compare-all.h"
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
  char filename[] = "/tmp/VidjilSimilarityXXXXXX";
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
    
      list<Sequence> reads;
      reads = fa.getAll();
      
      list<string> labels;
      for (int i=0; i < reads.size(); i++) {
        labels.push_back(fa.label(i));
      }
      
      SimilarityMatrix matrix = compare_all(reads, labels);

      if (cgi_mode) {
          json j;
          j << JsonOutputSimilarityMatrix(matrix);
          cout << j.dump(2);
      }else{
        cout << RawOutputSimilarityMatrix(matrix, 90);
      }
      
    }
      
}
