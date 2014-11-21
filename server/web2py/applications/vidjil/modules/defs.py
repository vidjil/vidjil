import math

### Upload directory for .fasta/.fastq.
### Old sequences files could be thrown away.
### No regular backup.

DIR_SEQUENCES = '/mnt/upload/uploads/'

### Upload directory for .vidjil/.fused/.analysis
### Regularly backuped

DIR_RESULTS = '/mnt/result/results/'

### Temporary directory to store vidjil results
### Formatted with 'data_id' in models/task.py
DIR_OUT_VIDJIL_ID = '/mnt/result/tmp/out-%06d/'


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
