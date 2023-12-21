# -*- coding: utf-8 -*-

import pickle

class DictionaryObject(object):
    """
    A class that has all the functionality of a normal Python dictionary, except
    for the fact it is itself immutable.  It also has the added feature of
    being able to lookup values by using keys as attributes.

    The reason for the class being immutable by default is to help make it a
    little easier to use in multiprocessing situations.  Granted, the underlying
    values themselves are not deeply copied, but the aim is to enforce some
    ensurances of immutability on the container class.

    When using positional arguments, the first argument must always be something
    that would be a valid argument for a dict().  However, a second, optional
    argument may be passed to create a default value when keys are not found.
  
    Examples:
    >>> d = DictionaryObject({'a':1, 'b':True, 3:'x'})
    >>> d.a == 1
    True
    >>> d.b
    True
    >>> d[3] == 'x'
    True
    
    >>> d = DictionaryObject((('a',1),('b',2)))
    >>> d.a == 1
    True
    >>> d.b == 2
    True
    
    >>> d = DictionaryObject({'a':1, 'b':True}, None)
    >>> d.a == 1
    True
    >>> d.b
    True
    >>> d.c
    
    >>> d = DictionaryObject({'a':1}, None)
    >>> m = MutableDictionaryObject(d)
    >>> d == m
    True
    >>> m.a = 0
    >>> d == m
    False
    >>> d != m
    True
  
    >>> import pickle
    >>> m1 = MutableDictionaryObject({'a':1}, None)
    >>> m2 = pickle.loads(pickle.dumps(m1))
    >>> m1 == m2
    True
    >>> m1.a = 3
    >>> m1 == m2
    False
    >>> m1.a == 3
    True
    >>> m1['c'] = 5
    >>> m1['c']
    5
    """
    
    def __init__(self, contents=(), *args, **kwargs):
        """
        Take as input a dictionary-like object and return a DictionaryObject.
        It also makes sure any keys containing dictionaries are also converted
        to DictionaryObjects.
        """
        super(DictionaryObject, self).__init__()
        if isinstance(contents, DictionaryObject):
            self.__dict__.update(pickle.loads(pickle.dumps(contents.__dict__)))
            return

        self.__dict__['_items'] = dict(contents, **kwargs)

        if len(args) > 1:
            raise TypeError("too many arguments")

        # If we have more than one argument passed in, use the second argument
        # as a default value.
        if args:
            try:
                default = type(self)(args[0])
            except:
                default = args[0]
            self.__dict__['_defaultValue'] = default
        else:
            self.__dict__['_defaultValue'] = None

        self.__dict__['_defaultIsSet'] = len(args) > 0

        for k in self._items:
            if isinstance(self._items[k], dict):
                self._items[k] = type(self)(self._items[k])

    def __setstate__(self, dict):
        self.__dict__.update(dict)

    def __getstate__(self):
        return self.__dict__.copy()

    def __getattr__(self, name):
        """
        This is the method that makes all the magic happen.  Search for
        'name' in self._items and return the value if found.  If a default
        value has been set and 'name' is not found in self._items, return it.
        Otherwise raise an AttributeError.
          
        Example:
        >>> d = DictionaryObject({'keys':[1,2], 'values':3, 'x':1})
        >>> sorted(list(d.keys())) == ['keys', 'values', 'x']
        True
        >>> [1, 2] in list(d.values())
        True
        >>> 1 in list(d.values())
        True
        >>> d.x
        1
        >>> d['keys']
        [1, 2]
        >>> d['values']
        3
        """
        if name in self._items:
            return self._items[name]
        if self._defaultIsSet:
            return self._defaultValue
        raise AttributeError("'%s' object has no attribute '%s'" % (type(self).__name__, name))

    def __setattr__(self, name, value):
        """
        This class is immutable-by-default.  See MutableDictionaryObject.
        """
        raise AttributeError("'%s' object does not support assignment" % type(self).__name__)

    def __getitem__(self, name):
        return self._items[name]
    
    def __contains__(self, name):
        return name in self._items
    
    def __len__(self):
        return len(self._items)

    def __iter__(self):
        return iter(self._items)
      
    def __repr__(self):
        if self._defaultIsSet:
            params = "%s, %s" % (repr(self._items), self._defaultValue)
        else:
            params = repr(self._items)
        return "%s(%s)" % (type(self).__name__, params)
    
    def __cmp__(self, rhs):
        if self < rhs:
            return -1
        if self > rhs:
            return 1
        return 0

    def __eq__(self, rhs):
        if self._items == rhs._items:
            return self._defaultValue == rhs._defaultValue
        return False

    def __ne__(self, rhs):
        return not (self == rhs)

    def keys(self):
        return self._items.keys()
    
    def values(self):
        return self._items.values()

    def asdict(self):
        """
        Copy the data back out of here and into a dict.  Then return it.
        Some libraries may check specifically for dict objects, such
        as the json library; so, this makes it convenient to get the data
        back out.

        >>> import dictobj
        >>> d = {'a':1, 'b':2}
        >>> dictobj.DictionaryObject(d).asdict() == d
        True
        >>> d['c'] = {1:2, 3:4}
        >>> dictobj.DictionaryObject(d).asdict() == d
        True
        """
        items = {}
        for name in self._items:
            value = self._items[name]
            if isinstance(value, DictionaryObject):
                items[name] = value.asdict()
            else:
                items[name] = value
        return items

class MutableDictionaryObject(DictionaryObject):
    """
    Slight enhancement of the DictionaryObject allowing one to add
    attributes easily, in cases where that functionality is wanted.

    Examples:
    >>> d = MutableDictionaryObject({'a':1, 'b':True}, None)
    >>> d.a == 1
    True
    >>> d.b == True
    True
    >>> d.c is None
    True
    >>> d.d is None
    True
    >>> d.c = 3
    >>> del d.a
    >>> d.a is None
    True
    >>> d.c == 3
    True
    """
    def __setattr__(self, name, value):
        self._items[name] = value

    def __delattr__(self, name):
        del self._items[name]
    
    __setitem__ = __setattr__
    __delitem__ = __delattr__
