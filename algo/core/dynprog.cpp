/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>, Marc Duez

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

#define SUBST 0
#define INSER 1
#define DELET 2
#define HOMO2X 3
#define HOMO2Y 4
#define FIN 5
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
}


ostream& operator<<(ostream& out, const Cost& cost)
{
  out << "(" << cost.match 
      << ", " << cost.mismatch
      << "/" << cost.insertion
      << "/" << cost.deletion
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

  S = new int*[m+1];
  for (int i = 0; i <= m; i++) {
    S[i] = new int[n+1];
  }
  
  B = new int**[m+1];
  for (int i = 0; i <= m; i++) {
    B[i] = new int*[n+1];
    for (int j = 0; j <= n; j++) {
      B[i][j] = new int[3];
    }
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
    delete [] S[i];
  }
  delete [] S;
  
  for (int i = 0; i <= m; i++) {
    for (int j = 0; j <= n; j++) {
      delete [] B[i][j];
    }
  }
  for (int i = 0; i <= m; i++) {
    delete [] B[i];
  }
  delete [] B;
  
  delete [] gap1;
  delete [] gap2;
  delete [] linkgap;
}

void DynProg::init()
{ 
  if (mode == Local || mode == LocalEndWithSomeDeletions)
    for (int i=0; i<=m; i++)
      S[i][0] = 0 ;
  else if (mode == GlobalButMostlyLocal)
    for (int i=0; i<=m; i++)
      S[i][0] = i * cost.insertion / 2 ;
  else // Global, SemiGlobal
    for (int i=0; i<=m; i++)
      S[i][0] = i * cost.insertion ;
   
  if (mode == SemiGlobal || mode == SemiGlobalTrans || mode == Local || mode == LocalEndWithSomeDeletions)
    for (int j=0; j<=n; j++)
      S[0][j] = 0 ;
  else if (mode == GlobalButMostlyLocal)
    for (int j=0; j<=n; j++)
      S[0][j] = j * cost.deletion / 2 ;
  else
    for (int j=0; j<=n; j++)
      S[0][j] = j * cost.deletion ;
}

int DynProg::compute()
{
  best_score = MINUS_INF ;

  for (int i=1; i<=m; i++)
    for (int j=1; j<=n; j++)
    {
      int subst = S[i-1][j-1] + cost.substitution(x[i-1], y[j-1]);

      int inser = S[i-1][j] + cost.insertion;
      int delet = S[i][j-1] + cost.deletion;
      
      // Also dealing with homopolymers (in a dirty way!)
      // int inser = S[i-1][j] + (i > 1 ? cost.ins(x[i-2], x[i-1]) : cost.ins(0,1));
      // int delet = S[i][j-1] + (j > 1 ? cost.del(y[j-2], y[j-1]) : cost.del(0,1));

      int best = max(max(subst, inser), delet);

      // Homopolymers (2 <-> 1)
      int homo2x = i > 1 ? S[i-2][j-1] + cost.homo2(x[i-2], x[i-1], y[j-1]) : MINUS_INF ;
      int homo2y = j > 1 ? S[i-1][j-2] + cost.homo2(y[j-2], y[j-1], x[i-1]) : MINUS_INF ;
      best = max(max(homo2x, homo2y), best);
      
      if (mode == Local || mode == LocalEndWithSomeDeletions)
	{
	  best = max(0, best); 

	  int tbest = best ;

	  if (mode == LocalEndWithSomeDeletions)
	    tbest += cost.deletion_end*(n-j);   
     
	  if (tbest > best_score)
	    {
	      best_score = tbest ;
	      best_i = i ;
	      best_j = j ;
	    }
	    
	  if (best == 0){
	    B[i][j][2] = FIN;
	  }
	}
      
      S[i][j] = best ;
      
      if (best==subst){
	B[i][j][0] = i-1 ;
	B[i][j][1] = j-1 ;
	B[i][j][2] = SUBST ;
      }
      if (best==inser){
	B[i][j][0] = i-1 ;
	B[i][j][1] = j ;
	B[i][j][2] = INSER ;
      }
      if (best==delet){
	B[i][j][0] = i ;
	B[i][j][1] = j-1 ;
	B[i][j][2] = DELET ;
      }
      if (best==homo2x){
	B[i][j][0] = i-2 ;
	if (B[i][j][0] < 0) B[i][j][0] = 0 ;
	B[i][j][1] = j-1 ;
	B[i][j][2] = HOMO2X ;
      }
      if (best==homo2y){
	B[i][j][0] = i-1 ;
	B[i][j][1] = j-2 ;
	if (B[i][j][1] < 0) B[i][j][1] = 0 ;
	B[i][j][2] = HOMO2Y ;
      }

      
      if (mode == Local || mode == LocalEndWithSomeDeletions)
	{
      	  if (best == 0){
	    B[i][j][2] = FIN;
	  }
	}
      
    }

  if (mode == Local || mode == LocalEndWithSomeDeletions)
    {
      for (int i=0; i<=n; i++){
	B[0][i][2] = FIN;
      }
      for (int i=0; i<=m; i++){
	B[i][0][2] = FIN;
      }
      
    }
  if (mode == SemiGlobal)
    {
      best_i = m ;
      
      for (int j=1; j<=n; j++)
	if (S[m][j] > best_score)
	  {
	    best_score = S[m][j] ;
	    best_j = j ;
	  }
      for (int i=1; i<=n; i++){
	B[0][i][0] = 0 ;
	B[0][i][1] = i-1 ;
	B[0][i][2] = DELET;
      }
      for (int i=0; i<=m; i++){
	B[i][0][2] = FIN;
      }
    }

  if (mode == SemiGlobalTrans)
    {
      best_j = n ;
      
      for (int i=1; i<=m; i++)
	if (S[i][n] > best_score)
	  {
	    best_score = S[i][n] ;
	    best_i = i ;
	  }
	  
      for (int i=0; i<=n; i++){
	B[0][i][2] = FIN;
      }
      for (int i=0; i<=m; i++){
	B[i][0][0] = i-1 ;
	B[i][0][1] = 0 ;
	B[i][0][2] = INSER;
      }
    }


  if ((mode == Global) || (mode == GlobalButMostlyLocal))
    {
      best_i = m ;
      best_j = n ;
      best_score = S[m][n];

      for (int i=0; i<=m; i++){
	B[i][0][0] = i-1 ;
	B[i][0][1] = 0 ;
	B[i][0][2] = INSER;
      }
      for (int i=1; i<=n; i++){
	B[0][i][0] = 0 ;
	B[0][i][1] = i-1 ;
	B[0][i][2] = DELET;
      }
      B[0][0][2] = FIN;
    }

  if (reverse_x)
    best_i = m - best_i + 1 ;

  if (reverse_y)
    best_j = n - best_j + 1;

  // In the matrix positions start at 1, but start positions may start at 0
  best_i -= 1;   
  best_j -= 1;

  return best_score ;
}

void DynProg::backtrack()
{
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
  
  int ti=best_i+1;
  int tj=best_j+1;
  int tmpi, tmpj;
  tmpi=ti;
  tmpj=tj;
  
  str_back = "";
  string str1, str2, str3;
  
  ostringstream back_s1;
  ostringstream back_s2;
  ostringstream back_tr;
  ostringstream back;
  
  
  while ( B[ti][tj][2] != FIN ){
    
    tmpi=B[ti][tj][0];
    tmpj=B[ti][tj][1];

    if (B[ti][tj][2] == SUBST ){
      linkgap[g1]=g2;
      back_s1 << x[ti-1];
      g1--;
      back_s2 << y[tj-1];
      g2--;

      if(x[ti-1]==y[tj-1]) {
	back_tr << "|";
      }else{
	back_tr << ":";
      }
      
    }
    if (B[ti][tj][2] == INSER ){
      linkgap[g1]=g2;
      back_s1 << x[ti-1];
      g1--;
      back_s2 << " ";
      gap2[g2]++;
      back_tr << ".";
      
    }
    if (B[ti][tj][2] == DELET){
    linkgap[g1]=g2;
      back_s1 << " ";
      gap1[g1]++;
      back_s2 << y[tj-1];
      g2--;
      back_tr << ".";
      
    }
    if (B[ti][tj][2] == HOMO2X ){
      linkgap[g1]=g2;
      back_s1 << x[ti-1] << x[ti-2];
      g1--;
      linkgap[g1]=g2;
      g1--;
      back_s2  << " " << y[tj-1];
      gap2[g2]++;
      g2--;
      back_tr << " h";

    }
      
    if (B[ti][tj][2] == HOMO2Y ){
    linkgap[g1]=g2;
      back_s1 << " " << x[ti-1] ;
      gap1[g1]++;
      g1--;
      back_s2 <<  y[tj-1] << y[tj-2] ;
      g2--;
      g2--;
      back_tr << " h";
    }
    
    ti=tmpi;
    tj=tmpj;
  }

  str1=back_s1.str();
  str1 =string (str1.rbegin(), str1.rend());
  str1 = str1;
  str2=back_tr.str();
  str2 = string (str2.rbegin(), str2.rend());
  str3=back_s2.str();
  str3 = string (str3.rbegin(), str3.rend());
  
  back << ti <<	"  >>	" << str1.substr(0, BACKSIZE-8) << endl;
  back << " diff	" << str2.substr(0, BACKSIZE-8) << endl;
  back << tj <<	"  >>	" << str3.substr(0, BACKSIZE-8) << endl << endl;
  for (size_t k=0 ; (BACKSIZE-8+k*BACKSIZE)< str1.length() ; k++){
    back << str1.substr(BACKSIZE-8+k*BACKSIZE, BACKSIZE) << endl;
    back << str2.substr(BACKSIZE-8+k*BACKSIZE, BACKSIZE) << endl;
    back << str3.substr(BACKSIZE-8+k*BACKSIZE, BACKSIZE) << endl << endl;
  }
  
  first_i=ti;
  first_j=tj;
  
  str_back=back.str();

  // cout << str_back << endl ;
}

string DynProg::SemiGlobal_extract_best()
{
  // for count

  // TODO: faire un vrai backtrack

  // marche avec Identity, prend quelques caracteres avant (+ best_score)
  int start_j = max(0, best_j - m + best_score) ;

  return y.substr(start_j, best_j - start_j);
}

void DynProg::SemiGlobal_hits_threshold(vector <int> &hits, int threshold, int shift_pos, int verbose)
{
  // for cut
    
  for (int j=1; j<=n; j++)
    {
      if (S[m][j] > threshold)
	{
	  if (verbose)
	    {
	      cout << j << "," ;
	    }
	  hits.push_back(max(0, j - shift_pos)) ;
	}
    }
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
	out << setw(4) << dp.S[i][j] << " ";

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



