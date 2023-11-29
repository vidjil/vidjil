import collections
import os
import json
import unittest
from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils, test_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth, cache
from ....modules.permission_enum import PermissionEnum

# Hack to prevent use of cache
cache.free = 0

from ....controllers import pre_process as pre_process_controller


class TestPreProcessController(unittest.TestCase):

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
    # Tests on pre_process_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = pre_process_controller.index()

        # Then : We get notifications list
        result = json.loads(json_result)
        assert result["message"] == "Pre-process list"
        query = result["query"]
        assert len(query) == 5
        names = [item["name"] for item in query]
        expected_names = ["public pre-process", "pre-process perm",
                          "test pre-process 0", "test pre-process 1", "test pre-process 2"]
        assert collections.Counter(
            names) == collections.Counter(expected_names)
        assert result["isAdmin"] == True

    ##################################
    # Tests on pre_process_controller.task_test2()
    ##################################

    # TODO : remove the controller method ? or test it...

    ##################################
    # Tests on pre_process_controller.add()
    ##################################

    def test_add_not_logged(self):
        # Given : not logged

        # When : Calling add
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.add()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_ok(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling add
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = pre_process_controller.add()

        # Then : add authorized
        result = json.loads(json_result)
        assert result["message"] == "Add pre-process"

    ##################################
    # Tests on pre_process_controller.add_form()
    ##################################

    def test_add_form_not_logged(self):
        # Given : not logged

        # When : Calling add_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.add_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_form(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_to_add = dict(pre_process_name="new pre_process name",
                                  pre_process_command="new pre_process command",
                                  pre_process_info="new pre_process info")

        # When : Calling add_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", **pre_process_to_add}):
            json_result = pre_process_controller.add_form()

        # Then : notification was added
        result = json.loads(json_result)
        pre_process_id = result["pre_process_id"]
        assert result["redirect"] == "pre_process/index"
        assert result["message"] == f"pre_process '{pre_process_to_add['pre_process_name']}' added"
        pre_process_from_db = db.pre_process[pre_process_id]
        assert pre_process_from_db["name"] == pre_process_to_add["pre_process_name"]
        assert pre_process_from_db["command"] == pre_process_to_add["pre_process_command"]
        assert pre_process_from_db["info"] == pre_process_to_add["pre_process_info"]

    ##################################
    # Tests on pre_process_controller.edit()
    ##################################

    def test_edit_not_logged(self):
        # Given : not logged

        # When : Calling edit
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.edit()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_no_rights(self):
        # Given : Logged as other user
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling edit
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.edit()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == pre_process_controller.ACCESS_DENIED

    def test_edit_ok(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")

        # When : Calling edit
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.edit()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == "edit pre_process"

    ##################################
    # Tests on pre_process_controller.edit_form()
    ##################################

    def test_edit_form_not_logged(self):
        # Given : not logged

        # When : Calling edit_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.edit_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_form_no_rights(self):
        # Given : Logged as other user
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling edit_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.edit_form()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == pre_process_controller.ACCESS_DENIED

    def test_edit_form(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        pre_process_edit = dict(pre_process_name="new pre process name",
                                pre_process_info="new pre process info",
                                pre_process_command="new pre process command")

        # When : Calling edit_form
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json", "id": pre_process_id, **pre_process_edit}):
            json_result = pre_process_controller.edit_form()

        # Then : notification was updated
        result = json.loads(json_result)
        assert result["message"] == f"pre_process '{pre_process_edit['pre_process_name']}' updated"
        assert result["redirect"] == "pre_process/index"
        pre_process_from_db = db.pre_process[pre_process_id]
        assert pre_process_from_db["name"] == pre_process_edit["pre_process_name"]
        assert pre_process_from_db["command"] == pre_process_edit["pre_process_command"]
        assert pre_process_from_db["info"] == pre_process_edit["pre_process_info"]

    ##################################
    # Tests on pre_process_controller.confirm()
    ##################################

    def test_confirm_not_logged(self):
        # Given : not logged

        # When : Calling confirm
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.confirm()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_confirm_no_rights(self):
        # Given : Logged as other user
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.confirm()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == pre_process_controller.ACCESS_DENIED

    def test_confirm(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.confirm()

        # Then : notification was updated
        result = json.loads(json_result)
        assert result["message"] == "confirm pre_process deletion"

    ##################################
    # Tests on pre_process_controller.delete()
    ##################################

    def test_delete_not_logged(self):
        # Given : not logged

        # When : Calling delete
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.delete()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_confirm_no_rights(self):
        # Given : Logged as other user
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.delete()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == pre_process_controller.ACCESS_DENIED

    def test_delete(self):
        # Given : Logged as admin, adding a preprocess
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        assert db.pre_process[pre_process_id] != None

        # When : Calling delete
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.delete()

        # Then : pre_process was deleted
        result = json.loads(json_result)
        assert result["redirect"] == "pre_process/index"
        assert result["message"] == f"pre_process '{pre_process_id}' deleted"
        assert db.pre_process[pre_process_id] == None

    ##################################
    # Tests on pre_process_controller.info()
    ##################################

    def test_info_not_logged(self):
        # Given : not logged

        # When : Calling info
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.info()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_info_no_rights(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sample_set_id": 1}):
            json_result = pre_process_controller.info()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["message"] == "acces denied"

    def test_info_ok(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sample_set_id": 1}):
            json_result = pre_process_controller.info()

        # Then : authorized
        result = json.loads(json_result)
        assert result["message"] == "result info"

    ##################################
    # Tests on pre_process_controller.permission()
    ##################################

    def test_permission_not_logged(self):
        # Given : No user logged

        # When : Calling permission
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                pre_process_controller.permission()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_permission_no_id(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling permission with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.permission()

        # Then : We get an exception
        exception = context.exception
        assert exception.args[0] == "id"

    def test_permission_id_first_pre_process(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        first_pre_process_id = db(db.pre_process).select().first().id

        # When : Calling permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": first_pre_process_id}):
            json_result = pre_process_controller.permission()

        # Then : check result
        result = json.loads(json_result)
        query = result["query"]
        assert len(query) == 6
        # only read access is for public groups
        read_permissions = [row["role"] for row in query if row["read"]]
        assert len(read_permissions) == 1
        assert read_permissions[0] == "public"

    def test_permission_id_new_pre_process(self):
        # Given : Logged as admin, adding a preprocess
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")

        # When : Calling permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.permission()

        # Then : check result
        result = json.loads(json_result)
        query = result["query"]
        assert len(query) == 6
        # no access
        read_permissions = [row["role"] for row in query if row["read"]]
        assert len(read_permissions) == 0

    def test_permission_id_new_pre_process_with_rights(self):
        # Given : Logged as admin, adding a preprocess with access rights
        db_manipulation_utils.log_in_as_default_admin(self.session)
        pre_process_id = db.pre_process.insert(name="pre process name",
                                               info="pre process info",
                                               command="pre process command")
        user_group_id = test_utils.get_user_group_id(db, 1)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.pre_process, pre_process_id)

        # When : Calling permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": pre_process_id}):
            json_result = pre_process_controller.permission()

        # Then : check result
        result = json.loads(json_result)
        query = result["query"]
        assert len(query) == 6
        # no access
        read_permissions = [row["role"] for row in query if row["read"]]
        assert len(read_permissions) == 1
        assert read_permissions[0] == db.auth_group[user_group_id].role

    ##################################
    # Tests on pre_process_controller.change_permission()
    ##################################

    def test_change_permission_not_logged(self):
        # Given : No user logged

        # When : Calling change_permission
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                pre_process_controller.change_permission()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_change_permission_no_pre_process_id(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling change_permission with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                pre_process_controller.change_permission()

        # Then : Error expected
        exception = context.exception
        assert exception.args[0] == "pre_process_id"

    def test_change_permission_access_denied(self):
        # Given : a user and pre_process
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))
        pre_process_id = db_manipulation_utils.add_pre_process()
        user_group_id = test_utils.get_user_group_id(db, user_1_id)

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"pre_process_id": pre_process_id, "group_id": user_group_id}):
            json_result = pre_process_controller.change_permission()

        # Then : Error expected
        result = json.loads(json_result)
        assert result["message"] == "access denied"

    def test_change_permission_granted(self):
        # Given : a user and pre_process
        db_manipulation_utils.log_in_as_default_admin(self.session)
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        pre_process_id = db_manipulation_utils.add_pre_process()
        user_group_id = test_utils.get_user_group_id(db, user_1_id)
        assert auth.get_group_access(
            "pre_process", pre_process_id, user_group_id) == False

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"pre_process_id": pre_process_id, "group_id": user_group_id}):
            json_result = pre_process_controller.change_permission()

        # Then : access granted
        result = json.loads(json_result)
        assert result["message"] == f"c{pre_process_id}: access '{PermissionEnum.access.value}' granted to '{db.auth_group[user_group_id].role}'"
        assert auth.get_group_access(
            "pre_process", pre_process_id, user_group_id) == True

    def test_change_permission_deleted(self):
        # Given : a user and pre_process
        db_manipulation_utils.log_in_as_default_admin(self.session)
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        pre_process_id = db_manipulation_utils.add_pre_process()
        user_group_id = test_utils.get_user_group_id(db, user_1_id)
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"pre_process_id": pre_process_id, "group_id": user_group_id}):
            json_result = pre_process_controller.change_permission()
        assert auth.get_group_access(
            "pre_process", pre_process_id, user_group_id) == True

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"pre_process_id": pre_process_id, "group_id": user_group_id}):
            json_result = pre_process_controller.change_permission()

        # Then : access deleted
        result = json.loads(json_result)
        assert result["message"] == f"c{pre_process_id}: access '{PermissionEnum.access.value}' deleted to '{db.auth_group[user_group_id].role}'"
        assert auth.get_group_access(
            "pre_process", pre_process_id, user_group_id) == False
