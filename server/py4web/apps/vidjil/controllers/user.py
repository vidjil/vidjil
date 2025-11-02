import datetime
import json
from datetime import timedelta

from py4web import action, request
from pydal.validators import IS_EMAIL, IS_NOT_IN_DB

from ..common import T, auth, db, log
from ..modules import vidjil_utils
from ..modules.controller_utils import error_message

##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"


@action("/vidjil/user/index", method=["POST", "GET"])
@action.uses("user/index.html", db, auth.user)
@vidjil_utils.jsontransformer
def index():
    if not auth.is_admin():
        res = {
            "success": "false",
            "message": ACCESS_DENIED,
            "redirect": vidjil_utils.get_patient_redirect_url(),
        }
        log.info(res)
        return json.dumps(res, separators=(",", ":"))

    since = datetime.datetime.now() - timedelta(days=90)

    query = db(db.auth_user).select()

    groups = {
        g.id: {"id": g.id, "role": g.role, "description": g.description}
        for g in db(db.auth_group).select()
    }

    for row in query:
        row.created = db(db.patient.creator == row.id).count()

        row.access = ""
        if auth.can_create_sample_set(user=row.id):
            row.access += "c"

        q = [
            g.group_id
            for g in db(db.auth_membership.user_id == row.id).select(
                db.auth_membership.group_id
            )
        ]
        q.sort()
        row.groups = q

        count_files = db.sequence_file.size_file.count()
        sum_files = db.sequence_file.size_file.sum() + db.sequence_file.size_file2.sum()
        size_res = (
            db(db.sequence_file.provider == row.id)
            .select(count_files, sum_files)
            .first()
        )
        row.files = size_res[count_files] if size_res[count_files] is not None else 0
        row.size = size_res[sum_files] if size_res[sum_files] is not None else 0

        max_logins = db.auth_event.time_stamp.max()
        min_logins = db.auth_event.time_stamp.min()
        logins = (
            db(
                (db.auth_event.user_id == row.id)
                & (db.auth_event.origin == "auth")
                & (db.auth_event.description == f"User {row.id} Logged-in")
            )
            .select(min_logins, max_logins)
            .first()
        )
        row.first_login = (
            str(logins[min_logins]) if logins[min_logins] is not None else "-"
        )
        row.last_login = (
            str(logins[max_logins]) if logins[max_logins] is not None else "-"
        )
        # login status between never ('-'), recent (True) and old (False)
        row.login_status = (
            datetime.datetime.strptime(row.last_login, "%Y-%m-%d %H:%M:%S") > since
            if row.last_login != "-"
            else "-"
        )

    ##sort query
    reverse = False
    if "reverse" in request.query and request.query["reverse"] == "true":
        reverse = True
    if "sort" not in request.query:
        request.query["sort"] = ""

    if request.query["sort"] == "files":
        query = sorted(query, key=lambda row: row.size, reverse=reverse)
    elif request.query["sort"] == "patients":
        query = sorted(query, key=lambda row: row.created, reverse=reverse)
    elif request.query["sort"] == "login":
        query = sorted(query, key=lambda row: row.last_login, reverse=reverse)
    else:
        query = sorted(query, key=lambda row: row.id, reverse=False)

    log.info(
        "view user list",
        extra={"user_id": auth.user_id, "record_id": None, "table_name": "auth_user"},
    )
    return dict(query=query, groups=groups, reverse=reverse, auth=auth, db=db)


@action("/vidjil/user/edit", method=["POST", "GET"])
@action.uses("user/edit.html", db, auth.user)
@vidjil_utils.jsontransformer
def edit():
    if auth.can_modify_user(int(request.query["id"])):
        user = db.auth_user[request.query["id"]]
        log.info(
            "load edit form for user",
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["id"],
                "table_name": "auth_user",
            },
        )
        return dict(message=T("Edit user"), user=user, auth=auth, db=db)
    return error_message(ACCESS_DENIED)


@action("/vidjil/user/edit_form", method=["POST", "GET"])
@action.uses(db, auth.user)
def edit_form():
    if not auth.can_modify_user(int(request.params["id"])):
        log.error(ACCESS_DENIED)
        return error_message(ACCESS_DENIED)

    if request.params["confirm_password"] != request.params["password"]:
        error_to_display = "password fields must match"
        log.error(error_to_display)
        return error_message(error_to_display)

    updated_user = dict(
        first_name=request.params["first_name"], last_name=request.params["last_name"]
    )

    current_value = dict(db(db.auth_user.id == request.params["id"]).select()[0])

    email = request.params["email"]
    if email != "":
        if current_value["email"] == email:
            pass
        elif current_value["email"] != email and not auth.is_admin():
            error = "You cannot change yourself your email adress. Please contact an administrator to do this change."
            res = {"success": "false", "message": f"new_email: {error}"}
            log.error(res)
            return json.dumps(res, separators=(",", ":"))
        elif auth.is_admin():
            # Override du validateur pour qu'il ignore cet utilisateur
            db.auth_user.email.requires = (
                IS_EMAIL(),
                IS_NOT_IN_DB(
                    db,
                    "auth_user.email",
                    ignore_common_filters=[
                        current_value["email"]
                    ],  # Ignore current user
                    error_message="Email already exists",
                ),
            )
            new_email, error = db.auth_user.email.validate(
                email
            )  # Don't work anymore as IS_NOT_IN_DB is include in Field declaration for email value
            if error:
                res = {"success": "false", "message": f"new_email: {error}"}
                log.error(res)
                return json.dumps(res, separators=(",", ":"))
            updated_user["email"] = new_email
            log.debug(
                f"Admin update email address of user {current_value['id']} from '{current_value['email']}' to '{email}'"
            )

    log.debug(f"updated_user : {updated_user}")

    new_password = request.params["password"]
    if new_password != "":
        new_pwd, error = db.auth_user.password.validate(new_password)
        if error:
            res = {"success": "false", "message": f"new_password: {error}"}
            log.error(res)
            return json.dumps(res, separators=(",", ":"))
        updated_user["password"] = new_pwd
        updated_user["last_password_change"] = datetime.datetime.now()
        if auth.is_admin():
            updated_user["number_wrong_passwords"] = 0

    db(db.auth_user.id == request.params["id"]).update(**updated_user)

    res = {
        "redirect": "back",
        "message": f"{request.params['email']} ({request.params['id']}) user edited",
    }
    log.info(
        res,
        extra={
            "user_id": auth.user_id,
            "record_id": request.params["id"],
            "table_name": "auth_user",
        },
    )
    return json.dumps(res, separators=(",", ":"))


## return user information
## need ["id"]
@action("/vidjil/user/info", method=["POST", "GET"])
@action.uses("user/info.html", db, auth.user)
@vidjil_utils.jsontransformer
def info():
    # In case no ID is given, user the last added user ID
    if "id" not in request.query:
        request.query["id"] = (
            db().select(db.auth_user.ALL, orderby=~db.auth_user.id)[0].id
        )
    log.info(
        "view info for user (%d)" % int(request.query["id"]),
        extra={
            "user_id": auth.user_id,
            "record_id": request.query["id"],
            "table_name": "auth_user",
        },
    )
    return dict(message=T("user info"), auth=auth, db=db)
