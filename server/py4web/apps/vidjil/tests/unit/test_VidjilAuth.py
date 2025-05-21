import os

import pytest
from py4web.core import Session, _before_request

from ... import settings
from ...common import auth, db
from ...modules.permission_enum import PermissionEnum
from ..functional.db_initialiser import DBInitialiser
from .utils import db_manipulation_utils


class TestVidjilAuth:
    @pytest.fixture(autouse=True)
    def setup(self):
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5]
        )
        _before_request()
        assert auth is not None
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        initialiser = DBInitialiser(db)
        initialiser.run()

        self.user1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        self.group_id_user1 = auth.user_group(self.user1_id)

    ##################################
    # Tests on VidjilAuth.login()
    ##################################

    def test_vidjil_auth_login_success(self):
        # Given: a valid user exists
        email = db_manipulation_utils.get_indexed_user_email(1)
        password = db_manipulation_utils.get_indexed_user_password(1)

        # When: calling login with correct credentials
        user, error = auth.login(email, password)

        # Then: user is returned, no error
        assert user is not None
        assert error is None
        assert user.email == email

    def test_vidjil_auth_login_wrong_password(self):
        # Given: a valid user exists
        email = db_manipulation_utils.get_indexed_user_email(1)
        wrong_password = "not_the_right_password"
        user = db(db.auth_user.email == email).select().first()
        initial_number_wrong_passwords = (
            user.number_wrong_passwords if user.number_wrong_passwords else 0
        )

        # When: calling login with wrong password
        user, error = auth.login(email, wrong_password)

        # Then: no user, error message, number of fail updated
        assert user is None
        assert error is not None
        assert error == "Invalid Credentials"
        user = db(db.auth_user.email == email).select().first()
        assert user.number_wrong_passwords == initial_number_wrong_passwords + 1

    def test_vidjil_auth_login_account_locked(self):
        # Given: a user with too many failed logins
        email = db_manipulation_utils.get_indexed_user_email(1)
        password = db_manipulation_utils.get_indexed_user_password(1)
        user = db(db.auth_user.email == email).select().first()
        user.update_record(number_wrong_passwords=settings.MAX_WRONG_PASSWORDS)

        # When: calling login
        user, error = auth.login(email, password)

        # Then: login is blocked
        assert user is None
        assert error is not None
        assert (
            error
            == "Max number of invalid credentials reached, account is locked. Please contact an administrator."
        )

    ##################################
    # Tests on VidjilAuth.logout()
    ##################################

    def test_vidjil_auth_logout_creates_event_and_clears_session(self):
        # Given: a logged-in user
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        user_id = self.session["user"]["id"]
        initial_event_count = db(db.auth_event).count()

        # When: calling logout
        auth.logout()

        # Then: session is cleared and an event is logged
        assert "user" not in self.session or self.session["user"] is None
        assert db(db.auth_event).count() == initial_event_count + 1
        last_event = db(db.auth_event).select(orderby=~db.auth_event.id).first()
        assert last_event.user_id == user_id
        assert "Logged-out" in last_event.description

    def test_vidjil_auth_logout_when_no_user(self):
        # Given: no logged-in user
        self.session.clear()
        assert "user" not in self.session or self.session["user"] is None
        initial_event_count = db(db.auth_event).count()

        # When: calling logout
        auth.logout()

        # Then: session is cleared and no error happened
        assert "user" not in self.session or self.session["user"] is None
        assert db(db.auth_event).count() == initial_event_count

    ##################################
    # Tests on VidjilAuth.is_admin()
    ##################################

    def test_vidjil_auth_isAdmin(self):
        # Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.is_admin()  # default log in ad admin

        # Test as other user
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

        assert not auth.is_admin(self.user1_id)

    ##################################
    # Tests on VidjilAuth.can_create_sample_set()
    ##################################

    def test_vidjil_auth_can_create_sample_set(self):
        # Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.can_create_sample_set()

        # Test as other user
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

        assert auth.can_create_sample_set()

    ##################################
    # Tests on VidjilAuth.can_create_sample_set_in_group()
    ##################################

    def test_vidjil_auth_can_create_sample_set_in_group(self):
        # Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.can_create_sample_set_in_group(1)
        nonexistent_group_id = 999999
        assert not auth.can_create_sample_set_in_group(nonexistent_group_id)

        # Test as other user
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

        assert not auth.can_create_sample_set_in_group(
            group_id=1, user_id=self.user1_id
        )
        assert auth.can_create_sample_set(self.user1_id)
        assert self.group_id_user1 in auth.get_permission_groups("create")
        assert (
            auth.is_admin(self.user1_id)
            or auth.can_create_sample_set(self.user1_id)
            and self.group_id_user1 in auth.get_permission_groups("create")
        )

        assert not auth.can_create_sample_set_in_group(
            group_id=1, user_id=self.user1_id
        )  # public
        assert not auth.can_create_sample_set_in_group(
            group_id=2, user_id=self.user1_id
        )  # admin
        assert not auth.can_create_sample_set_in_group(
            group_id=3, user_id=self.user1_id
        )  # user_1
        assert not auth.can_create_sample_set_in_group(
            group_id=4, user_id=self.user1_id
        )  # other group by initializer
        assert auth.can_create_sample_set_in_group(
            group_id=self.group_id_user1, user_id=self.user1_id
        )  # group of current user

    def test_vidjil_auth_can_create_sample_set_in_group_parent(self):
        # GIVEN
        # Get parent group ID
        parent_group = db(db.auth_group.role == "test parent").select()
        assert len(parent_group) == 1
        parent_group_id = parent_group[0].id
        assert not auth.can_create_sample_set_in_group(parent_group_id, self.user1_id)

        # Get child group ID
        child_0_group = db(db.auth_group.role == "test child 0").select()
        assert len(child_0_group) == 1
        child_0_group_id = child_0_group[0].id
        assert not auth.can_create_sample_set_in_group(child_0_group_id, self.user1_id)

        # Add user in child group, with create permission
        auth.add_permission(
            child_0_group_id, PermissionEnum.create.value, "sample_set", 0
        )
        auth.add_membership(child_0_group_id, self.user1_id)
        assert auth.can_create_sample_set_in_group(child_0_group_id, self.user1_id)

        # WHEN checking create rights in parent group
        can_create_sample_set_in_parent_group = auth.can_create_sample_set_in_group(
            parent_group_id, self.user1_id
        )

        # THEN user can create sample set in parent group
        assert can_create_sample_set_in_parent_group

    def test_vidjil_auth_can_create_sample_set_in_group_parent_no_right(self):
        # GIVEN
        # Get parent group ID
        parent_group = db(db.auth_group.role == "test parent").select()
        assert len(parent_group) == 1
        parent_group_id = parent_group[0].id
        assert not auth.can_create_sample_set_in_group(parent_group_id, self.user1_id)

        # Get child group ID
        child_0_group = db(db.auth_group.role == "test child 0").select()
        assert len(child_0_group) == 1
        child_0_group_id = child_0_group[0].id
        assert not auth.can_create_sample_set_in_group(child_0_group_id, self.user1_id)

        # Add user in child group, without create permission
        auth.del_permission(
            child_0_group_id, PermissionEnum.create.value, "sample_set", 0
        )
        auth.add_membership(child_0_group_id, self.user1_id)
        assert not auth.can_create_sample_set_in_group(child_0_group_id, self.user1_id)

        # WHEN checking create rights in parent group
        can_create_sample_set_in_parent_group = auth.can_create_sample_set_in_group(
            parent_group_id, self.user1_id
        )

        # THEN user cannot create sample set in parent group
        assert not can_create_sample_set_in_parent_group

    def test_vidjil_auth_can_create_sample_set_in_group_nonexistent_group(self):
        # Given: a group_id that does not exist in the database
        nonexistent_group_id = 999999  # Assuming this ID does not exist

        # When: calling can_create_sample_set_in_group with this group_id
        result = auth.can_create_sample_set_in_group(
            nonexistent_group_id, self.user1_id
        )

        # Then: the result should be False
        assert result is False

    ##################################
    # Tests on VidjilAuth.groups
    ##################################

    def test_vidjil_auth_groups_admin(self):
        # Given: the admin user is logged in
        db_manipulation_utils.log_in_as_default_admin(self.session)
        # When: retrieving the current user's groups
        group_roles = auth.groups
        # Then: there should be at least the 'admin' group
        assert "admin" in group_roles

    def test_vidjil_auth_groups_user(self):
        # Given: a standard user is logged in
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        # When: retrieving the current user's groups
        group_roles = auth.groups
        # Then: the user's personal group should be present
        expected_role = auth.user_group_role(self.user1_id)
        assert expected_role in group_roles

    def test_vidjil_auth_groups_multiple(self):
        # Given: a user who is a member of multiple groups
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        # Add an extra group
        extra_group_id = db.auth_group.insert(
            role="extra_group", description="Extra group"
        )
        auth.add_membership(extra_group_id, self.user1_id)
        # When: retrieving the current user's groups
        group_roles = auth.groups
        # Then: both the personal group and the extra group should be present
        assert auth.user_group_role(self.user1_id) in group_roles
        assert "extra_group" in group_roles

    def test_vidjil_auth_groups_none_when_not_logged(self):
        # Given: no user is logged in
        self.session.clear()
        auth.session = self.session
        # When: retrieving the current user's groups
        group_roles = auth.groups
        # Then: the list should be empty
        assert group_roles == []

    ##################################
    # Tests on VidjilAuth.get_user_access_groups
    ##################################

    def test_get_user_access_groups_no_access(self):
        # Given: a user and an object with no access permission
        user_id = self.user1_id
        object_of_action = "sample_set"
        oid = 123  # Assume this object exists but no permissions are set

        # When: calling get_user_access_groups
        result = auth.get_user_access_groups(object_of_action, oid, user_id)

        # Then: the result should be an empty list
        assert result == []

    def test_get_user_access_groups_direct_access(self):
        # Given: a user, a group, and an object with direct access permission
        user_id = self.user1_id
        object_of_action = "sample_set"
        oid = db.sample_set.insert(sample_type="patient")
        group_id = auth.user_group(user_id)
        auth.add_permission(
            group_id, PermissionEnum.access.value, object_of_action, oid
        )
        auth.add_membership(group_id, user_id)

        # When: calling get_user_access_groups
        result = auth.get_user_access_groups(object_of_action, oid, user_id)

        # Then: the result should contain the group_id
        assert group_id in result

    def test_get_user_access_groups_parent_access(self):
        # Given: a user, a child group, a parent group, and an object with access permission for the parent group
        user_id = self.user1_id
        object_of_action = "sample_set"
        oid = db.sample_set.insert(sample_type="patient")
        parent_group_id = db.auth_group.insert(
            role="parent_group", description="Parent group"
        )
        child_group_id = auth.user_group(user_id)
        # Create group association: parent -> child
        db.group_assoc.insert(
            first_group_id=parent_group_id, second_group_id=child_group_id
        )
        # Give access permission to the parent group and not the chid group
        auth.add_permission(
            parent_group_id, PermissionEnum.access.value, object_of_action, oid
        )
        auth.del_permission(
            child_group_id, PermissionEnum.access.value, object_of_action, oid
        )
        # User is member of the child group
        auth.add_membership(child_group_id, user_id)

        # When: calling get_user_access_groups
        result = auth.get_user_access_groups(object_of_action, oid, user_id)

        # Then: the result should contain the child_group_id via the parent group
        assert child_group_id in result
        assert parent_group_id not in result

    ##################################
    # Tests on VidjilAuth.get_access_groups
    ##################################

    def test_get_access_groups_user_none_and_group_none(self):
        # Given: user and group are None, should use current user
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        user_id = self.user1_id
        object_of_action = "sample_set"
        oid = db.sample_set.insert(sample_type="patient")
        group_id = auth.user_group(user_id)
        auth.add_permission(
            group_id, PermissionEnum.access.value, object_of_action, oid
        )
        auth.add_membership(group_id, user_id)

        # When: calling get_access_groups with no user and no group
        result = auth.get_access_groups(object_of_action, oid)

        # Then: the result should contain the group_id
        assert group_id in result

    def test_get_access_groups_with_user(self):
        # Given: specifying a user, should use get_user_access_groups
        user_id = self.user1_id
        object_of_action = "sample_set"
        oid = db.sample_set.insert(sample_type="patient")
        group_id = auth.user_group(user_id)
        auth.add_permission(
            group_id, PermissionEnum.access.value, object_of_action, oid
        )
        auth.add_membership(group_id, user_id)

        # When: calling get_access_groups with user specified
        result = auth.get_access_groups(object_of_action, oid, user=user_id)

        # Then: the result should contain the group_id
        assert group_id in result

    def test_get_access_groups_with_group(self):
        # Given: specifying a group, should use get_group_access_groups
        object_of_action = "sample_set"
        oid = db.sample_set.insert(sample_type="patient")
        group_id = db.auth_group.insert(role="test_group", description="Test group")
        auth.add_permission(
            group_id, PermissionEnum.access.value, object_of_action, oid
        )

        # When: calling get_access_groups with group specified
        result = auth.get_access_groups(object_of_action, oid, group=group_id)

        # Then: the result should contain the group_id
        assert group_id in result

    def test_get_access_groups_user_and_group_none_no_access(self):
        # Given: no permission set
        object_of_action = "sample_set"
        oid = db.sample_set.insert(sample_type="patient")

        # When: calling get_access_groups with no user and no group
        result = auth.get_access_groups(object_of_action, oid)

        # Then: the result should be empty
        assert result == []
