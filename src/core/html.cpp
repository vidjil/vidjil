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

#include "html.h"


string spanify_alignment(string class_name, string what)
{
  string res = "";

  for (std::string::iterator it = what.begin(), end = what.end(); it != end; ++it)
    {
      if ((*it) == ' ' || (*it) == '-')
	res += *it ;

      else
	res += "<span class='" + class_name + "'>" + *it + "</span>" ;
    }

  return res ;
}


string spanify_alignment_pos(string class_name_V, int left,
			     string class_name_N1, int left2,
			     string class_name_D, int right2,			     
			     string class_name_N2, int right,
			     string class_name_J,
			     string what)
{
  string res = "";
  int num = 0 ;

  for (std::string::iterator it = what.begin(), end = what.end(); it != end; ++it)
    {
      if ((*it) == ' ' || (*it) == '-')
	res += *it ;

      else
	{
	  num += 1 ;
	  string class_name = ((num <= left) ? class_name_V : 
			     ((num <= left2) ? class_name_N1 : 
			     ((num <= right2) ? class_name_D : 
			     ((num <= right) ? class_name_N2 : 
			     class_name_J)))) ;
	  res += "<span class='" + class_name + "'>" + *it + "</span>" ;
	}
    }
  
  return res ;
}
