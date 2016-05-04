# coding: utf8
import gluon.contrib.simplejson
import defs
import vidjil_utils
import os
import os.path
import datetime
from controller_utils import error_message


if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

    
def add(): 
    if not auth.can_upload_file():
        return error_message("you don't have right to upload files")
    else:
        
        patient_id = None
        run_id = None
        if db.sample_set[request.vars["id"]].sample_type == "patient" :
            patient_id = db( db.patient.sample_set_id == request.vars["id"]).select()[0].id
        if db.sample_set[request.vars["id"]].sample_type == "run" :
            run_id = db( db.run.sample_set_id == request.vars["id"]).select()[0].id
        
		
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
			
        query_patient = db(
            auth.accessible_query('admin', db.patient)
        ).select(
            db.patient.ALL,
            orderby = ~db.patient.id
        )
        patient_list = []
        patient = ""

        for row in query_patient :
            name = row.first_name + " " + row.last_name
            birth = "[" + str(row.birth) + "]   "
            id = "   ("+str(row.id)+")"
            patient_list.append(birth+name+id)
            if patient_id == row.id :
                patient = birth+name+id
            
        query_run = db(
            auth.accessible_query('admin', db.run)
        ).select(
            db.run.ALL,
            orderby = ~db.run.id
        )
        run_list = []
        run = ""

        for row in query_run :
            name = row.name
            run_date = "[" + str(row.run_date) + "]   "
            id = "   ("+str(row.id)+")"
            run_list.append(run_date+name+id)
            if run_id == row.id :
                run = run_date+name+id
				
				
        return dict(message = T('add file'),
                   patient_list = patient_list,
                   run_list = run_list,
				   pre_process_list = pre_process_list,
                   patient = patient,
                   run = run)


def add_form(): 
    error = ""
    patient_id = None
    run_id = None
    
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
            
    if request.vars['filename'] == None :
        error += " missing file"
    if request.vars['patient_id'] == '' and request.vars['run_id'] == "" :
        error += " missing patient or run"
        
    if request.vars['patient_id'] != '' :
        patient_id = int(request.vars['patient_id'].split('(')[-1][:-1])
        if not auth.can_modify_patient(patient_id) :
            error += " missing permission for patient "+str(patient_id)
            
        query = db((db.patient.id == patient_id)
                &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            ).select(db.sequence_file.ALL)
        for row in query :
            if row.filename == request.vars['filename'] :
                error += " this sequence file already exists for this patient"
            
    if request.vars['run_id'] != '' :
        run_id = int(request.vars['run_id'].split('(')[-1][:-1])
        if not auth.can_modify_run(run_id) :
            error += " missing permission for run "+str(run_id)
    pre_process = None
    pre_process_flag = "DONE"
    if request.vars['pre_process'] != "0":
        pre_process = request.vars['pre_process']
        pre_process_flag = "WAIT"

    if error=="" :
            
        #add sequence_file to the db
        id = db.sequence_file.insert(sampling_date=request.vars['sampling_date'],
                            info=request.vars['file_info'],
                            filename=request.vars['filename'],
                            pre_process_id=pre_process,
                            pre_process_flag=pre_process_flag,
                            provider=auth.user_id)
        
        #add a default sample_set for this sequence file
        id_sample_set = db.sample_set.insert(sample_type="sequence_file")
        
        id_sample_set_membership = db.sample_set_membership.insert(sample_set_id=id_sample_set,
                                                                  sequence_file_id=id)
        #add sequence_file to a run sample_set
        if run_id is not None :
            run_sample_set_id = db.run[run_id].sample_set_id
            id_sample_set_membership_run = db.sample_set_membership.insert(sample_set_id=run_sample_set_id,
                                                                  sequence_file_id=id)
            redirect_args = {"id" : run_sample_set_id}
            
        #add sequence_file to a patient sample_set
        if patient_id is not None :
            patient_sample_set_id = db.patient[patient_id].sample_set_id
            id_sample_set_membership_patient = db.sample_set_membership.insert(sample_set_id=patient_sample_set_id,
                                                                  sequence_file_id=id)
            redirect_args = {"id" : patient_sample_set_id}
        
        
        res = {"file_id" : id,
               "message": "file %s : upload started: %s" % (id, request.vars['filename']),
               "redirect": "sample_set/index",
               "args" : redirect_args
               }
        log.info(res)

        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        return error_message(error)


    
def edit(): 
    if auth.can_modify_file(request.vars['id']):
        patient_id = None
        run_id = None
        
        sample_set_list = db(db.sample_set_membership.sequence_file_id == request.vars['id']).select(db.sample_set_membership.sample_set_id)
        
        for row in sample_set_list :
            if db.sample_set[row.sample_set_id].sample_type == "patient" :
                patient_id = db( db.patient.sample_set_id == row.sample_set_id).select()[0].id
            if db.sample_set[row.sample_set_id].sample_type == "run" :
                run_id = db( db.run.sample_set_id == row.sample_set_id).select()[0].id
        
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
				file = file
			))
			
        query_patient = db(
            auth.accessible_query('admin', db.patient)
        ).select(
            db.patient.ALL,
            orderby = ~db.patient.id
        )
        patient_list = []
        patient = ""

        for row in query_patient :
            name = row.first_name + " " + row.last_name
            birth = "[" + str(row.birth) + "]   "
            id = "   ("+str(row.id)+")"
            patient_list.append(birth+name+id)
            if patient_id == row.id :
                patient = birth+name+id
            
        query_run = db(
            auth.accessible_query('admin', db.run)
        ).select(
            db.run.ALL,
            orderby = ~db.run.id
        )
        run_list = []
        run = ""

        for row in query_run :
            name = row.name
            run_date = "[" + str(row.run_date) + "]   "
            id = "   ("+str(row.id)+")"
            run_list.append(run_date+name+id)
            if run_id == row.id :
                run = run_date+name+id
        
        return dict(message = T('edit file'),
                   patient_list = patient_list,
                   run_list = run_list,
                   patient = patient,
				   pre_process_list = pre_process_list,
                   run = run,
                   file = db.sequence_file[request.vars["id"]])
    else:
        return error_message("you need admin permission to edit files")
        


#TODO check data
def edit_form(): 
    error = ""
    patient_id = None
    run_id = None
  
    if request.vars['patient_id'] != '' :
        patient_id = int(request.vars['patient_id'].split('(')[-1][:-1])
    if request.vars['run_id'] != '' :
        run_id = int(request.vars['run_id'].split('(')[-1][:-1])
    if request.vars['id'] == None :
        error += "missing id"
    if request.vars['filename'] == None :
        error += " missing filename"
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
            
    if error=="" :
        mes = "file " + str(request.vars['id']) + " : "
        filename = db.sequence_file[request.vars['id']].filename
        if request.vars['filename'] != "":
            filename = request.vars['filename']
        pre_process = None
        if request.vars['pre_process'] != "0":
            pre_process = int(request.vars['pre_process'])
        if request.vars['sampling_date'] != None and request.vars['file_info'] != None :
            db.sequence_file[request.vars["id"]] = dict(sampling_date=request.vars['sampling_date'],
                                                        info=request.vars['file_info'],
                                                        filename=filename,
                                                        pre_process_id=pre_process,
                                                        provider=auth.user_id)
            
        #remove previous membership
        for row in db( db.sample_set_membership.sequence_file_id == request.vars["id"]).select() :
            if db.sample_set[row.sample_set_id].sample_type != "sequence_file" :
                db(db.sample_set_membership.id == row.id).delete()
        
        #add sequence_file to a run sample_set
        if run_id is not None :
            run_sample_set_id = db.run[run_id].sample_set_id
            id_sample_set_membership_run = db.sample_set_membership.insert(sample_set_id=run_sample_set_id,
                                                                  sequence_file_id=request.vars["id"])
            redirect_args = {"id" : run_sample_set_id}
            
        #add sequence_file to a patient sample_set
        if patient_id is not None :
            patient_sample_set_id = db.patient[patient_id].sample_set_id
            id_sample_set_membership_patient = db.sample_set_membership.insert(sample_set_id=patient_sample_set_id,
                                                                  sequence_file_id=request.vars["id"])
            redirect_args = {"id" : patient_sample_set_id}
        
        
        res = {"file_id" : request.vars["id"],
               "message": "file %s: metadata saved" % request.vars["id"],
               "redirect": "sample_set/index",
               "args" : redirect_args
               }
        log.info(res)
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
        patient_id = db((db.sequence_file.id == request.vars["id"])
                        &(db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                        &(db.patient.sample_set_id == db.sample_set_membership.sample_set_id)
                        ).select(db.patient.id).first()
        mes += " file %s (patient %s) " % (db.sequence_file[request.vars['id']].filename, patient_id['id'])
        res = {"message": mes + "processing uploaded file",
               "redirect": "patient/info",
               "args" : {"id" : request.vars['id']}
               }
        log.debug(res)
        if request.vars.file != None :
            f = request.vars.file
            try:
                if request.vars["file_number"] == "1" :
                    db.sequence_file[request.vars["id"]] = dict(data_file = db.sequence_file.data_file.store(f.file, f.filename))
                else :
                    db.sequence_file[request.vars["id"]] = dict(data_file2 = db.sequence_file.data_file.store(f.file, f.filename))
                mes += "upload finished"
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
            
        if data_file is not None and data_file2 is not None and request.vars['pre_process'] != '0':
            db.sequence_file[request.vars["id"]] = dict(pre_process_flag = "WAIT")
            if db.scheduler_task[db.sequence_file[request.vars["id"]].pre_process_scheduler_task_id] != None:
                scheduler.stop_task(db.sequence_file[request.vars["id"]].pre_process_scheduler_task_id)
            schedule_pre_process(int(request.vars['id']), int(request.vars['pre_process']))
            mes += "files uploaded, start pre-process !! "+ request.vars['id'] + "-" +request.vars['pre_process']

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
    delete_results = ('delete_results' in request.vars and request.vars['delete_results'] == 'True')

    if auth.can_modify_file(request.vars["id"]):
        if not(delete_results):
            delete_sequence_file(request.vars['id'])
        else:
            db(db.sequence_file.id == request.vars["id"]).delete()
            db(db.results_file.sequence_file_id == request.vars["id"]).delete()
            
            for row in db( db.sample_set_membership.sequence_file_id == request.vars["id"]).select() :
                db(db.sample_set_membership.id == row.id).delete()

        res = {"redirect": "sample_set/index",
               "args" : { "id" : request.vars["redirect_sample_set_id"]},
               "message": "sequence file deleted"}
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
