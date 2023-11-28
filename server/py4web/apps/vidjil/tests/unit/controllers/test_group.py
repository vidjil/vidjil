import os
import json
import unittest

from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils, test_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
from ....modules.permission_enum import PermissionEnum
from ....controllers import group as group_controller


class TestGroupController(unittest.TestCase):

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
    # Tests on group_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_admin(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = group_controller.index()

        # Then : We get groups list
        result = json.loads(json_result)
        assert result["message"] == "Groups"
        query = result["query"]
        assert len(query) == 3
        assert query[0]["role"] == "admin"
        assert query[0]["access"] == "ec"
        assert query[1]["role"] == "public"
        assert query[1]["access"] == ""
        assert query[2]["role"] == "user_1"
        assert query[2]["access"] == ""

    def test_index_other_user(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = group_controller.index()

        # Then : We get groups list
        result = json.loads(json_result)
        assert result["message"] == "Groups"
        query = result["query"]
        assert len(query) == 4
        assert query[0]["role"] == "admin"
        assert query[0]["access"] == "ec"
        assert query[1]["role"] == "public"
        assert query[1]["access"] == ""
        assert query[2]["role"] == "user_1"
        assert query[2]["access"] == ""
        assert query[3]["role"] == "user_2"
        assert query[3]["access"] == "eacsu"
        # TODO : check that it is expected that we get all groups here (not only the group user has access to)

    ##################################
    # Tests on group_controller.add()
    ##################################

    def test_add_not_logged(self):
        # Given : not logged

        # When : Calling add
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.add()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_admin(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling add
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = group_controller.add()

        # Then : We get groups list
        result = json.loads(json_result)
        assert result["message"] == "New group"
        groups = result["groups"]
        assert len(groups) == 7
        assert groups[0]["role"] == "admin"
        assert groups[1]["role"] == "user_1"
        assert groups[2]["role"] == "public"

    def test_add_other_user(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling add
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = group_controller.add()

        # Then : We get groups list
        result = json.loads(json_result)
        assert result["message"] == "New group"
        groups = result["groups"]
        assert len(groups) == 2
        assert groups[0]["role"] == "public"
        assert groups[1]["role"] == "user_2"

    ##################################
    # Tests on group_controller.add_form()
    ##################################

    def test_add_form_not_logged(self):
        # Given : not logged

        # When : Calling add_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.add_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_form_other_user(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = group_controller.add_form()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == group_controller.ACCESS_DENIED

    def test_add_form_no_parent(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", "group_name": "test_group", "info": "test_group info", "group_parent": "None"}):
            json_result = group_controller.add_form()

        # Then : We get groups list
        result = json.loads(json_result)
        assert result["redirect"] == "group/index"
        group_id = result["group_id"]
        assert result["message"] == f"group '{group_id}' (test_group) created"
        group = db.auth_group[group_id]
        assert group.role == "test_group"
        assert group.description == "test_group info"
        group_assoc = db(db.group_assoc.second_group_id ==
                         group_id).select(db.group_assoc.first_group_id)
        assert len(group_assoc) == 0

    def test_add_form_parent(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", "group_name": "test_group", "info": "test_group info", "group_parent": "1"}):
            json_result = group_controller.add_form()

        # Then : We get groups list
        result = json.loads(json_result)
        assert result["redirect"] == "group/index"
        group_id = result["group_id"]
        assert result["message"] == f"group '{group_id}' (test_group) created"
        group = db.auth_group[group_id]
        assert group.role == "test_group"
        assert group.description == "test_group info"
        group_assoc = db(db.group_assoc.second_group_id ==
                         group_id).select(db.group_assoc.first_group_id)
        assert len(group_assoc) == 1
        assert group_assoc[0]["first_group_id"] == 1

    ##################################
    # Tests on group_controller.edit()
    ##################################

    def test_edit_not_logged(self):
        # Given : not logged

        # When : Calling edit
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.edit()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_no_rights(self):
        # Given : not logged
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling edit
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": "1"}):
            json_result = group_controller.edit()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == group_controller.ACCESS_DENIED

    def test_edit_admin(self):
        # Given : not logged
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling edit
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": "1"}):
            json_result = group_controller.edit()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["message"] == "Edit group"
        assert result["group"]["role"] == "admin"

    ##################################
    # Tests on group_controller.edit_form()
    ##################################

    def test_edit_form_not_logged(self):
        # Given : not logged

        # When : Calling edit_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.edit_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_form(self):
        # Given : not logged
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        user_group_id = test_utils.get_user_group_id(db, user_1_id)

        # When : Calling edit_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", "id": user_group_id, "group_name": "modified name", "info": "modified info"}):
            json_result = group_controller.edit_form()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["redirect"] == "group/index"
        assert result["message"] == f"group '{user_group_id}' modified"
        group = db.auth_group[user_group_id]
        assert group.role == "modified name"
        assert group.description == "modified info"

    ##################################
    # Tests on group_controller.confirm()
    ##################################

    def test_confirm_not_logged(self):
        # Given : not logged

        # When : Calling confirm
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.confirm()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_confirm_no_rights(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": 1}):
            json_result = group_controller.confirm()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == group_controller.ACCESS_DENIED

    def test_confirm_ok(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        user_group_id = test_utils.get_user_group_id(db, user_1_id)

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": user_group_id}):
            json_result = group_controller.confirm()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["message"] == "confirm group deletion"

    ##################################
    # Tests on group_controller.delete()
    ##################################

    def test_delete_not_logged(self):
        # Given : not logged

        # When : Calling delete
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.delete()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_delete_no_rights(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling delete
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": 1}):
            json_result = group_controller.delete()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == group_controller.ACCESS_DENIED

    def test_delete_ok(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        user_group_id = test_utils.get_user_group_id(db, user_1_id)
        assert db.auth_group[user_group_id] != None

        # When : Calling delete
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": user_group_id}):
            json_result = group_controller.delete()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["redirect"] == "group/index"
        assert result["message"] == f"group '{user_group_id}' deleted"
        assert db.auth_group[user_group_id] == None

    ##################################
    # Tests on group_controller.info()
    ##################################

    def test_info_not_logged(self):
        # Given : not logged

        # When : Calling info
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                group_controller.info()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_info_no_rights(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": 1}):
            json_result = group_controller.info()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == group_controller.ACCESS_DENIED

    def test_info_ok(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        user_group_id = test_utils.get_user_group_id(db, user_1_id)

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": user_group_id}):
            json_result = group_controller.info()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["message"] == "group info"
        assert result["group"]["id"] == user_group_id
        assert result["result"][str(user_1_id)]["auth_user"]["id"] == user_1_id

    ##################################
    # Tests on group_controller.invite()
    ##################################

    def test_invite(self):
        # Given : logged as admin
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert not auth.has_membership(1, user_1_id)

        # When : Calling invite
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"group_id": 1, "user_id": user_1_id}):
            json_result = group_controller.invite()

        # Then : user is added in group
        result = json.loads(json_result)
        assert result["redirect"] == "group/info"
        assert result["message"] == f"user '{user_1_id}' added to group '1'"
        assert auth.has_membership(1, user_1_id)

    ##################################
    # Tests on group_controller.kick()
    ##################################

    def test_kick(self):
        # Given : logged as admin
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in_as_default_admin(self.session)
        auth.add_membership(1, user_1_id)
        assert auth.has_membership(1, user_1_id)

        # When : Calling kick
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"group_id": 1, "user_id": user_1_id}):
            json_result = group_controller.kick()

        # Then : user is added in group
        result = json.loads(json_result)
        assert result["redirect"] == "group/info"
        assert result["message"] == f"user '{user_1_id}' removed from group '1'"
        assert not auth.has_membership(1, user_1_id)

    ##################################
    # Tests on group_controller.rights()
    ##################################

    def test_rights_add(self):
        # Given : logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert not auth.has_permission(group_id=1, name=PermissionEnum.upload.value, table_name="test", record_id=0)

        # When : Calling rights
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, 
                      query={"id": 1, "value": "true", "right": PermissionEnum.upload.value, "name": "test"}):
            json_result = group_controller.rights()

        # Then : user is added in group
        result = json.loads(json_result)
        assert result["redirect"] == "group/info"
        assert result["message"] == f"add '{PermissionEnum.upload.value}' permission on 'test' for group {db.auth_group[1].role}"
        assert auth.has_permission(group_id=1, name=PermissionEnum.upload.value, table_name="test", record_id=0)

    def test_rights_remove(self):
        # Given : logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.add_permission(group_id=1, name=PermissionEnum.upload.value, table_name="test", record_id=0)
        assert auth.has_permission(group_id=1, name=PermissionEnum.upload.value, table_name="test", record_id=0)

        # When : Calling rights
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, 
                      query={"id": 1, "value": "false", "right": PermissionEnum.upload.value, "name": "test"}):
            json_result = group_controller.rights()

        # Then : user is added in group
        result = json.loads(json_result)
        assert result["redirect"] == "group/info"
        assert result["message"] == f"remove '{PermissionEnum.upload.value}' permission on 'test' for group {db.auth_group[1].role}"
        assert not auth.has_permission(group_id=1, name=PermissionEnum.upload.value, table_name="test", record_id=0)
