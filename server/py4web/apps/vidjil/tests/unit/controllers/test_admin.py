import os
import json
from pathlib import Path
import unittest
from ..utils.omboddle import Omboddle
from py4web.core import _before_request, Session, HTTP
from ...functional.db_initialiser import DBInitialiser
from ..utils import db_manipulation_utils
from ....common import db, auth
from .... import defs
from ....controllers import admin as admin_controller


class TestAdminController(unittest.TestCase):

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

        # add a user
        self.user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)

    ##################################
    # Tests on admin_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : No user logged

        # When : Calling index
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, params={"format": "json"}):
                admin_controller.index()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_index_logged_as_other(self):
        # Given : Logged as user 1
        db_manipulation_utils.log_in(self.session,
               db_manipulation_utils.get_indexed_user_email(1),
               db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = admin_controller.index()

        # Then : We get an empty result
        result = json.loads(json_result)
        assert result is None

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = admin_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result is not None
        assert result["uptime"] != ""
        assert result["disk_use"] != ""
        assert result["revision"] != ""
        assert result["worker"] == 0
        assert result["queued"] == 0
        assert result["assigned"] == 0
        assert result["running"] == 0
        assert result["last_results"] == "CCCCCCCCCC"

    ##################################
    # Tests on admin_controller.showlog()
    ##################################

    def _get_resources_log_path(self) -> str:
        resources_logs_path = Path(Path(__file__).parent.absolute(),
                                   "..",
                                   "resources",
                                   "logs")
        return str(resources_logs_path)+os.sep

    def test_showlog_vidjil(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        saved_dir_log = defs.DIR_LOG
        defs.DIR_LOG = self._get_resources_log_path()

        try:
            # When : Calling showlog
            log_path = "vidjil.log"
            with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"file": log_path, "format": "vidjil"}):
                json_result = admin_controller.showlog()
        except:
            raise
        finally:
            defs.DIR_LOG = saved_dir_log

        # Then : We get a result
        result = json.loads(json_result)
        assert result is not None
        assert result["format"] == "vidjil"
        assert len(result["lines"]) == 1

    def test_showlog_vidjil_debug(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        saved_dir_log = defs.DIR_LOG
        defs.DIR_LOG = self._get_resources_log_path()

        try:
            # When : Calling showlog
            log_path = "vidjil-debug.log"
            with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"file": log_path, "format": "vidjil"}):
                json_result = admin_controller.showlog()
        except:
            raise
        finally:
            defs.DIR_LOG = saved_dir_log

        # Then : We get a result
        result = json.loads(json_result)
        assert result is not None
        assert result["format"] == "vidjil"
        assert len(result["lines"]) == 9

    def test_showlog_raw_access_log(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        saved_dir_log = defs.DIR_LOG
        defs.DIR_LOG = self._get_resources_log_path()

        try:
            # When : Calling showlog
            log_path = Path("nginx", "access.log")
            with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"file": log_path, "format": "raw"}):
                json_result = admin_controller.showlog()
        except:
            raise
        finally:
            defs.DIR_LOG = saved_dir_log

        # Then : We get a result
        result = json.loads(json_result)
        assert result is not None
        assert result["format"] == "raw"
        assert len(result["raw"]) == 130582

    def test_showlog_raw_error_log(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        saved_dir_log = defs.DIR_LOG
        defs.DIR_LOG = self._get_resources_log_path()

        try:
            # When : Calling showlog
            log_path = Path("nginx", "error.log")
            with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"file": log_path, "format": "raw"}):
                json_result = admin_controller.showlog()
        except:
            raise
        finally:
            defs.DIR_LOG = saved_dir_log

        # Then : We get a result
        result = json.loads(json_result)
        assert result is not None
        assert result["format"] == "raw"
        assert len(result["raw"]) == 5765

    # TODO: test access control, test filter, may be test more carefully result["lines"] and result["raw"]
    

    ##################################
    # Tests on admin_controller.repair_missing_files()
    ##################################
    
    def test_repair_missing_files(self):
        # Given : Logged as admin and a missing file
        test_file_name = "test_file_zXtRe"
        sequence_file_id = db.sequence_file.insert(sampling_date="1978-12-12",
                            info="",
                            pcr="",
                            sequencer="",
                            producer="",
                            patient_id=1,
                            filename=test_file_name,
                            provider=auth.user_id,
                            data_file = "plopapi") # incorrect data file
        assert db.sequence_file[sequence_file_id].data_file == "plopapi"

        # When : Calling repair_missing_files
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = admin_controller.repair_missing_files()
            
        # Then : We get a result
        result = json.loads(json_result)
        assert result["success"] == "true"
        assert result["message"].endswith(test_file_name)
        assert db.sequence_file[sequence_file_id].data_file == None
        
    # TODO: add more tests for repair_missing_files
    

    # TODO: add tests for make_backup, load_backup, repair and reset_workers
