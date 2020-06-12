
import collections
import defs
import sys

#### Utilities on dictionaries


def ordered(d, key=None):
    '''sorts a dictionary into an OrderedDict'''
    return collections.OrderedDict([(k, d[k]) for k in sorted(d, key=key)])

def concatenate_with_padding(d, 
                             d1, d1_size, 
                             d2, d2_size,
                             ignore_keys=None,
                             recursive=False):
    '''Concatenate two dictionaries d1 and d2 into d
    The dictionaries d1 and d2 store several values that are lists with d1_size and d2_size elements,
    and the resulting dictionary will store values that are lists with size d1_size + d2_size elements.
    Pads with lists [0, ... 0] data that appear in either only d1 or only d2.
    The values that are not lists are ignored (but this should not happen).
    
    >>> d = {}
    >>> d1 = { 'a': [1, 2], 'b': [11, 22], 'z':17 }
    >>> d2 = { 'a': [3, 4, 5], 'c': [333, 444, 555] } 
    >>> concatenate_with_padding(d, d1, 2, d2, 5, ['z'])
    >>> d['a']
    [1, 2, 3, 4, 5]
    >>> d['b']
    [11, 22, 0, 0, 0, 0, 0]
    >>> d['c']
    [0, 0, 333, 444, 555]
    '''

    t1=[]
    t2=[]
    dict_keys = []

    if ignore_keys == None:
        ignore_keys = []

    for i in range(d1_size):
        t1.append(0)
        
    for i in range(d2_size):
        t2.append(0)
    
    for key in d1:
        if key in ignore_keys:
            continue
        if type(d1[key]) is not list:
            dict_keys.append(key)
            continue

        d[key] = d1[key]
        ### For field normalized_reads, we prefer set it at None if not available for a timepoint
        # Create a specific loop for it
        if key not in d2:
            if key != "normalized_reads":
                if ((type(d1[key]) is list) and (len(d1[key]) > 0) and (type(d1[key][0]) in [str, list])):
                    d[key] += [type(d1[key][0])()]*d2_size
                else:
                    d[key] += t2
            elif key == "normalized_reads":
                d[key] += [None]*len(d2["reads"])

    for key in d2:
        if key in ignore_keys:
            continue
        if type(d2[key]) is not list:
            dict_keys.append(key)
            continue

        if key not in d:
            if key != "normalized_reads":
                if ((type(d2[key]) is list) and (len(d2[key]) > 0) and (type(d2[key][0]) in [str, list])):
                    d[key] = ([type(d2[key][0])()]*d1_size) + d2[key]
                else:
                    d[key] = t1 + d2[key]
            elif key == "normalized_reads":
                d[key] = [None]*len(d1["reads"]) + d2[key]
        else :
            d[key] = d[key] + d2[key]

    if recursive:
        keys = set(dict_keys)
        for k in keys:
            if k not in d:
                d[k] = {}
            if k not in d1:
                d1[k] = {}
            if k not in d2:
                d2[k] = {}
            concatenate_with_padding(d[k],
                                     d1[k], d1_size,
                                     d2[k], d2_size,
                                     ignore_keys=ignore_keys,
                                     recursive=True)

                
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
    table = sorted(table, key=lambda x:-len(x))
    # get the position of duplicates and get the first one (longest)
    duplicates=[i for i, x in enumerate(table) if table.count(x) == len(l)]
    if len(duplicates) > 0:
        return table[duplicates[0]]
    else:
        return ""

def get_common_suffpref(l, max_length, order):
    '''
    Get common prefixes or common suffixes.
    
    Maximal length of the prefixes/suffixes is max_length.
    Order is either 1 (common prefix) or -1 (common suffix).

    >>> get_common_suffpref(['ablkjsdflkj', 'ablmlksdf', 'alkjr'], 5, 1)
    'a'
    >>> get_common_suffpref(['ablkjsdflkj', 'ablmlksdf', 'lkjr'], 5, 1)
    ''
    >>> get_common_suffpref(['ablkjsdflkj', 'ablmlksdf', 'lkjr'], 5, -1)
    ''
    >>> get_common_suffpref(['ablkjsdflkj', 'ablmlklkj', 'lkjrlkj'], 5, -1)
    'lkj'
    '''
    common_string = 0
    for i in range(max_length):
        index = i
        if order == -1:
            index = i+1
        if all(map(lambda x: x[order*index] == l[0][order*index], l)):
            common_string += 1
        else:
            break
    if order==1 or common_string == 0:
        return l[0][:common_string]
    else:
        return l[0][-common_string:]
    
    
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

    common_prefix = get_common_suffpref(l, min_length, 1)

    substrings = [x[len(common_prefix):] for x in l]

    if max(map (len, substrings)) <= target_length:
        return substrings

    ### Remove suffixes

    common_suffix = get_common_suffpref(l, min_length - len(common_prefix), -1)

    substrings = [x[len(common_prefix):-len(common_suffix)] for x in l]            

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

 



#########

class VidjilJson():
    
    def check_version(self, filepath):
        '''Check vidjil_json_version'''
        if "vidjil_json_version" in self.d:
            if self.d["vidjil_json_version"] < defs.VIDJIL_JSON_VERSION:
                sys.stderr.write("! Reading file with old .json version %s\n" % self.d["vidjil_json_version"])
            if self.d["vidjil_json_version"] >= defs.VIDJIL_JSON_VERSION_REQUIRED:
                return
        raise IOError ("File '%s' is too old -- please regenerate it with a newer version of Vidjil" % filepath)
    
