import os
import json
import shutil
import unittest
import pathlib

from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils, test_utils
from ...functional.db_initialiser import DBInitialiser, TEST_ADMIN_EMAIL
from py4web import request
from py4web.core import _before_request, Session, HTTP
from .... import defs
from ....common import db, auth, T
from ....controllers import file as file_controller

import logging
LOGGER = logging.getLogger(__name__)


class TestFileController(unittest.TestCase):

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

    # def createDumbSequenceFile(self):
    #     return db.sequence_file.insert(sampling_date="1903-02-02",
    #                                    info="plop",
    #                                    pcr="plop",
    #                                    sequencer="plop",
    #                                    producer="plop",
    #                                    patient_id=fake_patient_id,
    #                                    pre_process_id=fake_pre_process_id,
    #                                    filename="babibou",
    #                                    provider=user_id,
    #                                    data_file =  db.sequence_file.data_file.store(open("../../doc/analysis-example.vidjil", 'rb'), "babibou"))

    ##################################
    # Tests on file_controller.form()
    ##################################

    def test_form(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(
                                         1),
                                     db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        # When : Calling form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sample_set_id": sample_set_id}):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["pre_process_list"][0]["name"] == "public pre-process"
        assert result["sets"][0]["type"] == defs.SET_TYPE_PATIENT
        assert result["sample_type"] == defs.SET_TYPE_PATIENT
        assert result["upload_group_ids"][0] == 8
        assert len(result["files"][0]) == 1
        assert result["isEditing"] == False

    def test_form_with_file(self):
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

        # When : Calling form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"sample_set_id": sample_set_id, "file_id": sequence_file_id}):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "Form response"
        assert result["pre_process_list"][0]["name"] == "public pre-process"
        assert result["sets"][0]["type"] == defs.SET_TYPE_PATIENT
        assert result["sample_type"] == defs.SET_TYPE_PATIENT
        assert result["upload_group_ids"][0] == 8
        assert len(result["files"][0]) > 1
        assert result["files"][0]["id"] == sequence_file_id
        assert result["isEditing"] == False

    def test_form_edit_file(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        # pass auth to correctly set the rights
        patient_id = db_manipulation_utils.add_patient(1, user_id, auth)[0]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)

        # When : Calling form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"file_id": sequence_file_id, "sample_type": defs.SET_TYPE_PATIENT}):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "Form response"
        assert result["pre_process_list"][0]["name"] == "public pre-process"
        assert result["sets"][0]["type"] == defs.SET_TYPE_PATIENT
        assert result["sample_type"] == defs.SET_TYPE_PATIENT
        assert result["upload_group_ids"][0] == 8
        assert len(result["files"][0]) > 1
        assert result["files"][0]["id"] == sequence_file_id
        assert result["isEditing"] == True

    def test_form_edit_file_no_rights(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        # do not pass auth not to add the rights
        patient_id = db_manipulation_utils.add_patient(1, user_id)[0]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)

        # When : Calling form
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"file_id": sequence_file_id}):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "you need admin permission to edit files"

    # add more tests : not logged in, with file_id, ...

    ##################################
    # Tests on file_controller.submit()
    ##################################

    def _initialize_json_submit_data(self,
                                     sample_set_id: int,
                                     source: str,
                                     filename: str = "",
                                     filename2: str = "",
                                     pre_process_id: int = 0,
                                     sequence_file_id: int = -1,
                                     sample_type: str = "") -> str:
        data = {}
        # TODO : should we use patient_id or sample_set_id ? In the web2py case it seems like we used a patient id
        # but in code it looks like we are looking for a sample set id...
        # data['set_ids'] = ":p plapipou (" + str(patient_id) + ")"
        data["set_ids"] = ":p plapipou (" + str(sample_set_id) + ")"
        data["source"] = source
        data["pre_process"] = pre_process_id
        if sample_type != "":
            data["sample_type"] = sample_type

        if sequence_file_id == -1:
            sequence_file_id = ""

        myfile = {
            "id": sequence_file_id,
            "sampling_date": "1992-02-02",
            "info": "plop",
            "pcr": "plop",
            "sequencer": "plop",
            "producer": "plop",
            "filename": filename,
            "filename2": filename2,
            "set_ids": ""
        }
        data["file"] = [myfile]
        return json.dumps(data)

    def test_submit_vidjil(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        json_submit_data = self._initialize_json_submit_data(
            sample_set_id, "computer", "plopapi")

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
            json_result = file_controller.submit()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "successfully added/edited file(s)"
        # TODO : check more things ?

    def test_submit_nfs(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="Demo-X5.fa")

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
            # TODO : check more things ?
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_submit_nfs_and_pre_process(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="Demo-X5.fa", filename2="Demo-X5.fa", pre_process_id=pre_process_id)

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
            # TODO : check more things ?
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_submit_invalid_form_no_filename(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()

            data = {}
            # TODO : should we use patient_id or sample_set_id ? In the web2py case it seems like we used a patient id
            # but in code it looks like we are looking for a sample set id...
            # data['set_ids'] = ":p plapipou (" + str(patient_id) + ")"
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="")

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result["message"] == "add_form() failed"
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_submit_invalid_form_no_pre_process_name(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="Demo-X5.fa", filename2="", pre_process_id=pre_process_id)

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result["message"] == "add_form() failed"
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_submit_edit(self):
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

        json_submit_data = self._initialize_json_submit_data(
            sample_set_id, "computer", filename="plopapi", sample_type=defs.SET_TYPE_PATIENT, sequence_file_id=sequence_file_id)

        # When : Calling submit
        with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
            json_result = file_controller.submit()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "successfully added/edited file(s)"
        # TODO : check more things ?

    def test_submit_edit_nfs(self):
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

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()

            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="Demo-X5.fa", sample_type=defs.SET_TYPE_PATIENT, sequence_file_id=sequence_file_id)

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
            # TODO : check more things ?
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_submit_edit_nfs_and_pre_process(self):
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
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="Demo-X5.fa", filename2="Demo-X5.fa", sample_type=defs.SET_TYPE_PATIENT, sequence_file_id=sequence_file_id, pre_process_id=pre_process_id)

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
            # TODO : check more things ?
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_submit_edit_invalid(self):
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
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="", filename2="Demo-X5.fa", sample_type=defs.SET_TYPE_PATIENT, sequence_file_id=sequence_file_id, pre_process_id=pre_process_id)

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, params={"format": "json", "data": json_submit_data}, query={"sample_set_id": sample_set_id}):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result["message"] == "add_form() failed"
            # TODO : check more things ?
        finally:
            defs.FILE_SOURCE = save_file_source

    # TODO : add missing cases ?

    ##################################
    # Tests on file_controller.upload()
    ##################################

    def test_upload(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id = db_manipulation_utils.add_patient(
            1, user_id, auth)[0]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            patient_id, user_id)
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil")
        with file_to_upload.open("rb") as file:
            upload_helper = test_utils.UploadHelper(file, "plopapou")
            save_upload_folder = db.sequence_file.data_file.uploadfolder
            try:
                db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
                # When : Calling uplaod
                with Omboddle(self.session, keep_session=True,
                              params={"id": sequence_file_id,
                                      "file_number": 1,
                                      "format": "json"}):
                    request.files["file"] = upload_helper
                    json_result = file_controller.upload()

                # Then : Check result
                result = json.loads(json_result)
                assert result["message"].startswith(
                    f" file {{{sequence_file_id}}} upload finished (plopapou)")
                result_file = pathlib.Path(test_utils.get_results_path(),
                                           db.sequence_file[sequence_file_id].data_file)
                assert result_file.exists()
                os.remove(result_file)
            finally:
                db.sequence_file.data_file.uploadfolder = save_upload_folder

    # TODO: more tests for upload ? use data_file_2 ? preprocess ?

    ##################################
    # Tests on file_controller.confirm()
    ##################################

    def test_confirm_fail_wrong_id(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        fake_sequence_file_id = 0

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"id": fake_sequence_file_id}):
            json_result = file_controller.confirm()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "The requested file doesn't exist"

    def test_confirm_success(self):
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

        # When : Calling confirm
        with Omboddle(self.session, keep_session=True, params={"format": "json"},
                      query={"id": sequence_file_id, "redirect_sample_set_id": sample_set_id}):
            json_result = file_controller.confirm()

        # Then : We get users list
        result = json.loads(json_result)
        assert result["message"] == "Choose what you would like to delete"
        assert result["delete_only_sequence"] == False
        assert result["delete_results"] == False

    ##################################
    # Tests on file_controller.delete()
    ##################################

    def test_delete_only_file(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id, auth)
        save_upload_folder = db.sequence_file.data_file.uploadfolder
        save_auto_delete = db.sequence_file.data_file.autodelete
        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
            db.sequence_file.data_file.autodelete = True
            sequence_file_id = db_manipulation_utils.add_sequence_file(
                patient_id, user_id, use_real_file=True)
            data_file = pathlib.Path(test_utils.get_results_path(),
                                     db.sequence_file[sequence_file_id].data_file)
            assert data_file.exists()

            # When : Calling confirm
            with Omboddle(self.session, keep_session=True, params={"format": "json"},
                          query={"id": sequence_file_id, "redirect_sample_set_id": sample_set_id}):
                json_result = file_controller.delete()

            # Then : We get users list
            result = json.loads(json_result)
            assert result["message"] == f"sequence file ({sequence_file_id}) deleted"
            assert not data_file.exists()
            assert db.sequence_file[sequence_file_id] != None
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder
            db.sequence_file.data_file.autodelete = save_auto_delete

    def test_delete_delete_results(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        patient_id, sample_set_id = db_manipulation_utils.add_patient(
            1, user_id, auth)
        save_upload_folder = db.sequence_file.data_file.uploadfolder
        save_auto_delete = db.sequence_file.data_file.autodelete
        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
            db.sequence_file.data_file.autodelete = True
            sequence_file_id = db_manipulation_utils.add_sequence_file(
                patient_id, user_id, use_real_file=True)
            data_file = pathlib.Path(test_utils.get_results_path(),
                                     db.sequence_file[sequence_file_id].data_file)
            assert data_file.exists()

            # When : Calling confirm
            with Omboddle(self.session, keep_session=True, params={"format": "json"},
                          query={"id": sequence_file_id, "redirect_sample_set_id": sample_set_id, "delete_results": True}):
                json_result = file_controller.delete()

            # Then : We get users list
            result = json.loads(json_result)
            assert result["message"] == f"sequence file ({sequence_file_id}) deleted"
            assert not data_file.exists()
            assert db.sequence_file[sequence_file_id] == None
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder
            db.sequence_file.data_file.autodelete = save_auto_delete

    # TODO : add tests on rights ?

    ##################################
    # Tests on file_controller.sequencer_list()
    ##################################

    def test_sequencer_list_empty(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling sequencer_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.sequencer_list()

        # Then : We get sequencer_list
        result = json.loads(json_result)
        assert result["sequencer"] == []

    def test_sequencer_list_one_result(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        sequence_file_id = db_manipulation_utils.add_sequence_file()
        db.sequence_file[sequence_file_id].update_record(
            sequencer="dummy_sequencer")

        # When : Calling sequencer_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.sequencer_list()

        # Then : We get sequencer_list
        result = json.loads(json_result)
        assert len(result["sequencer"]) == 1
        assert "dummy_sequencer" in result["sequencer"]

    ##################################
    # Tests on file_controller.pcr_list()
    ##################################

    def test_pcr_list_empty(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling pcr_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.pcr_list()

        # Then : We get pcr_list
        result = json.loads(json_result)
        assert result["pcr"] == []

    def test_pcr_list_one_result(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        sequence_file_id = db_manipulation_utils.add_sequence_file()
        db.sequence_file[sequence_file_id].update_record(pcr="dummy_pcr")

        # When : Calling pcr_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.pcr_list()

        # Then : We get pcr_list
        result = json.loads(json_result)
        assert len(result["pcr"]) == 1
        assert "dummy_pcr" in result["pcr"]

    ##################################
    # Tests on file_controller.producer_list()
    ##################################

    def test_producer_list_empty(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling producer_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.producer_list()

        # Then : We get producer_list
        result = json.loads(json_result)
        assert result["producer"] == []

    def test_producer_list_one_result(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        sequence_file_id = db_manipulation_utils.add_sequence_file()
        db.sequence_file[sequence_file_id].update_record(
            producer="dummy_producer")

        # When : Calling producer_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.producer_list()

        # Then : We get producer_list
        result = json.loads(json_result)
        assert len(result["producer"]) == 1
        assert "dummy_producer" in result["producer"]

    ##################################
    # Tests on file_controller.restart_pre_process()
    ##################################

    # TODO : how to deal with tasks ? see with default too
    # def test_restart_pre_process(self):
    #     # Given :
    #     db_manipulation_utils.log_in_as_default_admin(self.session)
    #     pre_process_id = db_manipulation_utils.add_pre_process()
    #     sequence_file_id = db_manipulation_utils.add_sequence_file()
    #     db.sequence_file[sequence_file_id].update_record(pre_process_id=pre_process_id)

    #     # When : Calling producer_list
    #     with Omboddle(self.session, keep_session=True, query={"sequence_file_id": sequence_file_id}):
    #         json_result = file_controller.restart_pre_process()

    #     # Then : pre process was restarted
    #     result = json.loads(json_result)
    #     assert len(result["producer"]) == 1
    #     assert "dummy_producer" in result["producer"]

    # def testRestartPreProcess(self):
    #     fake_task = db.scheduler_task[fake_task_id]
    #     res = dict()
    #     with patch.object(Scheduler, 'queue_task', return_value=fake_task) as mock_queue_task:
    #         sequence_id = self.createDumbSequenceFile()
    #         request.vars['sequence_file_id'] = sequence_id
    #         res = restart_pre_process()
    #         print(res)
    #     self.assertNotEqual(res.find('message'), -1, 'missing message in response')

    # def testRestartPreProcessInexistantFile(self):
    #     fake_task = db.scheduler_task[fake_task_id]
    #     res = dict()
    #     with patch.object(Scheduler, 'queue_task', return_value=fake_task) as mock_queue_task:
    #         request.vars['sequence_file_id'] = 666
    #         res = restart_pre_process()
    #         print(res)
    #     self.assertNotEqual(res.find('"success":"false"'), -1, 'missing message in response')

    ##################################
    # Tests on file_controller.filesystem()
    ##################################

    def test_filesystem_no_node(self):
        # Given : initialized data
        db_manipulation_utils.log_in_as_default_admin(self.session)

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = test_utils.get_resources_path()

            # When : Calling submit
            with Omboddle(self.session, keep_session=True):
                json_result = file_controller.filesystem()

            # Then : We get file list
            result = json_result[0]
            assert result["text"] == "/"
            assert result["id"] == "/"
            assert result["children"] == True
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_filesystem_empty_node(self):
        # Given : initialized data
        db_manipulation_utils.log_in_as_default_admin(self.session)

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = str(test_utils.get_resources_path())

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, query={"node": ""}):
                result = file_controller.filesystem()

            # Then : We get file list (with a filter on file type and directories)
            assert len(result) == 3
            assert result[0]["li_attr"]["title"] == "Demo-X5.fa"
            assert result[1]["li_attr"]["title"] == "results"
            assert result[2]["li_attr"]["title"] == "logs"
        finally:
            defs.FILE_SOURCE = save_file_source

    def test_filesystem_logs(self):
        # Given : initialized data
        db_manipulation_utils.log_in_as_default_admin(self.session)

        save_file_source = defs.FILE_SOURCE
        try:
            defs.FILE_SOURCE = str(test_utils.get_resources_path())

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, query={"node": "/logs"}):
                result = file_controller.filesystem()

            # Then : We get file list (with a filter on file type and directories)
            assert len(result) == 1
            assert result[0]["li_attr"]["title"] == "nginx"
        finally:
            defs.FILE_SOURCE = save_file_source
