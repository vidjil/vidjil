import gluon.contrib.simplejson
if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
        
## return user list
def index():
    
    query = db(db.auth_user).select()

    for row in query :
        row.created = db( db.patient.creator == row.id ).count()
        
        row.access = ''
        if auth.can_create_patient(user=row.id): row.access += 'c'
        if auth.can_upload_file(user=row.id): row.access += 'u'
        if auth.can_process_file(user=row.id): row.access += 'r'

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

            
    return dict(query=query,
    			reverse=reverse)

## return user information
## need ["id"]
def info():
    if "id" not in request.vars:
        request.vars["id"] = db().select(db.auth_user.ALL, orderby=~db.auth_user.id)[0].id
    return dict(message=T('user info'))
