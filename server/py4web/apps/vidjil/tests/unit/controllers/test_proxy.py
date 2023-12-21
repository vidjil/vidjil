import collections
import os
import json
import unittest
from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils, test_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
from ....modules.permission_enum import PermissionEnum
from ....controllers import proxy as proxy_controller

class TestProxyController(unittest.TestCase):

    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5])
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        # init db
        initialiser = DBInitialiser(db)
        initialiser.run()

    ##################################
    # Tests on proxy_controller.index()
    ##################################

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = proxy_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result == "index()"

    # TODO : test other methods of proxy_controller --> how to do it in the test env