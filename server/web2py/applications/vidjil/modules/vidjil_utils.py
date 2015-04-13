import math
import re
import defs
import json
from gluon import current
from datetime import date

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

    if n == 0:
        return '0'

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




def age_years_months(birth, months_below_year=4):
    '''Get the age in years, and possibly months.'''

    today = date.today()
    years = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    age = '%dy' % years

    if years >= months_below_year:
        return age

    months = today.month - birth.month - (today.day < birth.day)
    if months < 0:
        months += 12

    age += ' %dm' % months
    return age

def anon_birth(patient_id, user_id):
    '''Anonymize birth date. Only the 'anon' access see the full birth date.'''
    db = current.db
    auth=current.auth

    birth = db.patient[patient_id].birth
    age = age_years_months(birth)

    if auth.has_permission("anon", "patient", patient_id, user_id):
        return "%s (%s)" % (birth, age)
    else:
        return age

def anon(patient_id, user_id):
    '''Anonymize patient name. Only the 'anon' access see the full patient name.'''
    db = current.db
    auth=current.auth
    
    last_name = db.patient[patient_id].last_name
    first_name = db.patient[patient_id].first_name
    
    if auth.has_permission("anon", "patient", patient_id, user_id):
        name = last_name + " " + first_name
    else:
        try:
            ln = unicode(last_name, 'utf-8')
        except UnicodeDecodeError:
            ln = last_name
        name = ln[:3]

    # Admins also see the patient id
    if auth.has_membership("admin"):
        name += ' (%s)' % patient_id

    return name


# take a string to check and a filter_str (list of word to find (or not)) 
# return true if the string respect the filter list 
def filter(str, filter_str):
    filter_list = filter_str.split(" ")
    
    for f in filter_list :
        if len(f) > 0 and f[0] == "-" :
            if f[1:].lower() in str.lower():
                return False
        else :
            if f.lower() not in str.lower():
                return False
    return True


#### Utilities on regex
def search_first_regex_in_file(regex, filename, max_nb_line=None):
    try:
        if max_nb_line is None:
            results = open(filename).readlines()
        else:
            results = open(filename).readlines(max_nb_line)
    except IOError as e:
        results = []

    matched_keys = {}
    for r in regex:
        for line in results:
            m = r.search(line)
            if m:
                for (key, val) in m.groupdict().items():
                    matched_keys[key] = val.replace('\\', '')
                break
    return matched_keys


#### Utilities on JSON

def extract_value_from_json_path(json_path, json):
    '''
    Highly inspired from http://stackoverflow.com/a/7320664/1192742

    Takes a path (for instance field1/field2/field3) and returns
    the value at that path.

    If the value doesn't exist None will be returned.
    '''
    elem = json
    try:
        for x in json_path.strip("/").split("/"):
            elem = elem.get(x)
    except:
        pass

    return elem

def extract_fields_from_json(json_fields, pos_in_list, filename):
    '''
    Takes a map of JSON fields (the key is a common name
    and the value is a path) and return a similar map
    where the values are the values from the JSON filename.

    If the value retrieved from a JSON is an array, we will
    get only the item at position <pos_in_list>
    '''
    try:
        json_dict = json.loads(open(filename).read())
    except IOError:
        json_dict = {}

    matched_keys = {}
    for field in json_fields:
        value = extract_value_from_json_path(json_fields[field], json_dict)
        if value is not None:
            if  not isinstance(value, basestring) and len(value) > pos_in_list:
                matched_keys[field] = value[pos_in_list]
            else:
                matched_keys[field] = value

    return matched_keys

####

log_patient = re.compile('\((\d+)\)')
log_config = re.compile(' c(\d+)')
log_task = re.compile('\[(\d+)\]')

def log_links(s):
    '''Add HTML links to a log string

    >>> log_links("abcdef")
    'abcdef'
    >>> log_links("[1234]abcdef")
    '[<a class="loglink pointer" onclick="db.call(\\'admin/showlog\\', {\\'file\\': \\'../..//mnt/result/tmp/out-001234/001234.vidjil.log\\', \\'format\\': \\'raw\\'})">1234</a>]abcdef'
    >>> log_links("abcdef(234)")
    'abcdef(<a class="loglink pointer" onclick="db.call(\\'patient/info\\', {\\'id\\': \\'234\\'})">234</a>)'
    >>> log_links("abcdef(234)abcdef c11")
    'abcdef(234)abcdef <a class="loglink pointer" href="?patient=234&config=11">c11</a>'
    '''

    ### Parses the input string

    m_patient = log_patient.search(s)
    patient = m_patient.group(1) if m_patient else None

    m_config = log_config.search(s)
    config = m_config.group(1) if m_config else None

    m_task = log_task.search(s)
    task = int(m_task.group(1)) if m_task else None

    ### Rules

    url = ''  # href link
    call = '' # call to db

    if patient and config:
        url = "?patient=%s&config=%s" % (patient, config)
        (start, end) = m_config.span()
        start += 1

    elif patient:
        call = "patient/info"
        args = {'id': patient}
        (start, end) = m_patient.span()
        start += 1
        end -= 1

    if task:
        call = "admin/showlog"
        args = {'file': '../../' + defs.DIR_OUT_VIDJIL_ID % task + defs.BASENAME_OUT_VIDJIL_ID % task + '.vidjil.log', 'format': 'raw'}
        (start, end) = m_task.span()
        start += 1
        end -= 1

    ### Build final string

    link = ''
    if url:
        link = 'href="%s"' % url
    if call:
        link = '''onclick="db.call('%s', %s)"''' % (call, str(args))

    if link:
        s = '%s<a class="loglink pointer" %s>%s</a>%s' % (s[:start], link, s[start:end], s[end:])

    return s
