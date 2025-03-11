import json

from py4web import action, request

from ..common import auth, db
from ..modules import tag_utils
from ..modules.controller_utils import error_message

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
        return error_message(
            f"Group ids are not in a correct format ({request.params['keys']})"
        )

    tags = tag_utils.get_tags(db, group_ids)

    return tag_utils.tags_to_json(tags, group_ids)
