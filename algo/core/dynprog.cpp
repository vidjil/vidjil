/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011, 2012, 2013, 2014, 2015 by Bonsai bioinformatics 
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
*/

#include "dynprog.h"
#include "tools.h"
#include <cassert>
#include <list>
#include <cstdlib>
#include <string>

#define SUBST '|'
#define MISMATCH '.'
#define INSER 'i'
#define DELET 'd'
#define HOMO2X 'h'
#define HOMO2Y 'h'
#define FIN ' '
#define BEGIN 'B'
#define BACKSIZE 120

using namespace std;


Cost::Cost(int match, int mismatch, int indel, int del_end, int homopolymer)
{
  this -> match = match ;
  this -> mismatch = mismatch ;
  this -> insertion = indel ;
  this -> deletion = indel ;
  this -> deletion_end = del_end ;
  this -> homopolymer = (homopolymer == MINUS_INF ? indel: homopolymer);

  this -> open_insertion = this -> open_deletion = MINUS_INF ;
  this -> extend_insertion = this -> extend_deletion = MINUS_INF ;
  this -> affine_gap = false ;
}

Cost::Cost(int match, int mismatch, int open_gap, int extend_gap, int del_end, int homopolymer)
{
  this -> match = match ;
  this -> mismatch = mismatch ;
  this -> insertion = MINUS_INF ;
  this -> deletion = MINUS_INF ;
  this -> deletion_end = del_end ;
  this -> homopolymer = homopolymer ;

  this -> open_insertion = this -> open_deletion = open_gap ;
  this -> extend_insertion = this -> extend_deletion = extend_gap ;
  this -> affine_gap = true ;
}


ostream& operator<<(ostream& out, const Cost& cost)
{
  out << "(" << cost.match 
      << ", " << cost.mismatch
      << "/" << cost.insertion
      << "/" << cost.deletion
      << ", " << cost.open_insertion << cost.extend_insertion
      << "/" << cost.open_deletion << cost.extend_deletion
      << ", " << cost.deletion_end
      << ", " << cost.homopolymer
      << ")" ;
  return out;
}

Cost::Cost()
{
}

int Cost::substitution(char a, char b)
{
  return (a == b) ? match : mismatch ;
}

/*
int Cost::ins(char current, char next)
{
  return (next == current) ? homopolymer : insertion ;
}

int Cost::del(char current, char next)
{
  return (next == current) ? homopolymer : deletion ;
}
*/

int Cost::homo2(char xa, char xb, char y)
{
  return ((xa == xb) && (xb == y)) ? homopolymer : MINUS_INF ;
}


DynProg::DynProg(const string &x, const string &y, DynProgMode mode, const Cost& cost, const bool reverse_x, const bool reverse_y)
{
  this -> x = reverse_x ? reverse(x) : x ;
  this -> y = reverse_y ? reverse(y) : y ;

  this -> reverse_x = reverse_x ;
  this -> reverse_y = reverse_y ;

  m = x.size();
  n = y.size();
  // cout << "Dynprog " << x << "(" << m << ") / " << y << "(" << n << ")" << endl ;

  B = new operation*[m+1];
  for (int i = 0; i <= m; i++) {
    B[i] = new operation[n+1];
  }
  Bins = new operation*[m+1];
  for (int i = 0; i <= m; i++) {
    Bins[i] = new operation[n+1];
  }
  Bdel = new operation*[m+1];
  for (int i = 0; i <= m; i++) {
    Bdel[i] = new operation[n+1];
  }  
  this -> mode = mode;
  this -> cost = cost;

  this -> best_i = -1 ;
  this -> best_j = -1 ;
  this -> first_i = -1 ;
  this -> first_j = -1 ;
  
  gap1=NULL;
  gap2=NULL;
  linkgap=NULL;

  init();
}

DynProg::~DynProg() {

  for (int i = 0; i <= m; i++) {
    delete [] B[i];
    delete [] Bins[i];
    delete [] Bdel[i];
  }
  delete [] B;  
  delete [] Bins;
  delete [] Bdel;  
  delete [] gap1;
  delete [] gap2;
  delete [] linkgap;
}

void DynProg::init()
{
  for (int i=1; i<=m; i++)
    {
      B[i][0].type = INSER ;
      B[i][0].i = i-1 ;
      B[i][0].j = 0 ;
      Bdel[i][0].score = Bins[i][0].score = MINUS_INF ;
    }

  for (int j=1; j<=n; j++)
    {
      B[0][j].type = DELET ;    
      B[0][j].i = 0 ;
      B[0][j].j = j-1 ;
      Bdel[0][j].score = Bins[0][j].score = MINUS_INF ;
    }

  if (mode == Local || mode == LocalEndWithSomeDeletions)
    for (int i=0; i<=m; i++)
      B[i][0].score = 0 ;
  else if (mode == GlobalButMostlyLocal)
    for (int i=0; i<=m; i++)
      B[i][0].score = i * cost.insertion / 2 ;
  else // Global, SemiGlobal
    for (int i=0; i<=m; i++)
      B[i][0].score = i * cost.insertion ;
   
  if (mode == SemiGlobal || mode == SemiGlobalTrans || mode == Local || mode == LocalEndWithSomeDeletions)
    for (int j=0; j<=n; j++)
      B[0][j].score = 0 ;
  else if (mode == GlobalButMostlyLocal)
    for (int j=0; j<=n; j++)
      B[0][j].score = j * cost.deletion / 2 ;
  else // Global
    for (int j=0; j<=n; j++)
      B[0][j].score = j * cost.deletion ;
}

inline void try_operation(operation &best, int type, int i, int j, int score)
{
  if (score > best.score)
    {
      best.type = type ;
      best.i = i ;
      best.j = j ;
      best.score = score ;
    }
}

int DynProg::compute()
{
  best_score = MINUS_INF ;
  best_i = 0 ;
  best_j = 0 ;
  
  operation best ;

  for (int i=1; i<=m; i++)
    for (int j=1; j<=n; j++)
    {
      best.score = MINUS_INF ;

      // The edit operations, with their backtracking information and their score

      // Match, mismatch
      try_operation(best, SUBST, i-1, j-1, B[i-1][j-1].score + cost.substitution(x[i-1], y[j-1]));

      if (!cost.affine_gap)
        {
          // Regular indels
          try_operation(best, INSER, i-1, j  , B[i-1][j  ].score + cost.insertion);
          try_operation(best, DELET, i  , j-1, B[i  ][j-1].score + cost.deletion);
        }
      else
        {
          // Gotoh affine gaps - insertion
          Bins[i][j].score = MINUS_INF ;
          try_operation(Bins[i][j], 'o', i-1, j, B[i-1][j].score + cost.open_insertion);
          try_operation(Bins[i][j], 'x', Bins[i-1][j].i, j, Bins[i-1][j].score + cost.extend_insertion);
          try_operation(best, INSER, Bins[i][j].i, j ,Bins[i][j].score);

          // Gotoh affine gaps - deletions
          Bdel[i][j].score = MINUS_INF ;
          try_operation(Bdel[i][j], 'o', i, j-1, B[i][j-1].score + cost.open_deletion);
          try_operation(Bdel[i][j], 'x', i, Bdel[i][j-1].j, Bdel[i-1][j].score + cost.extend_deletion);
          try_operation(best, DELET, i, Bdel[i][j].j,  Bdel[i][j].score);
        }

      // Homopolymers
      try_operation(best, HOMO2X, i-2, j-1, i > 1 ? B[i-2][j-1].score + cost.homo2(x[i-2], x[i-1], y[j-1]) : MINUS_INF);
      try_operation(best, HOMO2Y, i-1, j-2, j > 1 ? B[i-1][j-2].score + cost.homo2(y[j-2], y[j-1], x[i-1]) : MINUS_INF);
      
      // Local alignment
      if (mode == Local || mode == LocalEndWithSomeDeletions)
	try_operation(best, BEGIN, 0, 0, 0);

      if ((best.type == SUBST) && (x[i-1] != y[j-1]))
        best.type = MISMATCH ;

      // Fill the score and the backtrack information
      B[i][j] = best ;
      
      // cout << " " << i << "," << j << " " << best_op.type << " " <<  best_op.i << "," << best_op.j << " "  << best_op.score << " " << best << endl ;

      if (mode == Local || mode == LocalEndWithSomeDeletions)
	{
	  int tbest = best.score ;

	  if (mode == LocalEndWithSomeDeletions)
	    tbest += cost.deletion_end*(n-j);   
     
	  if (tbest > best_score)
	    {
	      best_score = tbest ;
	      best_i = i ;
	      best_j = j ;
	    }
	    
	  if (best.score == 0){
	    B[i][j].type = FIN;
	  }
	}

      if (mode == Local || mode == LocalEndWithSomeDeletions)
	{
      	  if (best.score == 0){
	    B[i][j].type = FIN;
	  }
	}
      
    }

  // End. Find best_i and best_j, put FIN keywords where the backtrack should stop
  
  if (mode == Local || mode == LocalEndWithSomeDeletions)
    {
      for (int j=0; j<=n; j++){
	B[0][j].type = FIN;
      }
      for (int i=0; i<=m; i++){
	B[i][0].type = FIN;
      }
      
    }
  if (mode == SemiGlobal)
    {
      best_i = m ;
      
      for (int j=1; j<=n; j++)
	if (B[m][j].score > best_score)
	  {
	    best_score = B[m][j].score ;
	    best_j = j ;
	  }
      for (int i=0; i<=m; i++){
	B[i][0].type = FIN;
      }
    }

  if (mode == SemiGlobalTrans)
    {
      best_j = n ;
      
      for (int i=1; i<=m; i++)
	if (B[i][n].score > best_score)
	  {
	    best_score = B[i][n].score ;
	    best_i = i ;
	  }
	  
      for (int i=0; i<=n; i++){
	B[0][i].type = FIN;
      }     
    }

  if ((mode == Global) || (mode == GlobalButMostlyLocal))
    {
      best_i = m ;
      best_j = n ;
      best_score = B[m][n].score;
    }

  if (reverse_x)
    best_i = m - best_i + 1 ;

  if (reverse_y)
    best_j = n - best_j + 1;

  B[0][0].type = FIN;
  
  // In the matrix positions start at 1, but start positions may start at 0
  best_i -= 1;   
  best_j -= 1;

  return best_score ;
}

void DynProg::backtrack()
{
  // Tables for displaying the alignment
  gap1 = new int[x.size()+1];
  linkgap = new int[x.size()+1];
  gap2 = new int[y.size()+1];
      
  for (unsigned int i = 0; i <=x.size(); i++) {
    gap1[i] = 0;
    linkgap[i] = 0;
  }
  for (unsigned int i = 0; i <= y.size(); i++) {
    gap2[i] = 0;
  }
  
  
  int g1=x.size();
  int g2=y.size();
  
  int i=best_i+1;
  int j=best_j+1;

  // Compute backtrack strings
  
  ostringstream back_x;
  ostringstream back_y;
  ostringstream back_tr;
  
  while (1) {

    if ((i<0) || (j<0))
      { 
        cout << "Invalid backtrack: " << i << "," << j << endl ;
        exit(1);
      }

    if  (B[i][j].type == FIN)
      break ;
      
    // cout << "bt " << i << "/" << j << " " << B[i][j].type << " " << B[i][j].i << "," << B[i][j].j << endl ;
    
    int next_i = B[i][j].i;
    int next_j = B[i][j].j;

    // The maximum number of characters implied by this operation
    int max_k = max(i - next_i, j - next_j);
      
    for (int k=0; k<max_k; k++)
      {
        linkgap[g1]=g2;

        // Some character(s) from x, then fill with spaces
        if (i-k > next_i)
          {
            back_x << x[i-1-k];
            g1--;
          }
        else
          {
            back_x << " " ;
            gap1[g1]++ ;
          }

        // Some character(s) from y, then fill with spaces
        if (j-k > next_j)
          {
            back_y << y[j-1-k];
            g2--;
          }
        else
          {
            back_y << " " ;
            gap2[g2]++ ;
          }

        // The operation character, then fill with spaces
        if (k == max_k-1)          
          back_tr << B[i][j].type ;
        else
          back_tr << " " ;
      }
    
    i = next_i;
    j = next_j;
  }

  // Format backtrack strings
  
  string str1, str2, str3;
  str1 = back_x.str();
  str1 =string (str1.rbegin(), str1.rend());
  str1 = str1;
  str2=back_tr.str();
  str2 = string (str2.rbegin(), str2.rend());
  str3 = back_y.str();
  str3 = string (str3.rbegin(), str3.rend());

  ostringstream back;    
  back << setw(3) << i   << " " << str1.substr(0, BACKSIZE-8) << endl;
  back << setw(3) << " " << " " << str2.substr(0, BACKSIZE-8) << endl;
  back << setw(3) << j   << " " << str3.substr(0, BACKSIZE-8) << endl << endl;
  for (size_t k=0 ; (BACKSIZE-8+k*BACKSIZE)< str1.length() ; k++){
    back << str1.substr(BACKSIZE-8+k*BACKSIZE, BACKSIZE) << endl;
    back << str2.substr(BACKSIZE-8+k*BACKSIZE, BACKSIZE) << endl;
    back << str3.substr(BACKSIZE-8+k*BACKSIZE, BACKSIZE) << endl << endl;
  }
  back << "score: " << best_score << endl;
  
  first_i=i;
  first_j=j;
  
  str_back=back.str();

  // cout << str_back << endl ;
}


float identity_percent(int score)
{
  int match = (score + IdentityDirty.match/2) / IdentityDirty.match ;

  int mismatch = (score - match * IdentityDirty.match) / IdentityDirty.mismatch ;

  float pcent = (100. * (float) match) / (match + mismatch) ;

  // cout << score << "  " << match << "  " << mismatch << "  " << pcent << endl ; 

  return pcent ;
}


ostream& operator<<(ostream& out, const DynProg& dp)
{
  out << "       " ;

  for (int j=0; j<dp.n; j++)
    out << setw(4) << dp.y[j] << " ";

  out << endl ;

  for (int i=0; i<=dp.m; i++)
    {
      if (i)
	out << dp.x[i-1] << " " ;
      else
	out << "  " ;

      for (int j=0; j<=dp.n; j++)
        {
          if (dp.B[i][j].score)
            out << setw(4) << dp.B[i][j].score << dp.B[i][j].type ;
          else
            out << "    " << dp.B[i][j].type ;
        }
      out << endl ;      
    }
  
  out << "best: " << dp.best_i << "," << dp.best_j << endl;

  return out ;
}


Cost strToCost(string str, Cost default_cost){

  if (str.length()!=0){
    string::size_type stTemp = str.find(',');
	  
    std::list<int> val;
    
    while(stTemp != string::npos)
    {
	  val.push_back(atoi(str.substr(0, stTemp).c_str() ) );
	  str = str.substr(stTemp + 1);
	  stTemp = str.find(',');
    }
    val.push_back(atoi(str.c_str() ) );

    if (val.size()==5){ 
      int val1=val.front();
      val.pop_front();
      int val2=val.front();
      val.pop_front();
      int val3=val.front();
      val.pop_front();
      int val4=val.front();
      val.pop_front();
      int val5=val.front();
      val.pop_front();
      Cost result = Cost(val1, val2, val3, val4, val5);
      cout << "use custom Cost "<< result << endl;
      return result;
    }
    
    cout << "incorrect Cost format, use default "<< default_cost<<endl;
  }
  
  return default_cost;
}



