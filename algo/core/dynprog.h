#ifndef DYNPROG_H
#define DYNPROG_H

#include <string>
#include <vector>

#include <iostream>
#include <iomanip>


#define MINUS_INF -9999

using namespace std;


float identity_percent(int score);

typedef struct {
  char type;
  int i;
  int j;
  int score;
} operation;


class Cost
{
 public:
  int match;
  int mismatch;

  /**
   * @param homopolymer: if MINUS_INF => same score as indel 
   */

  // del_end -> utilise seulement pour LocalEndWithSomeDeletions
  Cost (int match, int mismatch, int indel, int del_end = 0, int homopolymer = MINUS_INF);
  Cost ();

  int insertion;
  int deletion;
  int deletion_end;
  int homopolymer;
  int substitution(char a, char b);
  //int ins(char current, char next);
  //int del(char current, char next);
  int homo2(char xa, char xb, char y);

  int open_insertion;
  int open_deletion;
  int extend_insertion;
  int extend_deletion;

  bool affine_gap;
};


ostream& operator<<(ostream& out, const Cost& cost);


/* const Cost DNA = Cost(+5, -4, -10); */
/* const Cost VDJ = Cost(+5, -8, -8, -1); */

const Cost DNA = Cost(+5, -4, -10, 0, 0);
const Cost VDJ = Cost(+4, -6, -10, -1, -2);
const Cost Identity = Cost(+1, -1, -1, 0, 0);

const Cost Homopolymers = Cost(+1, MINUS_INF, -1); // TODO: true homopolymer
const Cost IdentityToto= Cost(+1, -1, -1); // avec seuil de length-2: un homopoly xou une substituion
/* const Cost Identity = Cost(+1, 0, 0); */
const Cost IdentityDirty = Cost(+1000, -1, -1); // pour avoir une estimation de longueur de l'alignement, utilise dans compare-all
const Cost Hamming = Cost(0, -1, MINUS_INF);
const Cost Levenshtein = Cost(0, -1, -1);
const Cost Cluster = Cost(+1, -4, -4, 0, 0);

//const Cost Hamming = Cost();

class DynProg
{
 public:
  enum DynProgMode {
    Local,            // partial x / partial y
    LocalEndWithSomeDeletions, // local + some deletions on __
    SemiGlobalTrans,  // start-to-partial x / partial-to-end y 
    SemiGlobal,       // complete x / partial y
    GlobalButMostlyLocal,  // complete x / complete y, but deletions at begin (DONE) and end (TODO) are cheaper
    Global            // complete x / complete y
  } ;

  DynProgMode mode ;
  Cost cost;

 private:
  string x ;
  string y ;
  int m ;
  int n ;
  bool reverse_x ;
  bool reverse_y ;

 public:
  int best_score ;
  int best_i ;                  /* Start at 1 */
  int best_j ;                  /* Start at 1 */
  int first_i ;                 /* Start at 1 */
  int first_j ;                 /* Start at 1 */
  string str_back ;

  DynProg(const string &x, const string &y, DynProgMode mode, const Cost &c, const bool reverse_x=false, const bool reverse_y=false);
  ~DynProg();
  void init();
  int compute();
  void backtrack();
  void SemiGlobal_hits_threshold(vector<int> &hits, int threshold, int shift_pos, int verbose);

  string SemiGlobal_extract_best();

  friend ostream& operator<<(ostream& out, const DynProg& dp);
  
  operation **B;  // Score and backtrack matrix
  operation **Bins ; // affine gap
  operation **Bdel ; // affine gap
  int *gap1 ;
  int *linkgap ;
  int *gap2 ;

};

ostream& operator<<(ostream& out, const DynProg& dp);

Cost strToCost(string str, Cost default_cost);

#endif

