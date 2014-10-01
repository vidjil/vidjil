
#ifndef GERMLINE_H
#define GERMLINE_H

#include <string>
#include <list>
#include "kmeraffect.h"
#include "kmerstore.h"

using namespace std;

class Germline {
 private:

 public:
  /*
   * @param delta_min: the minimal distance between the right bound and the left bound
   *        so that the segmentation is accepted
   *        (left bound: end of V, right bound : start of J)
   * @param delta_min: the maximal distance between the right bound and the left bound
   *        so that the segmentation is accepted
   *        (left bound: end of V, right bound : start of J)
   */
  Germline(Fasta rep_5, Fasta rep_4, Fasta rep_3,
	   string seed,
	   int delta_min, int delta_max);
  ~Germline();

  string code ;
  char   shortcut ;
  string description ;

  // KmerAffect affect_5 ;
  // KmerAffect affect_3 ;

  Fasta  rep_5 ;
  Fasta  rep_4 ;
  Fasta  rep_3 ;
  IKmerStore<KmerAffect> *index;

  int delta_min;
  int delta_max;
};


ostream &operator<<(ostream &out, const Germline &germline);


class MultiGermline {
 private:

 public:
  list <Germline*> germlines;

  MultiGermline(Germline *germline);
  MultiGermline(string f_germlines_json);
};



#endif
