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

def extract_id(target, error):
    try:
        id = int(target.split('(')[-1][:-1])
        return id
    except:
        raise ValueError('invalid input %s' % target)
    
def get_sample_set_list(type, reference):
    query = db(
        auth.vidjil_accessible_query(PermissionEnum.read.value, db[type])
    ).select(
        db[type].ALL, # sub optimal, use helpers to reduce ?
        orderby = ~db[type].id
    )
    ss_list = []
    ref = ""

    factory = ModelFactory()
    helper = factory.get_instance(type=type)
    for row in query :
        tmp = helper.get_id_string(row)
        ss_list.append(tmp)
        if reference == row.id:
            ref = tmp
    return ss_list, ref

def add():
    sample_set = db.sample_set[request.vars["id"]]
    if not auth.can_upload_sample_set(sample_set.id):
        return error_message("you don't have right to upload files")
    else:
        sample_type = sample_set.sample_type
        enough_space = vidjil_utils.check_enough_space(defs.DIR_SEQUENCES)
        if not enough_space:
            mail.send(to=defs.ADMIN_EMAILS,
                subject="[Vidjil] Server space",
                message="The space in directory %s has passed below %d%%." % (defs.DIR_SEQUENCES, defs.FS_LOCK_THRESHHOLD))
            return error_message("Uploads are temporarily disabled. System admins have been made aware of the situation.")
        
        patient_id = None
        run_id = None
        generic_id = None
        group_ids = []
        if sample_set.sample_type == defs.SET_TYPE_GENERIC:
            generic_id = db( db.generic.sample_set_id == request.vars["id"]).select()[0].id
            group_ids.append(get_set_group(sample_set.sample_type, generic_id))
        if sample_set.sample_type == defs.SET_TYPE_PATIENT:
            patient_id = db( db.patient.sample_set_id == request.vars["id"]).select()[0].id
            group_ids.append(get_set_group(sample_set.sample_type, patient_id))
        if sample_set.sample_type == defs.SET_TYPE_RUN:
            run_id = db( db.run.sample_set_id == request.vars["id"]).select()[0].id
            group_ids.append(get_set_group(sample_set.sample_type, run_id))

        group_ids = [int(gid) for gid in group_ids]
		
	query_pre_process = db(
            db.pre_process>0
        ).select(
            db.pre_process.ALL,
			orderby = ~db.pre_process.id
        )
		
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

        generic_list, generic = get_sample_set_list(defs.SET_TYPE_GENERIC, generic_id)
        patient_list, patient = get_sample_set_list(defs.SET_TYPE_PATIENT, patient_id)
        run_list, run = get_sample_set_list(defs.SET_TYPE_RUN, run_id)
				
        source_module_active = hasattr(defs, 'FILE_SOURCE') and hasattr(defs, 'FILE_TYPES')
        return dict(message = T('add file'),
                   generic_list = generic_list,
                   patient_list = patient_list,
                   run_list = run_list,
				   pre_process_list = pre_process_list,
                   generic = generic,
                   patient = patient,
                   sample_type = sample_set.sample_type,
                   run = run,
                   source_module_active = source_module_active,
                   group_ids = group_ids)

def manage_filename(filename):
    filepath = ""
    name_list = []
    name_list = request.vars['filename'].split('/')
    filename = name_list[-1]
    data = dict(filename=filename, data_file=None)

    if len(name_list) > 1:
        filepath = defs.FILE_SOURCE + '/' + request.vars['filename']
        split_file = filename.split('.')
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
    ssid_dict = {}
    for key in id_dict:
        oid = id_dict[key]
        sample_set_id = db[key][oid].sample_set_id
        ssid_dict[key] = sample_set_id
        id_sample_set_membership_run = db.sample_set_membership.insert(sample_set_id=sample_set_id,
                                                                  sequence_file_id=seq_file_id)
    return ssid_dict

def filter_set_ids(req_vars):
    '''
    Create a dict with the patient, run etc.. id strings as sent by the form
    '''
    # TODO I wanted to make an associative array straight in the HTML form
    # but I couldn't get it working...
    set_ids = {}
    set_ids[defs.SET_TYPE_GENERIC] = req_vars['generic_id']
    set_ids[defs.SET_TYPE_PATIENT] = req_vars['patient_id']
    set_ids[defs.SET_TYPE_RUN] = req_vars['run_id']
    return set_ids

def add_form(): 
    error = ""
    patient_id = None
    run_id = None
    generic_id = None
    
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
            
    if request.vars['filename'] == None :
        error += " missing file"
    else:
        data, filepath = manage_filename(request.vars["filename"])
        filename = data['filename']

    if request.vars['patient_id'] == '' and request.vars['run_id'] == "" and request.vars['generic_id'] == "":
        error += " missing patient or run or sample_set"

    set_ids = filter_set_ids(request.vars)

    id_dict = {}
    for key in set_ids:
        if set_ids[key] != '':
            try:
                set_id = extract_id(set_ids[key], error)
                id_dict[key] = set_id
                if not auth.can_modify(key, set_id) :
                    error += " missing permission for %s %d" % (key, set_id)

                query = db((db[key].id == set_id)
                        &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                        &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                    ).select(db.sequence_file.ALL)
                for row in query :
                    if row.filename == filename :
                        error += " this sequence file already exists for this %s" % key
                        break
            except ValueError:
                error += " Invalid %s %s" % (key, set_ids[key])

    pre_process = None
    pre_process_flag = "DONE"
    if request.vars['pre_process'] is not None and request.vars['pre_process'] != "0":
        pre_process = request.vars['pre_process']
        pre_process_flag = "WAIT"

    if error=="" :

        #add sequence_file to the db
        id = db.sequence_file.insert(sampling_date=request.vars['sampling_date'],
                            info=request.vars['file_info'],
                            pre_process_id=pre_process,
                            pre_process_flag=pre_process_flag,
                            provider=auth.user_id)

        group_ids = set()
        for key in id_dict:
            group_ids.add(get_set_group(key, id_dict[key]))
        for group_id in group_ids:
            register_tags(db, 'sequence_file', id, request.vars["file_info"], group_id)

        log_message = "upload started"
        if request.vars['filename'] != "":
            if data['data_file'] is not None:
                log_message = "registered"
                os.symlink(filepath, defs.DIR_SEQUENCES + data['data_file'])
                data['size_file'] = os.path.getsize(filepath)
                data['network'] = True
            db.sequence_file[id] = data


        ids_sample_set = []

        ssid_dict = link_to_sample_sets(id, id_dict)
        redirect_args = {"id" : ssid_dict[request.vars["sample_type"]]}
        
        res = {"file_id" : id,
               "message": "(%s) file {%s} : %s: %s" % (','.join(map(str,ids_sample_set)), id, log_message, request.vars['filename']),
               "redirect": "sample_set/index",
               "args" : redirect_args
               }
        log.info(res, extra={'user_id': auth.user.id,\
                'record_id': run_id if run_id is not None else patient_id,\
                'table_name': 'run' if run_id is not None else 'patient'})

        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        return error_message(error)


    
def edit(): 
    if auth.can_modify_file(request.vars['id']):
        relevant_ids = {'patient': None, 'run': None, 'generic': None}

        sample_set_list = db(
                (db.sample_set_membership.sequence_file_id == request.vars['id'])
                & (db.sample_set_membership.sample_set_id != None)
                & (db.sample_set.id == db.sample_set_membership.sample_set_id)
                & (db.sample_set.sample_type != 'sequence_file')
            ).select(db.sample_set_membership.sample_set_id)
        for row in sample_set_list :
            sample_type = db.sample_set[row.sample_set_id].sample_type
            relevant_ids[sample_type] = db(db[sample_type].sample_set_id == row.sample_set_id).select()[0].id
        
	query_pre_process = db(
            db.pre_process>0
        ).select(
            db.pre_process.ALL,
			orderby = ~db.pre_process.id
        )
		
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

        generic_list, generic = get_sample_set_list(defs.SET_TYPE_GENERIC, relevant_ids['generic'])
        patient_list, patient = get_sample_set_list(defs.SET_TYPE_PATIENT, relevant_ids['patient'])
        run_list, run = get_sample_set_list(defs.SET_TYPE_RUN, relevant_ids['run'])

        group_ids = []
        for key in relevant_ids:
            if (relevant_ids[key] is not None):
                group_ids.append(get_set_group(key, relevant_ids[key]))

        group_ids = [int(gid) for gid in group_ids]

        source_module_active = hasattr(defs, 'FILE_SOURCE') and hasattr(defs, 'FILE_TYPES')
        return dict(message = T('edit file'),
                   generic_list = generic_list,
                   patient_list = patient_list,
                   run_list = run_list,
                   patient = patient,
				   pre_process_list = pre_process_list,
                   run = run,
                   generic = generic,
                   file = db.sequence_file[request.vars["id"]],
                   sample_type = request.vars['sample_type'],
                   source_module_active = source_module_active,
                   group_ids = group_ids)

    else:
        return error_message("you need admin permission to edit files")
        


#TODO check data
def edit_form(): 
    error = ""
    patient_id = None
    run_id = None
    generic_id = None

    if request.vars['patient_id'] == '' and request.vars['run_id'] == "" and request.vars['generic_id'] == "":
        error += " missing patient or run or sample_set"

    if request.vars['id'] == None :
        error += "missing id"
    if request.vars['filename'] == None :
        error += " missing filename"
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
            
    # TODO I wanted to make an associative array straight in the HTML form
    # but I couldn't get it working...
    set_ids = filter_set_ids(request.vars)

    id_dict = {}
    for key in set_ids:
        if set_ids[key] != '':
            try:
                set_id = extract_id(set_ids[key], error)
                id_dict[key] = set_id
                if not auth.can_modify(key, set_id) :
                    error += " missing permission for %s %d" % (key, set_id)
            except ValueError:
                error += " Invalid %s %s" % (key, set_ids[key])

    if error=="" :
        id = int(request.vars["id"])
        mes = "file {%d}: " % id
        filename = db.sequence_file[id].filename
        if 'filename' in request.vars and request.vars['filename'] != "":
            filename = request.vars['filename']
            # file is being reuploaded, remove all existing results_files
            db(db.results_file.sequence_file_id == id).delete()
        pre_process = None
        if request.vars['pre_process'] is not None and request.vars['pre_process'] != "0":
            pre_process = int(request.vars['pre_process'])
        if request.vars['sampling_date'] != None and request.vars['file_info'] != None :
            sequence_file = db.sequence_file[id]
            db.sequence_file[id] = dict(sampling_date=request.vars['sampling_date'],
                                                        info=request.vars['file_info'],
                                                        pre_process_id=pre_process,
                                                        provider=auth.user_id)

            if sequence_file.info != request.vars['file_info']:
                group_ids = set()
                for key in id_dict:
                    group_ids.add(get_set_group(key, id_dict[key]))
                for group_id in group_ids:
                    register_tags(db, 'sequence_file', id, request.vars["file_info"], group_id, reset=True)

        if request.vars['filename'] != "":
            data, filepath = manage_filename(request.vars["filename"])
            if 'data_file' in data and data['data_file'] is not None:
                os.symlink(filepath, defs.DIR_SEQUENCES + data['data_file'])
            db.sequence_file[id] = data
            
        #remove previous membership
        for row in db( db.sample_set_membership.sequence_file_id == id).select() :
            if db.sample_set[row.sample_set_id].sample_type != "sequence_file" :
                db(db.sample_set_membership.id == row.id).delete()
        
        ssid_dict = link_to_sample_sets(id, id_dict)
        redirect_args = {"id" : ssid_dict[request.vars["sample_type"]]}
        
        res = {"file_id" : id,
               "message": "file {%d}: metadata saved" % id,
               "redirect": "sample_set/index",
               "args" : redirect_args
               }
        log.info(res, extra={'user_id': auth.user.id, 'record_id': redirect_args['id'], 'table_name': 'run' if run_id is not None else 'patient'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        return error_message(error)
    
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
            schedule_fuse(sample_set_ids, config_ids)

        res = {"redirect": "sample_set/index",
               "args" : { "id" : request.vars["redirect_sample_set_id"]},
               "message": "sequence file deleted"}
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
    if "sequence_file_id" not in request.vars:
        return error_message("missing parameter")
    sequence_file = db.sequence_file[request.vars["sequence_file_id"]]
    if sequence_file is None or not auth.can_modify_file(sequence_file.id):
        return error_message("Permission denied")
    pre_process = db.pre_process[sequence_file.pre_process_id]
    db.sequence_file[sequence_file.id] = dict(pre_process_flag = 'WAIT')
    db.commit()
    res = schedule_pre_process(sequence_file.id, pre_process.id)
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
