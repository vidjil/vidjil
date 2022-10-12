import gluon.contrib.simplejson
import re
from controller_utils import error_message
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = 'access denied'
        
## return user list
def index():
    
    query = db(db.auth_user).select()

    for row in query :
        row.created = db( db.patient.creator == row.id ).count()
        
        row.access = ''
        if auth.can_create_patient(user=row.id): row.access += 'c'

        q = [g.group_id for g in db(db.auth_membership.user_id==row.id).select()]
        q.sort()
        row.groups = ' '.join([str(g) for g in q])

        row.size = 0
        row.files = 0
        query_size = db( db.sequence_file.provider == row.id ).select()
        
        for row2 in query_size:
            row.files += 1
            row.size += row2.size_file

        last_logins = db((db.auth_event.user_id==row.id)
                        &(db.auth_event.description=='User ' + str(row.id) + ' Logged-in')
                        &(db.auth_event.origin=='auth')).select(db.auth_event.time_stamp,
                                                                orderby=~db.auth_event.time_stamp)
        
        row.first_login = str(last_logins[-1].time_stamp) if len(last_logins) > 0 else '-'
        row.last_login = str(last_logins[0].time_stamp) if len(last_logins) > 0 else '-'

    ##sort query
    reverse = False
    if request.vars["reverse"] == "true" :
        reverse = True
    if request.vars["sort"] == "files" :
        query = sorted(query, key = lambda row : row.size, reverse=reverse)
    elif request.vars["sort"] == "patients" :
        query = sorted(query, key = lambda row : row.created, reverse=reverse)
    elif request.vars["sort"] == "login" :
        query = sorted(query, key = lambda row : row.last_login, reverse=reverse)
    else:
        query = sorted(query, key = lambda row : row.id, reverse=False)

    log.info("view user list", extra={'user_id': auth.user.id, 'record_id': None, 'table_name': 'auth_user'})
    return dict(query=query,
    			reverse=reverse)

def edit():
    if auth.can_modify_user(int(request.vars['id'])):
        user = db.auth_user[request.vars["id"]]
        log.info("load edit form for user",
                extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'auth_user'})
        return dict(message=T("Edit user"), user=user)
    return error_message(ACCESS_DENIED)

def edit_form():
    if auth.can_modify_user(int(request.vars['id'])):
        error = []
        if request.vars["first_name"] == "" :
            error.append("first name needed")
        if request.vars["last_name"] == "" :
            error.append("last name needed")
        if request.vars["email"] == "":
            error.append("email cannot be empty")
        elif not re.match(r"[^@]+@[^@]+\.[^@]+", request.vars["email"]):
            error.append("incorrect email format")

        if request.vars["password"] != "":
            if request.vars["confirm_password"] != request.vars["password"]:
                error.append("password fields must match")
            else:
                password = db.auth_user.password.validate(request.vars["password"])[0]
                if not password:
                    error.append("Password is too short, should be at least of length "+str(auth.settings.password_min_length))

        if len(error) == 0:
            data = dict(first_name = request.vars["first_name"],
                                                    last_name = request.vars["last_name"],
                                                    email = request.vars["email"])
            if 'password' in vars():
                data["password"] = password

            db.auth_user[request.vars['id']] = data
            db.commit()
            res = {"redirect": "back",
                    "message": "%s (%s) user edited" % (request.vars["email"], request.vars["id"])}
            log.info(res,
                extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'auth_user'})
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        else :
            res = {"success" : "false", "message" : ', '.join(error)}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

## return user information
## need ["id"]
def info():
    if "id" not in request.vars:
        request.vars["id"] = db().select(db.auth_user.ALL, orderby=~db.auth_user.id)[0].id
    log.info("view info for user (%d)" % int(request.vars['id']),
            extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'auth_user'})
    return dict(message=T('user info'))
