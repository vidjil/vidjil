import os
import json
import unittest
from ..utils.omboddle import Omboddle
from py4web.core import _before_request, Session, HTTP
from .... import defs
from ....common import db, auth
from ....controllers import user as user_controller
from ....controllers import auth as auth_controller
from ...functional.db_initialiser import DBInitialiser, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

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
        user_1_id = self.add_indexed_user(1)
        self.add_patient(1, user_1_id)
        self.add_patient(2, user_1_id)

        # add second user, 1 associated patient with a file
        user_2_id = self.add_indexed_user(2)
        patient_id = self.add_patient(3, user_2_id)
        self.add_sample_set_to_patient(patient_id)

        # add 3rd user, with no associated patient, and login to change last log date
        self.add_indexed_user(3)
        self.log_in(self.get_user_email(3), self.get_user_password(3))

    def add_sample_set_to_patient(self, patient_id: int) -> int:
        sequence_file_id = db.sequence_file.insert(sampling_date="2010-10-10",
                                                   info="testf",
                                                   filename="test_file.fasta",
                                                   size_file=1024,
                                                   network=False,
                                                   data_file="test_sequence_file")
        db.sample_set_membership.insert(
            sample_set_id=patient_id, sequence_file_id=sequence_file_id)
        return sequence_file_id

    def add_patient(self, patient_id: int, user_id: int) -> int:
        sample_set_id = db.sample_set.insert(
            sample_type=defs.SET_TYPE_PATIENT)
        patient_id_in_db = db.patient.insert(id_label="", first_name="patient", last_name=patient_id, birth="2010-10-10",
                                             info=f"test patient {patient_id} for user {user_id}", sample_set_id=sample_set_id, creator=user_id)
        return patient_id_in_db

    def get_user_first_name(self, user_index: int) -> str:
        return f"First name {user_index}"

    def get_user_last_name(self, user_index: int) -> str:
        return f"Last name {user_index}"

    def get_user_email(self, user_index: int) -> str:
        return f"user{user_index}@email.com"

    def get_user_password(self, user_index: int) -> str:
        return f"AVeryComplexPassword!{user_index}"

    def add_indexed_user(self, user_index: int) -> int:
        return self.add_user(self.get_user_first_name(user_index),
                             self.get_user_last_name(user_index),
                             self.get_user_email(user_index),
                             self.get_user_password(user_index))

    def add_user(self, first_name: str, last_name: str, email: str, password: str) -> int:
        user_id = -1
        self.log_in_as_admin()
        with Omboddle(self.session,
                      keep_session=True,
                      params={"first_name": first_name,
                              "last_name": last_name,
                              "email": email,
                              "password": password,
                              "confirm_password": password}):
            response = auth_controller.register_form()
            user_id = json.loads(response)["user_id"]
        self.logout()
        return user_id

    def log_in_as_admin(self) -> None:
        self.log_in(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)

    def log_in(self, email, password) -> None:
        with Omboddle(self.session, keep_session=True, params={"login": email, "password": password}):
            auth_controller.submit()

    def logout(self) -> None:
        with Omboddle(self.session, keep_session=True, params={"login": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}):
            auth_controller.logout()

    def test_index_not_logged(self):
        # Given : No user logged

        # When : Calling index on users
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session):
                user_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index(self):
        # Given : Logged as admin
        self.log_in_as_admin()

        # When : Calling index on users
        with Omboddle(self.session, keep_session=True, params={"json": True}):
            json_result = user_controller.index()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        query = result["query"]
        assert query is not None
        assert len(query) == 4
        assert query[0]["email"] == TEST_ADMIN_EMAIL
        assert query[1]["email"] == self.get_user_email(1)
        assert query[2]["email"] == self.get_user_email(2)
        assert query[3]["email"] == self.get_user_email(3)
