# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import os
import sys
import imp

from controller_utils import error_message

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def index():
    '''
    The request should receive two parameters:
    - sequences: a list of comma-separated DNA sequences to be searched in the CloneDB
    - sample_set_id: the sample set we're coming from
    '''
    if not auth.user:
        return response.json({'error': 'Access denied'})

    if request.vars['sequences'] == None or request.vars['sequences'] == ''\
       or request.vars['sample_set_id'] == None:
        return error_message('Malformed request')

    return search_clonedb(request.vars['sequences'].split(','), int(request.vars['sample_set_id']))

def search_clonedb(sequences, sample_set_id):
    sys.path.insert(1, os.path.abspath(defs.DIR_CLONEDB))
    import grep_clones
    clonedb = imp.load_source('clonedb', defs.DIR_CLONEDB+os.path.sep+'clonedb.py')

    results = []
    parent_group = get_default_creation_group(auth)[1]
    auth.load_permissions(PermissionEnum.read.value, 'sample_set')
    auth.load_permissions(PermissionEnum.anon.value, 'sample_set')
    options = clonedb.build_grep_clones_options({'sequence': sequences[0]+' -sample_set:%d' % sample_set_id,
                                                     'index': 'clonedb_{}'.format(parent_group)})
    options += sequences[1:]
    args = grep_clones.parser.parse_args(options)
    try:
        occurrences = grep_clones.launch_search(args)
    except ValueError:
        return error_message('Are you sure your account has an enabled CloneDB?')
    except Exception as e:
        return error_message(e.message)

    sample_set_ids = [ sid for occurrences_one_seq in occurrences for occ in occurrences_one_seq if 'tags' in occ and 'sample_set' in occ['tags']  for sid in occ['tags']['sample_set'] ]

    sample_sets = SampleSets(sample_set_ids)
    sample_names = sample_sets.get_names()
    sample_tags = sample_sets.get_tag_names()

    for occurrences_one_seq in occurrences:
        for occ in occurrences_one_seq:
            if 'tags' in occ and 'sample_set' in occ['tags']:
                
                info = get_info_of_viewable_sample_set([int(sample_id) for sample_id in occ['tags']['sample_set']], int(occ['tags']['config_id'][0]), sample_names, sample_tags)
                occ['tags']['sample_set_viewable'] = info['viewable']
                occ['tags']['sample_set_name'] = info['name']
                occ['tags']['sample_tags'] = info['sample_tags']
                config_db = db.config[occ['tags']['config_id'][0]]
                occ['tags']['config_name'] = [config_db.name if config_db else None]
        results.append(occurrences_one_seq)
    return response.json(results)

def get_info_of_viewable_sample_set(sample_sets, config, sample_names, sample_tags):
    info = {'viewable': [], 'name': [], 'sample_tags': []}
    for sample_id in sample_sets:
        viewable = auth.can_view_sample_set(sample_id, auth.user.id)
        info['viewable'].append(viewable)
        if viewable:
            info['name'].append(sample_names.get(sample_id))
            tags = sample_tags.get(sample_id)
            if tags:
                for row in tags:
                    info['sample_tags'].append("#" + row)
        else:
            info['name'].append(None)
    return info
