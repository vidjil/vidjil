# coding: utf8
import gluon.contrib.simplejson
import defs
import vidjil_utils
import os
import os.path
import datetime
from controller_utils import error_message
import jstree
import base64


if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

def extract_set_type(target):
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
        encoded_filename = base64.b16encode('.'.join(split_file[0:-1])).lower()
        data_file = "sequence_file.data_file.%s.%s.%s" % (
                uuid_key, encoded_filename, split_file[-1]
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

# TODO put these in a model or utils or smth
def validate(myfile):
    error = []
    if myfile['filename'] == None :
        error.append("missing filename")
    if myfile['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+myfile['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error.append("date (wrong format)")
    return error

def validate_sets(set_ids):
    id_dict = {}
    sets = []
    errors = []

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

def form():
    group_ids = []
    relevant_ids = {}

    helpers = get_set_helpers()

    # new file
    if 'sample_set_id' in request.vars:
        sample_set = db.sample_set[request.vars["sample_set_id"]]
        if not auth.can_upload_sample_set(sample_set.id):
            return error_message("you don't have right to upload files")

        sample_type = sample_set.sample_type
        enough_space = vidjil_utils.check_enough_space(defs.DIR_SEQUENCES)
        if not enough_space:
            mail.send(to=defs.ADMIN_EMAILS,
                subject=defs.EMAIL_SUBJECT_START+" Server space",
                message="The space in directory %s has passed below %d%%." % (defs.DIR_SEQUENCES, defs.FS_LOCK_THRESHHOLD))
            return error_message("Uploads are temporarily disabled. System admins have been made aware of the situation.")

        row = db(db[sample_set.sample_type].sample_set_id == request.vars["sample_set_id"]).select().first()
        stype = sample_set.sample_type
        if stype not in relevant_ids:
            relevant_ids[stype] = []
        relevant_ids[stype].append(row.id)
        action = 'add'
        log.debug("load add form", extra={'user_id': auth.user.id,
                'record_id': request.vars['sample_set_id'],
                'table_name': "sample_set"})

    # edit file
    elif 'file_id' in request.vars and request.vars['file_id'] is not None:
        if not auth.can_modify_file(request.vars['file_id']):
            return error_message("you need admin permission to edit files")

        sample_set_list = db(
                (db.sample_set_membership.sequence_file_id == request.vars['file_id'])
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

        sample_type = request.vars["sample_type"]
        log.debug("load edit form", extra={'user_id': auth.user.id,
                'record_id': request.vars['file_id'],
                'table_name': "sequence_file"})
    else:
        return error_message("missing sample_set or file id")

    myfile = db.sequence_file[request.vars["file_id"]]
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
def submit():
    data = json.loads(request.vars['data'], encoding='utf-8')
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
        f['errors'] = validate(f)

        f['sets'], f['id_dict'], err = validate_sets(f['set_ids'])

        if len(f['errors']) > 0:
            error = True
            continue

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
            
            db.sequence_file[fid] = file_data
            #remove previous membership
            db( db.sample_set_membership.sequence_file_id == fid).delete()
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
                register_tags(db, 'sequence_file', fid, f["info"], group_id, reset=True)

        if f['filename'] != "":
            if reupload:
                # file is being reuploaded, remove all existing results_files
                db(db.results_file.sequence_file_id == fid).delete()
                mes += " file was replaced"

            file_data, filepath = manage_filename(f["filename"])
            filename = file_data['filename']
            if 'data_file' in file_data and file_data['data_file'] is not None:
                os.symlink(filepath, defs.DIR_SEQUENCES + file_data['data_file'])
                file_data['size_file'] = os.path.getsize(filepath)
                file_data['network'] = True
                file_data['data_file'] = str(file_data['data_file'])
            db.sequence_file[fid] = file_data

        link_to_sample_sets(fid, id_dict)

        log.info(mes, extra={'user_id': auth.user.id,
                'record_id': f['id'],
                'table_name': "sequence_file"})

    if not error:
        set_type = data['sets'][0]['type']
        set_id = id_dict[set_type][0]
        res = { "file_ids": [f['id'] for f in data['file']],
                "redirect": "sample_set/index",
                "args" : { "id" : set_id, "config_id": -1},
                "message": "successfully added/edited file(s)"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        return form_response(data)
    
def form_response(data):
    source_module_active = hasattr(defs, 'FILE_SOURCE') and hasattr(defs, 'FILE_TYPES')
    network_source = source_module_active and (data['action'] != 'edit'     \
                                               or len(data['file']) == 0    \
                                               or data['file'][0].network)
      # should be true only when we want to use the network view
    response.view = 'file/form.html'
    upload_group_ids = [int(gid) for gid in get_upload_group_ids(auth)]
    group_ids = get_involved_groups()
    pre_process_list = get_pre_process_list()
    return dict(message=T("an error occured"),
           pre_process_list = pre_process_list,
           files = data['file'],
           sets = data['sets'],
           sample_type = data['sample_type'],
           errors = data['errors'],
           source_module_active = source_module_active,
           network_source = network_source,
           group_ids = group_ids,
           upload_group_ids = upload_group_ids,
           isEditing = data['action']=='edit')

def upload(): 
    session.forget(response)
    mes = ""
    error = ""

    if request.vars['id'] == None :
        error += "missing id"
    elif db.sequence_file[request.vars["id"]] is None:
        error += "no sequence file with this id"

    if not error:
        mes += " file {%s} " % (request.vars['id'])
        res = {"message": mes + "processing uploaded file"}
        log.debug(res)
        if request.vars.file != None :
            f = request.vars.file
            try:
                if request.vars["file_number"] == "1" :
                    db.sequence_file[request.vars["id"]] = dict(data_file = db.sequence_file.data_file.store(f.file, f.filename))
                else :
                    db.sequence_file[request.vars["id"]] = dict(data_file2 = db.sequence_file.data_file.store(f.file, f.filename))
                mes += "upload finished (%s)" % (f.filename)
            except IOError as e:
                if str(e).find("File name too long") > -1:
                    error += 'Your filename is too long, please shorten it.'
                else:
                    error += "System error during processing of uploaded file."
                    log.error(str(e))
        
        data_file = db.sequence_file[request.vars["id"]].data_file
        data_file2 = db.sequence_file[request.vars["id"]].data_file2
        
        if request.vars["file_number"] == "1" and len(error) == 0 and data_file is None:
            error += "no data file"
        if request.vars["file_number"] == "2" and len(error) == 0 and data_file2 is None:
            error += "no data file"

        db.sequence_file[request.vars["id"]] = dict(pre_process_flag=None,
                                                    pre_process_result=None)
        if data_file is not None and data_file2 is not None and request.vars['pre_process'] != '0':
            db.sequence_file[request.vars["id"]] = dict(pre_process_flag = "WAIT")
            old_task_id = db.sequence_file[request.vars["id"]].pre_process_scheduler_task_id
            if db.scheduler_task[old_task_id] != None:
                scheduler.stop_task(old_task_id)
                db(db.scheduler_task.id == old_task_id).delete()
                db.commit()
            schedule_pre_process(int(request.vars['id']), int(request.vars['pre_process']))
            mes += " | p%s start pre_process %s " % (request.vars['pre_process'], request.vars['id'] + "-" +request.vars['pre_process'])

        if data_file is not None :
            seq_file = defs.DIR_SEQUENCES + data_file
            # Compute and store file size
            size = os.path.getsize(seq_file)
            mes += ' (%s)' % vidjil_utils.format_size(size)
            db.sequence_file[request.vars["id"]] = dict(size_file = size)

        if data_file2 is not None :
            seq_file2 = defs.DIR_SEQUENCES + data_file2
            #TODO
        
    # Log and exit
    res = {"message": error + mes}
    if error:
        res['success'] = 'false'
        res['priority'] = 3
        log.error(res)
    else:
        log.info(res)
        log.debug("#TODO log all relevant info to database")
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
  

def confirm():
    '''
    Request parameters:
    \param delete_results: (optional) boolean
    \param id: sequence file ID
    '''
    delete_only_sequence = ('delete_only_sequence' in request.vars and request.vars['delete_only_sequence'] == 'True')
    delete_results = ('delete_results' in request.vars and request.vars['delete_results'] == 'True')
    sequence_file = db.sequence_file[request.vars['id']]
    if sequence_file == None:
        return error_message("The requested file doesn't exist")
    if sequence_file.data_file == None:
        delete_results = True
    if auth.can_modify_sample_set(request.vars['redirect_sample_set_id']):
        return dict(message=T('choose what you would like to delete'),
                    delete_only_sequence = delete_only_sequence,
                    delete_results = delete_results)
    else:
        return error_message("you need admin permission to delete this file")

def delete_sequence_file(seq_id):
    sequence = db.sequence_file[seq_id]
    seq_filename = sequence.data_file

    if auth.can_modify_file(seq_id):
        if seq_filename is not None:
            log.debug('Deleting '+defs.DIR_SEQUENCES+seq_filename+' with ID'+str(seq_id))
        db.sequence_file[seq_id] = dict(data_file = None)
    else:
        return error_message('you need admin permission to delete this file')

def delete():
    '''
    Called (via request) with:
    \param: id (the sequence ID)
    \param: delete_results: (optional) boolean stating if we also want to delete the results.
    '''
    delete_results = ('delete_results' in request.vars and request.vars['delete_results'] == "True")
    sample_set = db.sample_set[request.vars["redirect_sample_set_id"]]
    associated_id = None
    if sample_set.sample_type not in ['sequence_file', 'sample_set']:
        associated_elements = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select()
        if len(associated_elements) > 0:
            associated_id = associated_elements[0].id

    if auth.can_modify_file(request.vars["id"]):
        if not(delete_results):
            delete_sequence_file(request.vars['id'])
        else:
            sample_set_ids = get_sequence_file_sample_sets(request.vars["id"])
            config_ids = get_sequence_file_config_ids(request.vars["id"])
            db(db.results_file.sequence_file_id == request.vars["id"]).delete()
            db(db.sequence_file.id == request.vars["id"]).delete()
            set_memberships = db(db.sample_set_membership.sample_set_id.belongs(sample_set_ids)).select()
            non_empty_set_ids = [r.sample_set_id for r in set_memberships]
            schedule_fuse(non_empty_set_ids, config_ids)

        res = {"redirect": "sample_set/index",
               "args" : { "id" : request.vars["redirect_sample_set_id"]},
               "message": "sequence file ({}) deleted".format(request.vars['id'])}
        if associated_id is not None:
            log.info(res, extra={'user_id': auth.user.id, 'record_id': associated_id, 'table_name': sample_set.sample_type})
        else:
            log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        return error_message("you need admin permission to delete this file")

def sequencer_list():
    sequencer_list = []
    for row in db(db.sequence_file.sequencer != None).select(db.sequence_file.sequencer, distinct=True):
        if row.sequencer is not "null" :
            sequencer_list.append(row.sequencer)
            
    res = {"sequencer": sequencer_list}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def pcr_list():
    pcr_list = []
    for row in db(db.sequence_file.pcr != None).select(db.sequence_file.pcr, distinct=True):
        if row.pcr is not "null" :
            pcr_list.append(row.pcr)
            
    res = {"pcr": pcr_list}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def producer_list():
    producer_list = []
    for row in db(db.sequence_file.producer != None).select(db.sequence_file.producer, distinct=True):
        if row.producer is not "null" :
            producer_list.append(row.producer)
            
    res = {"producer": producer_list}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def restart_pre_process():
    if "sequence_file_id" not in request.vars or request.vars['sequence_file_id'] is None:
        return error_message("missing parameter")
    sequence_file = db.sequence_file[request.vars["sequence_file_id"]]
    if sequence_file is None or not auth.can_modify_file(sequence_file.id):
        return error_message("Permission denied")
    pre_process = db.pre_process[sequence_file.pre_process_id]
    db.sequence_file[sequence_file.id] = dict(pre_process_flag = 'WAIT')
    db.commit()
    res = schedule_pre_process(sequence_file.id, pre_process.id)
    log.debug("restart pre process", extra={'user_id': auth.user.id,
                'record_id': sequence_file.id,
                'table_name': "sequence_file"})
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def match_filetype(filename, extension):
    ext_len = len(extension)
    return ext_len == 0 or filename[-ext_len:] == extension

def filesystem():
    json = []
    id = "" if request.vars["node"] is None else request.vars["node"] + '/'
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
    return gluon.contrib.simplejson.dumps(json, separators=(',',':'))
