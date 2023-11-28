import os
import json
import unittest

from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
from ....controllers import log as log_controller


class TestFileController(unittest.TestCase):

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
    # Tests on log_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                log_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_no_logs(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = log_controller.index()

        # Then : We get groups list
        result = json.loads(json_result)
        query = result["query"]
        assert len(query) == 0

    def test_index_logs(self):
        # Given : Logged as admin and add some logs
        db_manipulation_utils.log_in_as_default_admin(self.session)
        patient_id = db_manipulation_utils.add_patient(1, 1)[0]
        log = dict(user_id=1,
                   created='2022-03-30 13:23:59',
                   table_name="patient",
                   msg="this is a fake log msg",
                   record_id=patient_id)
        db.user_log.insert(**log)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = log_controller.index()

        # Then : We get logs list
        result = json.loads(json_result)
        query = result["query"]
        assert len(query) == 1
        user_log = query[0]["user_log"]
        assert user_log["user_id"] == log["user_id"]
        assert user_log["created"] == log["created"]
        assert user_log["table_name"] == log["table_name"]
        assert user_log["msg"] == log["msg"]
        assert user_log["record_id"] == log["record_id"]
        auth_user = query[0]["auth_user"]
        assert auth_user["first_name"] == "System"
        assert auth_user["last_name"] == "Administrator"
        patient = query[0]["patient"]
        patient_from_db = db.patient[patient_id]
        assert patient["first_name"] == patient_from_db.first_name
        assert patient["last_name"] == patient_from_db.last_name
        
    # TODO : to enrich with more tests
