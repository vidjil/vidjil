# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

def index():
    if not auth.user : 
        res = {"redirect" : "default/user/login"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    return dict(message=T('config_list'))


def add(): 
    return dict(message=T('add config'))


#TODO check data
def add_form(): 
    error =""

    if request.vars['config_name'] == "" :
        error += "name needed, "
    if request.vars['config_info'] == "" :
        error += "info needed, "
    if request.vars['config_command'] == "" : 
        error += "command needed, "  
    if request.vars['config_germline'] == "" : 
        error += "germline needed, "

    if error=="" :
        
        db.config.insert(name=request.vars['config_name'],
                        info=request.vars['config_info'],
                        command=request.vars['config_command'],
                        germline=request.vars['config_germline']
                        )

        res = {"redirect": "config/index",
               "message": "config added"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    return dict(message=T('edit config'))


def edit_form(): 
    import shutil, os.path
    
    error =""

    if request.vars['config_name'] == "" :
        error += "name needed, "
    if request.vars['config_info'] == "" :
        error += "info needed, "
    if request.vars['config_command'] == "" : 
        error += "command needed, "
    if request.vars['config_germline'] == "" : 
        error += "germline needed, "

    if error=="" :

        db.config[request.vars["id"]] = dict(name=request.vars['config_name'],
                                            info=request.vars['config_info'],
                                            command=request.vars['config_command'],
                                            germline=request.vars['config_germline']
                                            )

        res = {"redirect": "config/index",
               "message": "config saved"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def confirm():
    return dict(message=T('confirm config deletion'))

def delete():
    import shutil, os.path
    
    #delete results_file using this config
    db(db.results_file.config_id==request.vars["id"]).delete()
    
    #delete config
    db(db.config.id==request.vars["id"]).delete() 
    
    res = {"redirect": "config/index",
           "message": "config deleted"}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
