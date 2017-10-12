from controller_utils import error_message
import json

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

def auto_complete():
    if "group_ids" not in request.vars:
        return error_message("missing group ids")

    prefix = get_tag_prefix()
    group_ids = json.loads(request.vars["group_ids"])
    tags = get_tags(db, group_ids)

    return tags_to_json(tags, group_ids)
