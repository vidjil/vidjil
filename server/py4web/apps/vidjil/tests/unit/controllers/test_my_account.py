import os
import unittest

from ..utils.omboddle import Omboddle
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
from ....controllers import my_account as my_account_controller


class TestMyAccountController(unittest.TestCase):

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
    # Tests on my_account_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                my_account_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    # TODO: seems to fail with an error in pydal... To check in normal deployement with mysql, and investigate the error (seems like an issue with pydal and sqlite)
    # def test_index(self):
    #     # Given : Logged as admin
    #     db_manipulation_utils.log_in_as_default_admin(self.session)

    #     # When : Calling index
    #     with Omboddle(self.session, keep_session=True, params={"format": "json"}):
    #         json_result = my_account_controller.index()

    #     # Then : We get groups list
    #     result = json.loads(json_result)
    #     query = result["query"]

    # TODO : to enrich with more tests on the various cases

    ##################################
    # Tests on my_account_controller.jobs()
    ##################################

    def test_jobs_not_logged(self):
        # Given : not logged

        # When : Calling jobs
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                my_account_controller.jobs()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    # TODO: seems to fail with an error in pydal... To check in normal deployement with mysql, and investigate the error (seems like an issue with pydal and sqlite)
    # def test_jobs(self):
    #     # Given : Logged as admin
    #     db_manipulation_utils.log_in_as_default_admin(self.session)

    #     # When : Calling index
    #     with Omboddle(self.session, keep_session=True, params={"format": "json"}):
    #         json_result = my_account_controller.index()

    #     # Then : We get groups list
    #     result = json.loads(json_result)
    #     query = result["query"]

    # TODO : to enrich with more tests on the various cases
