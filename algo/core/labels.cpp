/*
  This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>
  Copyright (C) 2011, 2012, 2013 by Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
  Contributors: Mathieu Giraud <mathieu.giraud@lifl.fr>, Mikaël Salson <mikael.salson@lifl.fr>

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


