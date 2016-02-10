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
    if not auth.can_modify_patient(request.vars['id'], auth.user_id):
        return error_message("you need admin permission on this patient to add files")
    elif not auth.can_upload_file(request.vars['id']):
        return error_message("you don't have right to upload files")
    else:
        query = db((db.patient.id == request.vars['id'])
                &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            ).select(db.sequence_file.ALL)
        if len(query) != 0 :
            pcr = query[0].pcr
            sequencer = query[0].sequencer
            producer = query[0].producer
        else:
            pcr = sequencer = producer = ""
        return dict(message=T('add file'),
                    pcr=pcr,
                    sequencer=sequencer,
                    producer=producer)

#TODO check data
def add_form(): 
    error = ""
    
    if request.vars['sampling_date'] != '' :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format), "
    if request.vars['filename'] == None :
        error += " missing filename"
            
    if error=="" :
        query = db((db.patient.id == request.vars['patient_id'])
                &(db.sample_set_membership.sample_set_id == db.patient.sample_set_id)
                &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            ).select(db.sequence_file.ALL)
        for row in query :
            if row.filename == request.vars['filename'] :
                return error_message("this sequence file already exists for this patient")
            
        id = db.sequence_file.insert(sampling_date=request.vars['sampling_date'],
                            info=request.vars['file_info'],
                            pcr=request.vars['pcr'],
                            sequencer=request.vars['sequencer'],
                            producer=request.vars['producer'],
                            patient_id=request.vars['patient_id'],
                            filename=request.vars['filename'],
                            provider=auth.user_id)
        
        id_sample_set = db.sample_set.insert(sample_type="sequence_file")
        
        id_sample_set_membership = db.sample_set_membership.insert(sample_set_id=id_sample_set,
                                                                  sequence_file_id=id)
        id_sample_set_membership_patient = db.sample_set_membership.insert(sample_set_id=db.patient[request.vars['patient_id']].sample_set_id,
                                                                  sequence_file_id=id)
    
        res = {"file_id" : id,
               "message": "file %s (%s): upload started: %s" % (id, request.vars['patient_id'], request.vars['filename']),
               "redirect": "patient/info",
               "args" : {"id" : request.vars['patient_id']}
               }
        log.info(res)

        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        return error_message(error)


def edit(): 
    if auth.can_modify_patient(request.vars['patient_id']):
        return dict(message=T('edit file'))
    #elif not auth.can_upload_file(request.vars['id']):
    #    res = {"success" : "false", "message" : "you don't have right to upload files"}
    #    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else:
        return error_message("you need admin permission to edit files")
        


#TODO check data
def edit_form(): 
    error = ""
    
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
        if request.vars['sampling_date'] != None and request.vars['file_info'] != None :
            db.sequence_file[request.vars["id"]] = dict(sampling_date=request.vars['sampling_date'],
                                                        info=request.vars['file_info'],
                                                        pcr=request.vars['pcr'],
                                                        sequencer=request.vars['sequencer'],
                                                        producer=request.vars['producer'],
                                                        filename=filename,
                                                        provider=auth.user_id)
            
        patient_id = db((db.sequence_file.id == request.vars["id"])
                        &(db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                        &(db.patient.sample_set_id == db.sample_set_membership.sample_set_id)
                        ).select(db.patient.id).first().id
        
        res = {"file_id" : request.vars['id'],
               "redirect": "patient/info",
               "args" : { "id" : patient_id},
               "message": "file %s: metadata saved" % request.vars["id"]}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

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
                db.sequence_file[request.vars["id"]] = dict(data_file = db.sequence_file.data_file.store(f.file, f.filename))
                mes += "upload finished"
            except IOError as e:
                if str(e).find("File name too long") > -1:
                    error += 'Your filename is too long, please shorten it.'
                else:
                    error += "System error during processing of uploaded file."
                    log.error(str(e))
        
        data_file = db.sequence_file[request.vars["id"]].data_file

        if data_file is None:
            error += "no data file"

    if not error:
        seq_file = defs.DIR_SEQUENCES + data_file

        # Compute and store file size
        size = os.path.getsize(seq_file)
        mes += ' (%s)' % vidjil_utils.format_size(size)
        db.sequence_file[request.vars["id"]] = dict(size_file = size)

    # Log and exit
    res = {"message": error + mes}
    if error:
        log.error(res)
    else:
        log.info(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
  

def confirm():
    '''
    Request parameters:
    \param delete_results: (optional) boolean
    \param id: sequence file ID
    \param patient_id: patient id
    '''
    delete_only_sequence = ('delete_only_sequence' in request.vars and request.vars['delete_only_sequence'] == 'True')
    delete_results = ('delete_results' in request.vars and request.vars['delete_results'] == 'True')
    sequence_file = db.sequence_file[request.vars['id']]
    if sequence_file == None:
        return error_message("The requested file doesn't exist")
    if sequence_file.data_file == None:
        delete_results = True
    if auth.can_modify_patient(request.vars['patient_id']):
        return dict(message=T('choose what you would like to delete'),
                    delete_only_sequence = delete_only_sequence,
                    delete_results = delete_results)
    else:
        return error_message("you need admin permission to delete this file")

def delete_sequence_file(seq_id):
    sequence = db.sequence_file[seq_id]
    seq_filename = sequence.data_file
    patient_id = db((db.sample_set_membership.sequence_file_id == seq_id)
                    &(db.patient.sample_set_id == db.sample_set_membership.sample_set_id)
                    ).select(db.patient.id).first().id
    if auth.can_modify_patient(patient_id):
        if seq_filename is not None:
            log.debug('Deleting '+defs.DIR_SEQUENCES+seq_filename+' with ID'+str(seq_id))
        db.sequence_file[seq_id] = dict(data_file = None)
    else:
        return error_message('you need admin permission to delete this file')

def delete():
    '''
    Called (via request) with:
    \param: id (the sequence ID)
    \param: patient_id
    \param: delete_results: (optional) boolean stating if we also want to delete the results.
    '''
    patient_id = request.vars["patient_id"]
    delete_results = ('delete_results' in request.vars and request.vars['delete_results'] == 'True')

    if auth.can_modify_patient(patient_id):
        if not(delete_results):
            delete_sequence_file(request.vars['id'])
        else:
            db(db.sequence_file.id == request.vars["id"]).delete()
            db(db.results_file.sequence_file_id == request.vars["id"]).delete()

        res = {"redirect": "patient/info",
               "args" : { "id" : patient_id},
               "message": "file %s (%s): sequence file deleted" % (request.vars["id"], patient_id)}
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
