import os
import json
import unittest
from ..utils.omboddle import Omboddle
from ..utils.db_manipulation_utils import add_indexed_user, add_patient, add_sequence_file_to_patient, log_in, get_indexed_user_email, get_indexed_user_password, log_in_as_default_admin
from ...functional.db_initialiser import DBInitialiser, TEST_ADMIN_EMAIL
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
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
        user_1_id = add_indexed_user(self.session, 1)
        add_patient(1, user_1_id)
        add_patient(2, user_1_id)

        # add second user, 1 associated patient with a file
        user_2_id = add_indexed_user(self.session, 2)
        patient_id = add_patient(3, user_2_id)
        add_sequence_file_to_patient(patient_id)

        # add 3rd user, with no associated patient, and login to change last log date
        add_indexed_user(self.session, 3)
        log_in(self.session, get_indexed_user_email(
            3), get_indexed_user_password(3))

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
        log_in_as_default_admin(self.session)

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
        assert query[1]["email"] == get_indexed_user_email(1)
        assert query[2]["email"] == get_indexed_user_email(2)
        assert query[3]["email"] == get_indexed_user_email(3)
