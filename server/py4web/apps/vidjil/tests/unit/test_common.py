import os
import types

import pytest
from py4web.core import Session, _before_request

from ...common import auth, db
from ..functional.db_initialiser import DBInitialiser


class TestCommon:
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

    ##################################
    # Tests on common.send_mail()
    ##################################

    def test_send_mail_returns_false_if_mailer_not_configured(self, mocker):
        from ...common import send_mail

        # Given: mail is None
        mocker.patch("apps.vidjil.common.mail", None)
        # When: calling send_mail
        result = send_mail("to@example.com", "subject", "body")
        # Then: should return False
        assert result is False

    def test_send_mail_returns_false_on_exception(self, mocker):
        from ...common import send_mail

        class FakeMailer:
            def send(self, **kwargs):
                raise Exception("SMTP error")

        mocker.patch("apps.vidjil.common.mail", FakeMailer())
        result = send_mail("to@example.com", "subject", "body")
        assert result is False

    ##################################
    # Tests on common.send_two_factor_email()
    ##################################

    def test_send_two_factor_email(self, mocker):
        from ...common import send_two_factor_email

        sent = {}

        def fake_send_mail(to, subject, body):
            sent["to"] = to
            sent["subject"] = subject
            sent["body"] = body
            return True

        mocker.patch("apps.vidjil.common.send_mail", fake_send_mail)
        user = type("User", (), {"email": "foo@bar.com"})()
        code = send_two_factor_email(user, "123456")
        assert code == "123456"
        assert sent["to"] == ["foo@bar.com"]
        assert "123456" in sent["body"]

    ##################################
    # Tests on common.two_factor_required()
    ##################################

    def test_two_factor_required_global(self, mocker):
        # Given: TWO_FACTOR_REQUIRED is True, no email list
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_REQUIRED", True)
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_EMAIL_LIST", [])
        user = types.SimpleNamespace(email="user@example.com")
        # When/Then: always required
        from ...common import two_factor_required

        assert two_factor_required(user, None) is True

    def test_two_factor_required_global_with_exclusion(self, mocker):
        # Given: TWO_FACTOR_REQUIRED is True, with exclusion list
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_REQUIRED", True)
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_EMAIL_LIST", ["user@example.com"])
        user = types.SimpleNamespace(email="user@example.com")
        # When/Then: not required for this user
        from ...common import two_factor_required

        assert two_factor_required(user, None) is False
        # But required for another user
        user2 = types.SimpleNamespace(email="other@example.com")
        assert two_factor_required(user2, None) is True

    def test_two_factor_required_only_for_list(self, mocker):
        # Given: TWO_FACTOR_REQUIRED is False, but list is set
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_REQUIRED", False)
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_EMAIL_LIST", ["user@example.com"])
        from ...common import two_factor_required

        user = types.SimpleNamespace(email="user@example.com")
        # When/Then: required only for users in the list
        assert two_factor_required(user, None) is True
        user2 = types.SimpleNamespace(email="other@example.com")
        assert two_factor_required(user2, None) is False

    def test_two_factor_required_disabled(self, mocker):
        # Given: TWO_FACTOR_REQUIRED is False, no email list
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_REQUIRED", False)
        mocker.patch("apps.vidjil.settings.TWO_FACTOR_EMAIL_LIST", [])
        from ...common import two_factor_required

        user = types.SimpleNamespace(email="user@example.com")
        # When/Then: never required
        assert two_factor_required(user, None) is False
