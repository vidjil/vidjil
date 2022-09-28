# coding: utf8


import calendar
import time
import uuid

from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
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
        

@action("/vidjil/auth/login", method=["POST", "GET"])
@action.uses("auth/login.html", db, cors, flash)
def login():

    if globals().get('user'):
        res = {"redirect" : URL('default/home.html')}
        return json.dumps(res, separators=(',',':'))

    return dict(message="login page",
                auth=auth,
                db=db)

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
    else:
        data = auth._error(error)

    res = {"redirect" : URL('default/home.html')}
    return json.dumps(res, separators=(',',':'))


@action("/vidjil/auth/logout", method=["POST", "GET"])
@action.uses(db, session, auth, cors, flash)
def logout():
    session.clear()
    res = {"redirect" : URL('default/home.html')}
    return json.dumps(res, separators=(',',':'))
