import os
import json
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

    # TODO : file_controller.upload() : How to deal with files ? --> same problem as in test_default

    # def testUpload(self):
    #     class emptyClass( object ):
    #         pass

    #     plop = emptyClass()
    #     setattr(plop, 'file',  open("../../doc/analysis-example.vidjil", 'rb'))
    #     setattr(plop, 'filename', 'plopapi')

    #     request.vars['file'] = plop
    #     request.vars['id'] = fake_file_id

    #     resp = upload()
    #     self.assertNotEqual(resp.find('upload finished'), -1, "testUpload() failed")

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

    # def testConfirmSuccess(self):
    #     test_file_id = self.createDumbSequenceFile()
    #     request.vars['id'] = test_file_id

    #     request.vars['redirect_sample_set_id'] = fake_sample_set_id

    #     resp = confirm()
    #     self.assertTrue(resp.has_key('message'), "confirm() fails to confirm deletion of a file")

    # def testDelete(self):
    #     test_file_id = self.createDumbSequenceFile()

    #     result_id = db.results_file.insert(sequence_file_id = test_file_id,
    #                                        config_id = fake_config_id,
    #                                        run_date = '2015-04-23 00:00:00')

    #     db.sample_set_membership.insert(sample_set_id = fake_sample_set_id, sequence_file_id = test_file_id)
    #     self.assertTrue(db.sequence_file[test_file_id].filename == "babibou" , "file have been added")

    #     request.vars['id'] = test_file_id
    #     request.vars['redirect_sample_set_id'] = fake_sample_set_id

    #     resp = delete()
    #     self.assertTrue(db.sequence_file[test_file_id].data_file == None , "file only should have been deleted")
    #     self.assertTrue(db.results_file[result_id] <> None, "result file should not have been deleted")

    #     request.vars['delete_results'] = 'True'
    #     resp = delete()
    #     self.assertTrue(db.sequence_file[test_file_id] == None, "sequence entry in DB should have been deleted")
    #     self.assertTrue(db.results_file[result_id] == None, "result file should have been deleted")

    # def testSequencerList(self):

    #     resp = sequencer_list()
    #     self.assertNotEqual(resp.find('"sequencer":['), -1, "sequencer_list() doesn't return a valid json")

    # def testPcrList(self):

    #     resp = pcr_list()
    #     self.assertNotEqual(resp.find('"pcr":['), -1, "pcr_list() doesn't return a valid json")

    # def testProducerList(self):

    #     resp = producer_list()
    #     self.assertNotEqual(resp.find('"producer":['), -1, "producer_list() doesn't return a valid json")

    # def testUpdateNameOfSequenceFile(self):
    #     sequence_id = self.createDumbSequenceFile()
    #     data_file = db.sequence_file[sequence_id].data_file

    #     update_name_of_sequence_file(sequence_id, 'toto.txt', 'LICENSE')

    #     current_sequence = db.sequence_file[sequence_id]
    #     self.assertEquals(current_sequence.size_file, os.path.getsize('LICENSE'))
    #     self.assertEquals(current_sequence.data_file, 'LICENSE')
    #     self.assertEquals(current_sequence.filename, 'toto.txt')

    # def testGetNewUploaddedFilename(self):
    #     sequence_id = self.createDumbSequenceFile()
    #     data_file = db.sequence_file[sequence_id].data_file

    #     filename = get_new_uploaded_filename(data_file, "truc.def")

    #     self.assertEquals(filename[-4:], ".def")
    #     self.assertTrue(filename.find(base64.b16encode('truc.def').lower() + ".def") > -1)

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
