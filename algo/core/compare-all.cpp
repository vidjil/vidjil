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

#include "compare-all.h"
#include "tools.h"

SimilarityMatrix compare_all(list <Sequence> sequences, bool min_size,
                             list <string> sequence_names)
{
  SimilarityMatrix matrix(sequences.size());

  if (!sequences.size())
    {
      return matrix ;
    }

  int num = 0 ;

  for (list <Sequence>::const_iterator it1 = sequences.begin();
       it1 != sequences.end(); ++it1 )
  num = 0 ;

  list<string>::const_iterator itLabel = sequence_names.begin();
  for (list <Sequence>::const_iterator it1 = sequences.begin();
       it1 != sequences.end(); ++it1 )
    {
      string seq1 = it1 -> sequence ;

      if (sequence_names.empty())
        matrix.setLabel(num, string_of_int(num+1));
      else {
        matrix.setLabel(num, *itLabel);
        itLabel++;
      }
      
      int num_num = -1 ;

      for (list <Sequence>::const_iterator it2 = sequences.begin();
	   it2 != sequences.end(); ++it2 )
	{
	  if (++num_num < num)
	    {
	      continue ;
	    }

	  string seq2 = it2 -> sequence ;

	  DynProg dp = DynProg(seq1, seq2, DynProg::Local, IdentityDirty);
  
	  int score = dp.compute() ;
	  float identity = identity_percent(score);

	  /*
	  int size = min_size 
	    ? min(seq1.size(), seq2.size())
	    : max(seq1.size(), seq2.size()) ;
	  */
	  
          matrix.setScore(num, num_num, identity);
	  
        }
    
      matrix.setDescription(num++, it1->label);
    }  

  return matrix;
}

