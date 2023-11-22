import os
import json
import unittest
from ..utils.omboddle import Omboddle
from py4web.core import _before_request, Session, HTTP
from ...functional.db_initialiser import DBInitialiser
from ..utils.db_manipulation_utils import add_indexed_user, log_in, get_indexed_user_email, get_indexed_user_password, log_in_as_default_admin, add_results_file
from ....common import db, auth
from ....controllers import config as config_controller


TEST_CONFIG_NAME = "test_config_plapipou"


class TestConfigController(unittest.TestCase):

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
    # Tests on config_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : No user logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_admin(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = config_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["isAdmin"] == True
        assert len(result["query"]) == 8
        assert len(result["used_configs"]) == 1
        assert result["used_configs"][0] == 1
        assert len(result["classification"]) == 6

    # TODO : test with other user

    ##################################
    # Tests on config_controller.add()
    ##################################

    def test_add_not_logged(self):
        # Given : No user logged

        # When : Calling add
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.add()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_admin(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling add
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = config_controller.add()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["message"] == "Add config"
        assert len(result["classification"]) == 6

    # TODO : test with other user

    ##################################
    # Tests on config_controller.add_form()
    ##################################

    def test_add_form_not_logged(self):
        # Given : No user logged

        # When : Calling add_form
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.add_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_add_form_admin_incomplete(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling add_form with no parameters
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = config_controller.add_form()

        # Then : check error occurs
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "config_name needed, config_command needed, config_fuse_command needed, config_program needed"

    def test_add_form_admin_config_no_classification(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : adding a new config
        with Omboddle(self.session, keep_session=True, params={"format": "json",
                                                               "config_name": TEST_CONFIG_NAME,
                                                               "config_info": "plop_info",
                                                               "config_command": "plop_command",
                                                               "config_fuse_command": "plop_fuse_command",
                                                               "config_program": "plop.cpp",
                                                               "config_classification": -1}):
            json_result = config_controller.add_form()

        # Then : check config was added
        result = json.loads(json_result)
        assert result["redirect"] == "config/index"
        assert result["message"] == f"config '{TEST_CONFIG_NAME}' added"
        config = db.config[result["config_id"]]
        assert config["name"] == TEST_CONFIG_NAME
        assert config["info"] == "plop_info"
        assert config["command"] == "plop_command"
        assert config["fuse_command"] == "plop_fuse_command"
        assert config["program"] == "plop.cpp"
        assert config["classification"] == None

    def test_add_form_admin_config_classification(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)
        classification_id = db.classification.insert(
            name="test_classification", info="test_classification_info")

        # When : adding a new config
        with Omboddle(self.session, keep_session=True, params={"format": "json",
                                                               "config_name": TEST_CONFIG_NAME,
                                                               "config_info": "plop_info",
                                                               "config_command": "plop_command",
                                                               "config_fuse_command": "plop_fuse_command",
                                                               "config_program": "plop.cpp",
                                                               "config_classification": classification_id}):
            json_result = config_controller.add_form()

        # Then : check config was added
        result = json.loads(json_result)
        assert result["redirect"] == "config/index"
        assert result["message"] == f"config '{TEST_CONFIG_NAME}' added"
        config = db.config[result["config_id"]]
        assert config["name"] == TEST_CONFIG_NAME
        assert config["info"] == "plop_info"
        assert config["command"] == "plop_command"
        assert config["fuse_command"] == "plop_fuse_command"
        assert config["program"] == "plop.cpp"
        assert config["classification"] == classification_id

    def test_add_form_admin_config_classification_not_existing(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)
        classification_id = db.classification.insert(
            name="test_classification", info="test_classification_info")

        # When : adding a new config
        with Omboddle(self.session, keep_session=True, params={"format": "json",
                                                               "config_name": TEST_CONFIG_NAME,
                                                               "config_info": "plop_info",
                                                               "config_command": "plop_command",
                                                               "config_fuse_command": "plop_fuse_command",
                                                               "config_program": "plop.cpp",
                                                               "config_classification": classification_id + 1}):
            json_result = config_controller.add_form()

        # Then : check error occurs
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "classification id don't exist"

    # TODO : test with other user

    ##################################
    # Tests on config_controller.edit()
    ##################################

    def test_edit_not_logged(self):
        # Given : No user logged

        # When : Calling edit
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.edit()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_no_id(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling edit with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                config_controller.edit()

        # Then : We get an exception
        exception = context.exception
        assert exception.args[0] == "id"

    def test_edit_id(self):
        # Given : Logged as admin and added config
        log_in_as_default_admin(self.session)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)

        # When : Calling edit with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": config_id}):
            json_result = config_controller.edit()

        # Then : we get a valid result
        result = json.loads(json_result)
        assert result["message"] == "edit config"
        assert len(result["classification"]) == 6

    # TODO : test no access, to not existing id

    ##################################
    # Tests on config_controller.edit_form()
    ##################################

    def test_edit_form_not_logged(self):
        # Given : No user logged

        # When : Calling edit
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.edit_form()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_edit_form_success(self):
        # Given : Logged as admin and added config and classification
        log_in_as_default_admin(self.session)
        classification_id = db.classification.insert(
            name="test_classification", info="test_classification_info")
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)

        # When : adding a new config
        with Omboddle(self.session, keep_session=True, params={"format": "json",
                                                               "id": config_id,
                                                               "config_name": f"{TEST_CONFIG_NAME}_mod",
                                                               "config_info": "plop_info_mod",
                                                               "config_command": "plop_command_mod",
                                                               "config_fuse_command": "plop_fuse_command_mod",
                                                               "config_program": "plop_mod.cpp",
                                                               "config_classification": classification_id}):
            json_result = config_controller.edit_form()

        # Then : check config was added
        result = json.loads(json_result)
        assert result["redirect"] == "config/index"
        assert result["message"] == f"config '{TEST_CONFIG_NAME}_mod' updated"
        config = db.config[config_id]
        assert config["name"] == f"{TEST_CONFIG_NAME}_mod"
        assert config["info"] == "plop_info_mod"
        assert config["command"] == "plop_command_mod"
        assert config["fuse_command"] == "plop_fuse_command_mod"
        assert config["program"] == "plop_mod.cpp"
        assert config["classification"] == classification_id

    # TODO : test more cases, missing or wrong ID, partial update, user rights, classification, ...

    ##################################
    # Tests on config_controller.confirm()
    ##################################

    def test_confirm_not_logged(self):
        # Given : No user logged

        # When : Calling confirm
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.confirm()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_confirm_no_id(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling confirm with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                config_controller.confirm()

        # Then : We get an exception
        exception = context.exception
        assert exception.args[0] == "id"

    def test_confirm_id(self):
        # Given : Logged as admin and added config
        log_in_as_default_admin(self.session)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)

        # When : Calling confirm with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": config_id}):
            json_result = config_controller.confirm()

        # Then : we get a valid result
        result = json.loads(json_result)
        assert result["message"] == "confirm config deletion"

    # TODO : test no access, to not existing id

    ##################################
    # Tests on config_controller.delete()
    ##################################

    def test_delete_not_logged(self):
        # Given : No user logged

        # When : Calling delete
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.delete()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_delete_no_id(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling delete with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                config_controller.delete()

        # Then : We get an exception
        exception = context.exception
        assert exception.args[0] == "id"

    def test_delete_success(self):
        # Given : Logged as admin and added config and classification
        log_in_as_default_admin(self.session)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)
        assert db.config[config_id] != None

        # When : deleting config
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": config_id}):
            json_result = config_controller.delete()

        # Then : check config was added
        result = json.loads(json_result)
        assert result["redirect"] == "config/index"
        assert result["message"] == f"config '{config_id}' deleted"
        assert db.config[config_id] == None

    def test_delete_used_config(self):
        # Given : Logged as admin and added config and classification
        log_in_as_default_admin(self.session)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)
        assert db.config[config_id] != None
        results_file_id = add_results_file(config_id=config_id)
        assert db.results_file[results_file_id] != None

        # When : deleting config
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": config_id}):
            json_result = config_controller.delete()

        # Then : check config was added
        result = json.loads(json_result)
        assert result["redirect"] == "config/index"
        assert result["success"] == "false"
        assert result["message"] == "cannot delete a config that has been used"
        assert db.config[config_id] != None

    ##################################
    # Tests on config_controller.permission()
    ##################################

    def test_permission_not_logged(self):
        # Given : No user logged

        # When : Calling permission
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.permission()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_permission_no_id(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling permission with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                config_controller.permission()

        # Then : We get an exception
        exception = context.exception
        assert exception.args[0] == "id"

    def test_permission_id_first_config(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)
        first_config_id = db(db.config).select().first().id

        # When : Calling permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": first_config_id}):
            json_result = config_controller.permission()

        # Then : check result
        result = json.loads(json_result)
        assert len(result["query"]) == 6

    ##################################
    # Tests on config_controller.change_permission()
    ##################################

    def test_change_permission_not_logged(self):
        # Given : No user logged

        # When : Calling change_permission
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                config_controller.change_permission()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_change_permission_no_config_id(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling change_permission with no id in params
        with self.assertRaises(KeyError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                config_controller.change_permission()

        # Then : Error expected
        exception = context.exception
        assert exception.args[0] == "config_id"

    def test_change_permission_missing_group_id(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"config_id": config_id}):
            json_result = config_controller.change_permission()

        # Then : Error expected
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "missing group_id"

    def test_change_permission_access_denied(self):
        # Given : a user and config
        user_1_id = add_indexed_user(self.session, 1)
        log_in(self.session,
               get_indexed_user_email(1),
               get_indexed_user_password(1))
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)
        user_group_id = db(db.auth_group.role ==
                           f"user_{user_1_id}").select()[0].id

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"config_id": config_id, "group_id": user_group_id}):
            json_result = config_controller.change_permission()

        # Then : Error expected
        result = json.loads(json_result)
        assert result["message"] == "access denied"

    def test_change_permission_granted(self):
        # Given : a user and config
        log_in_as_default_admin(self.session)
        user_1_id = add_indexed_user(self.session, 1)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)
        user_group_id = db(db.auth_group.role ==
                           f"user_{user_1_id}").select()[0].id
        assert auth.get_group_access(
            "config", config_id, user_group_id) == False

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"config_id": config_id, "group_id": user_group_id}):
            json_result = config_controller.change_permission()

        # Then : Error expected
        result = json.loads(json_result)
        assert result["message"] == "c9: access 'access' granted to 'user_2'"
        assert auth.get_group_access(
            "config", config_id, user_group_id) == True

    def test_change_permission_deleted(self):
        # Given : a user and config
        log_in_as_default_admin(self.session)
        user_1_id = add_indexed_user(self.session, 1)
        config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                     info="plop_info",
                                     command="plop_command",
                                     fuse_command="plop_fuse_command",
                                     program="plop.cpp",
                                     classification=None)
        user_group_id = db(db.auth_group.role ==
                           f"user_{user_1_id}").select()[0].id
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"config_id": config_id, "group_id": user_group_id}):
            json_result = config_controller.change_permission()
        assert auth.get_group_access(
            "config", config_id, user_group_id) == True

        # When : Calling change_permission with no id in params
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"config_id": config_id, "group_id": user_group_id}):
            json_result = config_controller.change_permission()

        # Then : Error expected
        result = json.loads(json_result)
        assert result["message"] == "c9: access 'access' deleted to 'user_2'"
        assert auth.get_group_access(
            "config", config_id, user_group_id) == False
