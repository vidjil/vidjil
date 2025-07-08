import collections
import io
import json
import logging
import os
import pathlib
import shutil

import pytest
from py4web import HTTP, request
from py4web.core import Session, _before_request

from .... import settings
from ....common import auth, db
from ....controllers import file as file_controller
from ....modules import sampleSet
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
                chunk_dir.rmdir()

    ##################################
    # Tests on file_controller.resumable_upload_post()
    ##################################

    def test_resumable_upload_post(self):
        """
        Test resumable_upload_post to ensure chunks are correctly uploaded and merged.
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
        resumableIdentifier = "test_identifier"
        resumableTotalChunks = 3
        save_upload_folder = settings.UPLOAD_FOLDER
        try:
            settings.UPLOAD_FOLDER = test_utils.get_results_path()
            # Upload chunks
            for chunk_number in range(1, resumableTotalChunks + 1):
                with Omboddle(
                    self.session,
                    keep_session=True,
                    params={
                        "resumableIdentifier": resumableIdentifier,
                        "resumableChunkNumber": chunk_number,
                        "resumableTotalChunks": resumableTotalChunks,
                        "resumableFilename": filename,
                        "format": "json",
                    },
                ):
                    request.files["file"] = test_utils.UploadHelper(
                        io.BytesIO(chunk_data), f"{filename}.part{chunk_number}"
                    )
                    json_result = file_controller.resumable_upload_post()
                    assert json_result == "OK"

            # Check if the final merged file exists
            final_path = pathlib.Path(
                settings.UPLOAD_FOLDER,
                f"{resumableIdentifier}{file_controller.MERGED_SUFFIX}",
            )
            assert final_path.exists()
            with final_path.open("rb") as f:
                merged_data = f.read()
                assert merged_data == chunk_data * resumableTotalChunks
        finally:
            settings.UPLOAD_FOLDER = save_upload_folder
            if final_path.exists():
                final_path.unlink()

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
            chunk_path = (
                chunk_dir / f"{resumableChunkNumber}{file_controller.PART_SUFFIX}"
            )
            chunk_path.write_bytes(b"chunk data")

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
            if chunk_path.exists():
                chunk_path.unlink()
            if chunk_dir.exists():
                chunk_dir.rmdir()

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
        mock_redlock = mocker.patch("apps.vidjil.controllers.file.Redlock")
        mock_lock_instance = mocker.MagicMock()
        mock_lock_instance.__enter__ = mocker.MagicMock(return_value=mock_lock_instance)
        mock_lock_instance.__exit__ = mocker.MagicMock(return_value=None)
        mock_redlock.return_value = mock_lock_instance

        save_upload_folder = settings.UPLOAD_FOLDER
        save_data_file_upload_folder = db.sequence_file.data_file.uploadfolder
        try:
            settings.UPLOAD_FOLDER = test_utils.get_results_path()
            db.sequence_file.data_file.uploadfolder = test_utils.get_results_path()
            shutil.copy(
                pathlib.Path(
                    test_utils.get_resources_path(), "analysis-example.vidjil"
                ),
                pathlib.Path(
                    db.sequence_file.data_file.uploadfolder,
                    f"{sequence_file_id}-{filename}{file_controller.MERGED_SUFFIX}",
                ),
            )
            # When : Calling upload
            with Omboddle(
                self.session,
                keep_session=True,
                params={
                    "resumableIdentifier": f"{sequence_file_id}-{filename}",
                    "sequence_id": sequence_file_id,
                    "filename": filename,
                    "file_number": 1,
                    "format": "json",
                },
            ):
                json_result = file_controller.resumable_upload_process()

            # Then : Check result
            result = json.loads(json_result)
            assert (
                result["message"]
                == f"file {filename}({sequence_file_id})  (35.6 kB) upload finished"
            )
            result_file = pathlib.Path(
                test_utils.get_results_path(),
                db.sequence_file[sequence_file_id].data_file,
            )
            assert result_file.exists()
            os.remove(result_file)
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
            mock_redlock = mocker.patch("apps.vidjil.controllers.file.Redlock")
            mock_lock_instance = mocker.MagicMock()
            mock_lock_instance.__enter__ = mocker.MagicMock(
                return_value=mock_lock_instance
            )
            mock_lock_instance.__exit__ = mocker.MagicMock(return_value=None)
            mock_redlock.return_value = mock_lock_instance

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
                assert (
                    result["message"]
                    == f"file {filename}({sequence_file_id})  (35.6 kB) upload finished"
                )
                result_file = pathlib.Path(
                    test_utils.get_results_path(),
                    db.sequence_file[sequence_file_id].data_file,
                )
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
            assert len(result) == 3
            titles = [item["li_attr"]["title"] for item in result]
            expected_titles = ["Demo-X5.fa", "results", "logs"]
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
