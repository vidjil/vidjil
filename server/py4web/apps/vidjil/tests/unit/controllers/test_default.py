import datetime
import json
import logging
import os
import pathlib
from pathlib import Path

import pytest
from py4web import URL, request
from py4web.core import HTTP, Session, _before_request

from .... import settings
from ....common import auth, db
from ....controllers import default as default_controller
from ....modules.permission_enum import PermissionEnum
from ...functional.db_initialiser import DBInitialiser
from ..utils import db_manipulation_utils, test_utils
from ..utils.omboddle import Omboddle


class TestDefaultController:
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
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

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
        with pytest.raises(HTTP) as excinfo:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.whoami()

        # Then : We get a redirect
        exception = excinfo.value
        assert exception.status == 303

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
        assert result["admin"] is True
        assert result["groups"][0]["role"] == "admin"

    def test_whoami_user(self):
        # Given : Logged as other user
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )

        # When : Calling whoami
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.whoami()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["id"] == user_id
        assert result["email"] == db_manipulation_utils.get_indexed_user_email(1)
        assert result["admin"] is False
        assert result["groups"] is not None

    ##################################
    # Tests on default_controller.logger()
    ##################################

    def test_logger(self, mocker):
        # Given : Logged as admin, prepare mocker
        db_manipulation_utils.log_in_as_default_admin(self.session)
        mocked_log = mocker.patch("apps.vidjil.controllers.default.log.log")
        message = "Test logger"

        # When : Calling logger
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"msg": message, "lvl": logging.WARNING},
        ):
            json_result = default_controller.logger()

        # Then : We get a result
        expected_res = {"success": "false", "message": f"/client/: {message}"}
        result = json.loads(json_result)
        assert result == expected_res
        mocked_log.assert_called_once_with(logging.WARNING, expected_res)

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
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        config_id = db_manipulation_utils.add_config()
        saved_dir_results = settings.DIR_RESULTS

        try:
            settings.DIR_RESULTS = test_utils.get_resources_path()

            # When : Calling run_request
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={
                    "sequence_file_id": sequence_file_id,
                    "sample_set_id": sample_set_id,
                    "config_id": config_id,
                },
            ):
                json_result = default_controller.run_request()

            # Then : Check result
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert (
                result["message"]
                == f"default/run_request  : permission needed, you do not have permission to launch process for this sample_set ({sample_set_id}), you do not have permission to launch process for this config ({config_id})"
            )
        finally:
            settings.DIR_RESULTS = saved_dir_results

    def test_run_request(self, mocker):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = auth.user_group(user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        patient_id, sample_set_id = db_manipulation_utils.add_patient(1, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id
        )
        auth.add_permission(user_group_id, PermissionEnum.run.value, db.sample_set, 0)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id
        )
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.patient, patient_id
        )
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        config_id = db_manipulation_utils.add_config()
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.config, config_id
        )
        saved_dir_results = settings.DIR_RESULTS
        settings.DIR_RESULTS = str(
            Path(Path(__file__).parent.absolute(), "..", "resources")
        )
        mocked_run_process = mocker.patch(
            "apps.vidjil.tasks.run_process.apply_async", return_value="SUCCESS"
        )

        # When : Calling run_request
        try:
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={
                    "sequence_file_id": sequence_file_id,
                    "sample_set_id": sample_set_id,
                    "config_id": config_id,
                },
            ):
                json_result = default_controller.run_request()

            # Then : Check result
            result = json.loads(json_result)
            assert result["redirect"] == "reload"
            results_file_id = result["results_file_id"]
            assert (
                result["message"]
                == f"[{results_file_id}] c{config_id}: process requested - None {
                    db.sequence_file[sequence_file_id].filename
                }"
            )
            mocked_run_process.assert_called_once()
        finally:
            settings.DIR_RESULTS = saved_dir_results

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
        user_group_id = auth.user_group(user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        patient_id, sample_set_id = db_manipulation_utils.add_patient(1, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id
        )
        auth.add_permission(user_group_id, PermissionEnum.run.value, db.sample_set, 0)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id
        )
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.patient, patient_id
        )
        sequence_file_id_1 = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        sequence_file_id_2 = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        config_id = db_manipulation_utils.add_config()
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.config, config_id
        )
        saved_dir_results = settings.DIR_RESULTS
        settings.DIR_RESULTS = str(
            Path(Path(__file__).parent.absolute(), "..", "resources")
        )
        mocked_run_process = mocker.patch(
            "apps.vidjil.tasks.run_process.apply_async", return_value="SUCCESS"
        )

        # When : Calling run_all_request
        try:
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={"sample_set_id": sample_set_id, "config_id": config_id},
            ):
                # Don't know how to pass a list in query, do it this way...
                request.query["sequence_file_ids"] = [
                    sequence_file_id_1,
                    sequence_file_id_2,
                ]
                json_result = default_controller.run_all_request()

            # Then : Check result
            result = json.loads(json_result)
            assert result["success"] == "true"
            assert result["redirect"] == "reload"
            assert mocked_run_process.call_count == 2
        finally:
            settings.DIR_RESULTS = saved_dir_results

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

    def test_get_data(self):
        # Given : Logged as other user
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = auth.user_group(user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        patient_id, sample_set_id = db_manipulation_utils.add_patient(1, user_id)
        sample_set2_id = db_manipulation_utils.add_patient(2, user_id)[1]
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id
        )
        config_id = db_manipulation_utils.add_config()
        # Use helloworld name to try and get coherent values with fused file
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id,
            user_id,
            force_filename="helloworld",
            other_sample_sets_ids=[sample_set2_id],
        )
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id, config_id
        )
        saved_dir_results = settings.DIR_RESULTS
        save_fuse_upload_folder = db.fused_file.fused_file.uploadfolder
        fused_file_id = -1

        try:
            settings.DIR_RESULTS = str(test_utils.get_results_path())
            db.fused_file.fused_file.uploadfolder = test_utils.get_results_path()
            fused_file_id = db_manipulation_utils.add_fused_file(
                sample_set_id, sequence_file_id, config_id, use_real_file=True
            )

            # When : Calling get_data
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={"sample_set_id": sample_set_id, "config": config_id},
            ):
                json_result = default_controller.get_data()

            # Then : We get a result
            result = json.loads(json_result)
            assert result["group_id"] == user_group_id
            assert result["patient_id"] == patient_id
            assert result["sample_set_id"] == sample_set_id
            assert result["config_name"] == db.config[config_id].name
            assert result["reads"]["segmented"] == [742377, 0]
            assert result["reads"]["total"] == [786861, 200]
            assert result["samples"]["number"] == 2
            assert result["samples"]["original_names"][0] == "helloworld"
            assert result["samples"]["sequence_file_id"][0] == sequence_file_id
            assert result["samples"]["results_file_id"][0] == results_file_id
            assert len(result["samples"]["associated_sets_names"][0]) == 1
            # patient name anon
            assert result["samples"]["associated_sets_names"][0][0] == "2"

        finally:
            if fused_file_id != -1:
                fused_file = pathlib.Path(
                    settings.DIR_RESULTS, db.fused_file[fused_file_id].fused_file
                )
                fused_file.unlink(missing_ok=True)
            settings.DIR_RESULTS = saved_dir_results
            db.fused_file.fused_file.uploadfolder = save_fuse_upload_folder

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
    #        self.assertTrue(settings.PORT_FUSE_SERVER is None, 'get_custom_data returns error without fuse server')
    #     else:
    #         self.assertEqual(resp['reads']['segmented'][0], resp['reads']['segmented'][2], "get_custom_data doesn't return a valid json")
    #         self.assertEqual(resp['sample_name'], 'Compare samples')

    # TODO: add other tests !

    ##################################
    # Tests on default_controller.save_analysis()
    ##################################

    def test_save_analysis(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        analysis_example_file = Path(
            test_utils.get_resources_path(), "example.analysis"
        )
        with open(analysis_example_file, "rb") as file:
            upload_helper = test_utils.UploadHelper(file, "example.analysis")
            save_upload_folder = db.analysis_file.analysis_file.uploadfolder
            try:
                db.analysis_file.analysis_file.uploadfolder = (
                    test_utils.get_results_path()
                )

                # When : Calling save_analysis
                with Omboddle(
                    self.session,
                    keep_session=True,
                    params={"format": "json"},
                    query={
                        "sample_set_id": sample_set_id,
                    },
                ):
                    request.files["fileToUpload"] = upload_helper
                    json_result = default_controller.save_analysis()

                # Then : Check result
                result = json.loads(json_result)
                assert result["success"] == "true"
                assert result["message"] == f"({sample_set_id}): analysis saved"
                analysis_file = (
                    db(db.analysis_file.sample_set_id == sample_set_id).select().first()
                )
                result_file = Path(
                    test_utils.get_results_path(), analysis_file["analysis_file"]
                )
                assert result_file.exists()
                assert result_file.read_text() == analysis_example_file.read_text()
                os.remove(result_file)
            finally:
                db.analysis_file.analysis_file.uploadfolder = save_upload_folder

    ##################################
    # Tests on default_controller.get_analysis()
    ##################################

    def text_get_analysis_not_logged(self):
        # Given : not logged

        # When : Calling get_analysis
        with pytest.raises(HTTP) as result:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.get_analysis()

        # Then : We get a redirect
        result = result.value
        assert result.status == 303

    def test_get_analysis_no_analysis(self):
        """
        Test get_analysis when there is no analysis recorded for the sample set.
        """
        # Given : Logged as other user and create a sample set without analysis
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        db_manipulation_utils.add_sequence_file(sample_set_id, user_id)

        # When : Calling get_analysis
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"sample_set_id": sample_set_id},
        ):
            json_result = default_controller.get_analysis()

        # Then : Check result
        result = json.loads(json_result)
        expected_result = {
            "samples": {
                "number": 0,
                "original_names": [],
                "order": [],
                "info_sequence_file": [],
            },
            "custom": [],
            "clusters": [],
            "clones": [],
            "tags": {},
            "report_save": {},
            "vidjil_json_version": "2014.09",
        }
        assert result == expected_result

    def test_get_analysis_with_data(self):
        """
        Test get_analysis with an analysis recorded for the sample set.
        """
        # Given : Logged as other user and create a sample set with analysis
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        # Insert analysis directly in the database
        save_upload_folder = db.analysis_file.analysis_file.uploadfolder
        saved_dir_results = settings.DIR_RESULTS
        analysis_file_id = None
        try:
            db.analysis_file.analysis_file.uploadfolder = test_utils.get_results_path()
            settings.DIR_RESULTS = test_utils.get_results_path()
            analysis_example_file = Path(
                test_utils.get_resources_path(), "example.analysis"
            )
            with open(analysis_example_file, "rb") as analysis_file:
                analysis_file_id = db.analysis_file.insert(
                    analysis_file=db.analysis_file.analysis_file.store(
                        analysis_file, "example.analysis"
                    ),
                    sample_set_id=sample_set_id,
                    analyze_date=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                )

            # When : Calling get_analysis
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = default_controller.get_analysis()

            # Then : Check result
            result = json.loads(json_result)
            expected_result = json.loads(analysis_example_file.read_text())
            assert result["samples"] == expected_result["samples"]
            assert result["clusters"] == expected_result["clusters"]
            assert result["clones"] == expected_result["clones"]
            assert result["report_save"] == expected_result["report_save"]
            assert (
                result["vidjil_json_version"] == expected_result["vidjil_json_version"]
            )
            assert result["system_selected"] == expected_result["system_selected"]
        finally:
            if analysis_file_id is not None:
                result_file = Path(
                    test_utils.get_results_path(),
                    db.analysis_file[analysis_file_id].analysis_file,
                )
                os.remove(result_file)
            db.analysis_file.analysis_file.uploadfolder = save_upload_folder
            settings.DIR_RESULTS = saved_dir_results

    ##################################
    # Tests on default_controller.impersonate()
    ##################################

    # TODO: add tests for default_controller.impersonate()

    ##################################
    # Tests on default_controller.stop_impersonate()
    ##################################

    # TODO: add tests for default_controller.stop_impersonate()
