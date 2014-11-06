
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
  void init(string _code, char _shortcut,
            int _delta_min, int _delta_max);

  void update_index();

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
           list <string> f_rep_5, list <string> f_rep_4, list <string> f_rep_3,
           int _delta_min, int _delta_max);

  Germline(string _code, char _shortcut, 
  	   string f_rep_5, string f_rep_4, string f_rep_3,
   	   int _delta_min, int _delta_max);

  Germline(string _code, char _shortcut, 
      Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
	   int _delta_min, int _delta_max);

  ~Germline();

  string code ;
  char   shortcut ;

  void new_index(string seed);
  void use_index(IKmerStore<KmerAffect> *index);

  list <string> f_reps_5 ;
  list <string> f_reps_4 ;
  list <string> f_reps_3 ;

  // KmerAffect affect_5 ;
  // KmerAffect affect_3 ;
  string affect_5 ;
  string affect_4 ;
  string affect_3 ;
  
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

  // A unique index can be used
  IKmerStore<KmerAffect> *index;

  MultiGermline();
  ~MultiGermline();

  void insert(Germline *germline);
  void build_default_set(string path);
  void load_standard_set(string path);

  void insert_in_one_index(IKmerStore<KmerAffect> *_index);
  void build_with_one_index(string seed);

  void out_stats(ostream &out);
};



#endif
