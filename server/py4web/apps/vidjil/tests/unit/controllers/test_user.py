import os
import unittest
from ..utils.omboddle import Omboddle
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
from ....controllers import user as user_controller
from ....controllers import auth as auth_controller
from ...functional.db_initialiser import DBInitialiser, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

import logging
LOGGER = logging.getLogger(__name__)


class TestUserController(unittest.TestCase):

    def setUp(self):
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5])
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        initialiser = DBInitialiser(db)
        initialiser.run()

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
        with Omboddle(self.session, keep_session=True, params={"login": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}):
            auth_controller.submit()

        # When : Calling index on users
        with Omboddle(self.session, keep_session=True):
            user_list_to_display = user_controller.index()

        # Then : We get users list
        assert user_list_to_display is not None
        LOGGER.info(f"user_list_to_display['query'] {user_list_to_display}")
