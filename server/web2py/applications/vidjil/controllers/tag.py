from tag import *
from controller_utils import error_message

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

def auto_complete():
    if "group_id" not in request.vars:
        return error_message("missing group id")

    if "query" not in request.vars or request.vars["query"][0] != "#":
        tags = []
    else:
        tags = get_tags(db, request.vars["group_id"], request.vars["query"][1:])

    return tags_to_json(tags)
