import math

def format_size(n):
    '''
    Takes an integer n, representing a filesize and returns a string
    where the size is formatted in M, G, ...

    Example:
    >>> format_size(1000000)
    1.0 MB
    >>> format_size(1024*1014*1024)
    1.073 GB
    '''
    size = math.floor((n/1000)/1000)
    if size > 1000 :
        size = str( round( (size/1000), 3 ) ) + " GB"
    else :
        size = str( math.floor(size) ) + " MB"
    return size
