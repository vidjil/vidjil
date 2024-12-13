import os
import pathlib
import pytest
from py4web.core import _before_request, Session

from .utils import db_manipulation_utils, test_utils
from ..functional.db_initialiser import DBInitialiser
from ... import settings, tasks
from ...common import db, auth
from ...modules.permission_enum import PermissionEnum


class TestTasks():

    # TODO: mutualize ?
    @pytest.fixture(autouse=True)
    def init_env_and_db(self):
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

    fuse_cmd = ""
    fuse_out_folder = ""
    fuse_output_filename = ""

    ##################################
    # Tests on custom_fuse()
    ##################################
    def fuse(self, cmd: str, out_folder: str, output_filename: str) -> str:
        TestTasks.fuse_cmd = cmd
        TestTasks.fuse_out_folder = out_folder
        TestTasks.fuse_output_filename = output_filename
        return pathlib.Path(test_utils.get_resources_path(),
                            "analysis-example.vidjil")

    def test_custom_fuse(self, mocker):
        # Given : add a result file and mock call to rpc
        user_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_group_id = auth.user_group(user_id)
        db_manipulation_utils.log_in(
            self.session,
            db_manipulation_utils.get_indexed_user_email(1),
            db_manipulation_utils.get_indexed_user_password(1))
        sample_set_id = db_manipulation_utils.add_patient(1, user_id)[1]
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.run.value, db.sample_set, 0)
        sequence_file_id = db_manipulation_utils.add_sequence_file(
            sample_set_id, user_id)
        results_file_id = db_manipulation_utils.add_results_file(
            sequence_file_id=sequence_file_id)

        mocked_server_proxy = mocker.patch(
            "xmlrpc.client.ServerProxy", return_value=self)

        saved_dir_results = settings.DIR_RESULTS
        saved_dir_out_vidjil_id = settings.DIR_OUT_VIDJIL_ID

        try:
            settings.DIR_RESULTS = str(test_utils.get_results_path())
            settings.DIR_OUT_VIDJIL_ID = str(pathlib.Path(
                test_utils.get_results_path(), f"out-{settings.BASENAME_OUT_VIDJIL_ID}")) + os.sep

            # When : Calling custom_fuse
            result = tasks.custom_fuse([str(results_file_id)])

            # Then : fuse was correctly called, directory was removed and we get a result
            mocked_server_proxy.assert_called_once()
            assert TestTasks.fuse_cmd.startswith(
                f"python {os.path.abspath(os.path.join(settings.DIR_FUSE, 'fuse.py'))}")
            assert not os.path.exists(TestTasks.fuse_out_folder)
            assert result["vidjil_json_version"] == "2014.10"
        finally:
            settings.DIR_OUT_VIDJIL_ID = saved_dir_out_vidjil_id
            settings.DIR_RESULTS = saved_dir_results
