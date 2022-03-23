"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

import datetime
import uuid

from py4web import action, request, abort, redirect, URL, Field
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.url_signer import URLSigner
from pydal.validators import *

from yatl.helpers import A
from .common import db, session, T, cache, auth
from .components.grid import Grid
from .components.vueform import VueForm, InsertForm, TableForm
from .components.fileupload import FileUpload
from .components.starrater import StarRater

signed_url = URLSigner(session, lifespan=3600)


# -----------------------------
# Sample grid.

vue_grid = Grid("grid_api", session)

@action("vuegrid", method=["GET"])
@action.uses(vue_grid, "vuegrid.html")
def vuegrid():
    """This page generates a sample grid."""
    # We need to instantiate our grid component.
    return dict(grid=vue_grid())

@action('vuegrid_bulma', method=["GET"])
@action.uses(vue_grid, 'vuegrid_bulma.html')
def vuegrid_bulma():
    """This page generates a sample grid."""
    # We need to instantiate our grid component.
    return dict(grid=vue_grid())

# -----------------------------
# File uploader.

file_uploader = FileUpload("upload_api", session)


@action("file_uploader", method=["GET"])
@action.uses(file_uploader, "file_uploader.html")
def fileuploader():
    return dict(uploader=file_uploader(id=1))


# -----------------------------
# Custom vue form.


def get_time():
    return datetime.datetime.utcnow()


vue_form = VueForm(
    "test_form",
    session,
    [
        Field("name", default="Luca"),
        Field("last_name", default="Smith", writable=False),
        Field("read", "boolean", default=True),
        Field(
            "animal",
            requires=IS_IN_SET(["cat", "dog", "bird"]),
            default="dog",
            writable=False,
        ),
        Field(
            "choice",
            requires=IS_IN_SET({"c": "cat", "d": "dog", "b": "bird"}),
            default="d",
        ),
        Field("arrival_time", "datetime", default=get_time),
        Field("date_of_birth", "date"),
        Field("narrative", "text"),
    ],
    readonly=False,
    redirect_url="index",
)


@action("vue_form", method=["GET"])
@action.uses(vue_form, "vueform.html")
def vueform():
    return dict(form=vue_form())

@action('vue_form_bulma', method=["GET"])
@action.uses(vue_form, "vueform_bulma.html")
def vueform_bulma():
    return dict(form=vue_form())

# -----------------------------
# Insertion form.

