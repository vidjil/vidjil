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
import logging

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
    if db(db.auth_user.id > 0).count() == 0:
        id_first_user=""

        ## création du premier user
        id_first_user=db.auth_user.insert(
            password = db.auth_user.password.validate('1234')[0],
            email = 'plop@plop.com',
            first_name = 'System',
            last_name = 'Administrator'
        )

        ## création des groupes de base
        id_admin_group=db.auth_group.insert(role='admin')
        id_sa_group=db.auth_group.insert(role='user_1')
        db.auth_group.insert(role="public")

        db.auth_membership.insert(user_id=id_first_user, group_id=id_admin_group)
        db.auth_membership.insert(user_id=id_first_user, group_id=id_sa_group)

        ##création des configs de base
        id_config_TRG = db.config.insert(
            name = 'TRG',
            command = '-c clones -z 100 -R 1 -r 1 -G germline/TRG ',
            info = 'default trg config'
        )

        id_config_IGH = db.config.insert(
            name = 'IGH',
            command = '-c clones -d -z 100 -R 1 -r 1 -G germline/IGH ',
            info = 'default igh config'
        )

        ## permission
        ## system admin have admin/read/create rights on all patients, groups and configs
        auth.add_permission(id_admin_group, 'admin', db.patient, 0)
        auth.add_permission(id_admin_group, 'admin', db.auth_group, 0)
        auth.add_permission(id_admin_group, 'admin', db.config, 0)
        auth.add_permission(id_admin_group, 'read', db.patient, 0)
        auth.add_permission(id_admin_group, 'read', db.auth_group, 0)
        auth.add_permission(id_admin_group, 'read', db.config, 0)
        auth.add_permission(id_admin_group, 'create', db.patient, 0)
        auth.add_permission(id_admin_group, 'create', db.auth_group, 0)
        auth.add_permission(id_admin_group, 'create', db.config, 0)

def init_from_csv():
    if db(db.auth_user.id > 0).count() == 0:
        res = {"success" : "true", "message" : "Importing " + defs.DB_BACKUP_FILE}
        log.info(res)

        try:
            db.import_from_csv_file(open(defs.DB_BACKUP_FILE, 'rb'), null='')
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

    ##TODO check
    if not "sequence_file_id" in request.vars :
        error += "id sequence file needed, "
    if not "config_id" in request.vars:
        error += "id config needed, "
        id_config = None
    else:
        id_config = request.vars["config_id"]
    if not auth.has_permission("run", "results_file") and not auth.has_membership("admin") :
        error += "permission needed"

    id_patient = db.sequence_file[request.vars["sequence_file_id"]].patient_id

    if not auth.has_permission('admin', 'patient', id_patient) :
        error += "you do not have permission to launch process for this patient ("+str(id_patient)+"), "

    if id_config:
      if not auth.has_permission('read', 'config', id_config) :
        error += "you do not have permission to launch process for this config ("+str(id_config)+"), "

    if error == "" :
        res = schedule_run(request.vars["sequence_file_id"], request.vars["config_id"])
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : "default/run_request : " + error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



#########################################################################
## return .data file
# need patient, config
# need patient admin or read permission
def get_data():
    import time
    from subprocess import Popen, PIPE, STDOUT
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                            vars=dict(_next=URL('default', 'get_data', scheme=True, host=True,
                                                vars=dict(patient = request.vars["patient"],
                                                          config =request.vars["config"]))
                                      )
                            )}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""

    if not "patient" in request.vars :
        error += "id patient file needed, "
    if not "config" in request.vars:
        error += "id config needed, "
    if not auth.has_permission('admin', 'patient', request.vars["patient"]) and \
    not auth.has_permission('read', 'patient', request.vars["patient"]):
        error += "you do not have permission to consult this patient ("+request.vars["patient"]+")"

    query = db( ( db.fused_file.patient_id == request.vars["patient"] )
               & ( db.fused_file.config_id == request.vars["config"] )
               ).select()
    for row in query :
        fused_file = defs.DIR_RESULTS+'/'+row.fused_file
        sequence_file_list = row.sequence_file_list

    if not 'fused_file' in locals():
        error += "file not found"

    if error == "" :

        f = open(fused_file, "r")
        data = gluon.contrib.simplejson.loads(f.read())
        f.close()
        
        patient_name = vidjil_utils.anon(request.vars["patient"], auth.user_id)
        config_name = db.config[request.vars["config"]].name
        command = db.config[request.vars["config"]].command
        
        data["patient_name"] = patient_name
        data["config_name"] = config_name
        data["dataFileName"] = patient_name + " (" + config_name + ")"
        data["info"] = db.patient(request.vars["patient"]).info
        
        data["samples"]["info"] = []
        data["samples"]["timestamp"] = []
        for i in range(len(data["samples"]["original_names"])) :
            data["samples"]["original_names"][i] = data["samples"]["original_names"][i].split('/')[-1]
            data["samples"]["info"].append('')
            data["samples"]["timestamp"].append('')

        ## récupération des infos stockées sur la base de données
        query = db( ( db.patient.id == db.sequence_file.patient_id )
                   & ( db.results_file.sequence_file_id == db.sequence_file.id )
                   & ( db.patient.id == request.vars["patient"] )
                   & ( db.results_file.config_id == request.vars["config"]  )
                   ).select( orderby=db.sequence_file.id|db.results_file.run_date, groupby=db.sequence_file.id )

        for row in query :
            filename = row.sequence_file.filename
            for i in range(len(data["samples"]["original_names"])) :
                data_file = data["samples"]["original_names"][i]
                if row.sequence_file.data_file == data_file :
                    data["samples"]["original_names"][i] = filename
                    data["samples"]["timestamp"][i] = str(row.sequence_file.sampling_date)
                    data["samples"]["info"][i] = row.sequence_file.info
                    data["samples"]["commandline"][i] = command
                
        log.debug("get_data (%s) c%s -> %s" % (request.vars["patient"], request.vars["config"], fused_file))
        return gluon.contrib.simplejson.dumps(data, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : "get_data (%s) c%s : %s " % (request.vars["patient"], request.vars["config"], error)}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#########################################################################
def get_custom_data():
    import time
    import vidjil_utils
    from subprocess import Popen, PIPE, STDOUT
    if not auth.user :
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True)} #TODO _next
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""

    if not "custom" in request.vars :
        error += "no file selected, "
    else:
        for id in request.vars["custom"] :
            sequence_file_id = db.results_file[id].sequence_file_id
            patient_id =db.sequence_file[sequence_file_id].patient_id
            if not auth.has_permission('admin', 'patient', patient_id) and \
                not auth.has_permission('read', 'patient', patient_id):
                error += "you do not have permission to consult this patient ("+str(patient_id)+")"
            
    if error == "" :
        data = custom_fuse(request.vars["custom"])
        
        data["dataFileName"] = "Compare patients"
        data["info"] = "Compare patients"
        data["samples"]["original_names"] = []
        data["samples"]["timestamp"] = []
        data["samples"]["info"] = []
        data["samples"]["commandline"] = []
        
        for id in request.vars["custom"] :
            sequence_file_id = db.results_file[id].sequence_file_id
            patient_id = db.sequence_file[sequence_file_id].patient_id
            config_id = db.results_file[id].config_id
            patient_name = vidjil_utils.anon(patient_id, auth.user_id)
            filename = db.sequence_file[sequence_file_id].filename
            data["samples"]["original_names"].append(patient_name + "_" + filename)
            data["samples"]["timestamp"].append(str(db.sequence_file[sequence_file_id].sampling_date))
            data["samples"]["info"].append(db.sequence_file[sequence_file_id].info)
            data["samples"]["commandline"].append(db.config[config_id].command)

        return gluon.contrib.simplejson.dumps(data, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : "default/get_custom_data : " + error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
#########################################################################
## return .analysis file
# need patient_id, config_id
# need patient admin or read permission
def get_analysis():
    error = ""

    if not "patient" in request.vars :
        error += "id patient file needed, "
    if not "config" in request.vars:
        error += "id config needed, "
    if not auth.has_permission('admin', 'patient', request.vars["patient"]) and \
    not auth.has_permission('read', 'patient', request.vars["patient"]):
        error += "you do not have permission to consult this patient ("+str(request.vars["patient"])+")"

    ## empty analysis file
    res = {"samples": {"number": 0,
                      "original_names": [],
                      "order": [],
                      "info_sequence_file" : []
                       },
           "custom": [],
           "clusters": [],
           "clones" : [],
           "tags": {},
           "vidjil_json_version" : "2014.09"
           }

    if "custom" in request.vars :
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    if error == "" :

        ## récupération des infos se trouvant dans le fichier .analysis
        analysis_query = db(  (db.analysis_file.patient_id == request.vars["patient"])
                   & (db.analysis_file.config_id == request.vars["config"] )  )

        if not analysis_query.isempty() :
            row = analysis_query.select().first()
            f = open(defs.DIR_RESULTS+'/'+row.analysis_file, "r")
            analysis = gluon.contrib.simplejson.loads(f.read())
            f.close()
            if 'cluster' in analysis:
                res["clusters"] = analysis["cluster"]
            if 'clusters' in analysis :
                res["clusters"] = analysis["clusters"]
            res["clones"] = analysis["clones"]
            res["tags"] = analysis["tags"]
            res["samples"]= analysis["samples"]

        res["info_patient"] = db.patient[request.vars["patient"]].info
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : "default/get_analysis : " + error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#########################################################################
## upload .analysis file and store it on the database
# need patient_id, config_id, fileToUpload
# need patient admin permission
def save_analysis():
    error = ""

    if not "patient" in request.vars :
        error += "id patient file needed, "
    if not "config" in request.vars:
        error += "id config needed, "
    if not auth.has_permission('admin', 'patient', request.vars['patient']) :
        error += "you do not have permission to save changes on this patient"

    if error == "" :
        analysis_query = db(  (db.analysis_file.patient_id == request.vars['patient'])
                            & (db.analysis_file.config_id == request.vars['config'] )  )

        f = request.vars['fileToUpload']

        ts = time.time()
        if not analysis_query.isempty() :
            analysis_id = analysis_query.select().first().id
            db.analysis_file[analysis_id] = dict(analysis_file = db.analysis_file.analysis_file.store(f.file, f.filename),
                                                 analyze_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
                                                 )
        else:

            analysis_id = db.analysis_file.insert(analysis_file = db.analysis_file.analysis_file.store(f.file, f.filename),
                                                  config_id = request.vars['config'],
                                                  patient_id = request.vars['patient'],
                                                  analyze_date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
                                                  )

        patient_name = db.patient[request.vars['patient']].first_name + " " + db.patient[request.vars['patient']].last_name

        res = {"success" : "true",
               "message" : "%s (%s) c%s: analysis saved" % (patient_name, request.vars['patient'], request.vars['config'])}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"success" : "false",
               "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



#########################################################################
def handle_error():
    """
    Custom error handler that returns correct status codes,
    adapted from http://www.web2pyslices.com/slice/show/1529/custom-error-routing
    """

    code = request.vars.code
    request_url = request.vars.request_url
    ticket = request.vars.ticket

    log.error("[%s] %s" % (code, ticket))

    if code is not None and request_url != request.url:# Make sure error url is not current url to avoid infinite loop.
        response.status = int(code) # Assign the error status code to the current response. (Must be integer to work.)

    if code == '403':
        return "Not authorized"
    elif code == '404':
        return "Not found"
    elif code == '500':
        # Get ticket URL:
        ticket_url = "<a href='%(scheme)s://%(host)s/admin/default/ticket/%(ticket)s' target='_blank'>%(ticket)s</a>" % {'scheme':'https','host':request.env.http_host,'ticket':ticket}

        # Email a notice, etc:
        mail.send(to=['contact@vidjil.org'],
                  subject="[Vidjil] web2py error",
                  message="Error Ticket:  %s" % ticket_url)

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
        res = {"redirect" : URL('patient', 'index', scheme=True, host=True)}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    #only authentified admin user can access register view
    if auth.user and request.args[0] == 'register' :
        #save admin session (the registering will automatically login the new user in order to initialize its default values)
        admin_auth = session.auth
        auth.is_logged_in = lambda: False
        
        def post_register(form):
            #default values for new user
            group_id = db(db.auth_group.role == 'public' ).select()[0].id
            db.auth_membership.insert(user_id = auth.user.id, group_id = group_id)
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
