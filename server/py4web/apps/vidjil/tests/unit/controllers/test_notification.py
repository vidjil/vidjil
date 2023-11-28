import os
import json
import unittest
import datetime

from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth, cache

# Hack to prevent use of cache
cache.free = 0

from ....controllers import notification as notification_controller


class TestMyAccountController(unittest.TestCase):

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

    ##################################
    # Tests on notification_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert db(db.user_preference.user_id == 1 and
                  db.user_preference.preference == "mail" and
                  db.user_preference.val == 1).count() == 0

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.index()

        # Then : We get notifications list
        result = json.loads(json_result)
        assert result["message"] == "News"
        assert len(result["notifications"]) == 3
        assert result["m_content"] == ""
        assert db(db.user_preference.user_id == 1 and
                  db.user_preference.preference == "mail" and
                  db.user_preference.val == 1).count() == 0

    def test_index_id(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert db(db.user_preference.user_id == 1 and
                  db.user_preference.preference == "mail" and
                  db.user_preference.val == 1).count() == 0

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": 1}):
            json_result = notification_controller.index()

        # Then : We get notifications list and loaded message content
        result = json.loads(json_result)
        assert result["message"] == "News"
        assert len(result["notifications"]) == 3
        assert result["m_content"] == "this is a test 0"
        assert db(db.user_preference.user_id == 1 and
                  db.user_preference.preference == "mail" and
                  db.user_preference.val == 1).count() == 1

    ##################################
    # Tests on notification_controller.add()
    ##################################

    def test_add_not_logged(self):
        # Given : not logged

        # When : Calling add
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.add()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_not_admin(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling add
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.add()

        # Then : error
        result = json.loads(json_result)
        assert result["message"] == notification_controller.ACCESS_DENIED

    def test_add_ok(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling add
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.add()

        # Then : add authorized
        result = json.loads(json_result)
        assert result["message"] == "add notification"

    ##################################
    # Tests on notification_controller.add_form()
    ##################################

    def test_add_form_not_logged(self):
        # Given : not logged

        # When : Calling add_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.add_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_form_not_admin(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.add_form()

        # Then : eroor
        result = json.loads(json_result)
        assert result["message"] == notification_controller.ACCESS_DENIED

    def test_add_form_wrong_date(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        notif_to_add = dict(title="title new notif",
                            message_content="message_content new notif",
                            message_type="message_type new notif",
                            priority="priority new notif",
                            expiration="a wrong date")

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", **notif_to_add}):
            json_result = notification_controller.add_form()

        # Then : error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "date (wrong format)"

    def test_add_form(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        tomorrow = datetime.datetime.today().date() + datetime.timedelta(days=1)
        notif_to_add = dict(title="title new notif",
                            message_content="message_content new notif",
                            message_type="message_type new notif",
                            priority="priority new notif",
                            expiration=tomorrow)

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", **notif_to_add}):
            json_result = notification_controller.add_form()

        # Then : notification was added
        result = json.loads(json_result)
        assert result["message"] == "notification added"
        assert result["redirect"] == "notification/index"
        notif_id = result["args"]["id"]
        notif_from_db = db.notification[notif_id]
        assert all(item in notif_from_db.items()
                   for item in notif_to_add.items())

    ##################################
    # Tests on notification_controller.edit()
    ##################################

    def test_edit_not_logged(self):
        # Given : not logged

        # When : Calling edit
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.edit()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_not_admin(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling edit
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.edit()

        # Then : error
        result = json.loads(json_result)
        assert result["message"] == notification_controller.ACCESS_DENIED

    def test_edit_ok(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling edit
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.edit()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == "edit notification"

    ##################################
    # Tests on notification_controller.edit_form()
    ##################################

    def test_edit_form_not_logged(self):
        # Given : not logged

        # When : Calling edit_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.edit_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_form_not_admin(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling edit_form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.edit_form()

        # Then : error
        result = json.loads(json_result)
        assert result["message"] == notification_controller.ACCESS_DENIED

    def test_edit_form_wrong_date(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        tomorrow = datetime.datetime.today().date() + datetime.timedelta(days=1)
        notification_id = db.notification.insert(title="title notif",
                                                 message_content="message_content notif",
                                                 message_type="message_type notif",
                                                 priority="priority notif",
                                                 expiration=tomorrow)
        notif_edit = dict(title="title new notif",
                          message_content="message_content new notif",
                          message_type="message_type new notif",
                          priority="priority new notif",
                          expiration="a wrong date")

        # When : Calling edit_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", "id": notification_id, **notif_edit}):
            json_result = notification_controller.edit_form()

        # Then : error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "date (wrong format)"

    def test_edit_form(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        tomorrow = datetime.datetime.today().date() + datetime.timedelta(days=1)
        notification_id = db.notification.insert(title="title notif",
                                                 message_content="message_content notif",
                                                 message_type="message_type notif",
                                                 priority="priority notif",
                                                 expiration=tomorrow)
        db.user_preference.insert(
            user_id=1, preference='mail', val=notification_id)
        assert db(db.user_preference.val ==
                  notification_id and db.user_preference.preference == "mail").count() > 0
        day_after_tomorrow = tomorrow + datetime.timedelta(days=1)
        notif_edit = dict(title="title new notif",
                          message_content="message_content new notif",
                          message_type="message_type new notif",
                          priority="priority new notif",
                          expiration=day_after_tomorrow)

        # When : Calling edit_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", "id": notification_id, **notif_edit}):
            json_result = notification_controller.edit_form()

        # Then : notification was updated
        result = json.loads(json_result)
        assert result["message"] == "notification updated"
        assert result["redirect"] == "notification/index"
        notification_id_from_result = result["args"]["id"]
        assert int(notification_id_from_result) == notification_id
        notification_from_db = db.notification[notification_id]
        assert all(item in notification_from_db.items()
                   for item in notif_edit.items())
        assert db(db.user_preference.val == notification_id and
                  db.user_preference.preference == "mail").count() == 0

    ##################################
    # Tests on notification_controller.delete()
    ##################################

    def test_delete_not_logged(self):
        # Given : not logged

        # When : Calling delete
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.delete()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_delete_not_admin(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling delete
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.delete()

        # Then : error
        result = json.loads(json_result)
        assert result["message"] == notification_controller.ACCESS_DENIED

    def test_delete(self):
        # Given : Logged as admin, adding a notif and a link
        db_manipulation_utils.log_in_as_default_admin(self.session)
        tomorrow = datetime.datetime.today().date() + datetime.timedelta(days=1)
        notification_id = db.notification.insert(title="title notif",
                                                 message_content="message_content notif",
                                                 message_type="message_type notif",
                                                 priority="priority notif",
                                                 expiration=tomorrow)
        assert db.notification[notification_id] != None
        db.user_preference.insert(
            user_id=1, preference='mail', val=notification_id)
        assert db(db.user_preference.val ==
                  notification_id and db.user_preference.preference == "mail").count() > 0

        # When : Calling delete
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": notification_id}):
            json_result = notification_controller.delete()

        # Then : notification was updated
        result = json.loads(json_result)
        assert result["redirect"] == "notification/index"
        assert result["success"] == "true"
        assert result["message"] == f"notification {notification_id} deleted"
        assert db.notification[notification_id] == None
        assert db(db.user_preference.val ==
                  notification_id and db.user_preference.preference == "mail").count() == 0

    ##################################
    # Tests on notification_controller.get_active_notifications()
    ##################################

    def test_get_active_notifications_not_logged(self):
        # Given : not logged

        # When : Calling get_active_notifications
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                notification_controller.get_active_notifications()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_get_active_notifications(self):
        # Given : Logged as admin, adding a notif and a link
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling get_active_notifications
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.get_active_notifications()

        # Then : we get the 3 original notifs
        result = json.loads(json_result)
        assert len(result) == 3

    def test_get_active_notifications_added_notif(self):
        # Given : Logged as admin, adding a notif
        db_manipulation_utils.log_in_as_default_admin(self.session)
        tomorrow = datetime.datetime.today().date() + datetime.timedelta(days=1)
        db.notification.insert(title="title notif",
                               message_content="message_content notif",
                               message_type="message_type notif",
                               priority="priority notif",
                               expiration=tomorrow)
        db.commit()

        # When : Calling get_active_notifications
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.get_active_notifications()
            json_result = notification_controller.get_active_notifications()

        # Then : we get the 3 original notifs + the added one
        result = json.loads(json_result)
        assert len(result) == 4
        assert ("title notif" in notification["title"]
                for notification in result)

    def test_get_active_notifications_added_notif_seen(self):
        # Given : Logged as admin, adding a notif and a link
        db_manipulation_utils.log_in_as_default_admin(self.session)
        tomorrow = datetime.datetime.today().date() + datetime.timedelta(days=1)
        notification_id = db.notification.insert(title="title notif",
                                                 message_content="message_content notif",
                                                 message_type="message_type notif",
                                                 priority="priority notif",
                                                 expiration=tomorrow)
        db.user_preference.insert(
            user_id=1, preference='mail', val=notification_id)

        # When : Calling get_active_notifications
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.get_active_notifications()

        # Then :  we only get the 3 original notifs, as the added one is marked as seen
        result = json.loads(json_result)
        assert len(result) == 3
        assert (
            "title notif" not in notification["title"] for notification in result)

    def test_get_active_notifications_added_notif_yesterday(self):
        # Given : Logged as admin, adding a notif
        db_manipulation_utils.log_in_as_default_admin(self.session)
        yesterday = datetime.datetime.today().date() - datetime.timedelta(days=1)
        db.notification.insert(title="title notif",
                               message_content="message_content notif",
                               message_type="message_type notif",
                               priority="priority notif",
                               expiration=yesterday)

        # When : Calling get_active_notifications
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = notification_controller.get_active_notifications()

        # Then : we only get the 3 original notifs, as the added one is expired
        result = json.loads(json_result)
        assert len(result) == 3
        assert ("title notif" in notification["title"]
                for notification in result)
        
    # TODO : test memoize ? currently deactivated
