import json
import os

import pytest
from py4web.core import Session, _before_request

from ....common import auth, db
from ....controllers import auth as auth_controller
from ...functional.db_initialiser import DBInitialiser
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
