using namespace std;
#include <map>
#include <string>
#include <fstream>
#include <iostream>
#include <list>

map <string, string> load_map(string map_file);
map <string, pair <string, float> > load_map_norm(string map_file);


list< pair <int, float> > compute_normalization_list(list<pair <string, int> > sort_all_windows, 
						     map <string, pair <string, float> > normalization,
						     int total
						     );

float compute_normalization(list< pair <int, float> > norm_list, int nb_reads);
