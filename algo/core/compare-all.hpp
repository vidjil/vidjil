#ifndef COMPARE_ALL_HPP
#define COMPARE_ALL_HPP

#include "compare-all.h"

/*Function which permit to compare all windows in windowsStorage*/
template <typename A>
SimilarityMatrix compare_windows(WindowsStorage<A> &windowsStorage, const Cost theCost, int nb_clones) {

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
                matrix.setScore(positionIt2, positionIt1, score);

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

#endif
