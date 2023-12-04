import os
import json
import pathlib
import tempfile
import pytest
from pathlib import Path
from ..utils.omboddle import Omboddle
from py4web import URL, request
from py4web.core import _before_request, Session, HTTP
from ...functional.db_initialiser import DBInitialiser
from ..utils import db_manipulation_utils, test_utils
from ....common import db, auth
from .... import defs
from ....modules.permission_enum import PermissionEnum
from ....controllers import default as default_controller


class TestDefaultController():

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
    # Tests on default_controller.index()
    ##################################

    def test_index(self):
        # Given : not logged

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["message"] == "hello world"

    ##################################
    # Tests on default_controller.help()
    ##################################

    def test_help(self):
        # Given : not logged

        # When : Calling help
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.help()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["message"] == "help i'm lost"

    ##################################
    # Tests on default_controller.home()
    ##################################

    def test_home_not_logged(self):
        # Given : not logged

        # When : Calling home
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.home()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_home_admin(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling home
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.home()
            expected_result_admin = URL("admin/index")

        # Then : We get a result
        result = json.loads(json_result)
        assert result["redirect"] == expected_result_admin

    def test_home_user(self):
        # Given : Logged as other user
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling home
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.home()
            expected_result_admin = URL("admin/index")

        # Then : We get a result
        result = json.loads(json_result)
        assert result["redirect"] != expected_result_admin
        assert "sample_set" in result["redirect"]

    ##################################
    # Tests on default_controller.whoami()
    ##################################

    def test_whoami_not_logged(self):
        # Given : not logged

        # When : Calling whoami
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.whoami()

        # Then : We get a redirect
        result = json.loads(json_result)
        assert result["id"] == None
        assert result["email"] == None
        assert result["admin"] == False
        assert result["groups"] == []

    def test_whoami_admin(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling whoami
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.whoami()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["id"] == 1
        assert result["email"] == "plop@plop.com"
        assert result["admin"] == True
        assert result["groups"][0]["role"] == "admin"

    def test_whoami_user(self):
        # Given : Logged as other user
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))

        # When : Calling whoami
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.whoami()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["id"] == user_id
        assert result["email"] == db_manipulation_utils.get_indexed_user_email(
            1)
        assert result["admin"] == False
        assert result["groups"] is not None

    ##################################
    # Tests on default_controller.init_db()
    ##################################

    # TODO : tests on default_controller.init_db()

    ##################################
    # Tests on default_controller.init_db_form()
    ##################################

    # TODO : tests on default_controller.init_db_form()

    ##################################
    # Tests on default_controller.run_request()
    ##################################

    def test_run_request_not_logged(self):
        # Given : not logged

        # When : Calling run_request
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.run_request()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_run_request_no_permission(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        config_id = db_manipulation_utils.add_config()
        saved_dir_results = defs.DIR_RESULTS

        try:
            defs.DIR_RESULTS = test_utils.get_resources_path()

            # When : Calling run_request
            with Omboddle(self.session, keep_session=True,
                          params={"format": "json"},
                          query={"sequence_file_id": sequence_file_id, "sample_set_id": sample_set_id, "config_id": config_id}):
                json_result = default_controller.run_request()

            # Then : Check result
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result[
                "message"] == f"default/run_request  : permission needed, you do not have permission to launch process for this sample_set ({sample_set_id}), you do not have permission to launch process for this config ({config_id})"
        finally:
            defs.DIR_RESULTS = saved_dir_results

    def test_run_request(self, mocker):
        # Given : Logged as other user, and add corresponding config, ...
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
            user_group_id, PermissionEnum.run.value, db.sample_set, 0)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.patient, patient_id)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        config_id = db_manipulation_utils.add_config()
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.config, config_id)
        saved_dir_results = defs.DIR_RESULTS
        defs.DIR_RESULTS = str(Path(Path(__file__).parent.absolute(),
                                    "..",
                                    "resources"))
        mocked_run_process = mocker.patch(
            "apps.vidjil.tasks.run_process.delay", return_value="SUCCESS")

        # When : Calling run_request
        try:
            with Omboddle(self.session, keep_session=True,
                          params={"format": "json"},
                          query={"sequence_file_id": sequence_file_id, "sample_set_id": sample_set_id, "config_id": config_id}):
                json_result = default_controller.run_request()

            # Then : Check result
            result = json.loads(json_result)
            assert result["redirect"] == "reload"
            results_file_id = result["results_file_id"]
            assert result["message"] == f"[{results_file_id}] c{config_id}: process requested - None {db.sequence_file[sequence_file_id].filename}"
            mocked_run_process.assert_called_once()
        finally:
            defs.DIR_RESULTS = saved_dir_results

    ##################################
    # Tests on default_controller.run_all_request()
    ##################################

    def test_run_all_request_not_logged(self):
        # Given : not logged

        # When : Calling run_all_request
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.run_all_request()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_run_all_request(self, mocker):
        # Given : Logged as other user, and add corresponding config, ...
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
            user_group_id, PermissionEnum.run.value, db.sample_set, 0)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.patient, patient_id)
        sequence_file_id_1 = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        sequence_file_id_2 = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        config_id = db_manipulation_utils.add_config()
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.config, config_id)
        saved_dir_results = defs.DIR_RESULTS
        defs.DIR_RESULTS = str(Path(Path(__file__).parent.absolute(),
                                    "..",
                                    "resources"))
        mocked_run_process = mocker.patch(
            "apps.vidjil.tasks.run_process.delay", return_value="SUCCESS")

        # When : Calling run_all_request
        try:
            with Omboddle(self.session, keep_session=True,
                          params={"format": "json"},
                          query={"sample_set_id": sample_set_id, "config_id": config_id}):
                # Don't know how to pass a list in query, do it this way...
                request.query["sequence_file_ids"] = [
                    sequence_file_id_1, sequence_file_id_2]
                json_result = default_controller.run_all_request()

            # Then : Check result
            result = json.loads(json_result)
            assert result["success"] == "true"
            assert result["redirect"] == "reload"
            assert mocked_run_process.call_count == 2
        finally:
            defs.DIR_RESULTS = saved_dir_results

    ##################################
    # Tests on default_controller.get_data()
    ##################################

    def test_get_data_not_logged(self):
        # Given : not logged

        # When : Calling get_data
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.get_data()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    # TODO : try and manage to get this working: should we use a real fused file ? where to get one ?
    def test_get_data(self):
        # Given : Logged as other user
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
        config_id = db_manipulation_utils.add_config()
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        saved_dir_results = defs.DIR_RESULTS
        save_upload_folder = db.fused_file.fused_file.uploadfolder
        fused_file_id = -1

        try:
            defs.DIR_RESULTS = str(test_utils.get_results_path())
            db.fused_file.fused_file.uploadfolder = test_utils.get_results_path()
            fused_file_id = db_manipulation_utils.add_fused_file(
                sample_set_id, sequence_file_id, config_id, use_real_file=True)

            # When : Calling get_data
            with Omboddle(self.session, keep_session=True, params={"format": "json"},
                          query={"sample_set_id": sample_set_id, "config": config_id}):
                json_result = default_controller.get_data()

            # Then : We get a result
            result = json.loads(json_result)
            assert result["group_id"] == user_group_id
            assert result["patient_id"] == patient_id
            assert result["sample_set_id"] == sample_set_id
            assert result["config_name"] == db.config[config_id].name
            assert result["reads"]["segmented"] == [742377, 0]
            assert result["reads"]["total"] == [786861, 200]
        finally:
            if fused_file_id != -1:
                fused_file = pathlib.Path(
                    defs.DIR_RESULTS, db.fused_file[fused_file_id].fused_file)
                fused_file.unlink(missing_ok=True)
            defs.DIR_RESULTS = saved_dir_results
            db.fused_file.fused_file.uploadfolder = save_upload_folder

    ##################################
    # Tests on default_controller.get_custom_data()
    ##################################

    def test_get_custom_data_not_logged(self):
        # Given : not logged

        # When : Calling get_custom_data
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.get_custom_data()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

    def test_get_custom_data_missing_arguments(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling get_custom_data
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.get_custom_data()

        # Then : We get a redirect
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "default/get_custom_data : no file selected, "

    # TODO : make this work with custom fuse... mock ?
    # def test_get_custom_data_one_file(self):
    #     # Given : Logged as admin
    #     db_manipulation_utils.log_in_as_default_admin(self.session)
    #     results_file_id = db_manipulation_utils.add_results_file()

    #     # When : Calling get_custom_data
    #     with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"custom": results_file_id}):
    #         json_result = default_controller.get_custom_data()

    #     # Then : We get a redirect
    #     result = json.loads(json_result)
    #     assert result["success"] == "false"
    #     # assert result["message"] == "[Errno 13] Permission denied: '/mnt/result'"

    # def testCustomDataOneFile(self):
    #     request.vars['custom'] = str(fake_result_id)
    #     resp = gluon.contrib.simplejson.loads(get_custom_data())
    #     self.assertEqual(resp['sample_name'], 'Sample %s' % fake_result_id)

    # def testCustomData(self):
    #     request.vars['custom'] = [str(fake_result_id2), str(fake_result_id2)]
    #     resp = gluon.contrib.simplejson.loads(get_custom_data())
    #     print(resp)
    #     if resp.has_key('success') and resp['success'] == 'false':
    #        self.assertTrue(defs.PORT_FUSE_SERVER is None, 'get_custom_data returns error without fuse server')
    #     else:
    #         self.assertEqual(resp['reads']['segmented'][0], resp['reads']['segmented'][2], "get_custom_data doesn't return a valid json")
    #         self.assertEqual(resp['sample_name'], 'Compare samples')

    # TODO: add other tests !

    ##################################
    # Tests on default_controller.get_analysis()
    ##################################

    # TODO: add tests for default_controller.get_analysis()

    ##################################
    # Tests on default_controller.save_analysis()
    ##################################

    def test_save_analysis(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id, auth)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        json_content_to_upload = '{"toto": 1, "bla": [], "clones": {"id": "AATA", "tag": 0}}'
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as analysis:
            analysis.write(json_content_to_upload)
        with open(analysis.name, 'rb') as file:
            upload_helper = test_utils.UploadHelper(file, "plopapou")
            save_upload_folder = db.analysis_file.analysis_file.uploadfolder
            try:
                db.analysis_file.analysis_file.uploadfolder = test_utils.get_results_path()

                # When : Calling save_analysis
                with Omboddle(self.session, keep_session=True,
                              params={"format": "json"},
                              query={"patient": patient_id,
                                     "info": "fake info",
                                     "samples_id": str(sequence_file_id),
                                     "samples_info": "fake sample info",
                                     "sample_set_id": sample_set_id}):
                    request.files["fileToUpload"] = upload_helper
                    json_result = default_controller.save_analysis()

                # Then : Check result
                result = json.loads(json_result)
                assert result["success"] == "true"
                assert result["message"] == f"({sample_set_id}): analysis saved"
                analysis_file = db(
                    db.analysis_file.sample_set_id == sample_set_id).select().first()
                result_file = Path(test_utils.get_results_path(),
                                   analysis_file["analysis_file"])
                assert result_file.exists()
                assert result_file.read_text() == json_content_to_upload
                os.remove(result_file)
            finally:
                db.analysis_file.analysis_file.uploadfolder = save_upload_folder
        os.remove(analysis.name)

    ##################################
    # Tests on default_controller.impersonate()
    ##################################

    # TODO: add tests for default_controller.impersonate()

    ##################################
    # Tests on default_controller.stop_impersonate()
    ##################################

    # TODO: add tests for default_controller.stop_impersonate()
