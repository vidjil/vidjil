import os
import json
import unittest
from ..utils.omboddle import Omboddle
from ..utils.db_manipulation_utils import *
from ...functional.db_initialiser import DBInitialiser, TEST_ADMIN_EMAIL
from py4web import request
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth, T
from ....controllers import user as user_controller

import logging
LOGGER = logging.getLogger(__name__)


class TestUserController(unittest.TestCase):

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

        # add first user and 2 associated patients with no files
        self.user_1_id = add_indexed_user(self.session, 1)
        add_patient(1, self.user_1_id)
        add_patient(2, self.user_1_id)

        # add second user, 1 associated patient with a file
        self.user_2_id = add_indexed_user(self.session, 2)
        patient_id = add_patient(3, self.user_2_id)
        add_sequence_file(patient_id, self.user_2_id)

        # add 3rd user, with no associated patient, and login to change last log date
        self.user_3_id = add_indexed_user(self.session, 3)
        log_in(self.session,
               get_indexed_user_email(3),
               get_indexed_user_password(3))

    ##################################
    # Tests on user_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : No user logged

        # When : Calling index on users
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                user_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_logged_as_other(self):
        # Given : Logged as user 3
        log_in(self.session,
               get_indexed_user_email(3),
               get_indexed_user_password(3))

        # When : Calling index on users
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = user_controller.index()

        # Then : We get an error
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == user_controller.ACCESS_DENIED
        assert result["redirect"].endswith(
            "sample_set/all?type=patient&page=0")

    def test_index_default(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = user_controller.index()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        assert query[0]["email"] == TEST_ADMIN_EMAIL
        assert query[1]["email"] == get_indexed_user_email(1)
        assert query[2]["email"] == get_indexed_user_email(2)
        assert query[3]["email"] == get_indexed_user_email(3)

    def test_index_sort_files(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users, sorted by files
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sort": "files"}):
            json_result = user_controller.index()

        # Then : We get sorted users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        # the first 3 are equals
        assert query[0]["email"] == TEST_ADMIN_EMAIL or query[0]["email"] == get_indexed_user_email(
            1) or query[0]["email"] == get_indexed_user_email(3)
        assert query[1]["email"] == TEST_ADMIN_EMAIL or query[1]["email"] == get_indexed_user_email(
            1) or query[1]["email"] == get_indexed_user_email(3)
        assert query[2]["email"] == TEST_ADMIN_EMAIL or query[2]["email"] == get_indexed_user_email(
            1) or query[2]["email"] == get_indexed_user_email(3)
        assert query[3]["email"] == get_indexed_user_email(2)

    def test_index_sort_files_reverse(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users, sorted by files, reversed
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sort": "files", "reverse": "true"}):
            json_result = user_controller.index()

        # Then : We get sorted users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        assert query[0]["email"] == get_indexed_user_email(2)
        assert query[1]["email"] == TEST_ADMIN_EMAIL or query[1]["email"] == get_indexed_user_email(
            1) or query[1]["email"] == get_indexed_user_email(3)
        assert query[2]["email"] == TEST_ADMIN_EMAIL or query[2]["email"] == get_indexed_user_email(
            1) or query[2]["email"] == get_indexed_user_email(3)
        assert query[3]["email"] == TEST_ADMIN_EMAIL or query[3]["email"] == get_indexed_user_email(
            1) or query[3]["email"] == get_indexed_user_email(3)

    def test_index_sort_patients(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users, sorted by patients
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sort": "patients"}):
            json_result = user_controller.index()

        # Then : We get sorted users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        assert query[0]["email"] == get_indexed_user_email(3)
        assert query[1]["email"] == get_indexed_user_email(2)
        assert query[2]["email"] == get_indexed_user_email(1)
        assert query[3]["email"] == TEST_ADMIN_EMAIL

    def test_index_sort_patients_reverse(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users, sorted by patients, reversed
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sort": "patients", "reverse": "true"}):
            json_result = user_controller.index()

        # Then : We get sorted users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        assert query[0]["email"] == TEST_ADMIN_EMAIL
        assert query[1]["email"] == get_indexed_user_email(1)
        assert query[2]["email"] == get_indexed_user_email(2)
        assert query[3]["email"] == get_indexed_user_email(3)

    def test_index_sort_login(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sort": "login"}):
            json_result = user_controller.index()

        # Then : We get users list, sorted by login
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        # as the test in done in seconds, not sure what will get first
        assert query[0]["email"] == get_indexed_user_email(
            1) or query[0]["email"] == get_indexed_user_email(2)
        assert query[1]["email"] == get_indexed_user_email(
            1) or query[1]["email"] == get_indexed_user_email(2)
        assert query[2]["email"] == TEST_ADMIN_EMAIL or query[2]["email"] == get_indexed_user_email(
            3)
        assert query[3]["email"] == TEST_ADMIN_EMAIL or query[3]["email"] == get_indexed_user_email(
            3)

    def test_index_sort_login_reverse(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index on users, sorted by login, reversed
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sort": "login", "reverse": "true"}):
            json_result = user_controller.index()

        # Then : We get sorted users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        # as the test in done in seconds, not sure what will get first
        assert query[0]["email"] == TEST_ADMIN_EMAIL or query[0]["email"] == get_indexed_user_email(
            3)
        assert query[1]["email"] == TEST_ADMIN_EMAIL or query[1]["email"] == get_indexed_user_email(
            3)
        assert query[2]["email"] == get_indexed_user_email(
            1) or query[2]["email"] == get_indexed_user_email(2)
        assert query[3]["email"] == get_indexed_user_email(
            1) or query[3]["email"] == get_indexed_user_email(2)

    ##################################
    # Tests on user_controller.edit()
    ##################################

    def test_edit_not_logged(self):
        # Given : No user logged

        # When : Trying and edit user 1
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": self.user_1_id}):
            json_result = user_controller.edit()

        # Then : We get accessed denied
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == user_controller.ACCESS_DENIED

    def test_edit_logged_as_other(self):
        # Given : Logged as user 3
        log_in(self.session,
               get_indexed_user_email(3),
               get_indexed_user_password(3))

        # When : Trying and edit user 1
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": self.user_1_id}):
            json_result = user_controller.edit()

        # Then : We get accessed denied
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == user_controller.ACCESS_DENIED

    def test_edit_myself(self):
        # Given : Logged as user 3
        log_in(self.session,
               get_indexed_user_email(3),
               get_indexed_user_password(3))

        # When : Trying and edit user 3
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": self.user_3_id}):
            json_result = user_controller.edit()

        # Then : We get user 3
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "Edit user"
        assert result["user"] is not None
        assert result["user"]["email"] == get_indexed_user_email(3)

    def test_edit_as_admin(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Trying and edit user 3
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": self.user_3_id}):
            json_result = user_controller.edit()

        # Then : We get user 3
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "Edit user"
        assert result["user"] is not None
        assert result["user"]["email"] == get_indexed_user_email(3)

    ##################################
    # Tests on user_controller.edit_form()
    ##################################

    def test_edit_form_not_logged(self):
        # Given : No user logged

        # When : Trying and edit user 1
        with Omboddle(self.session, keep_session=True, params={"format": "json", "id": self.user_1_id}):
            json_result = user_controller.edit_form()

        # Then : We get accessed denied
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == user_controller.ACCESS_DENIED

    def test_edit_form_logged_as_other(self):
        # Given : Logged as user 3
        log_in(self.session,
               get_indexed_user_email(3),
               get_indexed_user_password(3))

        # When : Trying and edit user 1
        with Omboddle(self.session, keep_session=True, params={"format": "json", "id": self.user_1_id}):
            json_result = user_controller.edit_form()

        # Then : We get accessed denied
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == user_controller.ACCESS_DENIED

    def test_edit_form_myself_OK(self):
        # Given : Logged as user 3
        log_in(self.session,
               get_indexed_user_email(3),
               get_indexed_user_password(3))

        # When : Trying and edit user 3
        with Omboddle(self.session, keep_session=True, params={"format": "json",
                                                               "id": self.user_3_id,
                                                               "first_name": "modified_first_name",
                                                               "last_name": "modified_last_name",
                                                               "email": "modified@email.com",
                                                               "password": "ComplicatedModifiedPassword",
                                                               "confirm_password": "ComplicatedModifiedPassword"}):
            json_result = user_controller.edit_form()

        # Then : User 3 was modified
        assert json_result is not None
        result = json.loads(json_result)
        assert result["redirect"] == "back"
        user_3 = db.auth_user[self.user_3_id]
        assert user_3["first_name"] == "modified_first_name"
        assert user_3["last_name"] == "modified_last_name"
        assert user_3["email"] == "modified@email.com"
        log_in(self.session,
               "modified@email.com",
               "ComplicatedModifiedPassword")

    def test_edit_form_as_admin_OK(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Trying and edit user 3
        with Omboddle(self.session, keep_session=True, params={"format": "json",
                                                               "id": self.user_3_id,
                                                               "first_name": "modified_first_name",
                                                               "last_name": "modified_last_name",
                                                               "email": "modified@email.com",
                                                               "password": "ComplicatedModifiedPassword",
                                                               "confirm_password": "ComplicatedModifiedPassword"}):
            json_result = user_controller.edit_form()

        # Then : User 3 was modified
        assert json_result is not None
        result = json.loads(json_result)
        assert result["redirect"] == "back"
        user_3 = db.auth_user[self.user_3_id]
        assert user_3["first_name"] == "modified_first_name"
        assert user_3["last_name"] == "modified_last_name"
        assert user_3["email"] == "modified@email.com"
        log_in(self.session,
               "modified@email.com",
               "ComplicatedModifiedPassword")

    ##################################
    # Tests on user_controller.info()
    ##################################

    def test_info_with_id(self):
        # Given

        # When : calling info() with an id
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": self.user_1_id}):
            json_result = user_controller.info()
            # Then : We get the same ID
            assert request.query["id"] == str(self.user_1_id)

        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "user info"

    def test_info_without_id(self):
        # Given

        # When : calling info() with an id
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = user_controller.info()
            # Then : We get the ID of the last added user
            assert request.query["id"] == self.user_3_id

        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "user info"
