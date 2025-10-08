import collections
import io
import json
import logging
import os
import pathlib
import shutil
import unittest

import pytest
from py4web import HTTP, request
from py4web.core import Session, _before_request

from .... import settings, tasks
from ....common import auth, db
from ....controllers import file as file_controller
from ....modules import sampleSet, vidjil_utils
from ...functional.db_initialiser import DBInitialiser
from ..utils import db_manipulation_utils, test_utils
from ..utils.omboddle import Omboddle

LOGGER = logging.getLogger(__name__)


class TestFileController:
    @pytest.fixture(autouse=True)
    def setup(self):
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
    # Utils
    ##################################

    def mock_redlock(self, mocker) -> None:
        mock_redlock = mocker.patch("apps.vidjil.controllers.file.Redlock")
        mock_lock_instance = mocker.MagicMock()
        mock_lock_instance.__enter__ = mocker.MagicMock(return_value=mock_lock_instance)
        mock_lock_instance.__exit__ = mocker.MagicMock(return_value=None)
        mock_redlock.return_value = mock_lock_instance

    def create_mock_upload_process(self, mocker, expected_result) -> unittest.mock.Mock:
        mock_upload_process = mocker.patch(
            "apps.vidjil.controllers.file.upload_process",
            return_value=json.dumps(expected_result),
        )
        return mock_upload_process

    ##################################
    # Tests on file_controller.form()
    ##################################

    def test_form(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        # When : Calling form
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"sample_set_id": sample_set_id},
        ):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["pre_process_list"][0]["name"] == "public pre-process"
        assert result["sets"][0]["type"] == sampleSet.SET_TYPE_PATIENT
        assert result["sample_type"] == sampleSet.SET_TYPE_PATIENT
        assert result["upload_group_ids"][0] == 9
        assert len(result["files"][0]) == 1
        assert not result["isEditing"]

    def test_form_with_file(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # When : Calling form
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"sample_set_id": sample_set_id, "file_id": sequence_file_id},
        ):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "Form response"
        assert result["pre_process_list"][0]["name"] == "public pre-process"
        assert result["sets"][0]["type"] == sampleSet.SET_TYPE_PATIENT
        assert result["sample_type"] == sampleSet.SET_TYPE_PATIENT
        assert result["upload_group_ids"][0] == 9
        assert len(result["files"][0]) > 1
        assert result["files"][0]["id"] == sequence_file_id
        assert not result["isEditing"]

    def test_form_edit_file(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        # pass auth to correctly set the rights
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # When : Calling form
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={
                "file_id": sequence_file_id,
                "sample_type": sampleSet.SET_TYPE_PATIENT,
            },
        ):
            json_result = file_controller.form()

        # Then : We get users list
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "Form response"
        assert result["pre_process_list"][0]["name"] == "public pre-process"
        assert result["sets"][0]["type"] == sampleSet.SET_TYPE_PATIENT
        assert result["sample_type"] == sampleSet.SET_TYPE_PATIENT
        assert result["upload_group_ids"][0] == 9
        assert len(result["files"][0]) > 1
        assert result["files"][0]["id"] == sequence_file_id
        assert result["isEditing"]

    def test_form_edit_file_no_rights(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        # do not pass auth not to add the rights
        sample_set_id = db_manipulation_utils.add_patient(1, user_id)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # When : Calling form
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"file_id": sequence_file_id},
        ):
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

    def _initialize_json_submit_data(
        self,
        sample_set_id: int,
        source: str,
        filename: str = "",
        filename2: str = "",
        pre_process_id: int = 0,
        sequence_file_id: int = -1,
        sample_type: str = "",
        use_set_id_in_file: bool = False,
    ) -> str:
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

        file_set_ids = data["set_ids"] if use_set_id_in_file else ""
        myfile = {
            "id": sequence_file_id,
            "sampling_date": "1992-02-02",
            "info": "plop",
            "pcr": "plop",
            "sequencer": "plop",
            "producer": "plop",
            "filename": filename,
            "filename2": filename2,
            "set_ids": file_set_ids,
        }
        data["file"] = [myfile]
        return json.dumps(data)

    def test_submit_vidjil(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        json_submit_data = self._initialize_json_submit_data(
            sample_set_id, "computer", "plopapi"
        )

        # When : Calling submit
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json", "data": json_submit_data},
            query={"sample_set_id": sample_set_id},
        ):
            json_result = file_controller.submit()

        # Then : We get a good result
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "successfully added/edited file(s)"

    def test_submit_vidjil_same_sets(self):
        # Test a sequence file is not associated multiple times to the same sample_set

        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        json_submit_data = self._initialize_json_submit_data(
            sample_set_id, "computer", "plopapi", use_set_id_in_file=True
        )

        # When : Calling submit
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json", "data": json_submit_data},
            query={"sample_set_id": sample_set_id},
        ):
            json_result = file_controller.submit()

        # Then : Check we get only one association
        assert json_result is not None
        result = json.loads(json_result)
        assert result["message"] == "successfully added/edited file(s)"
        file_ids = result["file_ids"]
        assert len(file_ids) == 1
        file_id = file_ids[0]
        rows = db(
            db.sample_set_membership.sequence_file_id == file_id
            and db.sample_set_membership.sample_set_id == sample_set_id
        ).select()
        assert len(rows) == 1

    def test_submit_nfs(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename="Demo-X5.fa"
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_submit_nfs_and_pre_process(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id,
                "nfs",
                filename="Demo-X5.fa",
                filename2="Demo-X5.fa",
                pre_process_id=pre_process_id,
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_submit_invalid_form_no_filename(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()

            # TODO : should we use patient_id or sample_set_id ? In the web2py case it seems like we used a patient id
            # but in code it looks like we are looking for a sample set id...
            # data['set_ids'] = ":p plapipou (" + str(patient_id) + ")"
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id, "nfs", filename=""
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result["message"] == "add_form() failed"
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_submit_invalid_form_no_pre_process_name(self):
        # Given : initialized data
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id,
                "nfs",
                filename="Demo-X5.fa",
                filename2="",
                pre_process_id=pre_process_id,
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result["message"] == "add_form() failed"
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_submit_edit(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        json_submit_data = self._initialize_json_submit_data(
            sample_set_id,
            "computer",
            filename="plopapi",
            sample_type=sampleSet.SET_TYPE_PATIENT,
            sequence_file_id=sequence_file_id,
        )

        # When : Calling submit
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json", "data": json_submit_data},
            query={"sample_set_id": sample_set_id},
        ):
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
            db_manipulation_utils.get_indexed_user_password(1),
        )
        patient_id, sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()

            json_submit_data = self._initialize_json_submit_data(
                sample_set_id,
                "nfs",
                filename="Demo-X5.fa",
                sample_type=sampleSet.SET_TYPE_PATIENT,
                sequence_file_id=sequence_file_id,
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
            # TODO : check more things ?
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_submit_edit_nfs_and_pre_process(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id,
                "nfs",
                filename="Demo-X5.fa",
                filename2="Demo-X5.fa",
                sample_type=sampleSet.SET_TYPE_PATIENT,
                sequence_file_id=sequence_file_id,
                pre_process_id=pre_process_id,
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["message"] == "successfully added/edited file(s)"
            # TODO : check more things ?
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_submit_edit_invalid(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        pre_process_id = db_manipulation_utils.add_pre_process()

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()
            json_submit_data = self._initialize_json_submit_data(
                sample_set_id,
                "nfs",
                filename="",
                filename2="Demo-X5.fa",
                sample_type=sampleSet.SET_TYPE_PATIENT,
                sequence_file_id=sequence_file_id,
                pre_process_id=pre_process_id,
            )

            # When : Calling submit
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json", "data": json_submit_data},
                query={"sample_set_id": sample_set_id},
            ):
                json_result = file_controller.submit()

            # Then : We get users list
            assert json_result is not None
            result = json.loads(json_result)
            assert result["success"] == "false"
            assert result["message"] == "add_form() failed"
            # TODO : check more things ?
        finally:
            settings.FILE_SOURCE = save_file_source

    ##################################
    # Tests on file_controller.resumable_upload_get()
    ##################################

    def test_resumable_upload_get_existing_chunk(self):
        """
        Test resumable_upload_get to ensure it correctly checks the existence of an existing chunk.
        """
        # Given : Logged as a user with the necessary permissions
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        resumableIdentifier = "test_identifier"
        resumableChunkNumber = 1
        save_upload_folder = settings.UPLOAD_FOLDER
        try:
            settings.UPLOAD_FOLDER = test_utils.get_results_path()
            chunk_dir = pathlib.Path(
                settings.UPLOAD_FOLDER,
                file_controller.PARTS_FOLDER,
                resumableIdentifier,
            )
            chunk_dir.mkdir(parents=True, exist_ok=True)
            chunk_path = (
                chunk_dir / f"{resumableChunkNumber}{file_controller.PART_SUFFIX}"
            )
            chunk_path.write_bytes(b"chunk data")

            # When : Calling resumable_upload_get for an existing chunk
            with Omboddle(
                self.session,
                keep_session=True,
                params={
                    "resumableIdentifier": resumableIdentifier,
                    "resumableChunkNumber": resumableChunkNumber,
                    "format": "json",
                },
            ):
                response = file_controller.resumable_upload_get()
                assert response == "OK"
        finally:
            settings.UPLOAD_FOLDER = save_upload_folder
            if chunk_path.exists():
                chunk_path.unlink()
            if chunk_dir.exists():
                shutil.rmtree(chunk_dir)

    def test_resumable_upload_get_missing_chunk(self):
        """
        Test resumable_upload_get to ensure it correctly handles a missing chunk.
        """
        # Given : Logged as a user with the necessary permissions
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        resumableIdentifier = "test_identifier"
        resumableChunkNumber = 1
        save_upload_folder = settings.UPLOAD_FOLDER
        try:
            settings.UPLOAD_FOLDER = test_utils.get_results_path()
            chunk_dir = pathlib.Path(
                settings.UPLOAD_FOLDER,
                file_controller.PARTS_FOLDER,
                resumableIdentifier,
            )
            chunk_dir.mkdir(parents=True, exist_ok=True)

            # When : Calling resumable_upload_get for a non-existing chunk
            with Omboddle(
                self.session,
                keep_session=True,
                params={
                    "resumableIdentifier": resumableIdentifier,
                    "resumableChunkNumber": resumableChunkNumber + 1,
                    "format": "json",
                },
            ):
                with pytest.raises(HTTP) as exc_info:
                    file_controller.resumable_upload_get()
                assert exc_info.value.status == 204
        finally:
            settings.UPLOAD_FOLDER = save_upload_folder
            if chunk_dir.exists():
                shutil.rmtree(chunk_dir)

    ##################################
    # Tests on file_controller.resumable_upload_post()
    ##################################

    def test_resumable_upload_post(self):
        """
        Test resumable_upload_post to ensure chunks are correctly uploaded.
        """
        # Given : Logged as a user with the necessary permissions
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        db_manipulation_utils.add_sequence_file(sample_set_id, user_id)
        filename = "plop"
        chunk_data = b"chunk data"
        resumable_identifier = "test_identifier"
        resumable_total_chunks = 3
        save_upload_folder = settings.UPLOAD_FOLDER
        try:
            settings.UPLOAD_FOLDER = test_utils.get_results_path()
            # When: Upload chunks
            for chunk_number in range(1, resumable_total_chunks + 1):
                with Omboddle(
                    self.session,
                    keep_session=True,
                    params={
                        "resumableIdentifier": resumable_identifier,
                        "resumableChunkNumber": chunk_number,
                        "resumableTotalChunks": resumable_total_chunks,
                        "resumableFilename": filename,
                        "format": "json",
                    },
                ):
                    request.files["file"] = test_utils.UploadHelper(
                        io.BytesIO(chunk_data), f"{filename}.part{chunk_number}"
                    )
                    json_result = file_controller.resumable_upload_post()
                    assert json_result == "OK"

            # Then: all chunks should be uploaded
            chunk_dir = file_controller.get_chunk_dir(resumable_identifier)
            for chunk_number in range(1, resumable_total_chunks + 1):
                assert (
                    chunk_dir / f"{chunk_number}{file_controller.PART_SUFFIX}"
                ).exists()
        finally:
            settings.UPLOAD_FOLDER = save_upload_folder

    ##################################
    # Tests on file_controller.resumable_upload_process()
    ##################################

    def test_resumable_upload_process(self, mocker):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        filename = "plop"

        # Mock the Redlock context manager to avoid timeout issues
        self.mock_redlock(mocker)

        # Mock upload_process since it's tested elsewhere
        expected_result = {
            "message": f"file {filename}({sequence_file_id}) upload finished"
        }
        mock_upload_process = self.create_mock_upload_process(mocker, expected_result)

        save_upload_folder = settings.UPLOAD_FOLDER
        save_data_file_upload_folder = db.sequence_file.data_file.uploadfolder
        try:
            settings.UPLOAD_FOLDER = test_utils.get_results_path()
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # Prepare chunks
            chunk_data = "chunk data"
            resumable_total_chunks = 3
            temp_resumable_identifier = "test_identifier"
            temp_chunk_dir = file_controller.get_chunk_dir(temp_resumable_identifier)
            temp_chunk_dir.mkdir(parents=True, exist_ok=True)
            total_size = 0
            for chunk_number in range(1, resumable_total_chunks + 1):
                chunk_file_path = (
                    temp_chunk_dir / f"{chunk_number}{file_controller.PART_SUFFIX}"
                )
                with chunk_file_path.open("w") as chunk_file:
                    chunk_file.write(f"{chunk_data}{chunk_number}\n")
                total_size += chunk_file_path.stat().st_size
            # update identifier
            resumable_identifier = f"{sequence_file_id}-{filename}-{total_size}"
            chunk_dir = file_controller.get_chunk_dir(resumable_identifier)
            temp_chunk_dir.replace(chunk_dir)

            # When : Calling upload process
            with Omboddle(
                self.session,
                keep_session=True,
                params={
                    "resumableIdentifier": resumable_identifier,
                    "sequence_id": sequence_file_id,
                    "filename": filename,
                    "file_number": 1,
                    "format": "json",
                },
            ):
                json_result = file_controller.resumable_upload_process()

            # Then : Check that chunks were merged and upload_process was called
            result = json.loads(json_result)
            assert result["message"] == expected_result["message"]

            # Verify that upload_process was called with correct parameters
            mock_upload_process.assert_called_once()
            call_args = mock_upload_process.call_args[0]
            (
                merged_file_path,
                called_sequence_id,
                called_filename,
                called_file_number,
                called_preprocess,
            ) = call_args
            assert called_sequence_id == str(sequence_file_id)
            assert called_filename == filename
            assert called_file_number == "1"
            assert called_preprocess is None

            # Verify merged file was created and has correct size and content
            assert merged_file_path.exists()
            assert merged_file_path.stat().st_size == total_size
            with merged_file_path.open() as merged_file:
                line_number = 0
                for line in merged_file:
                    line_number += 1
                    assert line == f"{chunk_data}{line_number}\n"
                assert line_number == resumable_total_chunks

            # Verify chunks directory was cleaned up
            assert not chunk_dir.exists()

            # Clean up merged file
            if merged_file_path.exists():
                os.remove(merged_file_path)
        finally:
            db.sequence_file.data_file.uploadfolder = save_data_file_upload_folder
            settings.UPLOAD_FOLDER = save_upload_folder

    ##################################
    # Tests on file_controller.upload()
    ##################################

    def test_upload(self, mocker):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        with file_to_upload.open("rb") as file:
            filename = "plop"
            upload_helper = test_utils.UploadHelper(file, filename)
            save_upload_folder = db.sequence_file.data_file.uploadfolder

            # Mock the Redlock context manager to avoid timeout issues
            self.mock_redlock(mocker)

            # Mock upload_process since it's tested elsewhere
            expected_result = {
                "message": f"file {filename}({sequence_file_id}) upload finished"
            }
            mock_upload_process = self.create_mock_upload_process(
                mocker, expected_result
            )

            try:
                db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
                # When : Calling upload
                with Omboddle(
                    self.session,
                    keep_session=True,
                    params={"id": sequence_file_id, "file_number": 1, "format": "json"},
                ):
                    request.files["file"] = upload_helper
                    json_result = file_controller.upload()

                # Then : Check result
                result = json.loads(json_result)
                assert result["message"] == expected_result["message"]

                # Verify that upload_process was called once
                mock_upload_process.assert_called_once()
                call_args = mock_upload_process.call_args[0]
                (
                    uploaded_file_path,
                    called_sequence_id,
                    called_filename,
                    called_file_number,
                    called_preprocess,
                ) = call_args

                assert called_sequence_id == str(sequence_file_id)
                assert called_filename == filename
                assert called_file_number == "1"
                assert called_preprocess is None

                # Verify the uploaded file was created temporarily
                assert uploaded_file_path.exists()

                # Clean up the temporary file
                if uploaded_file_path.exists():
                    os.remove(uploaded_file_path)
            finally:
                db.sequence_file.data_file.uploadfolder = save_upload_folder

    ##################################
    # Tests on file_controller.upload_process()
    ##################################

    def test_upload_process_file_1_success(self):
        # Given: Logged user with a sequence file for first file upload
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # Create a temporary file to upload
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(test_utils.get_results_path(), "temp_upload.fa")
        shutil.copy(file_to_upload, temp_upload_file)

        filename = "test_file.fa"
        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process for file 1
            result_json = file_controller.upload_process(
                temp_upload_file, str(sequence_file_id), filename, "1", None
            )

            # Then: Check successful upload
            result = json.loads(result_json)
            assert f"file {filename}({sequence_file_id})" in result["message"]
            assert "upload finished" in result["message"]

            # Verify file was moved and database updated
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.data_file is not None
            assert sequence_file.size_file > 0

            # Verify temporary file was moved (not copied)
            assert not temp_upload_file.exists()

            # Verify actual file exists
            actual_file = pathlib.Path(
                db.sequence_file.data_file.uploadfolder, sequence_file.data_file
            )
            assert actual_file.exists()

            # Clean up
            if actual_file.exists():
                os.remove(actual_file)
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder

    def test_upload_process_file_2_success(self):
        # Given: Logged user with a sequence file for second file upload
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # Create a temporary file to upload
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(
            test_utils.get_results_path(), "temp_upload_2.fa"
        )
        shutil.copy(file_to_upload, temp_upload_file)

        filename = "test_file_2.fa"
        save_upload_folder = db.sequence_file.data_file2.uploadfolder

        try:
            db.sequence_file.data_file2.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process for file 2
            result_json = file_controller.upload_process(
                temp_upload_file, str(sequence_file_id), filename, "2", None
            )

            # Then: Check successful upload
            result = json.loads(result_json)
            assert f"file {filename}({sequence_file_id})" in result["message"]
            assert "upload finished" in result["message"]

            # Verify file was moved and database updated
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.data_file2 is not None
            assert sequence_file.size_file2 > 0

            # Verify temporary file was moved
            assert not temp_upload_file.exists()

            # Verify actual file exists
            actual_file = pathlib.Path(
                db.sequence_file.data_file2.uploadfolder, sequence_file.data_file2
            )
            assert actual_file.exists()

            # Clean up
            if actual_file.exists():
                os.remove(actual_file)
        finally:
            db.sequence_file.data_file2.uploadfolder = save_upload_folder

    def test_upload_process_invalid_sequence_id(self):
        # Given: Invalid sequence file ID
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(test_utils.get_results_path(), "temp_upload.fa")
        shutil.copy(file_to_upload, temp_upload_file)

        try:
            # When: Calling upload_process with invalid sequence ID
            with pytest.raises(HTTP) as exc_info:
                file_controller.upload_process(
                    temp_upload_file, "999999", "test.fa", "1", None
                )

            # Then: Should raise HTTP 500 error
            assert exc_info.value.status == 500
            assert "no sequence file with this id" in str(exc_info.value.body)
        finally:
            if temp_upload_file.exists():
                os.remove(temp_upload_file)

    def test_upload_process_missing_file(self):
        # Given: Logged user with valid sequence file but missing upload file
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        non_existent_file = pathlib.Path(test_utils.get_results_path(), "missing.fa")

        # When: Calling upload_process with missing file
        with pytest.raises(HTTP) as exc_info:
            file_controller.upload_process(
                non_existent_file, str(sequence_file_id), "missing.fa", "1", None
            )

        # Then: Should raise HTTP 500 error
        assert exc_info.value.status == 500
        assert f"Expected merged file {non_existent_file} not found" in str(
            exc_info.value.body
        )

    def test_upload_process_with_preprocess_single_file(self, mocker):
        # Given: Logged user with preprocess requiring 1 file
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        pre_process_id = db_manipulation_utils.add_pre_process()
        preprocess = db.pre_process[pre_process_id]

        # Create temporary file
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(
            test_utils.get_results_path(), "temp_preprocess.fa"
        )
        shutil.copy(file_to_upload, temp_upload_file)

        # Mock Redlock and scheduler
        self.mock_redlock(mocker)
        mock_schedule = mocker.patch(
            "apps.vidjil.controllers.file.tasks.schedule_pre_process"
        )
        # Mock getPreprocessRequiredFiles to return 1
        mocker.patch(
            "apps.vidjil.controllers.file.vidjil_utils.getPreprocessRequiredFiles",
            return_value=1,
        )

        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process with preprocess
            result_json = file_controller.upload_process(
                temp_upload_file,
                str(sequence_file_id),
                "test_preprocess.fa",
                "1",
                preprocess,
            )

            # Then: Check that preprocess is scheduled
            result = json.loads(result_json)
            assert f"p{pre_process_id} start pre_process" in result["message"]
            mock_schedule.assert_called_once_with(
                int(sequence_file_id), int(pre_process_id)
            )

            # Verify pre_process_flag is updated
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.pre_process_flag == tasks.STATUS_WAITING

            # Clean up
            actual_file = pathlib.Path(
                db.sequence_file.data_file.uploadfolder, sequence_file.data_file
            )
            if actual_file.exists():
                os.remove(actual_file)
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder

    def test_upload_process_with_preprocess_two_files_incomplete(self, mocker):
        # Given: Logged user with preprocess requiring 2 files, but only 1 uploaded
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        pre_process_id = db_manipulation_utils.add_pre_process()
        preprocess = db.pre_process[pre_process_id]

        # Mock getPreprocessRequiredFiles to return 2
        mocker.patch(
            "apps.vidjil.controllers.file.vidjil_utils.getPreprocessRequiredFiles",
            return_value=2,
        )

        # Create temporary file
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(
            test_utils.get_results_path(), "temp_incomplete.fa"
        )
        shutil.copy(file_to_upload, temp_upload_file)

        # Mock Redlock and scheduler
        self.mock_redlock(mocker)
        mock_schedule = mocker.patch(
            "apps.vidjil.controllers.file.tasks.schedule_pre_process"
        )

        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process with preprocess requiring 2 files but only uploading 1
            result_json = file_controller.upload_process(
                temp_upload_file,
                str(sequence_file_id),
                "test_incomplete.fa",
                "1",
                preprocess,
            )

            # Then: Check that preprocess is NOT scheduled yet
            result = json.loads(result_json)
            assert f"p{pre_process_id} start pre_process" not in result["message"]
            mock_schedule.assert_not_called()

            # Clean up
            sequence_file = db.sequence_file[sequence_file_id]
            actual_file = pathlib.Path(
                db.sequence_file.data_file.uploadfolder, sequence_file.data_file
            )
            if actual_file.exists():
                os.remove(actual_file)
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder

    def test_upload_process_with_preprocess_two_files_complete(self, mocker):
        # Given: Logged user with preprocess requiring 2 files, both uploaded
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        pre_process_id = db_manipulation_utils.add_pre_process()
        preprocess = db.pre_process[pre_process_id]

        # Mock getPreprocessRequiredFiles to return 2
        mocker.patch(
            "apps.vidjil.controllers.file.vidjil_utils.getPreprocessRequiredFiles",
            return_value=2,
        )

        save_upload_folder_1 = db.sequence_file.data_file.uploadfolder
        save_upload_folder_2 = db.sequence_file.data_file2.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
            db.sequence_file.data_file2.uploadfolder = test_utils.get_results_path()

            # First, upload data_file manually to simulate it's already there
            file_to_upload = pathlib.Path(
                test_utils.get_resources_path(), "analysis-example.vidjil"
            )

            with io.BytesIO() as empty_file:
                db_filename = db.sequence_file.data_file.store(empty_file, "file1.fa")
            shutil.copy(
                file_to_upload,
                os.path.join(db.sequence_file.data_file.uploadfolder, db_filename),
            )
            db.sequence_file[sequence_file_id].update_record(data_file=db_filename)

            # Now upload second file
            temp_upload_file = pathlib.Path(
                test_utils.get_results_path(), "temp_complete.fa"
            )
            shutil.copy(file_to_upload, temp_upload_file)

            # Mock Redlock and scheduler
            self.mock_redlock(mocker)
            mock_schedule = mocker.patch(
                "apps.vidjil.controllers.file.tasks.schedule_pre_process"
            )

            # When: Calling upload_process for second file with preprocess
            result_json = file_controller.upload_process(
                temp_upload_file, str(sequence_file_id), "file2.fa", "2", preprocess
            )

            # Then: Check that preprocess is now scheduled
            result = json.loads(result_json)
            assert f"p{pre_process_id} start pre_process" in result["message"]
            mock_schedule.assert_called_once_with(
                int(sequence_file_id), int(pre_process_id)
            )

            # Verify pre_process_flag is updated
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.pre_process_flag == tasks.STATUS_WAITING

            # Clean up
            if sequence_file.data_file:
                result_file_1 = pathlib.Path(
                    test_utils.get_results_path(), sequence_file.data_file
                )
                if result_file_1.exists():
                    os.remove(result_file_1)
            if sequence_file.data_file2:
                result_file_2 = pathlib.Path(
                    test_utils.get_results_path(), sequence_file.data_file2
                )
                if result_file_2.exists():
                    os.remove(result_file_2)
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder_1
            db.sequence_file.data_file2.uploadfolder = save_upload_folder_2

    def test_upload_process_revoke_old_preprocess_task(self, mocker):
        # Given: Logged user with sequence file that has an existing preprocess task
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )
        pre_process_id = db_manipulation_utils.add_pre_process()
        preprocess = db.pre_process[pre_process_id]

        # Create a fake old task
        old_task_id = db.scheduler_task.insert(
            task_name="test_task", function_name="test_function", status="PENDING"
        )
        db.sequence_file[sequence_file_id].update_record(
            pre_process_scheduler_task_id=old_task_id
        )

        # Create temporary file
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(test_utils.get_results_path(), "temp_revoke.fa")
        shutil.copy(file_to_upload, temp_upload_file)

        # Mock Redlock and scheduler
        self.mock_redlock(mocker)
        mock_scheduler_revoke = mocker.patch(
            "apps.vidjil.controllers.file.scheduler.control.revoke"
        )
        mock_schedule = mocker.patch(
            "apps.vidjil.controllers.file.tasks.schedule_pre_process"
        )
        # Mock getPreprocessRequiredFiles to return 1
        mocker.patch(
            "apps.vidjil.controllers.file.vidjil_utils.getPreprocessRequiredFiles",
            return_value=1,
        )

        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process with preprocess
            file_controller.upload_process(
                temp_upload_file,
                str(sequence_file_id),
                "test_revoke.fa",
                "1",
                preprocess,
            )

            # Then: Check that old task is revoked and new one is scheduled
            mock_scheduler_revoke.assert_called_once_with(old_task_id, terminate=True)
            mock_schedule.assert_called_once_with(
                int(sequence_file_id), int(pre_process_id)
            )

            # Verify old task is deleted from database
            assert db.scheduler_task[old_task_id] is None

            # Clean up
            sequence_file = db.sequence_file[sequence_file_id]
            actual_file = pathlib.Path(
                db.sequence_file.data_file.uploadfolder, sequence_file.data_file
            )
            if actual_file.exists():
                os.remove(actual_file)
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder

    def test_upload_process_io_error_filename_too_long(self, mocker):
        # Given: Logged user with a sequence file
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # Create temporary file
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(test_utils.get_results_path(), "temp_long.fa")
        shutil.copy(file_to_upload, temp_upload_file)

        # Mock store method to raise IOError with filename too long message
        mocker.patch.object(
            db.sequence_file.data_file,
            "store",
            side_effect=IOError("File name too long"),
        )

        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process with long filename
            with pytest.raises(HTTP) as exc_info:
                file_controller.upload_process(
                    temp_upload_file, str(sequence_file_id), "test_long.fa", "1", None
                )

            # Then: Should raise HTTP 500 error with specific message
            assert exc_info.value.status == 500
            assert "Your filename is too long, please shorten it." in str(
                exc_info.value.body
            )

            # Verify pre_process_flag is set to upload failed
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.pre_process_flag == tasks.STATUS_UPLOAD_FAILED
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder
            if temp_upload_file.exists():
                os.remove(temp_upload_file)

    def test_upload_process_io_error_system_error(self, mocker):
        # Given: Logged user with a sequence file
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # Create temporary file
        file_to_upload = pathlib.Path(
            test_utils.get_resources_path(), "analysis-example.vidjil"
        )
        temp_upload_file = pathlib.Path(test_utils.get_results_path(), "temp_system.fa")
        shutil.copy(file_to_upload, temp_upload_file)

        # Mock store method to raise generic IOError
        mocker.patch.object(
            db.sequence_file.data_file, "store", side_effect=IOError("System error")
        )

        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process with system error
            with pytest.raises(HTTP) as exc_info:
                file_controller.upload_process(
                    temp_upload_file, str(sequence_file_id), "test_system.fa", "1", None
                )

            # Then: Should raise HTTP 500 error with generic message
            assert exc_info.value.status == 500
            assert "System error during processing of uploaded file." in str(
                exc_info.value.body
            )

            # Verify pre_process_flag is set to upload failed
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.pre_process_flag == tasks.STATUS_UPLOAD_FAILED
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder
            if temp_upload_file.exists():
                os.remove(temp_upload_file)

    def test_upload_process_file_size_calculation(self):
        # Given: Logged user uploading files of different sizes
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # Create temporary file with known content
        temp_upload_file = pathlib.Path(test_utils.get_results_path(), "temp_size.fa")
        test_content = "ATCGATCGATCG" * 100  # Known size content
        temp_upload_file.write_text(test_content)
        expected_size = temp_upload_file.stat().st_size

        save_upload_folder = db.sequence_file.data_file.uploadfolder

        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()

            # When: Calling upload_process
            result_json = file_controller.upload_process(
                temp_upload_file, str(sequence_file_id), "test_size.fa", "1", None
            )

            # Then: Check that file size is correctly calculated and stored
            sequence_file = db.sequence_file[sequence_file_id]
            assert sequence_file.size_file == expected_size

            result = json.loads(result_json)
            assert vidjil_utils.format_size(expected_size) in result["message"]

            # Clean up
            actual_file = pathlib.Path(
                db.sequence_file.data_file.uploadfolder, sequence_file.data_file
            )
            if actual_file.exists():
                os.remove(actual_file)
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder

    ##################################
    # Tests on file_controller.confirm()
    ##################################

    def test_confirm_fail_wrong_id(self):
        # Given : Logged as other user, and add corresponding config, ...
        db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        fake_sequence_file_id = 0

        # When : Calling confirm
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"id": fake_sequence_file_id},
        ):
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
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id
        )

        # When : Calling confirm
        with Omboddle(
            self.session,
            keep_session=True,
            params={"format": "json"},
            query={"id": sequence_file_id, "redirect_sample_set_id": sample_set_id},
        ):
            json_result = file_controller.confirm()

        # Then : We get users list
        result = json.loads(json_result)
        assert result["message"] == "Choose what you would like to delete"
        assert not result["delete_only_sequence"]
        assert not result["delete_results"]

    ##################################
    # Tests on file_controller.delete()
    ##################################

    def test_delete_only_file(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        save_upload_folder = db.sequence_file.data_file.uploadfolder
        save_auto_delete = db.sequence_file.data_file.autodelete
        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
            db.sequence_file.data_file.autodelete = True
            sequence_file_id = db_manipulation_utils.add_sequence_file(
                sample_set_id, user_id, use_real_file=True
            )
            data_file = pathlib.Path(
                test_utils.get_results_path(),
                db.sequence_file[sequence_file_id].data_file,
            )
            assert data_file.exists()

            # When : Calling confirm
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={"id": sequence_file_id, "redirect_sample_set_id": sample_set_id},
            ):
                json_result = file_controller.delete()

            # Then : We get users list
            result = json.loads(json_result)
            assert result["message"] == f"sequence file ({sequence_file_id}) deleted"
            assert not data_file.exists()
            assert db.sequence_file[sequence_file_id] is not None
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder
            db.sequence_file.data_file.autodelete = save_auto_delete

    def test_delete_delete_results(self):
        # Given : Logged as other user, and add corresponding config, ...
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1),
        )
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        save_upload_folder = db.sequence_file.data_file.uploadfolder
        save_auto_delete = db.sequence_file.data_file.autodelete
        try:
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
            db.sequence_file.data_file.autodelete = True
            sequence_file_id = db_manipulation_utils.add_sequence_file(
                sample_set_id, user_id, use_real_file=True
            )
            data_file = pathlib.Path(
                test_utils.get_results_path(),
                db.sequence_file[sequence_file_id].data_file,
            )
            assert data_file.exists()

            # When : Calling confirm
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                query={
                    "id": sequence_file_id,
                    "redirect_sample_set_id": sample_set_id,
                    "delete_results": True,
                },
            ):
                json_result = file_controller.delete()

            # Then : We get users list
            result = json.loads(json_result)
            assert result["message"] == f"sequence file ({sequence_file_id}) deleted"
            assert not data_file.exists()
            assert db.sequence_file[sequence_file_id] is None
        finally:
            db.sequence_file.data_file.uploadfolder = save_upload_folder
            db.sequence_file.data_file.autodelete = save_auto_delete

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
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
        db.sequence_file[sequence_file_id].update_record(sequencer="dummy_sequencer")

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
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
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

    def test_producer_list_default(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling producer_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.producer_list()

        # Then : We get producer_list
        result = json.loads(json_result)
        assert result["producer"] == ["vidjil"]

    def test_producer_list_new(self):
        # Given : Logged as default admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        sample_set_id = db_manipulation_utils.add_patient(1, user_id, auth)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
        db.sequence_file[sequence_file_id].update_record(producer="dummy_producer")

        # When : Calling producer_list
        with Omboddle(self.session, keep_session=True):
            json_result = file_controller.producer_list()

        # Then : We get producer_list
        result = json.loads(json_result)
        assert len(result["producer"]) == 2
        assert collections.Counter(result["producer"]) == collections.Counter(
            ["vidjil", "dummy_producer"]
        )

    ##################################
    # Tests on file_controller.restart_pre_process()
    ##################################

    # TODO : how to deal with tasks ? see with default too
    # def test_restart_pre_process(self):
    #     # Given :
    #     db_manipulation_utils.log_in_as_default_admin(self.session)
    #     sequence_file_id = db_manipulation_utils.add_sequence_file()
    #     pre_process_id = db_manipulation_utils.add_pre_process()
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

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = test_utils.get_resources_path()

            # When : Calling submit
            with Omboddle(self.session, keep_session=True):
                json_result = file_controller.filesystem()

            # Then : We get file list
            result = json_result[0]
            assert result["text"] == "/"
            assert result["id"] == "/"
            assert result["children"]
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_filesystem_empty_node(self):
        # Given : initialized data
        db_manipulation_utils.log_in_as_default_admin(self.session)

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = str(test_utils.get_resources_path())

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, query={"node": ""}):
                result = file_controller.filesystem()

            # Then : We get file list (with a filter on file type and directories)
            assert len(result) == 4
            titles = [item["li_attr"]["title"] for item in result]
            expected_titles = ["Demo-X5.fa", "results", "logs", "analysis-example.vidjil" ]
            assert collections.Counter(titles) == collections.Counter(expected_titles)
        finally:
            settings.FILE_SOURCE = save_file_source

    def test_filesystem_logs(self):
        # Given : initialized data
        db_manipulation_utils.log_in_as_default_admin(self.session)

        save_file_source = settings.FILE_SOURCE
        try:
            settings.FILE_SOURCE = str(test_utils.get_resources_path())

            # When : Calling submit
            with Omboddle(self.session, keep_session=True, query={"node": "/logs"}):
                result = file_controller.filesystem()

            # Then : We get file list (with a filter on file type and directories)
            assert len(result) == 1
            assert result[0]["li_attr"]["title"] == "nginx"
        finally:
            settings.FILE_SOURCE = save_file_source
