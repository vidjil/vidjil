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
        
    return dict(message=T('standard_list'))

def add(): 
    return dict(message=T('add standard file'))

#TODO check data
def add_form(): 
    import shutil, os.path
        
    id = db.standard_file.insert(data_file = request.vars.file )
    
    db.standard_file[id] = dict(name=request.vars['standard_name'],
                                info=request.vars['standard_info'])
    
    res = {"success": "true" }
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

def edit():
    return dict(message=T('edit standard file'))

def edit_form(): 
    import shutil, os.path
    error = ""

    if request.vars["standard_name"] == "" :
        error += "standard name needed, "

    if error=="" :
        db.standard_file[request.vars["id"]] = dict(name=request.vars['standard_name'],
                                                    info=request.vars['standard_info'])

        res = {"success": "true" }
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "error" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
def confirm():
    return dict(message=T('confirm standard deletion'))
        
def delete():
    import shutil, os.path
    
    query = db( (db.config.standard_id==request.vars["id"])).select() 
    for row in query :
        #delete data file using old config 
        db(db.data_file.config_id == row.id).delete()
        #delete config
        db(db.config.id == row.id).delete()
    
    #delete standard
    db(db.standard_file.id == request.vars["id"]).delete()
    
    res = {"success": "true" }
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
