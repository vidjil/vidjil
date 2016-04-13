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

    required_fields = ['config_name', 'config_command', 'config_fuse_command', 'config_program']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :
        
        db.config.insert(name=request.vars['config_name'],
                        info=request.vars['config_info'],
                        command=request.vars['config_command'],
                        fuse_command=request.vars['config_fuse_command'],
                        program=request.vars['config_program']
                        )

        res = {"redirect": "config/index",
               "message": "config '%s' added" % request.vars['config_name']}
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

    required_fields = ['id', 'config_name', 'config_command', 'config_fuse_command', 'config_program']
    for field in required_fields:
        if request.vars[field] == "" :
            error += field+" needed, "

    if error=="" :

        db.config[request.vars["id"]] = dict(name=request.vars['config_name'],
                                             info=request.vars['config_info'],
                                             command=request.vars['config_command'],
                                             fuse_command=request.vars['config_fuse_command'],
                                             program=request.vars['config_program']
                                             )

        res = {"redirect": "config/index",
               "message": "config '%s' updated" % request.vars['config_name']}

        log.admin(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def confirm():
    return dict(message=T('confirm config deletion'))

def delete():
    #delete results_file using this config
    db(db.results_file.config_id==request.vars["id"]).delete()
    
    #delete config
    db(db.config.id==request.vars["id"]).delete() 
    
    res = {"redirect": "config/index",
           "message": "config '%s' deleted" % request.vars["id"]}
    log.admin(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
