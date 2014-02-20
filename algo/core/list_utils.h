#ifndef LIST_UTILS_H
#define LIST_UTILS_H

#include <list>

using namespace std;

/**
 * @param l: list of elements
 * @param count: number of elements to keep in the list
 * @pre count > 0
 * @return a list of <count> elements that is composed of the first elements of l
 */
template <class T>
list<T> keep_n_first(list<T> l, size_t count) {
  size_t i = 0;
  typename list<T>::iterator it = l.begin();
  for (; it != l.end() && i < count ; it++)
    count++;

  return list<T>(l.begin(), it);
}

#endif

