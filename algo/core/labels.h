using namespace std;
#include <map>
#include <string>
#include <fstream>
#include <iostream>
#include <list>
#include "fasta.h"

map <string, string> load_map(string map_file);
map <string, pair <string, float> > load_map_norm(string map_file);


list< pair <float, int> > compute_normalization_list(map<string, list<Sequence> > &seqs_by_window,
						     map <string, pair <string, float> > normalization,
						     int total
						     );

float compute_normalization_one(list< pair <float, int> > norm_list, int nb_reads);
float compute_normalization(list< pair <float, int> > norm_list, int nb_reads);
