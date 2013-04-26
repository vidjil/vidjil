#include <map>
#include "fasta.h"
#include "dynprog.h"


void cut(Sequence read, vector<Sequence> primers, int verbose,
	 map <string, int> &stats,
	 const Cost cutCost, const int cutRelativeThreshold);
// ostream cut_file);




