# coding: utf8
from datetime import date
from datetime import datetime

import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

    
ACCESS_DENIED = "access denied"
NOTIFICATION_CACHE_PREFIX = 'notification_'

def index():
    user_id = auth.user.id if auth.user else None    

    query = None
    if request.vars['id']:
        query = db.notification[request.vars['id']]
        log.debug('read notification %s' % request.vars["id"])
    else:
        log.debug('notification list')
    if auth.user:
        rows = db((db.user_preference.user_id==auth.user.id)
            &(db.user_preference.preference=='mail')
            &(db.user_preference.val==request.vars['id'])).select()
        if len(rows) == 0:
            db.user_preference.insert(
                user_id=auth.user.id,
                preference='mail',
                val=request.vars['id'])

            # Clear cache of this user
            cache.ram.clear(regex=NOTIFICATION_CACHE_PREFIX + str(user_id))

    notifications = db(db.notification).select(orderby=~db.notification.id)
         
    return dict(message="News",
                query=query,
                notifications=notifications)

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
    if request.vars["expiration"] == "" :
        error += "expiration date required"
    else:
        try:
            datetime.strptime(""+request.vars['expiration'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format)"

    if error=="" :
        id = db.notification.insert(title=request.vars["title"],
                            message_content=XML(request.vars["message_content"], sanitize=True).xml(),
                            message_type=request.vars["message_type"],
                            priority=request.vars["priority"],
                            expiration=request.vars["expiration"],
                            creator=auth.user_id,
                            creation_datetime=datetime.now())

        res = {"redirect": "notification/index",
               "args" : { "id" : id },
               "message": "notification added"}
        log.info(res, extra={'user_id': auth.user.id,
                'record_id': id,
                'table_name': "notification"})
        # Clear cache of all notifications
        cache.ram.clear(regex=NOTIFICATION_CACHE_PREFIX + '*')
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
    if request.vars["expiration"] == "" :
        error += "expiration date required"
    else:
        try:
            datetime.strptime(""+request.vars['expiration'], '%Y-%m-%d')
        except ValueError:
            error += "date (wrong format)"

    if error=="" :
        db.notification[request.vars['id']] = dict(title=request.vars["title"],
                            message_content=XML(request.vars["message_content"], sanitize=True).xml(),
                            message_type=request.vars["message_type"],
                            priority=request.vars["priority"],
                            expiration=request.vars["expiration"])

        db((db.user_preference.val==request.vars['id'])
            &(db.user_preference.preference=='mail')).delete()

        res = {"redirect": "notification/index",
               "args" : { "id" : request.vars['id'] },
               "message": "notification updated"}
        log.info(res, extra={'user_id': auth.user.id,
                'record_id': request.vars["id"],
                'table_name': "notification"})
        # Clear cache of all notifications
        cache.ram.clear(regex=NOTIFICATION_CACHE_PREFIX + '*')
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
    # Cascade the notification deletion onto associated preferences
    db((db.user_preference.val==request.vars['id'])
        &(db.user_preference.preference=='mail')).delete()
    res = {"redirect": "notification/index",
               "success": "true",
               "message": "notification " + request.vars['id'] + " deleted"}
    log.info(res, extra={'user_id': auth.user.id,
            'record_id': request.vars["id"],
            'table_name': "notification"})
    # Clear cache of all notifications
    cache.ram.clear(regex=NOTIFICATION_CACHE_PREFIX + '*')
    return gluon.contrib.simplejson.dumps(res, separators=(',',':')) 

#
def get_active_notifications():
    today = date.today()
    user_id = auth.user.id if auth.user else None    
    if user_id:
        key = NOTIFICATION_CACHE_PREFIX + str(user_id)
    else:
        key = NOTIFICATION_CACHE_PREFIX

    # Force retrieval of the cache even if no value is set 
    cached = cache.ram(key, lambda: None, time_expire=None)
    if not cached:
        # No cache found: query database
        query = db(
            (db.notification.expiration >= today) | (db.notification.expiration == None)
        ).select(
            db.notification.ALL, db.user_preference.val,
            left=db.user_preference.on(
                (db.user_preference.val==db.notification.id)
                &(db.user_preference.user_id==user_id)))

        query = query.find(lambda row: row.user_preference.val is None)
        cached = cache.ram(key, lambda: query, time_expire=0)

    #TODO sanitize this response
    return cached.as_json()

