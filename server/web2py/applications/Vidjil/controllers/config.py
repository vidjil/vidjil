# coding: utf8


def index():
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    return dict(message=T('config_list'))


def add(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('add config'))


#TODO check data
def add_form(): 
    import gluon.contrib.simplejson, shutil, os.path
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
        
    error =""

    if request.vars['config_name'] == "" :
        error += "name needed, "
    if request.vars['config_info'] == "" :
        error += "info needed, "
    if request.vars['config_standard'] == "" :
        error += "standard needed, "
    if request.vars['config_command'] == "" : 
        error += "command needed, "  

    if error=="" :
        
        db.config.insert(name=request.vars['config_name'],
                        info=request.vars['config_info'],
                        standard_id=request.vars['config_standard'],
                        command=request.vars['config_command'],
                        )

        res = {"success": "true" }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "error" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('edit config'))


def edit_form(): 
    import gluon.contrib.simplejson, shutil, os.path
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    error =""

    if request.vars['config_name'] == "" :
        error += "name needed, "
    if request.vars['config_info'] == "" :
        error += "info needed, "
    if request.vars['config_standard'] == "" :
        error += "standard needed, "
    if request.vars['config_command'] == "" : 
        error += "command needed, "  

    if error=="" :

        db.config[request.vars["id"]] = dict(name=request.vars['config_name'],
                                            info=request.vars['config_info'],
                                            standard_id=request.vars['config_standard'],
                                            command=request.vars['config_command'],
                                            )

        res = {"success": "true" }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "error" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def confirm():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('confirm config deletion'))

def delete():
    import gluon.contrib.simplejson, shutil, os.path
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    #delete data_file using this config
    db(db.data_file.config_id==request.vars["id"]).delete()
    
    #delete config
    db(db.config.id==request.vars["id"]).delete() 
    
    res = {"success": "true" }
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
