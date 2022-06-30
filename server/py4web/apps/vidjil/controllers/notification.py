# coding: utf8
from sys import modules
from .. import defs

from ..modules.stats_decorator import *
import json

from datetime import datetime
from datetime import date 
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log

##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"
NOTIFICATION_CACHE_PREFIX = 'notification_'



##################################
# CONTROLLERS
##################################
@action("/vidjil/notification/index", method=["POST", "GET"])
@action.uses("notification/index.html", db, auth.user)
def index():
    user_id = auth.user_id if auth.user else None    
    query = None
    if "id" in request.query:
        query = db.notification[request.query['id']]
        log.debug('read notification %s' % request.query["id"])
    else:
        request.query['id'] = None
        log.debug('notification list')

    if auth.user and not 'redirected' in request.query:
        rows = db((db.user_preference.user_id==auth.user_id)
            &(db.user_preference.preference=='mail')
            &(db.user_preference.val==request.query['id'])).select()
        if len(rows) == 0 :
            db.user_preference.insert(
                user_id=auth.user_id,
                preference='mail',
                val=request.query['id'])

    notifications = db(db.notification).select(orderby=~db.notification.id)

    m_content =""
    if query and "message_content" in query:
        m_content = query["message_content"]

    return dict(message="News",
                query=query,
                m_content=m_content,
                notifications=notifications,
                auth=auth,
                db=db)

# serve for to add a notification
@action("/vidjil/notification/add", method=["POST", "GET"])
@action.uses("notification/add.html", db, auth.user)
def add():
    if (auth.is_admin()):
        return dict(message=T('add notification'), auth=auth, db=db)
    res = {"message": ACCESS_DENIED}

    log.error(res)
    return json.dumps(res, separators=(',',':'))


# validate the form the user has posted
@action("/vidjil/notification/add_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def add_form(): 
    if (not auth.is_admin()):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

    error = ""
    if request.params['title'] =="":
        error += "title needed, "
    if request.params["message_content"] == "" :
        error += "message content needed, "
    if request.params["message_type"] == "" :
        error += "type needed, "
    if request.params["priority"] == "" :
        error += "priority needed, "
    if request.params["expiration"] == "" :
        error += "expiration date required"
    else:
        try:
            datetime.strptime(""+request.params['expiration'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format)"

    if error=="" :
        id = db.notification.insert(title=request.params["title"],
                            message_content=XML(request.params["message_content"], sanitize=True).xml(),
                            message_type=request.params["message_type"],
                            priority=request.params["priority"],
                            expiration=request.params["expiration"],
                            creator=auth.user_id,
                            creation_datetime=datetime.now())

        res = {"redirect": "notification/index",
               "args" : { "id" : id,
                          "redirected" : True },
               "message": "notification added"}
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': id,
                'table_name': "notification"})

        return json.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))


# edit existing notification
@action("/vidjil/notification/edit", method=["POST", "GET"])
@action.uses("notification/edit.html", db, auth.user)
def edit():
    if (auth.is_admin()):
        return dict(message=T('edit notification'), auth=auth, db=db)
    res = {"message": ACCESS_DENIED}
    log.error(res)
    return json.dumps(res, separators=(',',':'))


# process submitted edit form
@action("/vidjil/notification/edit_form", method=["POST", "GET"])
@action.uses("notification/edit_form.html", db, auth.user)
def edit_form():
    if (not auth.is_admin()):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

    error = ""
    if request.params["message_content"] == "" :
        error += "message body needed, "
    if request.params["message_type"] == "" :
        error += "type needed, "
    if request.params["priority"] == "" :
        error += "priority needed, "
    if request.params["expiration"] == "" :
        error += "expiration date required"
    else:
        try:
            datetime.strptime(""+request.params['expiration'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format)"

    if error=="" :
        db.notification[request.params['id']] = dict(title=request.params["title"],
                            message_content=XML(request.params["message_content"], sanitize=True).xml(),
                            message_type=request.params["message_type"],
                            priority=request.params["priority"],
                            expiration=request.params["expiration"])

        db((db.user_preference.val==request.params['id'])
            &(db.user_preference.preference=='mail')).delete()

        res = {"redirect": "notification/index",
               "args" : { "id" : request.params['id'],
                          "redirected" : True },
               "message": "notification updated"}
        log.info(res, extra={'user_id': auth.user_id,
                'record_id': request.params["id"],
                'table_name': "notification"})

        return json.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false",
               "message" : error}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

@action("/vidjil/notification/delete", method=["POST", "GET"])
@action.uses("notification/delete.html", db, auth.user)
def delete():
    if (not auth.is_admin()):
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(',',':'))

    db(db.notification.id==request.query['id']).delete()
    # Cascade the notification deletion onto associated preferences
    db((db.user_preference.val==request.query['id'])
        &(db.user_preference.preference=='mail')).delete()
    res = {"redirect": "notification/index",
               "success": "true",
               "message": "notification " + request.query['id'] + " deleted"}
    log.info(res, extra={'user_id': auth.user_id,
            'record_id': request.query["id"],
            'table_name': "notification"})

    return json.dumps(res, separators=(',',':')) 


#
@action("/vidjil/notification/get_active_notifications", method=["POST", "GET"])
@action.uses( db, auth.user)
@cache.memoize(60)
def get_active_notifications():
    today = date.today()
    user_id = auth.user_id if auth.user else None    
    if user_id:
        key = NOTIFICATION_CACHE_PREFIX + str(user_id)
    else:
        key = NOTIFICATION_CACHE_PREFIX

    query = db(
        (db.notification.expiration >= today) | (db.notification.expiration == None)
    ).select(
        db.notification.ALL, db.user_preference.val,
        left=db.user_preference.on(
            (db.user_preference.val==db.notification.id)
            &(db.user_preference.user_id==user_id)))

    query = query.find(lambda row: row.user_preference.val is None)

    #TODO sanitize this response
    return query.as_json()

