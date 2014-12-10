import math
from gluon import current

def format_size(n, unit='B'):
    '''
    Takes an integer n, representing a filesize and returns a string
    where the size is formatted with the correct SI prefix and
    with a constant number of significant digits.

    Example:
    >>> format_size(42)
    '42 B'
    >>> format_size(123456)
    '123 kB'
    >>> format_size(1000*1000)
    '1.00 MB'
    >>> format_size(1024*1024*1024)
    '1.07 GB'
    >>> format_size(42*(2**40))
    '46.2 TB'
    '''
    size = float(n)
    PREFIXES = ['', 'k', 'M', 'G', 'T', 'P']

    for prefix in PREFIXES:
        if size < 1000:
            break
        size /= 1000


    if size > 100 or not prefix:
        fmt = '%.0f'
    elif size > 10:
        fmt = '%.1f'
    else:
        fmt = '%.2f'

    return fmt % size + ' ' + prefix + unit


def anon(patient_id, user_id):
    db = current.db
    auth=current.auth
    
    last_name = db.patient[patient_id].last_name
    first_name = db.patient[patient_id].first_name
    
    if auth.has_permission("anon", "patient", patient_id, user_id):
        return last_name + " " + first_name
    else:
        return last_name[:3]
