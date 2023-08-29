# -*- coding: utf-8 -*-


import calendar
import time
import uuid
from datetime import datetime

from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..controllers.group import add_default_group_permissions
import json
import re
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
from py4web.utils.auth import AuthAPI, DefaultAuthForms

from ..common import db, session, cors, T, flash, cache, authenticated, unauthenticated, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"
        
def prevent_open_redirect(url):
    """url must be a valid absolute URL whithout schema"""
    if url and url[0] == "/" and "//" not in url:
        return url
    return None

@action("/vidjil/auth/login", method=["POST", "GET"])
@action.uses("auth/login.html", db, cors, flash)
def login():

    if (db(db.auth_user.id > 0).count() == 0) :
        res = {"redirect" : URL('default/init_db')}
        return json.dumps(res, separators=(',',':'))

    if globals().get('user'):
        res = {"redirect" : URL('default/home.html')}
        return json.dumps(res, separators=(',',':'))

    return dict(message="login page",
                auth=auth,
                db=db,
                defs=defs)

@action("/vidjil/auth/submit", method=["POST", "GET"])
@action.uses(db, session, auth, cors, flash)
def submit():
    user, error = auth.login(request.params['login'], request.params['password'])
    if user:
        auth.session["user"] = {"id": user.get("id")}
        auth.session["recent_activity"] = calendar.timegm(time.gmtime())
        auth.session["uuid"] = str(uuid.uuid1())
        user = {f.name: user[f.name] for f in auth.db.auth_user if f.readable}
        data = {"user": user}
        log.info("Login ", extra={'user_id': auth.current_user.get('id'), "timestamp": auth.session["recent_activity"]})
        auth_event_data = dict(time_stamp=str(datetime.fromtimestamp(auth.session['recent_activity'])),
                         client_ip=request.remote_addr ,
                         user_id=user.get("id"),
                         origin="auth",
                         description='User ' + str(user.get("id")) + ' Logged-in')
        db.auth_event.insert(**auth_event_data)
    else:
        data = auth._error(error)

    res = {"redirect" : URL('default/home.html'), "error": error, "user_id": user["id"] if user != None else None, "user_email": user["email"] if user != None else None}
    return json.dumps(res, separators=(',',':'))


@action("/vidjil/auth/logout", method=["POST", "GET"])
@action.uses(db, session, auth, cors, flash)
def logout():
    user_id = auth.session["user"]["id"]
    session.clear()
    res = {"redirect" : URL('default/home.html')}
    log.info("Logout ", extra={'user_id': auth.current_user.get('id'), "timestamp": calendar.timegm(time.gmtime())})
    auth_event_data = dict(time_stamp=str(datetime.now()),
                         client_ip=request.remote_addr ,
                         user_id=user_id,
                         origin="auth",
                         description='User ' + str(user_id) + ' Logged-out')
    db.auth_event.insert(**auth_event_data)
    return json.dumps(res, separators=(',',':'))

@action("/vidjil/auth/register", method=["POST", "GET"])
@action.uses("auth_form.html", db, session, auth, cors, flash)
def register():
    #only authentified admin user can access register view
    if auth.user:
        daf = DefaultAuthForms(auth)
        
        @action.uses(db, session, auth, flash)
        def post_register(form, user):
            # Set up a new user, after register
            new_user_id = db(db.auth_user).select(orderby=db.auth_user.id).last().id
            new_user_email = db(db.auth_user).select(orderby=db.auth_user.id).last().email
            # create new user default group 
            new_user_group_id = db.auth_group.insert(role = "user_%i"%(new_user_id), 
                                                     description = "Group uniquely assigned to user %i"%(new_user_id))
            db.auth_membership.insert(user_id = new_user_id, group_id = new_user_group_id)

            # Default permissions
            add_default_group_permissions(auth, new_user_group_id, anon=True)

            # Join public group
            public_group_id = db(db.auth_group.role == 'public').select()[0].id
            db.auth_membership.insert(user_id = new_user_id, group_id = public_group_id)

            log.admin('User %s <%s> registered, group %s' % (new_user_id, new_user_email, new_user_group_id))


        auth.on_accept['register'] = post_register
        
        #redirect to the last added user view
        next_url = prevent_open_redirect(URL("index"))
        auth.session["_next_register"] = next_url
        form=daf.register()
        return dict(title="register user",
                    auth=auth,
                    db=db,
                    form=form)
    
    #unauthentified users
    else:
        res = {"message": "you need to be admin and logged to add new users"}
        return json.dumps(res, separators=(',',':'))
