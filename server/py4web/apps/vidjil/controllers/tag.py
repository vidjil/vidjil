import json
from py4web import action, request

from ..modules import tag
from ..modules.controller_utils import error_message
from ..common import db, auth


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"

@action("/vidjil/tag/auto_complete", method=["POST", "GET"])
@action.uses(db, auth.user)
def auto_complete():
    if "keys" not in request.params:
        return error_message("missing group ids")

    group_ids = json.loads(request.params["keys"])

    if not isinstance(group_ids, list):
        return error_message(f"Group ids are not in a correct format ({request.params['keys']})")

    tags = tag.get_tags(db, group_ids)

    return tag.tags_to_json(tags, group_ids)
