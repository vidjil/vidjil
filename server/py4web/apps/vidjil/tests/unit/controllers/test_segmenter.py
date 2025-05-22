import json
import os
from unittest.mock import mock_open, patch

import pytest
from py4web.core import Session, _before_request

from ....common import auth, db
from ....controllers import segmenter as segmenter_controller
from ...functional.db_initialiser import DBInitialiser
from ..utils.omboddle import Omboddle


class TestSegmenterController:
    # TODO: mutualize ?
    @pytest.fixture(autouse=True)
    def init_env_and_db(self):
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
    # Tests on segmenter_controller.index()
    ##################################

    @patch("os.system")
    @patch(
        "builtins.open",
        new_callable=mock_open,
        read_data='{"clones": [{"name": "TRGV5*01", "sequence": "CGTCTT"}]}',
    )
    @patch("os.path.isfile", return_value=True)
    def test_index_valid_fasta(self, mock_isfile, mock_open_file, mock_os_system):
        # Given : Mocked vidjil-algo execution and output file
        mock_os_system.return_value = 0  # Simulate successful execution of os.system
        sequences = ">seq1\nATCG\n>seq2\nGGGG"

        # When : Calling index with mocked vidjil-algo
        with Omboddle(
            self.session,
            keep_session=True,
            params={"sequences": sequences},
        ):
            json_result = segmenter_controller.index()

        # Then : The mocked result is returned
        result = json.loads(json_result)
        clone_names = [clone["name"] for clone in result["clones"]]
        assert "TRGV5*01" in clone_names

        # Verify that os.system was called
        mock_os_system.assert_called_once()
        assert mock_isfile.called
        assert mock_open_file.called

    @patch("os.system")
    @patch(
        "builtins.open",
        new_callable=mock_open,
        read_data='{"clones": [{"name": "TRGV5*01", "sequence": "CGTCTT"}]}',
    )
    @patch("os.path.isfile", return_value=True)
    def test_index_valid_fastq(self, mock_isfile, mock_open_file, mock_os_system):
        # Given : Mocked vidjil-algo execution and output file
        mock_os_system.return_value = 0  # Simulate successful execution of os.system
        sequences = "@seq1\nATCG\n+\n!!!!\n@seq2\nGGGG\n+\n!!!!"

        # When : Calling index with mocked vidjil-algo
        with Omboddle(
            self.session,
            keep_session=True,
            params={"sequences": sequences},
        ):
            json_result = segmenter_controller.index()

        # Then : The mocked result is returned
        result = json.loads(json_result)
        clone_names = [clone["name"] for clone in result["clones"]]
        assert "TRGV5*01" in clone_names

        # Verify that os.system was called
        mock_os_system.assert_called_once()
        assert mock_isfile.called
        assert mock_open_file.called

    def test_index_too_many_fasta(self):
        # Given : Too many FASTA sequences
        sequences = ">seq1\nATCG\n" * 12  # Exceeds the limit of 10

        # When : Calling index with too many FASTA sequences
        with Omboddle(
            self.session,
            keep_session=True,
            params={"sequences": sequences},
        ):
            json_result = segmenter_controller.index()

        # Then : An error message is returned
        result = json.loads(json_result)
        assert result["error"] == "too many sequences (limit : 10)"

    def test_index_invalid_format(self):
        # Given : An invalid sequence format
        sequences = "INVALID_SEQUENCE"

        # When : Calling index with an invalid sequence format
        with Omboddle(
            self.session,
            keep_session=True,
            params={"sequences": sequences},
        ):
            json_result = segmenter_controller.index()

        # Then : An error message is returned
        result = json.loads(json_result)
        assert result["error"] == "invalid sequences, please use fasta or fastq format"

    @patch("os.system")
    @patch("os.path.isfile", return_value=True)
    @patch(
        "builtins.open",
        new_callable=mock_open,
        read_data='{"clones": [{"name": "TRGV5*01", "sequence": "CGTCTT"}]}',
    )
    def test_index_no_sequences(self, mock_open_file, mock_isfile, mock_os_system):
        # Given : No sequences provided in the request
        mock_os_system.return_value = 0  # Simulate successful execution of os.system

        # When : Calling index without sequences
        with Omboddle(
            self.session,
            keep_session=True,
            params={},  # No sequences provided
        ):
            json_result = segmenter_controller.index()

        # Then : An error is logged and no result is returned
        assert json_result is None
        mock_os_system.assert_not_called()
        mock_isfile.assert_not_called()
        mock_open_file.assert_not_called()

    @patch("os.system")
    @patch("os.path.isfile", return_value=False)
    def test_index_mocked_vidjil_algo_error(self, mock_isfile, mock_os_system):
        # Given : Mocked vidjil-algo execution with no output file
        mock_os_system.return_value = 0  # Simulate successful execution of os.system

        # When : Calling index with mocked vidjil-algo
        with Omboddle(
            self.session,
            keep_session=True,
            params={"sequences": ">seq1 \nINVALID_SEQUENCE"},
        ):
            json_result = segmenter_controller.index()

        # Then : An error message is returned
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "Error while processing the file"
