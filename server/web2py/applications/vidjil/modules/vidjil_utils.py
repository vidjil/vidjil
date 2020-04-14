# -*- coding: utf-8 -*-
import math
import re
import defs
import json
import datetime
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
    PREFIXES = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']

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
    
    if not isinstance(birth, datetime.date) :
        return '-/-'
    
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

    if birth is None:
        return ""

    age = age_years_months(birth)

    if auth.get_permission("anon", "patient", patient_id, user_id):
        return "%s (%s)" % (birth, age)
    else:
        return age

def anon_ids(patient_ids, can_view = None):
    '''Anonymize patient name. Only the 'anon' access see the full patient name.
    patient_ids is a list of patient IDs
    '''
    db = current.db
    auth=current.auth
    
    patients = db(db.patient.id.belongs(patient_ids)).select(db.patient.sample_set_id, 
                                                             db.patient.first_name,
                                                             db.patient.last_name)

    return [display_names(p.sample_set_id, p.first_name, p.last_name, can_view) for p in patients]

def anon_names(sample_set_id, first_name, last_name, can_view=None):
    '''
    Anonymize the given names of the patient whose ID is patient_id.
    This function performs at most one db call (to know if we can see
    the patient's personal informations). None is performed if can_view
    is provided (to tell if one can view the patient's personal informations)
    '''
    auth=current.auth

    ln = last_name
    fn = first_name
    if can_view or (can_view == None and auth.can_view_info('sample_set', sample_set_id)):
        name = ln + " " + fn
    else:
        name = unicode(safe_decoding(ln)[:3])

    return name

def display_names(sample_set_id, first_name, last_name, can_view=None):
    '''
    Return the name as displayed to a user or admin of a patient
    whose ID is patient_id.
    It makes use of anon_names which will return an anonymised version
    of the patient name if the user doesn't have permission to see the real name.
    Admins will also see the patient id.
    '''
    auth = current.auth

    name = anon_names(sample_set_id, first_name, last_name, can_view)

    # Admins also see the patient id
    if auth.is_admin():
        name += ' (%s)' % sample_set_id

    return name

def safe_decoding(string):
    '''
    Get a unicode string. If the string was already unicode we just return it.
    '''
    if isinstance(string, unicode):
        return string
    else:
        return string.decode('utf-8')

def safe_encoding(string):
    '''
    Try to encode the string in UTF-8 but if it fails just
    returns the string.
    '''
    try:
        return unicode(string).encode('utf-8')
    except UnicodeDecodeError:
        return string

def prevent_none(value, replacement_value):
    '''
    Return value if it is not None otherwise
    replacement_value

    >>> prevent_none(None, 2)
    2
    >>> prevent_none('toto', 2)
    'toto'
    '''
    if value is not None:
        return value
    return replacement_value

# take a list of strings to check and a filter_str (list of word to find (or not)) 
# return true if the string respect the filter list 
def advanced_filter(list_searched, filter_str):
    filter_list = filter_str.split(" ")
    list_searched = map(lambda s: s.lower(), list_searched)

    for f in filter_list :
        if len(f) > 0 and f[0] == "-" :
            pattern = f[1:]
        else:
            pattern = f
        result = filter(lambda item: pattern.lower() in item, list_searched)
        if len(result) == 0:
            return False
    return True


def put_properties_in_dict(src_dict, dest_dict, properties):
    '''
    Put the values of src_dict in dest_dict.
    Only keys that are keys in properties are copied to dest_dict.
    The key in dest_dict is determined by properties[key]

    >>> put_properties_in_dict({'toto': [1, 2], 'tutu': 'A'}, {'toto': 3, 'machin': 2}, {'toto': 'toto', 'titi': 'titi', 'tutu': 'truc'}) == {'toto': [1, 2], 'truc': 'A', 'machin': 2}
    True
    '''
    for key in properties.iterkeys():
        if key in src_dict:
            dest_dict[properties[key]] = src_dict[key]
    return dest_dict


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

def cleanup_json_sample(json_string):
    '''
    Takes a JSON sample and close the ) ] " ' so that
    the string can be parsed by a JSON parser.
    >>> cleanup_json_sample('"toto": [ [ 1 ], "t')
    '"toto": [ [ 1 ], "t"]'
    >>> cleanup_json_sample('"toto": [ [ 1 ], ')
    '"toto": [ [ 1 ]]'
    >>> cleanup_json_sample('{"germlines": {"custom": {"3": [')
    '{"germlines": {"custom": {"3": []}}}'
    >>> cleanup_json_sample('{"germlines": {"custom": {"3":')
    '{"germlines": {"custom": {}}}'
    >>> cleanup_json_sample('{"germlines": {"custom": {"3')
    '{"germlines": {"custom": {}}}'
    >>> cleanup_json_sample('{"germlines": {"custom": {"3": [2], "2')
    '{"germlines": {"custom": {"3": [2]}}}'
    >>> cleanup_json_sample('{"germlines": {"custom": {"3": [2], "2": "truc"')
    '{"germlines": {"custom": {"3": [2], "2": "truc"}}}'

    '''
    start_delimiters = ['{', '[', '"', "'"]
    end_delimiters = ['}', ']', '"', "'"]

    delimiter_stack = []
    pos_isolated_comma = None

    for i, char in enumerate(json_string):
        if char in start_delimiters or char in end_delimiters:
            try:
                corresponding_delimiter = start_delimiters[end_delimiters.index(char)]
            except ValueError:
                corresponding_delimiter = None
            if len(delimiter_stack) == 0 or delimiter_stack[-1][0] != corresponding_delimiter:
                delimiter_stack.append(char)
            else:
                delimiter_stack.pop()
            pos_isolated_comma = None
        elif char == ',':
            pos_isolated_comma = i

    if pos_isolated_comma != None:
        json_string = json_string[:pos_isolated_comma]
    json_string = json_string.strip()

    delimiter_stack.reverse()
    end_delimiter_stack = map(lambda c: end_delimiters[start_delimiters.index(c)], delimiter_stack)

    if (len(end_delimiter_stack) > 0 and end_delimiter_stack[0] == '}')\
       or (len(end_delimiter_stack) > 1 and end_delimiter_stack[0] in ['"', "'"] and end_delimiter_stack[1] == '}'):
        # We didn't close a dict. Are we in the middle of a property (eg. "toto": )
        last_colon = json_string.rfind(':')
        last_bracket = json_string.rfind('{')
        last_comma = json_string.rfind(',')-1
        property_start = max(last_comma, last_bracket)
        if last_colon == len(json_string)-1\
           or property_start > last_colon:
            json_string = json_string[:property_start+1]
            if len(end_delimiter_stack) > 1 and end_delimiter_stack[0] != '}':
                end_delimiter_stack.pop(0)


    return json_string + ''.join(end_delimiter_stack)



def extract_value_from_json_path(json_path, json):
    '''
    Highly inspired from http://stackoverflow.com/a/7320664/1192742

    Takes a path (for instance field1/field2/field3) and returns
    the value at that path.
    The path also support indexed opeations (such as field1/field2[3]/field4)

    If the value doesn't exist None will be returned.
    '''
    elem = json
    try:
        for x in json_path.strip("/").split("/"):
            list_pos = re.search(r'[[]\d+[]]', x)
            if list_pos is not None:
                list_pos = list_pos.span()
                index = int(x[list_pos[0]+1:list_pos[1]-1])
                x = x[:list_pos[0]]
                elem = elem.get(x)[index]
            else:
                elem = elem.get(x)
    except:
        pass

    return elem

def extract_fields_from_json(json_fields, pos_in_list, filename, max_bytes = None):
    '''
    Takes a map of JSON fields (the key is a common name
    and the value is a path) and return a similar map
    where the values are the values from the JSON filename.

    If the value retrieved from a JSON is an array, we will
    get only the item at position <pos_in_list> (if None, will
    get all of them)
    '''
    try:
        if max_bytes is None:
            json_dict = json.loads(open(filename).read())
        else:
            json_dict = json.loads(cleanup_json_sample(open(filename).read(max_bytes)))
    except IOError:
        current.log.debug('JSON loading failed')
        json_dict = {}
    except ValueError as e:
        current.log.debug(str(e))
    matched_keys = {}
    for field in json_fields:
        value = extract_value_from_json_path(json_fields[field], json_dict)
        if value is not None:
            if  not isinstance(value, basestring) and pos_in_list is not None\
                and len(value) > pos_in_list:
                matched_keys[field] = value[pos_in_list]
            else:
                matched_keys[field] = value

    return matched_keys


####


STATS_READLINES = 1000 # approx. size in which the stats are searched
STATS_MAXBYTES = 500000 # approx. size in which the stats are searched


def stats(samples):

    stats_regex = [
        # found 771265 40-windows in 2620561 segments (85.4%) inside 3068713 sequences # before 1f501e13 (-> 2015.05)
        'in (?P<seg>\d+) segments \((?P<seg_ratio>.*?)\) inside (?P<reads>\d+) sequences',

        # found 10750 50-windows in 13139 reads (99.9% of 13153 reads)
        'windows in (?P<seg>\d+) reads \((?P<seg_ratio>.*?) of (?P<reads>\d+) reads\)',

        # segmentation causes
        'log.* SEG_[+].*?-> (?P<SEG_plus>.*?).n',
        'log.* SEG_[-].*?-> (?P<SEG_minus>.*?).n',
    ]

    # stats by locus
    for locus in defs.LOCUS:
        locus_regex = locus.replace('+', '[+]')
        locus_group = locus.replace('+', 'p')
        stats_regex += [ 'log.* %(locus)s.*?->\s*?(?P<%(locus_g)s_reads>\d+)\s+(?P<%(locus_g)s_av_len>[0-9.]+)\s+(?P<%(locus_g)s_clones>\d+)\s+(?P<%(locus_g)s_av_reads>[0-9.]+)\s*.n'
                         % { 'locus': locus_regex, 'locus_g': locus_group } ]

    json_paths = {
        'result_file': {
            'main_clone': '/clones[0]/name',
            'main_clone_reads': '/clones[0]/reads[0]'
        },
        'fused_file': {
                  'reads distribution [>= 10%]': 'reads/distribution/0.1',
                  'reads distribution [>= 1% < 10%]': 'reads/distribution/0.01',
                  'reads distribution [>= .01% < 1%]': 'reads/distribution/0.001',
                  'reads distribution [>= .001% < .01%]': 'reads/distribution/0.0001',
                  'reads distribution [>= .0001% < .001%]': 'reads/distribution/0.00001',
                  'producer': 'samples/producer'
        }
    }

    keys_patient = [ 'info' ]
    keys_file = [ 'sampling_date', 'size_file' ]

    keys = []
    keys += keys_file
    keys += keys_patient

    regex = []
    for sr in stats_regex:
        r = re.compile(sr)
        regex += [r]
        keys += r.groupindex.keys()

    keys += sorted(json_paths['result_file'].keys() + json_paths['fused_file'].keys())

    tab = []
    found = {}

    for (metadata, f_result, f_fused, pos_in_fused) in samples:
        row = {}
        row_result = search_first_regex_in_file(regex, f_result, STATS_READLINES)
        row['result'] = row_result # TMP, for debug
        try:
            row_result_json = extract_fields_from_json(json_paths['result_file'], None, defs.DIR_RESULTS + results_f, STATS_MAXBYTES)
        except:
            row_result_json = []

        if f_fused:
            try:
                row_fused = extract_fields_from_json(json_paths['fused_file'], pos_in_fused, f_fused, STATS_MAXBYTES)
            except ValueError:
                row_fused = []
        else:
            row_fused = {}
        results_list = [row_result, row_result_json, row_fused]

        for key in keys:
            for map_result in results_list:
                if key in map_result:
                    row[key] = map_result[key]
                    found[key] = True
            if key not in found:
                if key in keys_patient:
                    row[key] = "TODO" + key  # metadata['patient'][key]
                    found[key] = True
                elif key in keys_file:
                    row[key] = "TODO" + key  # metadata['sequence_file'][key]
                    found[key] = True
                else:
                    row[key] = ''
        
        tab += [row]

    # Re-process some data
    keys += ['IGH_av_clones']
    for row in tab:
        row['IGH_av_clones'] = ''
        if 'IGH_av_reads' in row:
            try:
                row['IGH_av_clones'] = '%.4f' % (1.0 / float(row['IGH_av_reads']))
                found['IGH_av_clones'] = True
            except:
                pass

    # Keep only non-empty columns
    res = []
    for key in keys:
        if key in found:
            res += [key]

    return tab # res # TODO

####

SOURCES = "https://github.com/vidjil/vidjil/blob/master/server/web2py/applications/vidjil/%s#L%s"
SOURCES_DIR_DEFAULT = 'controllers/'
SOURCES_DIR = {
    'task.py': 'models/',
    'db.py': 'models/',
    'sequence_file.py': 'models/',
    'vidjil_utils.py': 'modules/',
}


log_patient = re.compile('\((\d+)\)')
log_config = re.compile(' c(\d+)')
log_task = re.compile('\[(\d+)\]')
log_py = re.compile('(.*[.]py):(\d+)')

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

    m_py = log_py.search(s)
    if m_py:
        source = m_py.group(1)
        if source in SOURCES_DIR:
            source = SOURCES_DIR[source] + source
        else:
            source = SOURCES_DIR_DEFAULT + source

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

    if m_py:
        (start, end) = m_py.span(2)
        url = SOURCES % (source, m_py.group(2))

    ### Build final string

    link = ''
    if url:
        link = 'href="%s"' % url
    if call:
        link = '''onclick="db.call('%s', %s)"''' % (call, str(args))

    if link:
        s = '%s<a class="loglink pointer" %s>%s</a>%s' % (s[:start], link, s[start:end], s[end:])

    return s

def check_enough_space(directory):
    import subprocess
    df = subprocess.Popen(["df", directory], stdout=subprocess.PIPE)
    output = df.communicate()[0]
    device, size, used, available, percent, mountpoint = output.split("\n")[1].split()
    available = int(available)
    size = int(size)
    result = available >= (size * (defs.FS_LOCK_THRESHHOLD/100))
    return result

def get_found_types(data):
    known_types = set([defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC])
    present_types = set(data.keys())
    return known_types.intersection(present_types)

def reset_db(db):
    mysql = db._uri[:5] == "mysql"
    # if using mysql disable foreign keys to be able to truncate
    if mysql:
        db.executesql('SET FOREIGN_KEY_CHECKS = 0;')
    try:
        for table in db :
            r = None
            try:
                # check if table exists (db can contain tables that don't exist, like auth_cas)
                r = db(table.id > 0).select(limitby = (0,1))
            except:
                pass
            if r is not None:
                table.truncate()
    except:
        raise
    finally:
        # lets not forget to renable foreign keys
        if mysql:
            db.executesql('SET FOREIGN_KEY_CHECKS = 1;')

def init_db_helper(db, auth, force=False, admin_email="plop@plop.com", admin_password="1234"):
    from gluon.main import save_password
    from permission_enum import PermissionEnum
    if (force) or (db(db.auth_user.id > 0).count() == 0) : 
        if force:
            reset_db(db)

        id_first_user=""

        ## création du premier user
        id_first_user=db.auth_user.insert(
            password = db.auth_user.password.validate(admin_password)[0],
            email = admin_email,
            first_name = 'System',
            last_name = 'Administrator'
        )

        # set web2py administration interface password to the same as vidjil admin password
        save_password(admin_password, 443)

        ## création des groupes de base
        id_admin_group=db.auth_group.insert(role='admin')
        id_sa_group=db.auth_group.insert(role='user_1')
        id_public_group=db.auth_group.insert(role="public")

        db.auth_membership.insert(user_id=id_first_user, group_id=id_admin_group)
        db.auth_membership.insert(user_id=id_first_user, group_id=id_sa_group)
        db.auth_membership.insert(user_id=id_first_user, group_id=id_public_group)


        ### Base config classification
        db.classification.insert(
            name = 'Vidjil-algo',
            info = 'Vidjil-algo'
        )
        db.classification.insert(
            name = 'Sub groups',
            info = 'Sub groups'
        )
        db.classification.insert(
            name = 'Other germlines',
            info = 'Other germlines'
        )
        db.classification.insert(
            name = 'Other species',
            info = 'Other species'
        )
        db.classification.insert(
            name = 'Experimentals',
            info = 'Experimentals'
        )


        ## base Vidjil configs

        db.config.insert(
            name = 'default + extract reads',
            program = 'vidjil',
            command = '-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 -U ',
            fuse_command = '-t 100',
            info = 'Same as the default "multi+inc+xxx" (multi-locus, with some incomplete/unusual/unexpected recombinations), and extract analyzed reads in the "out" temporary directory.',
            classification = 1
        )
        db.config.insert(
            name = 'multi+inc+xxx',
            program = 'vidjil',
            command = '-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 ',
            fuse_command = '-t 100',
            info = 'multi-locus, with some incomplete/unusual/unexpected recombinations',
            classification = 1
        )
        db.config.insert(
            name = 'multi+inc',
            program = 'vidjil',
            command = '-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -w 50 ',
            fuse_command = '-t 100',
            info = 'multi-locus, with some incomplete/unusual recombinations',
            classification = 1
        )
        db.config.insert(
            name = 'multi',
            program = 'vidjil',
            command = '-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH,IGK,IGL,TRA,TRB,TRG,TRD -e 1 -d -w 50 ',
            fuse_command = '-t 100',
            info = 'multi-locus, only complete recombinations',
            classification = 2
        )
        db.config.insert(
            name = 'TRG',
            program = 'vidjil',
            command = '-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:TRG ',
            fuse_command = '-t 100',
            info = 'TRG, VgJg',
            classification = 2
        )
        db.config.insert(
            name = 'IGH',
            program = 'vidjil',
            command = '-c clones -w 60 -d -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH ',
            fuse_command = '-t 100',
            info = 'IGH, Vh(Dh)Jh',
            classification = 2
        )

        ## permission
        ## system admin have admin/read/create rights on all patients, groups and configs
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.sample_set, 0)
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.patient, 0)
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.run, 0)
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.generic, 0)
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.config, 0)
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.pre_process, 0)
        auth.add_permission(id_admin_group, PermissionEnum.access.value, db.auth_group, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin.value, db.sample_set, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin.value, db.patient, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin.value, db.generic, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin.value, db.run, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin_group.value, db.auth_group, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin_config.value, db.config, 0)
        auth.add_permission(id_admin_group, PermissionEnum.admin_pre_process.value, db.pre_process, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read.value, db.sample_set, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read.value, db.patient, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read.value, db.run, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read.value, db.generic, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read_group.value, db.auth_group, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read_config.value, db.config, 0)
        auth.add_permission(id_admin_group, PermissionEnum.read_pre_process.value, db.pre_process, 0)
        auth.add_permission(id_admin_group, PermissionEnum.create.value, db.sample_set, 0)
        auth.add_permission(id_admin_group, PermissionEnum.create_group.value, db.auth_group, 0)
        auth.add_permission(id_admin_group, PermissionEnum.create_config.value, db.config, 0)
        auth.add_permission(id_admin_group, PermissionEnum.create_pre_process.value, db.pre_process, 0)
        auth.add_permission(id_admin_group, 'impersonate', db.auth_user, 0)

        auth.add_permission(id_public_group, PermissionEnum.read_config.value, db.config, 0)
        for config in db(db.config.id > 0).select():
            auth.add_permission(id_public_group, PermissionEnum.access.value, db.config, config.id)

        auth.add_permission(id_public_group, PermissionEnum.read_pre_process.value, db.pre_process, 0)
        for pre_process in db(db.pre_process.id > 0).select():
            auth.add_permission(id_public_group, PermissionEnum.access.value, db.pre_process, pre_process.id)

        tags = ['ALL', 'T-ALL',  'B-ALL',
                'pre-B-ALL','pro-B-ALL', 'mature-B-ALL',
                'CML', 'HCL', 'MZL', 'T-PLL',
                'CLL', 'LGL',
                'lymphoma',
                'MCL', 'NHL', 'HL', 'FL', 'DLBCL',
                'WM', 'MAG',
                'MM',
                'diagnosis', 'MRD', 'relapse', 'CR', 'deceased',
                'pre-BMT', 'post-BMT', 'pre-SCT', 'post-SCT',
                'dilution', 'standard',
                'QC', 'EuroMRD',
                'marrow', 'blood',
                'repertoire',
                'TIL', 'CAR-T', 'scFv',
                'FR1', 'FR2', 'FR3',
                'TRA', 'TRB', 'TRG', 'TRD',
                'IGH', 'IGK', 'KDE', 'IGL',
                'IKAROS',
                'BCR-ABL', 'TEL-AML1', 'E2A-PBX',
                'BCL2',
                'PAX5']
        for tag in tags:
            tid  = db.tag.insert(name=tag)
            db.group_tag.insert(group_id=id_public_group, tag_id=tid)
