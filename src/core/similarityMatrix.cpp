/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>

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

#include "similarityMatrix.h"
#include <cassert>
#include <limits>

SimilarityMatrix::SimilarityMatrix(int n):n(n),labels(n),descriptions(n) {
  assert(n >= 0);
  scores = new float*[n];
  for (int i=0; i < n; i++) {
    scores[i] = new float[n];
    for (int j = 0; j < n; j++) 
      scores[i][j] = 0;
  }
  maxV = -1;
  minV = numeric_limits<float>::infinity();
}

SimilarityMatrix::~SimilarityMatrix() {
  for (int i=0; i < n; i++) {
    delete [] scores[i];
  } 
  delete [] scores;
}

// Queries
string SimilarityMatrix::description(int i) const{
  assert(i >= 0 && i < n);
  return descriptions[i];
}

string SimilarityMatrix::label(int i) const {
  assert(i >= 0 && i < n);
  return labels[i];
}

float SimilarityMatrix::max() const {
  return maxV;
}

float SimilarityMatrix::min() const {
  return minV;
}

int SimilarityMatrix::size() const {
  return n;
}

float SimilarityMatrix::operator()(int i, int j) const{
  assert(i >= 0 && i < n && j >= 0 && j < n);
  return scores[i][j];
}

  // Commands
void SimilarityMatrix::setDescription(int i, string description) {
  assert(i >= 0 && i < n);
  descriptions[i] = description;
}

void SimilarityMatrix::setLabel(int i, string label) {
  assert(i >= 0 && i < n);
  labels[i] = label;
}

void SimilarityMatrix::setScore(int i, int j, float score) {
  // cout << "i = " << i << ", j = " << j << ", n = " << n << endl;
  assert(i >= 0 && i < n && j >= 0 && j < n);
  scores[i][j] = score;
  if (i != j) {
    if (score < minV) {
      minV = score;
    }
    if (score > maxV) {
      maxV = score;
    }
  }
}

OutputSimilarityMatrix::OutputSimilarityMatrix(SimilarityMatrix &m, float sim):matrix(m), sim(sim){}


float OutputSimilarityMatrix::similarity() const {
  return sim;
}

RawOutputSimilarityMatrix::RawOutputSimilarityMatrix(SimilarityMatrix &m, float sim) : OutputSimilarityMatrix(m, sim) {}

HTMLOutputSimilarityMatrix::HTMLOutputSimilarityMatrix(SimilarityMatrix &m, float sim) : OutputSimilarityMatrix(m, sim) {}



ostream &operator<<(ostream &out, const RawOutputSimilarityMatrix &outputMatrix) {
  SimilarityMatrix &matrix = outputMatrix.matrix;
  out << "    | " ;

  for (int num = 0; num <  matrix.size(); num++) 
    if (num <= LIMIT_DISPLAY)
      out << setw(4) << matrix.label(num) << " " ;

  out << endl ;

  for (int num = 0; num <  matrix.size(); num++) {
    if (num <= LIMIT_DISPLAY)
      out << setw(3) << matrix.label(num) << " | " ;
    

    for (int num_num = 0; num_num < matrix.size(); num_num++ )
      {
        
        if (num_num < num)
          {
            if ((num <= LIMIT_DISPLAY) && (num_num <= LIMIT_DISPLAY))
              out << "     " ;
            continue ;
          }
        
        if (num_num <= LIMIT_DISPLAY)
          {
            out << setw(4) << (int)matrix(num, num_num) ;
	    
            if ((matrix(num, num_num) >= outputMatrix.similarity()) 
                && (num_num > num)) 
              out << "!"  ;
            else
              out << " " ;
          }
      }

    if (num <= LIMIT_DISPLAY)
      {
        out << "   " << matrix.description(num) ;
        out << endl ;	  
      }
  }


  return out;
}

ostream &operator<<(ostream &out, const HTMLOutputSimilarityMatrix &outputMatrix) {
  SimilarityMatrix &matrix = outputMatrix.matrix;
  out << "<table class='similarityMatrix'>"
      << "<thead><tr>" ;

  out << "<th />";
  for (int num = 0; num <  matrix.size(); num++) 
    if (num <= LIMIT_DISPLAY)
      out << "<th>" << matrix.label(num) << "</th>" ;

  out << "</tr></thead>" << endl ;
  out << "<tbody>";

  for (int num = 0; num <  matrix.size(); num++) {
    if (num <= LIMIT_DISPLAY)
      out << "<tr><td class='index'>" << matrix.label(num) << "</td>" ;
    

    for (int num_num = 0; num_num < matrix.size(); num_num++ )
      {
        
        if (num_num < num)
          {
            if ((num <= LIMIT_DISPLAY) && (num_num <= LIMIT_DISPLAY))
              out << "<td />" ;
            continue ;
          }
        
        if (num_num <= LIMIT_DISPLAY)
          {
            bool highSim = (matrix(num, num_num) >= outputMatrix.similarity()) 
                            && (num_num > num);
            out << "<td" << (highSim ? " class='highSimilarity' " : "" ) << ">"
                << (int)matrix(num, num_num) << "</td>";
          }
      }

    if (num <= LIMIT_DISPLAY)
      {
        out << "  <td class='label'>" << matrix.description(num) << "</td>" ;
        out << "</tr>" << endl ;	  
      }
  }

  out << "</tbody>";
  out << "</table>" << endl << endl;


  return out;
}
