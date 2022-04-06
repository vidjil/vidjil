import os
from py4web import action, request, abort, redirect, URL, Field, HTTP
from yatl.helpers import A, I
from py4web.utils.form import Form, FormStyleDefault
from py4web.utils.grid import Grid, GridClassStyle, Column
from py4web.utils.publisher import Publisher, ALLOW_ALL_POLICY
from pydal.validators import IS_NOT_EMPTY, IS_INT_IN_RANGE, IS_IN_SET, IS_IN_DB
from yatl.helpers import INPUT, H1, HTML, BODY, A, DIV
from py4web.utils.param import Param
from ..settings import SESSION_SECRET_KEY
from ..modules.permission_enum import PermissionEnum
from ..modules.zmodel_factory import ModelFactory
from ..user_groups import get_default_creation_group
from ..VidjilAuth import VidjilAuth
import types
from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth

# exposes services necessary to access the db.thing via ajax
publisher = Publisher(db, policy=ALLOW_ALL_POLICY)


@action("/vidjil/sequence_file/delete", method=["POST", "GET"])
@action.uses(db, "forms.html")
@action.uses(auth.user)
def sequence_file_delete(sequence_file_id=None):


    redirect(URL('/vidjil/patient'))

    return dict(title="add sequence file",
                forms=[form])
