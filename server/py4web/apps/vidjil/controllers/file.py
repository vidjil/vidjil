# -*- coding: utf-8 -*-
import base64
import datetime
import pathlib
from sys import modules


from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.sampleSet import SampleSet, get_set_group
from ..modules.sampleSets import SampleSets
from ..modules.sampleSetList import SampleSetList, filter_by_tags
from ..modules.sequenceFile import check_space, get_sequence_file_sample_sets, get_sequence_file_config_ids
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..modules.zmodel_factory import ModelFactory
import apps.vidjil.modules.jstree as jstree
from ..tasks import schedule_pre_process
from ..user_groups import get_upload_group_ids, get_involved_groups
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
import time
import os
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
import math

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log, scheduler


###########################
# HELPERS
###########################
def extract_set_type(target):
    log.debug(f"extract_set_type for {target}")
    mapping = {
        'p': 'patient',
        'r': 'run',
        's': 'generic'
    }
    return mapping[target.split(':')[1][0]]


def manage_filename(filename):
    filepath = ""
    name_list = []
    name_list = filename.split('/')
    myfilename = name_list[-1]
    data = dict(filename=myfilename, data_file=None)

    if len(name_list) > 1:
        filepath = defs.FILE_SOURCE + '/' + filename
        split_file = myfilename.split('.')
        uuid_key = db.uuid().replace('-', '')[-16:]
        encoded_filename = base64.b16encode('.'.join(split_file[0:-1]).encode('utf-8')).lower()
        data_file = "sequence_file.data_file.%s.%s.%s" % (
                uuid_key, str(encoded_filename.decode('utf-8')), split_file[-1]
            )
        data['data_file'] = data_file

    return (data, filepath)

def link_to_sample_sets(seq_file_id, id_dict):
    '''
    Create sample set memberships and return a dict of the sample set ids.
    The keys to the dict are thee same as the ones passed in id_dict
    '''
    log.debug("linking file %d to sets:" % seq_file_id)
    for key in id_dict:
        log.debug("%s: %s" % (key, str(id_dict[key])))
        arr = [{'sample_set_id': oid, 'sequence_file_id': seq_file_id} for oid in id_dict[key]]
        db.sample_set_membership.bulk_insert(arr)
    db.commit()

def validate(myfile, id , pre_process):
    reupload = id != ""
    error = []

    # 0 or two filename must be provided to update a file with pre-process
    if reupload and pre_process is not None:
        if myfile['filename'] == "" and myfile['filename2'] != "" :
            error.append("missing filename")
        if myfile['filename2'] == "" and myfile['filename'] != "" :
            error.append("missing filename2")

    # both filename must be provided to add a file with pre-process
    if not reupload and pre_process is not None:
        if myfile['filename'] == "" :
            error.append("missing filename")
        if myfile['filename2'] == "":
            error.append("missing filename2")

    # a single filename must be provided to add a file without pre_process
    if not reupload and pre_process is None :
        if myfile['filename'] == "" :
            error.append("missing filename")
    
    if "sampling date" in myfile and myfile['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+myfile['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error.append("date (wrong format)")
    return error

def validate_sets(set_ids):
    id_dict = {}
    sets = []
    errors = []
    
    log.debug(f"validate_sets for {set_ids}")

    if len(set_ids) == 0:
        errors.append("missing set association")

    mf = ModelFactory()
    helpers = {}

    set_ids_arr = []
    if len(set_ids) > 0:
        set_ids_arr = [x.strip() for x in set_ids.split('|')]
    for sid in set_ids_arr:
        try:
            set_type = extract_set_type(sid)
            if set_type not in id_dict:
                helpers[set_type] = mf.get_instance(set_type)
                id_dict[set_type] = []
            sets.append({'type': set_type, 'id': sid})
            set_id = helpers[set_type].parse_id_string(sid)
            id_dict[set_type].append(set_id)
            if not auth.can_modify_sample_set(set_id) :
                errors.append("missing permission for %s %d" % (set_type, set_id))
        except ValueError:
            errors.append("Invalid %s %s" % (set_type, sid))
    return sets, id_dict, errors

def get_pre_process_list():
    query_pre_process = db((auth.vidjil_accessible_query(PermissionEnum.read_pre_process.value, db.pre_process) | auth.vidjil_accessible_query(PermissionEnum.admin_pre_process.value, db.pre_process) ) ).select(orderby=~db.pre_process.id)

    pre_process_list = []
    for row in query_pre_process :
        file = 1
        if "&file2" in row.command:
                file = 2
        pre_process_list.append(dict(
                        id = row.id,
                        name = row.name,
                        file = file,
                        info = row.info
                ))
    return pre_process_list

def get_set_list(id_dict, helpers):
    sets = []
    for key in id_dict:
        slist = db(db[key].id.belongs(id_dict[key])).select()
        for sset in slist:
            sets.append({'type': key, 'id': helpers[key].get_id_string(sset)})
    return sets

def get_set_helpers():
    factory = ModelFactory()
    sample_types = [defs.SET_TYPE_GENERIC, defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN]
    helpers = {}
    for stype in sample_types:
        helpers[stype] = factory.get_instance(type=stype)
    return helpers

def form_response(data):
    source_module_active = hasattr(defs, 'FILE_SOURCE') and hasattr(defs, 'FILE_TYPES')
    network_source = source_module_active and (data['action'] != 'edit'     \
                                               or len(data['file']) == 0    \
                                               or data['file'][0].network)
    # should be true only when we want to use the network view
    upload_group_ids = list(set([int(gid) for gid in get_upload_group_ids(auth)]))
    group_ids = get_involved_groups()
    pre_process_list = get_pre_process_list()
    return dict(message=T("Form response"),
           pre_process_list = pre_process_list,
           files = data['file'],
           sets = data['sets'],
           sample_type = data['sample_type'],
           errors = data['errors'],
           source_module_active = source_module_active,
           network_source = network_source,
           group_ids = group_ids,
           upload_group_ids = upload_group_ids,
           isEditing = data['action']=='edit',
           auth=auth,
           db=db)









############################
# CONTROLLERS
############################
@action("/vidjil/file/form", method=["POST", "GET"])
@action.uses("file/form.html", db, auth.user)
@vidjil_utils.jsontransformer
def form():
    group_ids = []
    relevant_ids = {}

    helpers = get_set_helpers()

    # new file
    if 'sample_set_id' in request.query:
        sample_set = db.sample_set[request.query["sample_set_id"]]
        if not auth.can_upload_sample_set(sample_set.id):
            return error_message("you don't have right to upload files")

        sample_type = sample_set.sample_type
        error_space = check_space(defs.DIR_SEQUENCES, "Uploads")
        if error_space is not None:
            return error_space

        row = db(db[sample_set.sample_type].sample_set_id == request.query["sample_set_id"]).select().first()
        stype = sample_set.sample_type
        if stype not in relevant_ids:
            relevant_ids[stype] = []
        relevant_ids[stype].append(row.id)
        action = 'add'
        log.debug("load add form", extra={'user_id': auth.user_id,
                'record_id': request.query['sample_set_id'],
                'table_name': "sample_set"})

    # edit file
    elif 'file_id' in request.query and request.query['file_id'] is not None:
        if not auth.can_modify_file(int(request.query['file_id'])):
            return error_message("you need admin permission to edit files")

        sample_set_list = db(
                (db.sample_set_membership.sequence_file_id == request.query['file_id'])
                & (db.sample_set_membership.sample_set_id != None)
                & (db.sample_set.id == db.sample_set_membership.sample_set_id)
                & (db.sample_set.sample_type != 'sequence_file')
            ).select(db.sample_set_membership.sample_set_id.with_alias('sample_set_id'), db.sample_set.sample_type.with_alias('sample_type'))
        for row in sample_set_list :
            smp_type= row.sample_type
            if smp_type not in relevant_ids:
                relevant_ids[smp_type] = []
            relevant_ids[smp_type].append(db(db[smp_type].sample_set_id == row.sample_set_id).select()[0].id)
        action = 'edit'

        sample_type = request.query["sample_type"]
        log.debug("load edit form", extra={'user_id': auth.user_id,
                'record_id': request.query['file_id'],
                'table_name': "sequence_file"})
    else:
        return error_message("missing sample_set or file id")

    myfile = {}
    if 'file_id' in request.query:
        myfile = db.sequence_file[request.query["file_id"]]
    if myfile is None:
        myfile = {}
    myfile['sets'] = []
    sets = get_set_list(relevant_ids, helpers)

    data = {}
    data['file'] = [myfile]
    data['sets'] = sets
    data['sample_type'] = sample_type
    data['errors'] = []
    data['action'] = action

    return form_response(data)

#TODO check data
@action("/vidjil/file/submit", method=["POST", "GET"])
@action.uses(db, auth.user)
def submit():
    data = json.loads(request.params['data'])
    # data = json.loads(request.params['data'], encoding='utf-8')
    error = False

    pre_process = None
    pre_process_flag = "COMPLETED"
    if 'pre_process' in data and data['pre_process'] is not None and\
       int(data['pre_process']) > 0:
        pre_process = int(data['pre_process'])
        pre_process_flag = "WAIT"

    sets, common_id_dict, errors = validate_sets(data['set_ids'])
    data['sets'] = sets

    data['errors'] = errors

    data['action'] = 'add'
    if len(errors) > 0:
        error = True

    for f in data['file']:
        f['errors'] = validate(f, f["id"], pre_process)

        f['sets'], f['id_dict'], err = validate_sets(f['set_ids'])

        if len(f['errors']) > 0:
            error = True
            continue

        if not 'sampling_date' in f:
            f['sampling_date'] = ''

        file_data = dict(sampling_date=f['sampling_date'],
                         info=f['info'],
                         pre_process_id=pre_process,
                         pre_process_flag= pre_process_flag,
                         provider=auth.user_id)

        # edit
        if (f["id"] != ""):
            reupload = True
            fid = int(f["id"])
            sequence_file = db.sequence_file[fid]
            if f['filename'] == '':
                # If we don't reupload a new file
                file_data.pop('pre_process_flag')
            
            sequence_file = file_data
            #remove previous membership
            db( db.sample_set_membership.sequence_file_id == fid).delete()
            db.commit()
            action = "edit"

        # add
        else:
            reupload = False
            f['id'] = fid = db.sequence_file.insert(**file_data)
            action = "add"

        data['action'] = action
        f['message'] = []
        mes = "file (%d) %s %sed" % (int(f["id"]), f["filename"], action)
        f['message'].append(mes)
        f['message'].append("You must reselect the file for it to be uploaded")

        id_dict = common_id_dict.copy()

        for key in f['id_dict']:
            if key not in id_dict:
                id_dict[key] = []
            id_dict[key] += f['id_dict'][key]

        for key in id_dict:
            for sid in id_dict[key]:
                group_id = get_set_group(sid)
                tag.register_tags(db, 'sequence_file', fid, f["info"], group_id, reset=True)

        if f['filename'] != "":
            if reupload:
                # file is being reuploaded, remove all existing results_files
                db(db.results_file.sequence_file_id == fid).delete()
                mes += " file was replaced"

            filename, filepath = manage_filename(f["filename"])
            file_data.update(filename)
            if 'data_file' in file_data and file_data['data_file'] is not None:
                os.symlink(filepath, defs.DIR_SEQUENCES + file_data['data_file'])
                file_data['size_file'] = os.path.getsize(filepath)
                file_data['network']   = True
                file_data['data_file'] = str(file_data['data_file'])

            if data["source"] == "nfs" :
                file_data2, filepath2 = manage_filename(f["filename2"])
                if 'data_file' in file_data2 and file_data2['data_file'] is not None:
                    file_data['data_file2'] = str(file_data2['data_file'])
                    os.symlink(filepath2, defs.DIR_SEQUENCES + file_data2['data_file'])

        link_to_sample_sets(fid, id_dict)

        row = db.sequence_file[fid]
        for key in file_data.keys():
            row.update( **{key: file_data[key]} )
        row.update_record()

        # pre-process for nfs files can be started immediately
        data_file = db.sequence_file[fid].data_file
        data_file2 = db.sequence_file[fid].data_file2
        if data["source"] == "nfs" :
            if data_file is not None and data_file2 is not None and pre_process != '0':
                schedule_pre_process(fid, pre_process)

        log.info(mes, extra={'user_id': auth.current_user.get('id'),
                'record_id': f['id'],
                'table_name': "sequence_file"})

    if not error:
        set_type = data['sets'][0]['type']
        set_id = id_dict[set_type][0]
        res = { "file_ids": [f['id'] for f in data['file']],
                "redirect": "sample_set/index",
                "args" : { "id" : set_id, "config_id": -1},
                "message": "successfully added/edited file(s)"}
        return json.dumps(res, separators=(',',':'))
    else:
        return error_message("add_form() failed")


@action("/vidjil/file/upload", method=["POST", "GET", "OPTIONS"])
@action.uses(db, auth.user)
def upload(): 
    #session.forget(response)
    mes = ""
    error = ""

    if not 'id' in request.params:
        error += "missing id"
    elif db.sequence_file[request.params["id"]] is None:
        error += "no sequence file with this id"

    if not error:
        mes += " file {%s} " % (request.params['id'])
        res = {"message": mes + "processing uploaded file"}
        log.debug(res)
        if "file" in request.files:
            f = request.files['file'] 
            try:
                if request.params["file_number"] == "1" :
                    db.sequence_file[request.params["id"]] = dict(data_file = db.sequence_file.data_file.store(f.file, f.filename))
                else :
                    db.sequence_file[request.params["id"]] = dict(data_file2 = db.sequence_file.data_file.store(f.file, f.filename))
                mes += "upload finished (%s)" % (f.filename)
            except IOError as e:
                if str(e).find("File name too long") > -1:
                    error += 'Your filename is too long, please shorten it.'
                else:
                    error += "System error during processing of uploaded file."
                    log.error(str(e))
        
        data_file = db.sequence_file[request.params["id"]].data_file
        data_file2 = db.sequence_file[request.params["id"]].data_file2
        
        if request.params["file_number"] == "1" and len(error) == 0 and data_file is None:
            error += "no data file"
        if request.params["file_number"] == "2" and len(error) == 0 and data_file2 is None:
            error += "no data file"

        db.sequence_file[request.params["id"]].update(pre_process_flag=None,
                                                    pre_process_result=None)

        if data_file is not None and data_file2 is not None and 'pre_process' in request.params and request.params['pre_process'] != '0':
            db.sequence_file[request.params["id"]].update(pre_process_flag = "WAIT")
            old_task_id = db.sequence_file[request.params["id"]].pre_process_scheduler_task_id
            if db.scheduler_task[old_task_id] != None:
                scheduler.control.revoke(old_task_id, terminate=True)
                db(db.scheduler_task.id == old_task_id).delete()
                db.commit()
            schedule_pre_process(int(request.params['id']), int(request.params['pre_process']))
            mes += " | p%s start pre_process %s " % (request.params['pre_process'], request.params['id'] + "-" +request.params['pre_process'])

        if data_file is not None :
            seq_file = pathlib.Path(db.sequence_file.data_file.uploadfolder, data_file)
            # Compute and store file size
            size = os.path.getsize(seq_file)
            mes += ' (%s)' % vidjil_utils.format_size(size)
            db(db.sequence_file.id == request.params["id"]).update(size_file = size)

        if data_file2 is not None :
            seq_file2 = pathlib.Path(db.sequence_file.data_file2.uploadfolder, data_file2)
            size2 = os.path.getsize(seq_file2)
            mes += ' (%s)' % vidjil_utils.format_size(size2)
            db(db.sequence_file.id == request.params["id"]).update(size_file2 = size2)
        
    # Log and exit
    res = {"message": error + mes}
    if error:
        res['success'] = 'false'
        res['priority'] = 3
        log.error(res)
    else:
        log.info(res)
        log.debug("#TODO log all relevant info to database")
    return json.dumps(res, separators=(',',':'))
  
@action("/vidjil/file/confirm", method=["POST", "GET"])
@action.uses("file/confirm.html", db, auth.user)
@vidjil_utils.jsontransformer
def confirm():
    """
    Request parameters:
    delete_results: (optional) boolean
    id: sequence file ID
    """
    delete_only_sequence = ('delete_only_sequence' in request.query and request.query['delete_only_sequence'] == 'True')
    delete_results = ('delete_results' in request.query and request.query['delete_results'] == 'True')
    sequence_file = db.sequence_file[request.query['id']]
    if sequence_file == None:
        return error_message("The requested file doesn't exist")
    if sequence_file.data_file == None:
        delete_results = True
    if auth.can_modify_sample_set(int(request.query['redirect_sample_set_id'])):
        return dict(message=T('Choose what you would like to delete'),
                    delete_only_sequence = delete_only_sequence,
                    delete_results = delete_results,
                    auth=auth,
                    db=db)
    else:
        return error_message("you need admin permission to delete this file")

def delete_sequence_file(seq_id):
    if not auth.can_modify_file(seq_id):
        return error_message('you need admin permission to delete this file')
    
    sequence = db.sequence_file[seq_id]
    seq_filename = sequence.data_file
    if seq_filename is not None:
        log.debug(f"Deleting {db.sequence_file.data_file.uploadfolder}{seq_filename} with ID {seq_id}")
    db.sequence_file[seq_id].update_record(data_file = None)

@action("/vidjil/file/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    '''
    Called (via request) with:
    id: the sequence ID
    delete_results: (optional) boolean stating if we also want to delete the results.
    '''
    delete_results = ('delete_results' in request.query and request.query['delete_results'] == "True")
    sample_set = db.sample_set[request.query["redirect_sample_set_id"]]
    associated_id = None
    if sample_set.sample_type not in ['sequence_file', 'sample_set']:
        associated_elements = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select()
        if len(associated_elements) > 0:
            associated_id = associated_elements[0].id

    if auth.can_modify_file(int(request.query["id"])):
        if not(delete_results):
            delete_sequence_file(request.query['id'])
        else:
            sample_set_ids = get_sequence_file_sample_sets(request.query["id"])
            config_ids = get_sequence_file_config_ids(request.query["id"])
            db(db.results_file.sequence_file_id == request.query["id"]).delete()
            db(db.sequence_file.id == request.query["id"]).delete()
            set_memberships = db(db.sample_set_membership.sample_set_id.belongs(sample_set_ids)).select()
            non_empty_set_ids = [r.sample_set_id for r in set_memberships]
            #############################
            # TODO
            ##########################
            #schedule_fuse(non_empty_set_ids, config_ids)

        res = {"redirect": "sample_set/index",
               "args" : { "id" : request.query["redirect_sample_set_id"]},
               "message": "sequence file ({}) deleted".format(request.query['id'])}
        if associated_id is not None:
            log.info(res, extra={'user_id': auth.user_id, 'record_id': associated_id, 'table_name': sample_set.sample_type})
        else:
            log.info(res)
        return json.dumps(res, separators=(',',':'))
    else:
        return error_message("you need admin permission to delete this file")

def sequencer_list():
    sequencer_list = []
    for row in db(db.sequence_file.sequencer != None).select(db.sequence_file.sequencer, distinct=True):
        if row.sequencer != "null" :
            sequencer_list.append(row.sequencer)
            
    res = {"sequencer": sequencer_list}
    return json.dumps(res, separators=(',',':'))

def pcr_list():
    pcr_list = []
    for row in db(db.sequence_file.pcr != None).select(db.sequence_file.pcr, distinct=True):
        if row.pcr != "null" :
            pcr_list.append(row.pcr)
            
    res = {"pcr": pcr_list}
    return json.dumps(res, separators=(',',':'))

def producer_list():
    producer_list = []
    for row in db(db.sequence_file.producer != None).select(db.sequence_file.producer, distinct=True):
        if row.producer != "null" :
            producer_list.append(row.producer)
            
    res = {"producer": producer_list}
    return json.dumps(res, separators=(',',':'))

@action("/vidjil/file/restart_pre_process", method=["POST"])
@action.uses(db, auth.user)
def restart_pre_process():
    if "sequence_file_id" not in request.params or request.params['sequence_file_id'] is None:
        return error_message("missing parameter")
    sequence_file = db.sequence_file[request.params["sequence_file_id"]]

    if sequence_file is None or not auth.can_modify_file(sequence_file.id):
        return error_message("Permission denied")

    ### Delete previous preprocess
    db.sequence_file[sequence_file.id].update_record(pre_process_flag = "WAIT")
    old_task_id = sequence_file.pre_process_scheduler_task_id
    if db.scheduler_task[old_task_id] != None:
        print( f"Delete old preprocess: {old_task_id}")
        scheduler.control.revoke(old_task_id, terminate=True)
        db(db.scheduler_task.id == old_task_id).delete()
        db.commit()

    ### Launch new preprocess
    pre_process = db.pre_process[sequence_file.pre_process_id]
    print( f"sequence_file.id: {sequence_file.id}, pre_process.id: {pre_process.id}")
    res = schedule_pre_process(sequence_file.id, pre_process.id)


    log.debug("restart pre process", extra={'user_id': auth.user_id,
                'record_id': sequence_file.id,
                'table_name': "sequence_file"})
    return json.dumps(res, separators=(',',':'))

def match_filetype(filename, extension):
    ext_len = len(extension)
    return ext_len == 0 or filename[-ext_len:] == extension


@action("/vidjil/file/filesystem", method=["GET"])
@action.uses(db, auth.user)
def filesystem():
    json = []
    id = "" if ("node" not in request.query.keys() or request.query["node"] is None) else request.query["node"] + '/'
    if id == "":
        json = [{"text": "/", "id": "/",  "children": True}]
    else:
        root_folder = defs.FILE_SOURCE + id
        for idx, f in enumerate(os.listdir(root_folder)):
            correct_type = False
            for ext in defs.FILE_TYPES:
                correct_type = match_filetype(f, ext)
                if correct_type:
                    break
            is_dir = os.path.isdir(root_folder + f)
            if correct_type or is_dir:
                json_node = jstree.Node(f, id + f).jsonData()
                if is_dir : json_node['children'] = True
                if correct_type: json_node['icon'] = 'jstree-file'
                json_node['li_attr']['title'] = f
                json.append(json_node)
    return json

