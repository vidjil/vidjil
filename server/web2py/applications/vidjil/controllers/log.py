import gluon.contrib.simplejson

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400
    
def index():
    query = db(db.user_log).select()
    return dict(query=query)
