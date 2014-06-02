# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## This is a sample controller
## - index is the default action of any application
## - user is required for authentication and authorization
## - download is for downloading files uploaded in the db (does streaming)
## - call exposes all registered services (none by default)
#########################################################################


def index():
    """
    example action using the internationalization operator T and flash
    rendered by views/default/index.html or views/generic.html

    if you need a simple wiki simply replace the two lines below with:
    return auth.wiki()
    """
    response.flash = T("Welcome to Vidjil!")
    return dict(message=T('hello world'))

def help():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('help i\'m lost'))


## add a scheduller task to run vidjil on a specific sequence file
def run_request():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
        error = ""
        
        ##TODO check  
        if not "sequence_file_id" in request.vars :
            error += "id sequence file needed, "
        if not "config_id" in request.vars:
            error += "id config needed, "
        
        row2 = db( ( db.scheduler_task.args == '["'+request.vars["sequence_file_id"]+'", "'+request.vars["config_id"]+'"]' ) 
                 & ( db.scheduler_task.status != "FAILED"  )
                 & ( db.scheduler_task.status != "EXPIRED"  )
                 & ( db.scheduler_task.status != "TIMEOUT"  )
                 & ( db.scheduler_task.status != "COMPLETED"  )
                 ).select()
        
        if len(row2) > 0 :
            error += "run already registered, "
        
        if error == "" :
            
            ## create or update data file state
            row = db( ( db.data_file.config_id == request.vars["config_id" ] ) 
             & ( db.data_file.sequence_file_id == request.vars["sequence_file_id"] )  
             ).select()
            
            if len(row) > 0 : ## update
                data_id = row[0].data_file.id
                db.data_file[data_id] = dict(state = 'queued')
            else:             ## create
                data_id = db.data_file.insert(sequence_file_id = request.vars['sequence_file_id'],
                                            config_id = request.vars['config_id'],
                                            status = 'pending'
                                            )
                
            ## create or update fuse file state
            id_patient = db.sequence_file[request.vars["sequence_file_id"]].patient_id
            row = db( ( db.fused_file.config_id == request.vars["config_id"] ) & 
                      ( db.fused_file.patient_id == id_patient )  
                    ).select()

            if len(row) > 0 : ## update
                fuse_id = row[0].id
            else:             ## create
                fuse_id = db.fused_file.insert(patient_id = id_patient,
                                                config_id = request.vars['config_id'])
            
            ##add task to scheduller
            scheduler.queue_task('run', [request.vars["sequence_file_id"],request.vars["config_id"], data_id, fuse_id]
                                 , repeats = 1, timeout = 6000)
            
            res = {"success": "true" , "msg": "request added" }
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        else :
            res = {"success" : "false", "msg" : error}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
            
        
    res2 = {"success" : "false", "msg" : "connect error"}
    return gluon.contrib.simplejson.dumps(res2, separators=(',',':'))


def get_data():
    import time
    import gluon.contrib.simplejson
    from subprocess import Popen, PIPE, STDOUT
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400

        error = ""
        
        if not "patient_id" in request.vars :
            error += "id patient file needed, "
        if not "config_id" in request.vars:
            error += "id config needed, "

        query = db( ( db.fused_file.patient_id == request.vars["patient_id"] )
                   & ( db.fused_file.config_id == request.vars["config_id"] )
                   ).select() 
        for row in query :
            fused_file = "applications/vidjil/uploads/"+row.fused_file
        
        if error == "" :

            f = open(fused_file, "r")
            output=f.readlines()
            f.close()
            
            return output
        
        res = {"success" : "false", "msg" : "connect error"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    
def get_analysis():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    error = ""

    if not "patient_id" in request.vars :
        error += "id patient file needed, "
    if not "config_id" in request.vars:
        error += "id config needed, "
    
    ## empty analysis file
    res = {"custom": [],
           "cluster" : [],
           "info_patient" : "test info patient",
           "info_sequence_file" : [],
           "time": [],
           "time_order": []
           }
    
    ## récupération des infos stockées sur la base de données 
    query = db( ( db.patient.id == db.sequence_file.patient_id )
               & ( db.data_file.sequence_file_id == db.sequence_file.id )
               & ( db.patient.id == request.vars["patient_id"] )
               & ( db.data_file.config_id == request.vars["config_id"]  )
               ).select( orderby=db.sequence_file.sampling_date ) 

    order = 0
    for row in query :
        (filename, str) = db.sequence_file.data_file.retrieve(row.sequence_file.data_file)
        res["time"].append(filename)
        res["time_order"].append(order)
        res["info_sequence_file"].append(row.sequence_file.info) 
        order = order+1

    res["info_patient"] = db.patient[request.vars["patient_id"]].info
    
    ## récupération des infos se trouvant dans le fichier .analysis
    analysis_query = db(  (db.analysis_file.patient_id == 1)
               & (db.analysis_file.config_id == 1 )  )

    if not analysis_query.isempty() :
        row = analysis_query.select().first()
        f = open('applications/vidjil/uploads/'+row.analysis_file, "r")
        analysis = gluon.contrib.simplejson.loads(f.read())
        f.close()
            
        res["custom"] = analysis["custom"]
        res["cluster"] = analysis["cluster"]
    
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    
def save_analysis():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
    error = ""

    if not "patient_id" in request.vars :
        error += "id patient file needed, "
    if not "config_id" in request.vars:
        error += "id config needed, "
        
    if error == "" :
        analysis_query = db(  (db.analysis_file.patient_id == 1)
                            & (db.analysis_file.config_id == 1 )  )

        f = request.vars['fileToUpload']
        
        if not analysis_query.isempty() :
            analysis_id = analysis_query.select().first().id
            db.analysis_file[analysis_id] = dict(analysis_file = db.analysis_file.analysis_file.store(f.file, f.filename))
        else:           
            analysis_id = db.analysis_file.insert(analysis_file = db.analysis_file.analysis_file.store(f.file, f.filename),
                                                    config_id = request.vars['config_id'],
                                                    patient_id = request.vars['patient_id'],
                                                )
        
        
        res = {"success" : "true", "msg" : "analysis saved"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"success" : "false", "msg" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
def test_upload():
    response.title = ""
    return dict(message=T('test upload'))


@cache.action()
def download():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    """
    allows downloading of uploaded files
    http://..../[app]/default/download/[filename]
    """
    return response.download(request, db)


def call():
    """
    exposes services. for example:
    http://..../[app]/default/call/jsonrpc
    decorate with @services.jsonrpc the functions to expose
    supports xml, json, xmlrpc, jsonrpc, amfrpc, rss, csv
    """
    return service()


@auth.requires_signature()
def data():
    """
    http://..../[app]/default/data/tables
    http://..../[app]/default/data/create/[table]
    http://..../[app]/default/data/read/[table]/[id]
    http://..../[app]/default/data/update/[table]/[id]
    http://..../[app]/default/data/delete/[table]/[id]
    http://..../[app]/default/data/select/[table]
    http://..../[app]/default/data/search/[table]
    but URLs must be signed, i.e. linked with
      A('table',_href=URL('data/tables',user_signature=True))
    or with the signed load operator
      LOAD('default','data.load',args='tables',ajax=True,user_signature=True)
    """
    return dict(form=crud())


@auth.requires_login()
@auth.requires_membership('admin')
def add_membership(): 
    response.title = ""

    user_query = db(db.auth_user).select()
    group_query = db(~(db.auth_group.role.like("user%"))).select()
 
    form = SQLFORM.factory(
        Field('user', requires=IS_IN_SET([r.id for r in user_query], labels=[r.first_name+" "+r.last_name for r in user_query])),
        Field('group', requires=IS_IN_SET([r.id for r in group_query], labels=[r.role for r in group_query]))
        )

    if form.validate():
        db.auth_membership.insert(user_id=form.vars.user,
                                  group_id=form.vars.group)
        response.flash = "membership added"
        
    return dict(form=form)

def upload_file():
        import gluon.contrib.simplejson, shutil, os.path
        
        try:
            # Get the file from the form
            f = request.vars['files[]']
            p = request.vars['patient_id[]']
            i = request.vars['info[]']
            d = request.vars['date[]']
            
            # Store file
            id = db.sequence_file.insert(data_file = db.sequence_file.data_file.store(f.file, f.filename))
             
            record = db.sequence_file[id]
            path_list = []
            path_list.append(request.folder)
            path_list.append('uploads')
            path_list.append(record['data_file'])
            size =  shutil.os.path.getsize(shutil.os.path.join(*path_list))
            
            db.sequence_file[id] = dict(size_file=size ,
                                        patient_id=p,
                                        sampling_date=d,
                                        info=i)
            
            File = db(db.sequence_file.id==id).select()[0]
            res = dict(files=[{"name": str(f.filename), 
                               "size": size, 
                               "url": URL(f='download', args=[File['data_file']])
                               }])
            
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
 
        except:
            res = dict(files=[{"name": "kuik", "size": 0, "error": "fail!!" }])
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
 
 
def delete_file():
        try:
            id = request.args[0]
            query=db(db.sequence_file.id==id)
            patient_id=query.select()[0].patient_id
            query.delete()
            session.flash = "file deleted"
            redirect( URL(f='patient', args=[patient_id]) )
        except:
            redirect( URL(f='patient', args=[patient_id]) )
        

 
def upload():
        return dict()
    
def user():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
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
    return dict(form=auth())


def create_self_signed_cert(cert_dir):
    """
    create a new self-signed cert and key and write them to disk
    """
    from OpenSSL import crypto, SSL
    from socket import gethostname
    from pprint import pprint
    from time import gmtime, mktime
    from os.path import exists, join
 
    CERT_FILE = "ssl_certificate.crt"    
    KEY_FILE = "ssl_self_signed.key"
    ssl_created = False
    if not exists(join(cert_dir, CERT_FILE)) \
            or not exists(join(cert_dir, KEY_FILE)):
        ssl_created = True    
        # create a key pair
        k = crypto.PKey()
        k.generate_key(crypto.TYPE_RSA, 4096)
 
        # create a self-signed cert
        cert = crypto.X509()
        cert.get_subject().C = "AQ"
        cert.get_subject().ST = "State"
        cert.get_subject().L = "City"
        cert.get_subject().O = "Company"
        cert.get_subject().OU = "Organization"
        cert.get_subject().CN = gethostname()
        cert.set_serial_number(1000)
        cert.gmtime_adj_notBefore(0)
        cert.gmtime_adj_notAfter(10*365*24*60*60)
        cert.set_issuer(cert.get_subject())
        cert.set_pubkey(k)
        cert.sign(k, 'sha1')
 
        open(join(cert_dir, CERT_FILE), "wt").write(
            crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
        open(join(cert_dir, KEY_FILE), "wt").write(
            crypto.dump_privatekey(crypto.FILETYPE_PEM, k))
 
        create_self_signed_cert('.')
        
    return(ssl_created, cert_dir, CERT_FILE, KEY_FILE)
 
def generate_ssl_key():
    ssl_created, cert_dir, CERT_FILE, KEY_FILE = create_self_signed_cert(request.folder + "private/")
    return(dict(ssl_created=ssl_created, cert_dir=cert_dir, CERT_FILE=CERT_FILE, KEY_FILE=KEY_FILE))
