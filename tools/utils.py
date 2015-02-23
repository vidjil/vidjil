
import collections


#### Utilities on dictionaries


def ordered(d, key=None):
    '''sorts a dictionary into an OrderedDict'''
    return collections.OrderedDict([(k, d[k]) for k in sorted(d, key=key)])


def concatenate_with_padding(d, 
                             d1, d1_size, 
                             d2, d2_size,
                             ignore_keys=[]):
    '''Concatenate two dictionaries d1 and d2 into d
    The dictionaries d1 and d2 store several values that are lists with d1_size and d2_size elements,
    and the resulting dictionary will store values that are lists with size d1_size + d2_size elements.
    Pads with lists [0, ... 0] data that appear in either only d1 or only d2.
    The values that are not lists are ignored (but this should not happen).
    
    >>> d = {}
    >>> d1 = { 'a': [1, 2], 'b': [11, 22], 'z':17 }
    >>> d2 = { 'a': [3, 4, 5], 'c': [333, 444, 555] } 
    >>> concatenate_with_padding(d, d1, 2, d2, 5, ['z'])
    >>> d
    {'a': [1, 2, 3, 4, 5], 'c': [0, 0, 333, 444, 555], 'b': [11, 22, 0, 0, 0, 0, 0]}
    '''

    t1=[]
    t2=[]
        
    for i in range(d1_size):
        t1.append(0)
        
    for i in range(d2_size):
        t2.append(0)
    
    for key in d1:
        if key in ignore_keys:
            continue
        if type(d1[key]) is not list:
            continue

        d[key] = d1[key]
        if key not in d2 :
            d[key] += t2

    for key in d2:
        if key in ignore_keys:
            continue
        if type(d2[key]) is not list:
            continue

        if key not in d :
            d[key] = t1 + d2[key]
        else :
            d[key] = d[key] + d2[key]

                
class AccessedDict(dict):
    '''Dictionary providing a .not_accessed_keys() method
    Note that access with .get(key) are not tracked.

    >>> d = AccessedDict({1:11, 2:22, 3: 33, 4: 44})

    >>> d[1], d[3]
    (11, 33)

    >>> list(d.not_accessed_keys())
    [2, 4]
    '''

    def __init__(self, *args, **kwargs):
        dict.__init__(self, *args, **kwargs)
        self.accessed_keys = []

    def __getitem__(self, key):
        self.accessed_keys.append(key)
        return dict.__getitem__(self, key)

    def not_accessed_keys(self):
        for key in self.keys():
            if key in self.accessed_keys:
                continue
            yield key



                
###### Utilities on strings


def common_substring(l):
    '''Return the longest common substring among the strings in the list
    >>> common_substring(['abcdfffff', 'ghhhhhhhhhbcd'])
    'bcd'
    >>> common_substring(['abcdfffff', 'ghhhhhhhhh'])
    ''
    >>> common_substring(['b-abc-123', 'tuvwxyz-abc-321', 'tuvwxyz-abc-456', 'd-abc-789'])
    '-abc-'
    '''

    table = []
    for s in l:
        # adds in table all substrings of s - duplicate substrings in s are added only once
        table += set(s[j:k] for j in range(len(s)) for k in range(j+1, len(s)+1))

    # sort substrings by length (descending)
    table = sorted(table, cmp=lambda x,y: cmp(len(y), len(x)))
    # get the position of duplicates and get the first one (longest)
    duplicates=[i for i, x in enumerate(table) if table.count(x) == len(l)]
    if len(duplicates) > 0:
        return table[duplicates[0]]
    else:
        return ""

    
def interesting_substrings(l, target_length=6, substring_replacement='-'):
    '''Return a list with intersting substrings.
    Now it removes common prefixes and suffixes, and then the longest 
    common substring. 
    But it stops removing once all lengths are at most 'target_length'.

    >>> interesting_substrings(['ec-3--bla', 'ec-512-bla', 'ec-47-bla'], target_length=0)
    ['3-', '512', '47']
    >>> interesting_substrings(['ec-A-seq-1-bla', 'ec-B-seq-512-bla', 'ec-C-seq-21-bla'], target_length=0, substring_replacement='')
    ['A1', 'B512', 'C21']
    >>> interesting_substrings(['ec-A-seq-1-bla', 'ec-B-seq-512-bla', 'ec-C-seq-21-bla'], target_length=0)
    ['A-1', 'B-512', 'C-21']
    >>> interesting_substrings(['ec-A-seq-1-bla', 'ec-B-seq-512-bla', 'ec-C-seq-21-bla'], target_length=9)
    ['A-seq-1', 'B-seq-512', 'C-seq-21']
    '''

    if not l:
        return {}

    if max(map (len, l)) <= target_length:
        return l

    min_length = min(map (len, l))

    ### Remove prefixes

    common_prefix = 0
    for i in range(min_length):
        if all(map(lambda x: x[i] == l[0][i], l)):
            common_prefix = i+1
        else:
            break

    substrings = [x[common_prefix:] for x in l]

    if max(map (len, substrings)) <= target_length:
        return substrings

    ### Remove suffixes

    common_suffix = 0
    for i in range(min_length - common_prefix):
        if all(map(lambda x: x[-(i+1)] == l[0][-(i+1)], l)):
            common_suffix = i
        else:
            break

    substrings = [x[common_prefix:-(common_suffix+1)] for x in l]            

    if max(map (len, substrings)) <= target_length:
        return substrings

    ### Remove the longest common substring
    
    #Have to replace '' by '_' if the removal have place between 2 substrings 

    common = common_substring(substrings)
    if common:
        substrings = [s.replace(common, substring_replacement) for s in substrings]

    return substrings
    
    # ### Build dict
    # substrings = {}
    # for x in l:
    #     substrings[x] = x[common_prefix:-(common_suffix+1)]
    # return substrings

 
