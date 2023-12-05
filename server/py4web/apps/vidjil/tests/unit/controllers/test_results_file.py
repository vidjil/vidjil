import os
import json
import pathlib
import shutil
from typing import TextIO
import pytest
from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils, test_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session, HTTP
from ....common import db, auth
from .... import defs
from ....modules.permission_enum import PermissionEnum

from ....controllers import results_file as results_file_controller


class TestResultsFileController():

    @pytest.fixture(autouse=True)
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
    # Tests on results_file_controller.index()
    ##################################

    def test_index_not_logged(self):
        # Given : not logged

        # When : Calling index
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.index()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_index_other_user(self):
        # Given : logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling index:
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = results_file_controller.index()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"sort": "", "reverse": ""}):
            json_result = results_file_controller.index()

        # Then : We get results_file list
        result = json.loads(json_result)
        assert result["reverse"] == False
        query = result["query"]
        assert len(query) == 15

    # TODO : check more things in results, and add more test for sort, reverse, ...

    ##################################
    # Tests on results_file_controller.run_all_patients()
    ##################################

    def test_run_all_patients_not_logged(self):
        # Given : not logged

        # When : Calling run_all_patients
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.run_all_patients()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_run_all_patients_other_user(self):
        # Given : logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling run_all_patients:
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = results_file_controller.run_all_patients()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED

    # TODO : add real tests for results_file_controller.run_all_patients() --> hwo to deal with tasks ?

    ##################################
    # Tests on results_file_controller.info()
    ##################################

    def test_info_not_logged(self):
        # Given : not logged

        # When : Calling info
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.info()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_info(self):
        # Given : logged as other user, add a results file with the correct rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"results_file_id": results_file_id}):
            json_result = results_file_controller.info()

        # Then : We get results_file list
        result = json.loads(json_result)
        assert result["message"] == "result info"
        assert result["content_log"] == None

    def test_info_access_denied(self):
        # Given : logged as other user, add a results file with the wrong rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.del_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)

        # When : Calling info
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"results_file_id": results_file_id}):
            json_result = results_file_controller.info()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED

    # TODO : add test for results_file_controller.info() with a real content

    ##################################
    # Tests on results_file_controller.output()
    ##################################

    def test_output_not_logged(self):
        # Given : not logged

        # When : Calling output
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.output()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_output_access_denied(self):
        # Given : logged as other user, add a results file with the wrong rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.del_permission(
            user_group_id, PermissionEnum.read.value, 'sample_set', sample_set_id)
        auth.del_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)

        # When : Calling output
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"results_file_id": results_file_id}):
            json_result = results_file_controller.output()

        # Then : We get an error
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == results_file_controller.ACCESS_DENIED

    def test_output(self):
        # Given : logged as other user, add a results file with rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.read.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        save_dir_out_vidjil_id = defs.DIR_OUT_VIDJIL_ID
        try:
            results_file_id = db_manipulation_utils.add_results_file(
                sequence_file_id=sequence_file_id)
            defs.DIR_OUT_VIDJIL_ID = str(pathlib.Path(
                test_utils.get_results_path(), f"out-{defs.BASENAME_OUT_VIDJIL_ID}")) + os.sep
            results_file_directory = pathlib.Path(
                defs.DIR_OUT_VIDJIL_ID % results_file_id)
            results_file_directory.mkdir(parents=True, exist_ok=True)
            results_filename = "test_result_file.res"
            results_content = "test_content"
            pathlib.Path(results_file_directory,
                         results_filename).write_text(results_content)

            # When : Calling output
            with Omboddle(self.session, keep_session=True, params={"format": "json"},
                          query={"results_file_id": results_file_id}):
                json_result = results_file_controller.output()

            # Then : We get the correct list of files
            result = json.loads(json_result)
            assert result["message"] == "output files"
            assert result["results_file_id"] == results_file_id
            files = result["files"]
            assert len(files) == 1
            assert files[0]["filename"] == results_filename
            assert files[0]["size"] == f"{len(results_content)} B"
        finally:
            defs.DIR_OUT_VIDJIL_ID = save_dir_out_vidjil_id
            shutil.rmtree(results_file_directory)

    ##################################
    # Tests on results_file_controller.download()
    ##################################

    # TODO : test results_file_controller.download() --> is it working ? how to test response.stream() ? (did not work with setattr or mock)
    # stream_log = None

    # @staticmethod
    # def stream_logging(stream: TextIO, attachment: bool, filename: str, chunk_size: int):
    #     TestResultsFileController.stream_log = dict(stream=stream,
    #                                                 attachment=attachment,
    #                                                 filename=filename,
    #                                                 chunk_size=chunk_size)

    # def test_download(self, mocker):
    #     # Given : logged as other user, add a results file with rights
    #     user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
    #     user_group_id = test_utils.get_user_group_id(db, user_id)
    #     db_manipulation_utils.log_in(
    #         self.session,
    #         db_manipulation_utils.get_indexed_user_email(1),
    #         db_manipulation_utils.get_indexed_user_password(1))
    #     patient_id, sample_set_id = db_manipulation_utils.add_patient(
    #         1, user_id)
    #     auth.add_permission(
    #         user_group_id, PermissionEnum.read.value, db.sample_set, sample_set_id)
    #     auth.add_permission(
    #         user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id)
    #     sequence_file_id = db_manipulation_utils.add_sequence_file(
    #         patient_id, user_id)
    #     save_dir_out_vidjil_id = defs.DIR_OUT_VIDJIL_ID
    #     try:
    #         results_file_id = db_manipulation_utils.add_results_file(
    #             sequence_file_id=sequence_file_id)
    #         defs.DIR_OUT_VIDJIL_ID = str(pathlib.Path(
    #             test_utils.get_results_path(), f"out-{defs.BASENAME_OUT_VIDJIL_ID}")) + os.sep
    #         results_file_directory = pathlib.Path(
    #             defs.DIR_OUT_VIDJIL_ID % results_file_id)
    #         results_file_directory.mkdir(parents=True, exist_ok=True)
    #         results_filename = "test_result_file.res"
    #         results_content = "test_content"
    #         pathlib.Path(results_file_directory,
    #                      results_filename).write_text(results_content)

    #         # When : Calling download
    #         with Omboddle(self.session, keep_session=True, params={"format": "json"},
    #                       query={"results_file_id": results_file_id, "filename": results_filename}):
    #             result = results_file_controller.download()

    #         # Then : We get the correct list of files
    #         assert result == "Response from mock"
    #         assert TestResultsFileController.stream_log != None
    #     finally:
    #         defs.DIR_OUT_VIDJIL_ID = save_dir_out_vidjil_id
    #         shutil.rmtree(results_file_directory)

    ##################################
    # Tests on results_file_controller.confirm()
    ##################################

    def test_confirm_not_logged(self):
        # Given : not logged

        # When : Calling confirm
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.confirm()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_confirm_no_rights(self):
        # Given : logged as other user, add a sample with no rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)[1]

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"sample_set_id": sample_set_id}):
            json_result = results_file_controller.confirm()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == results_file_controller.ACCESS_DENIED

    def test_confirm(self):
        # Given : logged as other user, add a results file with the correct rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)[1]
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, 0)

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"sample_set_id": sample_set_id}):
            json_result = results_file_controller.confirm()

        # Then : authorized
        result = json.loads(json_result)
        assert result["message"] == "result confirm"

    ##################################
    # Tests on results_file_controller.delete()
    ##################################

    def test_delete_not_logged(self):
        # Given : not logged

        # When : Calling delete
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                results_file_controller.delete()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_delete_no_rights(self):
        # Given : logged as other user, add a sample with no rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)[1]

        # When : Calling delete
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"sample_set_id": sample_set_id}):
            json_result = results_file_controller.delete()

        # Then : edit is authorized
        result = json.loads(json_result)
        assert result["message"] == results_file_controller.ACCESS_DENIED

    def test_delete(self):
        # Given : logged as other user, add a results file with the correct rights
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = test_utils.get_user_group_id(db, user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, 0)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)
        assert db.results_file[results_file_id] != None

        # When : Calling delete
        with Omboddle(self.session, keep_session=True,
                      params={"format": "json"}, query={"sample_set_id": sample_set_id, "results_file_id": results_file_id}):
            json_result = results_file_controller.delete()

        # Then : authorized
        result = json.loads(json_result)
        assert result["success"] == "true"
        assert result["redirect"] == "sample_set/index"
        assert result["message"] == f"[{results_file_id}] ({sample_set_id}) c1: process deleted"
        assert result["args"]["id"] == str(sample_set_id)
        assert db.results_file[results_file_id] == None
