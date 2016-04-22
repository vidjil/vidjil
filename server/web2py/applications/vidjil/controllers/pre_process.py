# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

    
ACCESS_DENIED = "access denied"

def index():
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    query = db((auth.accessible_query('read', db.pre_process) | auth.accessible_query('admin', db.pre_process) ) ).select(orderby=~db.pre_process.name)

    return dict(message=T('Pre-process list'),
               query=query,
               isAdmin = auth.is_admin())


def add(): 
    return dict(message=T('Add pre-process'))


def add_form(): 
    error =""

    required_fields = ['pre_process_name', 'pre_process_command']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :
        
        pre_proc_id = db.pre_process.insert(name=request.vars['pre_process_name'],
                        info=request.vars['pre_process_info'],
                        command=request.vars['pre_process_command']
                        )

	auth.add_permission(auth.user_group(), 'read', db.pre_process, pre_proc_id)

        res = {"redirect": "pre_process/index",
               "message": "pre_process '%s' added" % request.vars['pre_process_name']}
        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    return dict(message=T('edit config'))


def edit_form(): 
    error =""

    required_fields = ['pre_process_name', 'pre_process_command']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :

        db.pre_process[request.vars["id"]] = dict(name=request.vars['pre_process_name'],
                        info=request.vars['pre_process_info'],
                        command=request.vars['pre_process_command']
                        )

        res = {"redirect": "pre_process/index",
               "message": "pre_process '%s' updated" % request.vars['pre_process_name']}

        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def confirm():
    return dict(message=T('confirm pre_process deletion'))

def delete():
    
    #delete pre_process
    db(db.pre_process.id==request.vars["id"]).delete() 
    
    res = {"redirect": "pre_process/index",
           "message": "pre_process '%s' deleted" % request.vars["id"]}
    log.admin(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

## need ["sequence_file_id"]
## need ["sample_set_id"]
def info():
    if (auth.can_modify_sample_set(request.vars["sample_set_id"])):
        return dict(message=T('result info'))
    else :
        res = {"message": "acces denied"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
