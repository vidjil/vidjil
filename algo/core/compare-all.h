#include <list>
#include <string>
#include <iostream>
#include <iomanip>

#include "dynprog.h"
#include "fasta.h"
#include "similarityMatrix.h"
#include "windows.h"

SimilarityMatrix compare_all(list <Sequence> sequences, bool min_size,
                             list <string> sequence_names=list<string>());

/*Object to compare windows to build a distances matrix between windows
@param windowsStorage: The object which contains windows
@param theCost: The cost to add for the dynamic programming
@param nb_clones: The number of clones to take on board to build the matrix*/
SimilarityMatrix compare_windows(WindowsStorage &windowsStorage, const Cost theCost, int nb_clones);

// bool compare_all(list <Sequence> sequences, bool min_size=false, std::ostream out=std::cout);
