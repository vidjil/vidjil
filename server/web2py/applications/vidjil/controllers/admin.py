# coding: utf8
import gluon.contrib.simplejson
import os.path
import defs
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    

## return admin_panel
def index():
    if auth.has_membership("admin"):
        return dict(message=T(''))
    
def worker():
    if auth.has_membership("admin"):
        return dict(message=T(''))

## to use after change in the upload folder
def repair_missing_files():
    if auth.has_membership("admin"):
        
        flist = ""
        for row in db(db.sequence_file.id>0 and db.sequence_file.data_file != None).select() : 
            seq_file = defs.DIR_SEQUENCES+row.data_file
            
            if not os.path.exists(seq_file) :
                db.sequence_file[row.id] = dict(data_file = None)
                flist += " : " + row.filename
            else :
                size = defs.format_size(os.path.getsize(seq_file))
                db.sequence_file[row.id] = dict(size_file = size)
                
        res = {"success" : "true", "message" : "path of missing files have been removed from the database"+flist}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
