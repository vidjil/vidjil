
#include <map>
#include <string>
#include <fstream>
#include <iostream>
#include <list>
#include "bioreader.hpp"

void load_into_map(map <string, string> &the_map, string map_file, string default_value);
json load_into_map_from_json(map <string, string> &the_map, string json_file);
