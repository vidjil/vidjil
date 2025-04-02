import json

from py4web import action

from ..common import db, log
from ..tests.functional.db_initialiser import DBInitialiser


@action("/vidjil/test/init_test_db", method=["GET"])
def init_test_db():
    initialiser = DBInitialiser(db)
    initialiser.run()

    res = {"success": "true", "message": "Database initialized with success"}
    log.info(res)
    return json.dumps(res, separators=(",", ":"))
