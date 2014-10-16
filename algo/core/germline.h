
#ifndef GERMLINE_H
#define GERMLINE_H

#include <string>
#include <list>
#include "kmeraffect.h"
#include "kmerstore.h"
#include "stats.h"

using namespace std;

class Germline {
 private:
  void build_index(string seed);

 public:
  /*
   * @param delta_min: the minimal distance between the right bound and the left bound
   *        so that the segmentation is accepted
   *        (left bound: end of V, right bound : start of J)
   * @param delta_min: the maximal distance between the right bound and the left bound
   *        so that the segmentation is accepted
   *        (left bound: end of V, right bound : start of J)
   */

  Germline(string _code, char _shortcut, 
  	   string f_rep_5, string f_rep_4, string f_rep_3,
   	   string seed, 
   	   int _delta_min, int _delta_max);

  Germline(string _code, char _shortcut, 
      Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
	   string seed,
	   int _delta_min, int _delta_max);

  ~Germline();

  string code ;
  char   shortcut ;

  // KmerAffect affect_5 ;
  // KmerAffect affect_3 ;

  Fasta  rep_5 ;
  Fasta  rep_4 ;
  Fasta  rep_3 ;
  IKmerStore<KmerAffect> *index;

  int delta_min;
  int delta_max;

  Stats stats;
};


ostream &operator<<(ostream &out, const Germline &germline);


class MultiGermline {
 private:

 public:
  list <Germline*> germlines;

  MultiGermline();
  MultiGermline(string f_germlines_json);
  ~MultiGermline();

  void insert(Germline *germline);
  void load_default_set(string path);

  void out_stats(ostream &out);
};



#endif
