# coding: utf8
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    

## return admin_panel
def index():
    if auth.has_membership("admin"):
        return dict(message=T(''))


def result():
    if auth.has_membership("admin"):
        return dict(message=T(''))

def run_all():
    if auth.has_membership("admin"):
        query = db(
                (db.data_file.sequence_file_id==db.sequence_file.id)
                & (db.data_file.config_id==db.config.id)
            ).select()

        for row in query:
            schedule_run(row.sequence_file.id, row.config.id)

        res = {"success" : "true",
               "message" : "rerun all"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
