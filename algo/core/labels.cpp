
#include "labels.h"
#include <cmath>
#include <cstdlib>
#include "tools.h"

#include "lib/json.hpp"
using nlohmann::json;


json load_into_map_from_json(map <string, string> &the_map, string json_file)
{
  if (!json_file.size())
    return {};

  cout << "  <== " << json_file << endl ;
  std::ifstream json_file_stream(json_file);

  json j;
  json_file_stream >> j;

  json jj = j["config"]["labels"] ;
  int n = 0;

  for(json::iterator label = jj.begin(); label != jj.end(); ++label) {
    string name = (*label)["name"].get<std::string>();
    string sequence = (*label)["sequence"].get<std::string>();
    the_map[sequence] = name;
    n++ ;
  }

  cout << "  ==> " << n << " labels" << endl;

  return jj;
}

void load_into_map(map <string, string> &the_map, string map_file, string default_value)
{
  // Loads a simple file with key, values into a map
  
  if (!map_file.size())
    return ;

  cout << "  <== " << map_file ;

  ifstream f(map_file.c_str());
      
  if (!f.is_open())
    {
      cout << "  [failed] " << endl ;
    }

  int nb_keys = 0 ;

  while (f.good())
    {
      string line ;
      getline (f, line);

      int i = line.find(" ");
      if (i != (int) string::npos)
	{
	  string key = line.substr(0, i);
	  string value = line.substr(i+1, string::npos);
	  
	  nb_keys++ ;
          if (!value.length())
            value = default_value;

	  the_map[key] = value + (the_map[key].length() ? " " : "") + the_map[key];
	}
    }

  cout << ": " << nb_keys << " elements" << endl ;
}


