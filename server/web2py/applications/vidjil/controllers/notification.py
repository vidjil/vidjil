# coding: utf8
from datetime import date
import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

    
ACCESS_DENIED = "access denied"

def index():
    if not auth.is_admin() :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))    

    query = db(db.notification).select(orderby=~db.notification.id)

    return dict(message="Notifications",
        query=query)

def info():

	query = db.notification[request.vars['id']]

	return dict(query=query)

# serve for to add a notification
def add():
    if (auth.is_admin()):
        return dict(message=T('add notification'))
    res = {"message": ACCESS_DENIED}
    log.error(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


# validate the form the user has posted
def add_form(): 
    if (not auth.is_admin()):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""
    if request.vars['title'] =="":
        error += "title needed, "
    if request.vars["message_content"] == "" :
        error += "message content needed, "
    if request.vars["message_type"] == "" :
        error += "type needed, "
    if request.vars["priority"] == "" :
        error += "priority needed, "
    if request.vars["expiration"] != "" :
        try:
            datetime.datetime.strptime(""+request.vars['expiration'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format)"

    if error=="" :
        id = db.notification.insert(title=request.vars["title"],
        						message_content=XML(request.vars["message_content"], sanitize=True).xml(),
                               message_type=request.vars["message_type"],
                               priority=request.vars["priority"],
                               expiration=request.vars["expiration"],
                               creator=auth.user_id)

        res = {"redirect": "notification/index",
               "args" : { "id" : id },
               "message": "notification added"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


# edit existing notification
def edit():
    if (auth.is_admin()):
        return dict(message=T('edit notification'))
    res = {"message": ACCESS_DENIED}
    log.error(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


# process submitted edit form
def edit_form():
    if (not auth.is_admin()):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    error = ""
    if request.vars["message_content"] == "" :
        error += "message body needed, "
    if request.vars["message_type"] == "" :
        error += "type needed, "
    if request.vars["priority"] == "" :
        error += "priority needed, "
    if request.vars["expiration"] != "" :
        try:
            datetime.datetime.strptime(""+request.vars['expiration'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format)"

    if error=="" :
        db.notification[request.vars['id']] = dict(title=request.vars["title"],
        						message_content=XML(request.vars["message_content"], sanitize=True).xml(),
                               message_type=request.vars["message_type"],
                               priority=request.vars["priority"],
                               expiration=request.vars["expiration"])

        res = {"redirect": "notification/index",
               "args" : { "id" : request.vars['id'] },
               "message": "notification updated"}
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : error}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def delete():
    if (not auth.is_admin()):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    db(db.notification.id==request.vars['id']).delete()
    res = {"redirect": "notification/index",
               "success": "true",
               "message": "notification " + request.vars['id'] + " deleted"}
    log.info(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':')) 

# 
def get_active_notifications():
    today = date.today()

    if (request.vars['type'] is not None):
        query = db(
        ((db.notification.expiration >= today)
            | (db.notification.expiration == None))
            & (db.notification.message_type == request.vars['type'])
        ).select()
    else :
        query = db(
            (db.notification.expiration >= today) | (db.notification.expiration == None)
        ).select()
    #TODO sanitize this response
    return query.as_json()
