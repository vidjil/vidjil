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

#include "similarityMatrix.h"
#include <cassert>
#include <limits>
#include <math.h>

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

OutputSimilarityMatrix::OutputSimilarityMatrix(SimilarityMatrix &m, float sim, int max_display):matrix(m), sim(sim), max_display(max_display){}


float OutputSimilarityMatrix::similarity() const {
  return sim;
}

int OutputSimilarityMatrix::maxDisplayed() const {
  return max_display;
}

RawOutputSimilarityMatrix::RawOutputSimilarityMatrix(SimilarityMatrix &m, float sim, int max_display) : OutputSimilarityMatrix(m, sim, max_display) {}

JsonOutputSimilarityMatrix::JsonOutputSimilarityMatrix(SimilarityMatrix &m, float sim, int max_display) : OutputSimilarityMatrix(m, sim, max_display) {}

JsonOutputWindowsMatrix::JsonOutputWindowsMatrix(SimilarityMatrix &m, float sim, int max_display) : OutputSimilarityMatrix(m, sim, max_display) {}

ostream &operator<<(ostream &out, const RawOutputSimilarityMatrix &outputMatrix) {
  SimilarityMatrix &matrix = outputMatrix.matrix;
  out << "    | " ;

  for (int num = 0; num <  matrix.size(); num++) 
    if (num <= outputMatrix.maxDisplayed())
      out << setw(4) << matrix.label(num) << " " ;

  out << endl ;

  for (int num = 0; num <  matrix.size(); num++) {
    if (num <= outputMatrix.maxDisplayed())
      out << setw(3) << matrix.label(num) << " | " ;
    

    for (int num_num = 0; num_num < matrix.size(); num_num++ )
      {
        
        if (num_num < num)
          {
            if ((num <= outputMatrix.maxDisplayed()) && (num_num <= outputMatrix.maxDisplayed()))
              out << "     " ;
            continue ;
          }
        
        if (num_num <= outputMatrix.maxDisplayed())
          {
            out << setw(4) << (int)matrix(num, num_num) ;
	    
            if ((matrix(num, num_num) >= outputMatrix.similarity()) 
                && (num_num > num)) 
              out << "!"  ;
            else
              out << " " ;
          }
      }

    if (num <= outputMatrix.maxDisplayed())
      {
        out << "   " << matrix.description(num) ;
        out << endl ;	  
      }
  }


  return out;
}

/*Export a similarity matrix, for the edit distance distribution & DBSCAN algorithm
*/
JsonArray &operator<<(JsonArray &out, const JsonOutputSimilarityMatrix &outputMatrix) {

    SimilarityMatrix &matrix = outputMatrix.matrix;
    for (int i = 0; i < matrix.size(); i++) {
        for (int j = 0; j < matrix.size(); j++) {
            if (i < j) {
                //Creation of an edges objects array, which contains a source objet, a target object, and the length of the distance between them
                JsonList lineEdge;
                lineEdge.add("source", i);
                lineEdge.add("target", j);
                //100 - similarity -> distance
                lineEdge.add("len", (100 - matrix(i,j)));
                out.add(lineEdge);
            }
        }
    }
    return out;
}

/* Export Levenshtein distances matrix, for the edit distance distribution & DBSCAN algorithm
*/
JsonArray &operator<<(JsonArray &out, const JsonOutputWindowsMatrix &outputMatrix) {

    SimilarityMatrix &matrix = outputMatrix.matrix;
    for (int i = 0; i < matrix.size(); i++) {
        for (int j = 0; j < matrix.size(); j++) {
            if (i < j) {
                //Creation of an edges objects array, which contains a source objet, a target object, and the length of the distance between them
                JsonList lineEdge;
                lineEdge.add("source", i);
                lineEdge.add("target", j);
                //absolute value of the score -> distance
                lineEdge.add("len", fabs(matrix(i,j)));
                out.add(lineEdge);
            }
        }
    }
    return out;
}
