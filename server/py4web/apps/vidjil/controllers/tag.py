# coding: utf8
from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.controller_utils import error_message
import json
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict


from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"

@action("/vidjil/tag/auto_complete", method=["POST", "GET"])
@action.uses(db, auth.user)
def auto_complete():
    if "keys" not in request.params:
        return error_message("missing group ids")

    prefix = tag.get_tag_prefix()
    group_ids = json.loads(request.params["keys"])
    tags = tag.get_tags(db, group_ids)

    return tag.tags_to_json(tags, group_ids)
