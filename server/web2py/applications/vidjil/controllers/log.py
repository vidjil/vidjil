import gluon.contrib.simplejson

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    
def index():
    if auth.is_admin():
        query = db(db.user_log).select(orderby=~db.user_log.created)
    else:
	user_groups = auth.get_user_groups()
	parent_groups = auth.get_user_group_parents()
	group_list = [g.id for g in user_groups]
	parent_list = [g.id for g in parent_groups]
	groups = list(set(group_list + parent_list))
        query = db(
	    (db.user_log.table_name == db.auth_permission.table_name) &
            (db.user_log.record_id == db.auth_permission.record_id) &
	    (db.auth_permission.name == PermissionEnum.access.value) &
	    (db.auth_permission.group_id.belongs(groups))
	).select(db.user_log.ALL, orderby=~db.user_log.created)
    return dict(query=query)
