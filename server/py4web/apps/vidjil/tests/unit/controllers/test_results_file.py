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

from ....controllers import results_file as results_file_controller


class TestResultsFileController(unittest.TestCase):

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
    # Tests on results_file_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_other_user(self):
        # Given : logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling index:
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = results_file_controller.index()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"sort": "", "reverse": ""}):
            json_result = results_file_controller.index()

        # Then : We get results_file list
        result = json.loads(json_result)
        assert result["reverse"] == False
        query = result["query"]
        assert len(query) == 15

    # TODO : check more things in results, and add more test for sort, reverse, ...

    ##################################
    # Tests on results_file_controller.run_all_patients()
    ##################################

    def test_run_all_patients_not_logged(self):
        # Given : not logged

        # When : Calling run_all_patients
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.run_all_patients()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_run_all_patients_other_user(self):
        # Given : logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling run_all_patients:
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = results_file_controller.run_all_patients()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED

    # TODO : add real tests for results_file_controller.run_all_patients() --> hwo to deal with tasks ?

    ##################################
    # Tests on results_file_controller.info()
    ##################################

    def test_info_not_logged(self):
        # Given : not logged

        # When : Calling info
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.info()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_info(self):
        # Given : logged as other user, add a results file with the correct rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"results_file_id": results_file_id}):
            json_result = results_file_controller.info()

        # Then : We get results_file list
        result = json.loads(json_result)
        assert result["message"] == "result info"
        assert result["content_log"] == None

    def test_info_access_denied(self):
        # Given : logged as other user, add a results file with the wrong rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.del_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"results_file_id": results_file_id}):
            json_result = results_file_controller.info()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED
        
    # TODO : add test for results_file_controller.info() with a real content

    # TODO : add tests for other methods...