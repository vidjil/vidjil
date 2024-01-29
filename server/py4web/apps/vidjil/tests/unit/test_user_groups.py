import os
import pytest
from py4web.core import _before_request, Session
from ..functional.db_initialiser import DBInitialiser
from .utils import db_manipulation_utils, test_utils
from ...common import db, auth

from ... import user_groups


class TestUserGroups():

    # TODO: mutualize ?
    @pytest.fixture(autouse=True)
    def init_env_and_db(self):
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
    # Tests on get_default_creation_group()
    ##################################

    def test_get_default_creation_group_single_group(self):
        # Given : adding another user (with default group)
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        user_group_id = auth.user_group(user_id)

        # When : Calling get_default_creation_group
        result = user_groups.get_default_creation_group(auth)

        # Then : we get the correct group and max_group
        groups, max_group = result
        assert len(groups) == 1
        assert groups[0]["id"] == user_group_id
        assert groups[0]["name"] == "Personal Group"
        assert max_group == user_group_id

    def test_get_default_creation_group_admin(self):
        # Given : log in as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling get_default_creation_group
        result = user_groups.get_default_creation_group(auth)

        # Then : we get the correct group and max_group
        groups, max_group = result
        assert len(groups) == 4
