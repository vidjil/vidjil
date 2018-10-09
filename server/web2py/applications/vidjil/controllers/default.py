# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## This is a sample controller
## - index is the default action of any application
## - user is required for authentication and authorization
## - download is for downloading files uploaded in the db (does streaming)
## - call exposes all registered services (none by default)
#########################################################################

import defs
import vidjil_utils
import StringIO
import logging
from controller_utils import error_message

import gluon.contrib.simplejson, time, datetime
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

#########################################################################
##return the default index page for vidjil (redirect to the browser)
def index():
    return dict(message=T('hello world'))

#########################################################################
##return the view default/help.html
def help():
    return dict(message=T('help i\'m lost'))

#########################################################################
## default home page
def home():
    if auth.is_admin():
        redirect = URL('admin', 'index', scheme=True, host=True)
    else:
        redirect = URL('sample_set', 'all', vars={'type': defs.SET_TYPE_PATIENT, 'page': 0}, scheme=True, host=True)
    res = {"redirect" : redirect}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def logger():
    '''Log to the server'''
    res = {"success" : "false",
           "message" : "/client/: %s" % request.vars['msg']}

    try:
        lvl = int(request.vars['lvl'])
    except:
        lvl = logging.INFO
    log.log(lvl, res)

def init_db():
    if (db(db.auth_user.id > 0).count() == 0) :
        return dict(message=T('create admin user and initialise database'))
    res = {"redirect" : "default/user/login"}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def init_db_form():
    if (db(db.auth_user.id > 0).count() == 0) :
        error = ""
        force = False
        if request.vars['email'] == "":
            error += "You must specify an admin email address, "
        if len(request.vars['password']) < 8:
            error += "Password must be at least 8 characters long, "
        if request.vars['confirm_password'] != request.vars['password']:
            error += "Passwords didn't match"
        if "force" in request.vars and request.vars["force"].lower() == 'true':
            force = True
        if error == "":
            vidjil_utils.init_db_helper(db, auth, force=force, admin_email=request.vars['email'], admin_password=request.vars['password'])
        else :
            res = {"success" : "false",
                   "message" : error}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    res = {"redirect" : "default/user/login"}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def init_from_csv():
    if db(db.auth_user.id > 0).count() == 0:
        res = {"success" : "true", "message" : "Importing " + defs.DB_BACKUP_FILE}
        log.info(res)

        try:
            db.import_from_csv_file(open(defs.DB_BACKUP_FILE, 'rb'))
            # db.scheduler_task.truncate()
            # db.scheduler_run.truncate()
        except Exception as e:
            res = {"success": "false", "message": "!" + str(e)}
            log.error(res)
            raise

        res = {"success" : "true", "message" : "coucou"}
        log.info(res)

#########################################################################
## add a scheduller task to run vidjil on a specific sequence file
# need sequence_file_id, config_id
# need patient admin permission
def run_request():
    error = ""
    enough_space = vidjil_utils.check_enough_space(defs.DIR_RESULTS)
    if not enough_space:
        mail.send(to=defs.ADMIN_EMAILS,
            subject="[Vidjil] Server space",
            message="The space in directory %s has passed below %d%%." % (defs.DIR_RESULTS, defs.FS_LOCK_THRESHHOLD))
        return error_message("Runs are temporarily disabled. System admins have been made aware of the situation.")

    ##TODO check
    if not "sequence_file_id" in request.vars :
        error += "id sequence file needed, "
    if not "config_id" in request.vars:
        error += "id config needed, "
        id_config = None
    else:
        id_config = request.vars["config_id"]
    if not auth.can_process_sample_set(request.vars['sample_set_id']):
        error += "permission needed"

    id_sample_set = request.vars["sample_set_id"]

    if "grep_reads" in request.vars:
        grep_reads = request.vars["grep_reads"]
    else:
        grep_reads = None

    if not auth.can_modify_sample_set(id_sample_set) :
        error += "you do not have permission to launch process for this sample_set ("+str(id_sample_set)+"), "

    if id_config:
        if not auth.can_use_config(id_config) :
            error += "you do not have permission to launch process for this config ("+str(id_config)+"), "

    if error == "" :
        res = schedule_run(request.vars["sequence_file_id"], id_config, grep_reads)
        log.info("run requested", extra={'user_id': auth.user.id, 'record_id': request.vars['sequence_file_id'], 'table_name': 'sequence_file'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : "default/run_request : " + error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def run_contamination():
    task = scheduler.queue_task('compute_contamination', pvars=dict(sequence_file_id=request.vars["sequence_file_id"],
                                                                    results_file_id=request.vars["results_file_id"],
                                                                    config_id=request.vars["config_id"]),
             repeats = 1, timeout = defs.TASK_TIMEOUT,immediate=True)
    
    res = {"success" : "true",
           "processId" : task.id}
    log.error(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def run_extra():
    task = scheduler.queue_task('compute_extra', pvars=dict(id_file=request.vars["sequence_file_id"],
                                                            id_config=request.vars["config_id"],
                                                            min_threshold=5))
    res = {"success" : "true",
           "processId" : task.id}
    log.debug(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def checkProcess():
    task = db.scheduler_task[request.vars["processId"]]
    
    if task.status == "COMPLETED" :
        run = db( db.scheduler_run.task_id == task.id ).select()[0]
    
        res = {"success" : "true",
               "status" : task.status,
               "data" : run.run_result,
               "processId" : task.id}
    else :
        res = {"success" : "true",
               "status" : task.status,
               "processId" : task.id}
        
    log.error(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#########################################################################
## return .data file
# need sample_set/patient, config
# need sample_set admin or read permission
def get_data():
    from subprocess import Popen, PIPE, STDOUT
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                            vars=dict(_next=URL('default', 'get_data', scheme=True, host=True,
                                                vars=dict(sample_set_id = request.vars["sample_set_id"],
                                                          config =request.vars["config"]))
                                      )
                            )}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""
    
    if "patient" in request.vars :
        request.vars["sample_set_id"] = db.patient[request.vars["patient"]].sample_set_id

    download = False
    if "filename" in request.vars:
        download = True

    if "run" in request.vars :
        request.vars["sample_set_id"] = db.run[request.vars["run"]].sample_set_id
    
    if not "sample_set_id" in request.vars :
        error += "id sampleset file needed, "
    else : 
        if not auth.can_view_sample_set(request.vars["sample_set_id"]):
            error += "you do not have permission to consult this sample_set ("+str(request.vars["sample_set_id"])+")"
    if not "config" in request.vars:
        error += "id config needed, "


    sample_set = db.sample_set[request.vars["sample_set_id"]]
    
    query = db( ( db.fused_file.sample_set_id == request.vars["sample_set_id"])
               & ( db.fused_file.config_id == request.vars["config"] )
               ).select(db.fused_file.ALL).first()
    if query is not None:
        fused_file = defs.DIR_RESULTS+'/'+query.fused_file
        sequence_file_list = query.sequence_file_list

    if not 'fused_file' in locals():
        error += "file not found"

    if error == "" :

        f = open(fused_file, "r")
        data = gluon.contrib.simplejson.loads(f.read())
        f.close()
        
        patient_name = ""
        run_name = ""
        config_name = db.config[request.vars["config"]].name
        command = db.config[request.vars["config"]].command

        log_reference_id = request.vars["sample_set_id"]

        if (sample_set.sample_type == defs.SET_TYPE_GENERIC) :
            for row in db( db.generic.sample_set_id == request.vars["sample_set_id"] ).select() :
                log_reference_id = row.id
                generic_name = db.generic[row.id].name
                data["dataFileName"] = generic_name + " (" + config_name + ")"
                data["info"] = db.generic[row.id].info
                data["generic_id"] = row.id
                data["sample_name"] = generic_name
                data["group_id"] = get_set_group(row.sample_set_id)

        if (sample_set.sample_type == defs.SET_TYPE_PATIENT):
            for row in db( db.patient.sample_set_id == request.vars["sample_set_id"] ).select() :
                log_reference_id = row.id
                patient_name = vidjil_utils.anon_ids(row.id)
                data["dataFileName"] = patient_name + " (" + config_name + ")"
                data["info"] = db.patient[row.id].info
                data["patient_id"] = row.id
                data["sample_name"] = patient_name
                data["group_id"] = get_set_group(row.sample_set_id)

        if (sample_set.sample_type == defs.SET_TYPE_RUN) :
            for row in db( db.run.sample_set_id == request.vars["sample_set_id"] ).select() :
                log_reference_id = row.id
                run_name = db.run[row.id].name
                data["dataFileName"] = run_name + " (" + config_name + ")"
                data["info"] = db.run[row.id].info
                data["run_id"] = row.id
                data["sample_name"] = run_name
                data["group_id"] = get_set_group(row.sample_set_id)

        log_query = db(  ( db.user_log.record_id == log_reference_id )
                       & ( db.user_log.table_name == sample_set.sample_type )
                      ).select(db.user_log.ALL, orderby=db.user_log.created)

        data["logs"] = []
        for row in log_query:
            data["logs"].append({'message': row.msg, 'created': str(row.created)})

        ## récupération des infos stockées sur la base de données
        query = db(  ( db.sample_set.id == request.vars["sample_set_id"] )
                   & ( db.sample_set.id == db.sample_set_membership.sample_set_id )
                   & ( db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                   & ( db.results_file.sequence_file_id == db.sequence_file.id )
                   & ( db.results_file.config_id == request.vars["config"]  )
                   ).select(db.sequence_file.ALL,db.results_file.ALL, db.sample_set.id, orderby=db.sequence_file.id|~db.results_file.run_date)

        query2 = {}
        sequence_file_id = 0
        for row in query : 
            if row.sequence_file.id != sequence_file_id :
                query2[row.sequence_file.data_file]=row
                sequence_file_id = row.sequence_file.id
        
        data["sample_set_id"] = sample_set.id

        data["config_name"] = config_name
        data["samples"]["info"] = []
        data["samples"]["timestamp"] = []
        data["samples"]["sequence_file_id"] = []
        data["samples"]["results_file_id"] = []
        data["samples"]["config_id"] = []
        data["samples"]["names"] = []
        data["samples"]["db_key"] = []
        data["samples"]["id"] = []
        data["samples"]["patient_id"] = []
        data["samples"]["sample_name"] = []
        data["samples"]["run_id"] = []
        for i in range(len(data["samples"]["original_names"])) :
            o_n = data["samples"]["original_names"][i].split('/')[-1]
            data["samples"]["original_names"][i] = data["samples"]["original_names"][i].split('/')[-1]
            data["samples"]["config_id"].append(request.vars['config'])
            data["samples"]["db_key"].append('')
            data["samples"]["commandline"].append(command)
            if o_n in query2:
                row = query2[o_n]
                data["samples"]["info"].append(row.sequence_file.info)
                data["samples"]["timestamp"].append(str(row.sequence_file.sampling_date))
                data["samples"]["sequence_file_id"].append(row.sequence_file.id)
                data["samples"]["results_file_id"].append(row.results_file.id)
                data["samples"]["names"].append(row.sequence_file.filename.split('.')[0])
                data["samples"]["id"].append(row.sequence_file.id)
                data["samples"]["patient_id"].append(get_patient_id(row.sequence_file.id))
                data["samples"]["sample_name"].append(row.sequence_file.id)
                data["samples"]["run_id"].append(row.sequence_file.id)
            else :
                data["samples"]["info"].append("this file has been deleted from the database, info relative to this sample are no longer available")
                data["samples"]["timestamp"].append("None")
                data["samples"]["sequence_file_id"].append("")
                data["samples"]["results_file_id"].append("")
                data["samples"]["names"].append("deleted")
                data["samples"]["id"].append("")

        log.debug("get_data (%s) c%s -> %s (%s)" % (request.vars["sample_set_id"], request.vars["config"], fused_file, "downloaded" if download else "streamed"))
        log.info("load sample", extra={'user_id': auth.user.id, 'record_id': request.vars['sample_set_id'], 'table_name': 'sample_set'})

        dumped_json = gluon.contrib.simplejson.dumps(data, separators=(',',':'))

        if download:
             return response.stream(StringIO.StringIO(dumped_json), attachment = True, filename = request.vars['filename'])

        return dumped_json
    else :
        res = {"success" : "false",
               "message" : "get_data (%s) c%s : %s " % (request.vars["sample_set_id"], request.vars["config"], error)}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#########################################################################
def get_custom_data():
    from subprocess import Popen, PIPE, STDOUT
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True)} #TODO _next
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""

    if not "custom" in request.vars :
        error += "no file selected, "
    else:
        if type(request.vars['custom']) is not list or len(request.vars['custom']) < 2:
            error += "you must select several files."
        else:
            for id in request.vars["custom"] :
                log.debug("id = '%s'" % str(id))
                sequence_file_id = db.results_file[id].sequence_file_id
                sample_set_id = db((db.sample_set_membership.sequence_file_id == sequence_file_id)
                ).select(db.sample_set_membership.sample_set_id).first().sample_set_id
                if not auth.can_view_sample_set(sample_set_id):
                    error += "you do not have permission to consult this element ("+str(sample_set_id)+")"
            
    if error == "" :
        try:
            data = custom_fuse(request.vars["custom"])
        except IOError, error:
            return error_message(str(error))
        
        generic_info = "Compare samples"
        data["sample_name"] = generic_info
        data["dataFileName"] = generic_info
        data["info"] = generic_info
        data["samples"]["original_names"] = []
        data["samples"]["timestamp"] = []
        data["samples"]["info"] = []
        data["samples"]["commandline"] = []
        
        for id in request.vars["custom"] :
            sequence_file_id = db.results_file[id].sequence_file_id
            sample_set = db((db.sequence_file.id == sequence_file_id)
                            & (db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                            & (db.sample_set.id == db.sample_set_membership.sample_set_id)
                            & (db.sample_set.sample_type.belongs([defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]))
                            ).select(db.sample_set.id, db.sample_set.sample_type).first()

            patient_run = db(db[sample_set.sample_type].sample_set_id == sample_set.id).select().first()
            config_id = db.results_file[id].config_id
            name = vidjil_utils.anon_ids(patient_run.id) if sample_set.sample_type == defs.SET_TYPE_PATIENT else patient_run.name
            filename = db.sequence_file[sequence_file_id].filename
            data["samples"]["original_names"].append(name + "_" + filename)
            data["samples"]["timestamp"].append(str(db.sequence_file[sequence_file_id].sampling_date))
            data["samples"]["info"].append(db.sequence_file[sequence_file_id].info)
            data["samples"]["commandline"].append(db.config[config_id].command)

        log.info("load custom data #TODO log db")

        return gluon.contrib.simplejson.dumps(data, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : "default/get_custom_data : " + error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#########################################################################
## return .analysis file
# need patient_id
# need patient admin or read permission
def get_analysis():
    error = ""

    if "custom" in request.vars :
        res = {"success" : "true"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    if "patient" in request.vars :
        request.vars["sample_set_id"] = db.patient[request.vars["patient"]].sample_set_id

    download = False
    if "filename" in request.vars:
        download = True

    if "run" in request.vars :
        request.vars["sample_set_id"] = db.run[request.vars["run"]].sample_set_id
    
    if not "sample_set_id" in request.vars :
        error += "id sample_set file needed, "
    if not auth.can_view_sample_set(request.vars["sample_set_id"]):
        error += "you do not have permission to consult this sample_set ("+str(request.vars["sample_set_id"])+")"

    if "custom" in request.vars :
        return gluon.contrib.simplejson.dumps(get_default_analysis(), separators=(',',':'))
    
    if error == "" :
        
        ## récupération des infos se trouvant dans le fichier .analysis
        analysis_data = get_analysis_data(request.vars['sample_set_id'])
        #analysis_data["info_patient"] = db.patient[request.vars["patient"]].info
        dumped_json = gluon.contrib.simplejson.dumps(analysis_data, separators=(',',':'))

        log.info("load analysis", extra={'user_id': auth.user.id, 'record_id': request.vars['sample_id'], 'table_name': 'sample_set'})

        if download:
            return response.stream(StringIO.StringIO(dumped_json), attachment = True, filename = request.vars['filename'])

        return dumped_json

    else :
        res = {"success" : "false",
               "message" : "default/get_analysis : " + error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#########################################################################
## upload .analysis file and store it on the database
# need patient_id, fileToUpload
# need patient admin permission
def save_analysis():
    error = ""

    if "patient" in request.vars :
        request.vars["sample_set_id"] = db.patient[request.vars["patient"]].sample_set_id

    if "run" in request.vars :
        request.vars["sample_set_id"] = db.run[request.vars["run"]].sample_set_id

    if not "sample_set_id" in request.vars :
        error += "It is currently not possible to save an analysis on a comparison of samples, "
    elif not auth.can_save_sample_set(request.vars['sample_set_id']) :
        error += "you do not have permission to save changes on this sample set"

    if error == "" :
        f = request.vars['fileToUpload']
        ts = time.time()
        
        sample_set_id = request.vars['sample_set_id']
        
        analysis_id = db.analysis_file.insert(analysis_file = db.analysis_file.analysis_file.store(f.file, f.filename),
                                              sample_set_id = sample_set_id,
                                              analyze_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
                                              )

        sample_type = db.sample_set[sample_set_id].sample_type
        if (request.vars['info'] is not None):
            if (sample_type == defs.SET_TYPE_PATIENT) :
                db(db.patient.sample_set_id == sample_set_id).update(info = request.vars['info']);

            if (sample_type == defs.SET_TYPE_RUN) :
                db(db.run.sample_set_id == sample_set_id).update(info = request.vars['info']);

        if (request.vars['samples_id'] is not None and request.vars['samples_info'] is not None):
	    ids = request.vars['samples_id'].split(',')
	    infos = request.vars['samples_info'].split(',')
        
        
            # TODO find way to remove loop ?
            for i in range(0, len(ids)):
                if(len(ids[i]) > 0):
                    db(db.sequence_file.id == int(ids[i])).update(info = infos[i])

        #patient_name = db.patient[request.vars['patient']].first_name + " " + db.patient[request.vars['patient']].last_name

        res = {"success" : "true",
               "message" : "(%s): analysis saved" % (sample_set_id)}
        log.info(res, extra={'user_id': auth.user.id})

        log.info("save analysis", extra={'user_id': auth.user.id, 'record_id': request.vars['samples_id'], 'table_name': 'sample_set'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"success" : "false",
               "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



#########################################################################
def error():
    """
    Custom error handler that returns correct status codes,
    adapted from http://www.web2pyslices.com/slice/show/1529/custom-error-routing
    """

    code = request.vars.code
    request_url = request.vars.request_url
    requested_uri = request.vars.requested_uri
    ticket = request.vars.ticket
    response.status = int(code)

    assert(response.status == 500 and request_url != request.url) # avoid infinite loop

    ticket_url = '<a href="https://%(host)s/admin/default/ticket/%(ticket)s">%(ticket)s</a>' % { 'host':request.env.http_host,
                                                                                                 'ticket':ticket }
    log.error("Server error // %s" % ticket_url)

    user_str, x = log.process('', None)
    user_str = user_str.replace('<','').replace('>','').strip()

    mail.send(to=defs.ADMIN_EMAILS,
              subject="[Vidjil] Server error - %s" % user_str,
              message="<html>Ticket: %s<br/>At: %s<br />User: %s</html>" % (ticket_url, requested_uri, user_str))

    return "Server error"

    
def user():
    """
    exposes:
    http://..../[app]/default/user/login
    http://..../[app]/default/user/logout
    http://..../[app]/default/user/register
    http://..../[app]/default/user/profile
    http://..../[app]/default/user/retrieve_password
    http://..../[app]/default/user/change_password
    http://..../[app]/default/user/manage_users (requires membership in
    use @auth.requires_login()
        @auth.requires_membership('group name')
        @auth.requires_permission('read','table name',record_id)
    to decorate functions that need access control
    """

    #redirect already logged user 
    if auth.user and request.args[0] == 'login' :
        res = {"redirect" : URL('default', 'home', scheme=True, host=True)}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    #only authentified admin user can access register view
    if auth.user and request.args[0] == 'register' :
        #save admin session (the registering will automatically login the new user in order to initialize its default values)
        admin_auth = session.auth
        auth.is_logged_in = lambda: False
        
        def post_register(form):
            # Set up a new user, after register

            # Default permissions
            add_default_group_permissions(auth, auth.user_group())

            # Appartenance to the public group
            group_id = db(db.auth_group.role == 'public').select()[0].id
            db.auth_membership.insert(user_id = auth.user.id, group_id = group_id)

            log.admin('User %s <%s> registered, group %s' % (auth.user.id, auth.user.email, auth.user_group()))

            #restore admin session after register
            session.auth = admin_auth
            auth.user = session.auth.user
        auth.settings.register_onaccept = post_register
        
        #redirect to the last added user view
        auth.settings.logged_url = URL('user', 'info')
        auth.settings.login_next = URL('user', 'info')
        
        return dict(form=auth.register())
    
    #reject others
    if request.args[0] == 'register' :
        res = {"message": "you need to be admin and logged to add new users"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    return dict(form=auth())

def impersonate() :
    if auth.is_impersonating() :
        stop_impersonate()
    if request.vars["id"] != 0 :
        log.debug({"success" : "true", "message" : "impersonate >> %s" % request.vars["id"]})
        auth.impersonate(request.vars["id"]) 
        log.debug({"success" : "true", "message" : "impersonated"})
    if not 'admin' in request.vars['next']:
        res = {"redirect": "reload"}
    else:
        res = {"redirect" : URL('patient', 'index', scheme=True, host=True)}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def stop_impersonate() :
    if auth.is_impersonating() :
        log.debug({"success" : "true", "message" : "impersonate << stop"})
        auth.impersonate(0) 
        # force clean login (default impersonate don't restore everything :/ )
        auth.login_user(db.auth_user(auth.user.id))

    res = {"redirect" : "reload"}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## TODO make custom download for .data et .analysis
@cache.action()
def download():
    """
    allows downloading of uploaded files
    http://..../[app]/default/download/[filename]
    """
    return response.download(request, db, download_filename=request.vars.filename)

def download_data():

    file = "test"
    return response.stream( file, chunk_size=4096, filename=request.vars.filename)



#########################################################################
