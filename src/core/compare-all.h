#include <list>
#include <string>
#include <iostream>
#include <iomanip>

#include "dynprog.h"
#include "fasta.h"
#include "similarityMatrix.h"

SimilarityMatrix compare_all(list <Sequence> sequences, bool min_size,
                             list <string> sequence_names=list<string>());

// bool compare_all(list <Sequence> sequences, bool min_size=false, std::ostream out=std::cout);

