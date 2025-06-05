import json
import os

import pytest
from py4web.core import Session, _before_request

from ....common import auth, db
from ....controllers import auth as auth_controller
from ...functional.db_initialiser import (
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
    DBInitialiser,
)
from ..utils import db_manipulation_utils
from ..utils.omboddle import Omboddle


class TestAuthController:
    @pytest.fixture(autouse=True)
    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5]
        )
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        # init db
        initialiser = DBInitialiser(db)
        initialiser.run()

    ##################################
    # Tests on auth_controller.login()
    ##################################

    def test_login_page_render(self):
        # Given : No user is logged in

        # When : Calling login
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.login()

        # Then : The login page is called
        result = json.loads(json_result)
        assert result["message"] == "login page"

    ##################################
    # Tests on auth_controller.submit()
    ##################################

    def test_submit_no_credentials(self):
        # Given : No credentials provided
        params = {"format": "json"}

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.submit()

        # Then : We get an error message
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "Missing required parameter"

    def test_submit_invalid_user(self):
        # Given : Invalid login and password
        params = {
            "format": "json",
            "login": "invalid_user",
            "password": "wrong_password",
        }

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.submit()

        # Then : We get an error message
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "Invalid Credentials"

    def test_submit_invalid_password(self):
        # Given : Invalid login and password
        params = {
            "format": "json",
            "login": TEST_ADMIN_EMAIL,
            "password": "wrong_password",
        }

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.submit()

        # Then : We get an error message
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert "Invalid credentials" in result["message"]

    def test_submit_valid_credentials_no_2fa(self):
        # Given : Valid login and password, and no 2FA required
        admin_user = db(db.auth_user.email == TEST_ADMIN_EMAIL).select().first()
        assert admin_user is not None, "Valid user must exist in the database"
        params = {
            "format": "json",
            "login": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
        }
        two_factor_required_save = auth.param.two_factor_required
        two_factor_send_save = auth.param.two_factor_send
        auth.param.two_factor_required = None
        auth.param.two_factor_send = None

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.submit()

        # Then : User is logged in and redirected to home
        result = json.loads(json_result)
        assert result["success"] == "true"
        assert result["redirect"] == "/vidjil/default/home.html"
        assert self.session["user"]["id"] == admin_user.id

        auth.param.two_factor_required = two_factor_required_save
        auth.param.two_factor_send = two_factor_send_save

    def test_submit_valid_credentials_with_2fa(self):
        # Given : Valid login and password, and 2FA required
        admin_user = db(db.auth_user.email == TEST_ADMIN_EMAIL).select().first()
        assert admin_user is not None, "Admin user must exist in the database"
        params = {
            "format": "json",
            "login": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
        }
        two_factor_required_save = auth.param.two_factor_required
        two_factor_send_save = auth.param.two_factor_send
        auth.param.two_factor_required = lambda user, request: True
        auth.param.two_factor_send = lambda user, code: code

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.submit()

        # Then : User is redirected to two_factor
        result = json.loads(json_result)
        assert result["redirect"] == "/vidjil/auth/two_factor"
        assert self.session["auth.2fa_user"] == admin_user.id

        auth.param.two_factor_required = two_factor_required_save
        auth.param.two_factor_send = two_factor_send_save

    def test_submit_valid_credentials_2fa_bypass(self):
        # Given : Valid login and password, but 2FA bypassed
        admin_user = db(db.auth_user.email == TEST_ADMIN_EMAIL).select().first()
        assert admin_user is not None, "Admin user must exist in the database"
        params = {
            "format": "json",
            "login": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
        }
        two_factor_required_save = auth.param.two_factor_required
        two_factor_send_save = auth.param.two_factor_send
        auth.param.two_factor_required = lambda user, request: False
        auth.param.two_factor_send = lambda user, code: code

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.submit()

        # Then : User is logged in and redirected to home
        result = json.loads(json_result)
        assert result["success"] == "true"
        assert result["redirect"] == "/vidjil/default/home.html"
        assert self.session["user"]["id"] == admin_user.id

        auth.param.two_factor_required = two_factor_required_save
        auth.param.two_factor_send = two_factor_send_save

    ##################################
    # Tests on auth_controller.two_factor()
    ##################################

    def test_two_factor_no_user_id(self):
        # Given : no user_id in session

        # When : Calling two_factor
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.two_factor()

        # Then : We get a redirect to login
        result = json.loads(json_result)
        assert result["redirect"] == "vidjil/auth/login"

    def test_two_factor_code_not_sent(self, mocker):
        # Given : user id but no code in session
        self.session["auth.2fa_user"] = 1
        mocked_two_factor_send = mocker.patch(
            "apps.vidjil.controllers.auth.auth.param.two_factor_send"
        )

        # When : Calling two_factor
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.two_factor()

        # Then : check message is sent
        result = json.loads(json_result)
        assert result["message"] == "Enter verification code sent by email"
        mocked_two_factor_send.assert_called_once()

    def test_two_factor_code_already_sent(self, mocker):
        # Given : user id and code in session
        self.session["auth.2fa_user"] = 1
        self.session["auth.2fa_code"] = 10000
        mocked_two_factor_send = mocker.patch(
            "apps.vidjil.controllers.auth.auth.param.two_factor_send"
        )

        # When : Calling two_factor
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.two_factor()

        # Then : check no message is sent, and code stays the same
        result = json.loads(json_result)
        assert result["message"] == "Enter verification code sent by email"
        mocked_two_factor_send.assert_not_called()
        assert self.session["auth.2fa_code"] == 10000

    ##################################
    # Tests on auth_controller.submit_two_factor()
    ##################################

    def test_submit_two_factor_no_verification_code(self):
        # Given : no verification code in params

        # When : Calling submit_two_factor
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.submit_two_factor()

        # Then : We get a redirect to login and an error message
        result = json.loads(json_result)
        assert result["redirect"] == "vidjil/auth/login"
        assert result["message"] == "Missing required parameter"

    def test_submit_two_factor_verification_code_ok(self):
        # Given : no verification code in params
        user_id = 1
        next_url = "next/url"
        verification_code = 10000
        self.session["auth.2fa_user"] = user_id
        self.session["auth.2fa_next_url"] = next_url
        self.session["auth.2fa_code"] = verification_code
        self.session["auth.2fa_tries_left"] = 3

        # When : Calling submit_two_factor
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json", "verification_code": verification_code},
        ):
            json_result = auth_controller.submit_two_factor()

        # Then : We get a redirect to next_url, user is logged and 2FA is reset
        result = json.loads(json_result)
        assert result["redirect"] == next_url
        assert self.session["auth.2fa_code"] is None
        assert auth.session["auth.2fa_user"] is None
        assert auth.session["user"]["id"] == user_id

    def test_submit_two_factor_verification_code_ko(self):
        # Given : verification code wrong
        user_id = 1
        next_url = "next/url"
        verification_code = 10000
        tries_left = 3
        self.session["auth.2fa_user"] = user_id
        self.session["auth.2fa_next_url"] = next_url
        self.session["auth.2fa_code"] = verification_code + 1
        self.session["auth.2fa_tries_left"] = tries_left

        # When : Calling submit_two_factor
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json", "verification_code": verification_code},
        ):
            json_result = auth_controller.submit_two_factor()

        # Then : We get a redirect to two_factor, user is not logged and 2FA tries left is decreased
        result = json.loads(json_result)
        assert result["redirect"] == "vidjil/auth/two_factor"
        assert "user" not in auth.session
        assert self.session["auth.2fa_code"] == verification_code + 1
        assert auth.session["auth.2fa_tries_left"] == tries_left - 1

    def test_submit_two_factor_verification_code_ko_no_tries(self):
        # Given : verification code wrong, no tries left
        user_id = 1
        next_url = "next/url"
        verification_code = 10000
        tries_left = 1
        self.session["auth.2fa_user"] = user_id
        self.session["auth.2fa_next_url"] = next_url
        self.session["auth.2fa_code"] = verification_code + 1
        self.session["auth.2fa_tries_left"] = tries_left

        # When : Calling submit_two_factor
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json", "verification_code": verification_code},
        ):
            json_result = auth_controller.submit_two_factor()

        # Then : We get a redirect to login, user is not logged and 2FA is reset
        result = json.loads(json_result)
        assert result["redirect"] == "vidjil/auth/login"
        assert "user" not in auth.session
        assert self.session["auth.2fa_code"] is None
        assert self.session["auth.2fa_user"] is None

    ##################################
    # Tests on auth_controller.logout()
    ##################################

    def test_logout_user_logged_in(self):
        # Given : Logged in as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        initial_auth_event_count = db(db.auth_event).count()

        # When : Calling logout
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.logout()

        # Then : The session is cleared and user is redirected to home
        result = json.loads(json_result)
        assert result["redirect"] == "/vidjil/default/home.html"
        assert "user" not in self.session
        assert db(db.auth_event).count() == initial_auth_event_count + 1

    def test_logout_user_not_logged_in(self):
        # Given : No user is logged in

        # When : Calling logout
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.logout()

        # Then : The session remains cleared and user is redirected to home
        result = json.loads(json_result)
        assert result["redirect"] == "/vidjil/default/home.html"
        assert "user" not in self.session

    ##################################
    # Tests on auth_controller.register()
    ##################################

    def test_register_user_authenticated(self):
        # Given : Logged in as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling register
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.register()

        # Then : The register page is rendered
        result = json.loads(json_result)
        assert result["message"] == "Register new user"

    def test_register_user_not_authenticated(self):
        # Given : No user is logged in

        # When : Calling register
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.register()

        # Then : An error message is returned
        result = json.loads(json_result)
        assert result["message"] == "you need to be admin and logged to add new users"

    def test_register_user_other_user(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

        # When : Calling register
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.register()

        # Then : An error message is returned
        result = json.loads(json_result)
        assert result["message"] == "you need to be admin and logged to add new users"

    ##################################
    # Tests on auth_controller.register_form()
    ##################################

    def test_register_form_user_not_authenticated(self):
        # Given : No user is logged in

        # When : Calling register_form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.register_form()

        # Then : Access is denied
        result = json.loads(json_result)
        assert result["message"] == "access denied"

    def test_register_form_user_other_user(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

        # When : Calling register_form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = auth_controller.register_form()

        # Then : Access is denied
        result = json.loads(json_result)
        assert result["message"] == "access denied"

    def test_register_form_passwords_do_not_match(self):
        # Given : Logged in as admin, passwords do not match
        db_manipulation_utils.log_in_as_default_admin(self.session)
        params = {
            "format": "json",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "password": "password123",
            "confirm_password": "password456",
        }

        # When : Calling register_form
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.register_form()

        # Then : An error message is returned
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "password fields must match"

    def test_register_form_success(self):
        # Given : An admin user is logged in
        db_manipulation_utils.log_in_as_default_admin(self.session)
        user_email = "john.doe@example.com"
        params = {
            "format": "json",
            "first_name": "John",
            "last_name": "Doe",
            "email": user_email,
            "password": "password123",
            "confirm_password": "password123",
        }

        # When : Calling register_form
        with Omboddle(self.session, keep_session=True, params=params):
            json_result = auth_controller.register_form()

        # Then : The user is successfully registered
        result = json.loads(json_result)
        assert result["redirect"] == "back"
        assert result["message"].startswith(user_email)
        assert "user_id" in result

        # Verify that the user exists in the database
        new_user_id = result["user_id"]
        new_user = db(db.auth_user.id == new_user_id).select().first()
        assert new_user is not None
        assert new_user.email == user_email

        # Verify that a group has been assigned to the user
        user_group_role = auth.user_group_role(new_user_id)
        user_group = db(db.auth_group.role == user_group_role).select().first()
        assert user_group is not None
        assert user_group.description == f"Group of user {new_user_id} - John Doe"

        # Verify that the user is a member of the assigned group
        membership = (
            db(
                (db.auth_membership.user_id == new_user_id)
                & (db.auth_membership.group_id == user_group.id)
            )
            .select()
            .first()
        )
        assert membership is not None
