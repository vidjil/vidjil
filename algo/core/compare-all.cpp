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

#include "compare-all.h"
#include "tools.h"

SimilarityMatrix compare_all(list <Sequence> sequences,
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

          matrix.setScore(num, num_num, identity);
	  
        }
    
      matrix.setDescription(num++, it1->label);
    }  

  return matrix;
}

/*Function which permit to compare all windows in windowsStorage*/
SimilarityMatrix compare_windows(WindowsStorage &windowsStorage, const Cost theCost, int nb_clones) {

    //Creation of a nb_clones matrix
    SimilarityMatrix matrix(nb_clones);

    if (windowsStorage.size() == 0)
        return matrix;

    //Creation of a pair list, which contains junctions/windows (index) and the number of occurences of this (value)
    list<pair <junction, size_t> > sortedList = windowsStorage.getSortedList();

    //Positions of the array
    int positionIt1 = 0;
    int positionIt2 = 0;

    //Process of the junctions (windows)
    for (list<pair <junction, size_t> >:: const_iterator it1 = sortedList.begin();
        it1 != sortedList.end(); ++it1) {

        //We save the name of the junction
        string win1 = it1->first;

        //We compute & save only clones it the position is lower than the number of clones we want
        if (positionIt1 >= nb_clones) break;

        //Process of the second junctions
        for (list<pair <junction, size_t> >:: const_iterator it2 = sortedList.begin();
        it2 != sortedList.end(); ++it2) {

            string win2 = it2->first;

            //We compute only distances when first position is lower than the second
            if (positionIt1 < positionIt2) {

                if (positionIt2 < nb_clones) {

                //Compute all the windows, globally
                DynProg dp = DynProg(win1, win2, DynProg::Global, theCost);

                //Compute the score by dynamic programming
                float score = dp.compute();

                //To debug
                /*dp.backtrack();
                cout << dp.str_back;*/

                //Put the score at position1 / position2 of the array
                matrix.setScore(positionIt1, positionIt2, score);

                }

                else break;

            }

            positionIt2++;
        }

        positionIt1++;
        positionIt2 = 0;

    }

    return matrix;
}
