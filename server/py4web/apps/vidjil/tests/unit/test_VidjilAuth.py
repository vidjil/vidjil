import os
import unittest

from .utils import db_manipulation_utils
from ..functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session
from ...common import db, auth
from ...modules.permission_enum import PermissionEnum

import logging
LOGGER = logging.getLogger(__name__)


class TestVidjilAuth(unittest.TestCase):

    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5])
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        initialiser = DBInitialiser(db)
        initialiser.run()

        self.user1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        self.group_id_user1 = auth.user_group(self.user1_id)
        return

    ##################################
    # Tests on VidjilAuth
    ##################################

    def test_vidjilauth_setup(self):
        assert auth is not None

    def test_vidjilauth_isAdmin(self):
        # Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.is_admin()  # default log in ad admin

        # Test as other user
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))

        assert not auth.is_admin(self.user1_id)
        return

    def test_vidjilauth_can_create_sample_set(self):
        # Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.can_create_sample_set()

        # Test as other user
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))

        assert auth.can_create_sample_set()

    def test_vidjilauth_can_create_sample_set_in_group(self):
        # Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.can_create_sample_set_in_group(1)

        # Test as other user
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))

        assert not auth.can_create_sample_set_in_group(
            group_id=1, user_id=self.user1_id)
        assert auth.can_create_sample_set(self.user1_id)
        assert (self.group_id_user1 in auth.get_permission_groups("create"))
        assert (auth.is_admin(self.user1_id) or auth.can_create_sample_set(
            self.user1_id) and self.group_id_user1 in auth.get_permission_groups("create"))

        assert not auth.can_create_sample_set_in_group(
            group_id=1, user_id=self.user1_id)  # public
        assert not auth.can_create_sample_set_in_group(
            group_id=2, user_id=self.user1_id)  # admin
        assert not auth.can_create_sample_set_in_group(
            group_id=3, user_id=self.user1_id)  # user_1
        assert not auth.can_create_sample_set_in_group(
            group_id=4, user_id=self.user1_id)  # other group by initializer
        assert auth.can_create_sample_set_in_group(
            group_id=self.group_id_user1, user_id=self.user1_id)  # group of current user

    def test_vidjilauth_can_create_sample_set_in_group_parent(self):
        # GIVEN
        # Get parent group ID
        parent_group = db(db.auth_group.role == "test parent").select()
        assert len(parent_group) == 1
        parent_group_id = parent_group[0].id
        assert not auth.can_create_sample_set_in_group(
            parent_group_id, self.user1_id)

        # Get child group ID
        child_0_group = db(db.auth_group.role == "test child 0").select()
        assert len(child_0_group) == 1
        child_0_group_id = child_0_group[0].id
        assert not auth.can_create_sample_set_in_group(
            child_0_group_id, self.user1_id)

        # Add user in child group, with create permission
        auth.add_permission(
            child_0_group_id, PermissionEnum.create.value, "sample_set", 0)
        auth.add_membership(child_0_group_id, self.user1_id)
        assert auth.can_create_sample_set_in_group(
            child_0_group_id, self.user1_id)

        # WHEN checking create rights in parent group
        can_create_sample_set_in_parent_group = auth.can_create_sample_set_in_group(
            parent_group_id, self.user1_id)

        # THEN user can create sample set in parent group
        assert can_create_sample_set_in_parent_group

    def test_vidjilauth_can_create_sample_set_in_group_parent_no_right(self):
        # GIVEN
        # Get parent group ID
        parent_group = db(db.auth_group.role == "test parent").select()
        assert len(parent_group) == 1
        parent_group_id = parent_group[0].id
        assert not auth.can_create_sample_set_in_group(
            parent_group_id, self.user1_id)

        # Get child group ID
        child_0_group = db(db.auth_group.role == "test child 0").select()
        assert len(child_0_group) == 1
        child_0_group_id = child_0_group[0].id
        assert not auth.can_create_sample_set_in_group(
            child_0_group_id, self.user1_id)

        # Add user in child group, without create permission
        auth.del_permission(
            child_0_group_id, PermissionEnum.create.value, "sample_set", 0)
        auth.add_membership(child_0_group_id, self.user1_id)
        assert not auth.can_create_sample_set_in_group(
            child_0_group_id, self.user1_id)

        # WHEN checking create rights in parent group
        can_create_sample_set_in_parent_group = auth.can_create_sample_set_in_group(
            parent_group_id, self.user1_id)

        # THEN user cannot create sample set in parent group
        assert not can_create_sample_set_in_parent_group
