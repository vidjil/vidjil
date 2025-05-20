# -*- coding: utf-8 -*-


import calendar
import json
import random
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
    """url must be a valid absolute URL without schema"""
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
    if "login" not in request.params or "password" not in request.params:
        res = {
            "redirect": URL("vidjil/auth/login"),
            "success": "false",
            "message": "Missing required parameter",
        }
        return json.dumps(res, separators=(",", ":"))

    user, error = auth.login(request.params["login"], request.params["password"])
    if user:
        #  We will process two_factor if two_factor_send is defined and either
        #  - No two_factor_required defined
        #    OR
        #  - two_factor_required() returns True
        #  If two_factor_required exists and returns False,
        #  then this user bypasses two_factor processing
        if auth.param.two_factor_send is not None:
            if not auth.param.two_factor_required or auth.param.two_factor_required(
                user, request
            ):
                auth.session["auth.2fa_user"] = user["id"]
                auth.session["auth.2fa_next_url"] = URL("default/home.html")
                res = {
                    "redirect": URL("auth/two_factor"),
                }
                return json.dumps(res, separators=(",", ":"))

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
        "user_id": user["id"] if user is not None else None,
        "user_email": user["email"] if user is not None else None,
        "success": "true" if user is not None else "false",
        "message": error,
    }
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/auth/two_factor", method=["POST", "GET"])
@action.uses("auth/two_factor.html", db, cors, flash, auth, session)
@vidjil_utils.jsontransformer
def two_factor():
    user_id = auth.session.get("auth.2fa_user")

    if not user_id:
        res = {"redirect": "vidjil/auth/login"}
        return json.dumps(res, separators=(",", ":"))

    code = auth.session.get("auth.2fa_code")
    if (not code) and (auth.param.two_factor_send is not None):
        # generate and send the code
        code = str(random.randint(100000, 999999))
        user = db.auth_user(user_id)
        code = auth.param.two_factor_send(user, code)
        # store code in session
        auth.session["auth.2fa_code"] = code
        auth.session["auth.2fa_tries_left"] = auth.param.two_factor_tries

    return dict(
        message="Enter verification code sent by email",
        auth=auth,
        db=db,
        settings=settings,
    )


@action("/vidjil/auth/submit_two_factor", method=["POST", "GET"])
@action.uses(db, cors, flash, auth, session)
@vidjil_utils.jsontransformer
def submit_two_factor():
    if "verification_code" not in request.params:
        _reset_two_factor()
        res = {
            "redirect": "vidjil/auth/login",
            "success": "false",
            "message": "Missing required parameter",
        }
        return json.dumps(res, separators=(",", ":"))

    submitted_code = str(request.params["verification_code"])
    code = str(auth.session.get("auth.2fa_code"))

    if submitted_code == code:
        # store user id session
        user_id = auth.session.get("auth.2fa_user")
        auth.store_user_in_session(user_id)
        # redirect after login
        next_url = auth.session.get("auth.2fa_next_url")
        res = {"redirect": next_url}
        # reset the 2f session
        _reset_two_factor()
        return json.dumps(res, separators=(",", ":"))
    else:
        # decrease the retries count
        auth.session["auth.2fa_tries_left"] -= 1
        # if 0 retries available, reset, and redirect to login
        if auth.session.get("auth.2fa_tries_left") < 1:
            _reset_two_factor()
            res = {
                "redirect": "vidjil/auth/login",
                "success": "false",
                "message": "Two factor max tries exceeded",
            }
            return json.dumps(res, separators=(",", ":"))
        else:
            res = {
                "redirect": "vidjil/auth/two_factor",
                "success": "false",
                "message": "Verification code does not match",
            }
            return json.dumps(res, separators=(",", ":"))


def _reset_two_factor():
    auth.session["auth.2fa_user"] = None
    auth.session["auth.2fa_code"] = None
    auth.session["auth.2fa_tries_left"] = auth.param.two_factor_tries


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

    auth.session.clear()
    session.clear()
    res = {"redirect": URL("default/home.html")}
    log.info("Logout")
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/auth/register", method=["POST", "GET"])
@action.uses("auth/register.html", db, auth)
@vidjil_utils.jsontransformer
def register():
    # only authenticated admin user can access register view
    if auth.is_admin():
        return dict(message=T("Register new user"), auth=auth, db=db)
    else:
        # not authenticated users
        res = {"message": "you need to be admin and logged to add new users"}
        return json.dumps(res, separators=(",", ":"))


@action("/vidjil/auth/register_form", method=["POST", "GET"])
@action.uses(db, auth)
def register_form():
    if not auth.is_admin():
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
