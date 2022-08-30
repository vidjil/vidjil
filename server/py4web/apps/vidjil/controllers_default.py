import os
from py4web import action, request, abort, redirect, URL, Field, HTTP
from yatl.helpers import A, I
from py4web.utils.form import Form, FormStyleDefault
from py4web.utils.factories import ActionFactory, Inject
from py4web.utils.grid import Grid, GridClassStyle, Column
from py4web.utils.param import Param
from py4web.utils.publisher import Publisher, ALLOW_ALL_POLICY
from pydal.validators import IS_NOT_EMPTY, IS_INT_IN_RANGE, IS_IN_SET, IS_IN_DB
from yatl.helpers import INPUT, H1, HTML, BODY, A, DIV
from py4web.utils.param import Param

from apps.vidjil.tasks import task_test
from .settings import SESSION_SECRET_KEY

from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash


# exposes services necessary to access the db.thing via ajax
publisher = Publisher(db, policy=ALLOW_ALL_POLICY)

@action("index")
@action.uses("index.html", auth)
def index():
    return {}


@action("my_task")
@action.uses(db, session )
def my_task():
    results = task_test.delay()
    print('Task id: {}'.format(results.id))
    print('Task status: {}'.format(results.status))
    return {}
