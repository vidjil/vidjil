# -*- coding: utf-8 -*-


import calendar
import json
import time
import uuid
from datetime import datetime

from py4web import URL, action, request

from .. import settings
from ..common import T, auth, cors, db, flash, log, session
from ..controllers.group import add_default_group_permissions
from ..modules import vidjil_utils
from ..modules.permission_enum import PermissionEnum

##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"


def prevent_open_redirect(url):
    """url must be a valid absolute URL whithout schema"""
    if url and url[0] == "/" and "//" not in url:
        return url
    return None


##################################
# CONTROLLERS
##################################


@action("/vidjil/auth/login", method=["POST", "GET"])
@action.uses("auth/login.html", db, cors, flash)
@vidjil_utils.jsontransformer
def login():
    if db(db.auth_user.id > 0).count() == 0:
        res = {"redirect": URL("default/init_db")}
        return json.dumps(res, separators=(",", ":"))

    if globals().get("user"):
        res = {"redirect": URL("default/home.html")}
        return json.dumps(res, separators=(",", ":"))

    return dict(message="login page", auth=auth, db=db, settings=settings)


@action("/vidjil/auth/submit", method=["POST", "GET"])
@action.uses(db, session, auth, cors, flash)
def submit():
    user, error = auth.login(request.params["login"], request.params["password"])
    if user:
        auth.session["user"] = {"id": user.get("id")}
        auth.session["recent_activity"] = calendar.timegm(time.gmtime())
        auth.session["uuid"] = str(uuid.uuid1())
        user = {f.name: user[f.name] for f in auth.db.auth_user if f.readable}
        log.info(
            "Login ",
            extra={
                "user_id": auth.current_user.get("id"),
                "timestamp": auth.session["recent_activity"],
            },
        )
        auth_event_data = dict(
            time_stamp=str(datetime.fromtimestamp(auth.session["recent_activity"])),
            client_ip=request.remote_addr,
            user_id=user.get("id"),
            origin="auth",
            description="User " + str(user.get("id")) + " Logged-in",
        )
        db.auth_event.insert(**auth_event_data)

    res = {
        "redirect": URL("default/home.html"),
        "error": error,
        "user_id": user["id"] if user is not None else None,
        "user_email": user["email"] if user is not None else None,
    }
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/auth/logout", method=["POST", "GET"])
@action.uses(db, session, auth, cors, flash)
def logout():
    if "user" in auth.session and "id" in auth.session["user"]:
        user_id = auth.session["user"]["id"]
        auth_event_data = dict(
            time_stamp=str(datetime.now()),
            client_ip=request.remote_addr,
            user_id=user_id,
            origin="auth",
            description="User " + str(user_id) + " Logged-out",
        )
        db.auth_event.insert(**auth_event_data)

    session.clear()
    res = {"redirect": URL("default/home.html")}
    log.info("Logout")
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/auth/register", method=["POST", "GET"])
@action.uses("auth/register.html", db, auth)
@vidjil_utils.jsontransformer
def register():
    # only authenticated admin user can access register view
    if auth.user:
        return dict(message=T("Register new user"), auth=auth, db=db)
    else:
        # not authenticated users
        res = {"message": "you need to be admin and logged to add new users"}
        return json.dumps(res, separators=(",", ":"))


@action("/vidjil/auth/register_form", method=["POST", "GET"])
@action.uses(db, auth)
def register_form():
    if not auth.user:
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return json.dumps(res, separators=(",", ":"))

    if request.params["confirm_password"] != request.params["password"]:
        res = {"success": "false", "message": "password fields must match"}
        log.error(res)
        return json.dumps(res, separators=(",", ":"))

    # Try and add user
    user_to_add = dict(
        first_name=request.params["first_name"],
        last_name=request.params["last_name"],
        email=request.params["email"],
        password=request.params["password"],
    )
    response = auth.register(user_to_add)
    errors = response.get("errors")
    if errors:
        res = {"success": "false", "message": json.dumps(errors)}
        log.error(res)
        return json.dumps(res, separators=(",", ":"))

    # Update user groups
    new_user_id = response["id"]
    new_user_email = request.params["email"]
    # create new user default group
    new_user_group_id = db.auth_group.insert(
        role=auth.user_group_role(new_user_id),
        description="Group uniquely assigned to user %i" % (new_user_id),
    )
    db.auth_membership.insert(user_id=new_user_id, group_id=new_user_group_id)
    # Default permissions
    add_default_group_permissions(auth, new_user_group_id, anon=True)
    auth.add_permission(
        new_user_group_id, PermissionEnum.access.value, "auth_group", new_user_group_id
    )
    # Join public group
    public_group_id = db(db.auth_group.role == "public").select()[0].id
    db.auth_membership.insert(user_id=new_user_id, group_id=public_group_id)

    log.admin(
        "User %s <%s> registered, group %s"
        % (new_user_id, new_user_email, new_user_group_id)
    )

    res = {
        "redirect": "back",
        "message": f"{request.params['email']} ({response['id']}) user added",
        "user_id": response["id"],
    }
    return json.dumps(res, separators=(",", ":"))
