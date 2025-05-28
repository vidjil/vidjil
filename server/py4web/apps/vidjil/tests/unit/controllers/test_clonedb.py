import json
import os
import unittest
from unittest.mock import patch

from py4web.core import HTTP, Session, _before_request

from ....common import auth, db
from ....controllers import clonedb as clonedb_controller
from ...functional.db_initialiser import DBInitialiser
from ..utils import db_manipulation_utils
from ..utils.omboddle import Omboddle


class TestClonedbController(unittest.TestCase):
    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5]
        )
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        # init db
        initialiser = DBInitialiser(db)
        initialiser.run()

    ##################################
    # Tests on clonedb_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : No user logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                clonedb_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_malformed_request(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When: No sequences or sample_set_id
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = clonedb_controller.index()

        # Then: error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "Malformed request"

    @patch("apps.vidjil.controllers.clonedb.search_clonedb")
    def test_index_success(self, mock_search_clonedb):
        # Given: logged in user, valid parameters, and a mocked search
        user_id = db(db.auth_user).select().first().id
        self.session["user"] = {"id": user_id}
        mock_search_clonedb.return_value = [{"mock": "result"}]
        params = {
            "sequences": "ATCG,GGGG",
            "sample_set_id": "1",
        }

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params=params):
            result = clonedb_controller.index()

        # Then: error
        assert isinstance(result, list)
        assert result == [{"mock": "result"}]
        mock_search_clonedb.assert_called_once_with(["ATCG", "GGGG"], 1)


# TODO: add tests for search_clonedb !
