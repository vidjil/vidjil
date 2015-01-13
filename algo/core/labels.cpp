
#include "labels.h"
#include <cmath>
#include <cstdlib>
#include "tools.h"


map <string, string> load_map(string map_file)
{
  // Loads a simple file with key, values into a map
  map <string, string> the_map ;
  
  if (!map_file.size())
    return the_map ;

  cout << "  <== " << map_file ;

  ifstream f(map_file.c_str());
      
  if (!f.is_open())
    {
      cout << "  [failed] " << endl ;
      return the_map ;
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
	  the_map[key] = value + " " + the_map[key];
	}
    }

  cout << ": " << nb_keys << " elements" << endl ;

  return the_map ;
}


