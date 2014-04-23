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
            
        row = db( ( db.data_file.config_id == request.vars["config_id" ] ) 
                 & ( db.data_file.sequence_file_id == request.vars["sequence_file_id"] )  
                 ).select()
        if len(row) > 0 :
            error += "run already done, "
        
        row2 = db( ( db.scheduler_task.args == '["'+request.vars["sequence_file_id"]+'", "'+request.vars["config_id"]+'"]' ) 
                 & ( db.scheduler_task.status != "FAILED"  )
                 & ( db.scheduler_task.status != "EXPIRED"  )
                 & ( db.scheduler_task.status != "TIMEOUT"  )
                 & ( db.scheduler_task.status != "COMPLETED"  )
                 ).select()
        
        if len(row2) > 0 :
            error += "run already registered, "
        
        if error == "" :
            scheduler.queue_task('run', [request.vars["sequence_file_id"],request.vars["config_id"]]
                                 , repeats = 1, timeout = 6000)
            
            res = {"success": "true" , "msg": "request added" }
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
        else :
            res = {"success" : "false", "msg" : error}
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
            
        
    res2 = {"success" : "false", "msg" : "connect error"}
    return gluon.contrib.simplejson.dumps(res2, separators=(',',':'))



def result():
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

        output_file = "result_patient_"+request.vars["patient_id"]+"_config_"+request.vars["config_id"]

        files = ""
        query = db( ( db.patient.id == db.sequence_file.patient_id )
                   & ( db.data_file.sequence_file_id == db.sequence_file.id )
                   & ( db.patient.id == request.vars["patient_id"] )
                   & ( db.data_file.config_id == request.vars["config_id"] )
                   ).select( orderby=db.sequence_file.sampling_date ) 
        for row in query :
            files += " applications/Vidjil/uploads/"+row.data_file.data_file
        
        if error == "" :
            cmd = "python ../fuse.py -o "+output_file+" -t 100 "+files
            p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
            
            time.sleep(1)
            
            f = open(output_file, "r")
            output=f.readlines()
            f.close()
            
            return output
        
        res = {"success" : "false", "msg" : "connect error"}
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
