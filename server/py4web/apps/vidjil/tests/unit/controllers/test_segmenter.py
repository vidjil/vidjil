import json
import os
import pathlib

import pytest
from py4web.core import Session, _before_request

from .... import settings
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

    def test_index_error_wrong_path(self):
        # Given : not logged

        # When : Calling index:
        with Omboddle(
            self.session, keep_session=True, params={"sequences": ">seq1 ACCGTAA"}
        ):
            json_result = segmenter_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "Error while processing the file"

    def test_index_simple_sequence(self):
        # Given : correctly set vidjil path
        saved_dir_vidjil = settings.DIR_VIDJIL
        saved_dir_germline = settings.DIR_GERMLINE
        settings.DIR_VIDJIL = str(
            pathlib.Path(
                __file__
            ).parent.parent.parent.parent.parent.parent.parent.parent.absolute()
        )
        settings.DIR_GERMLINE = settings.DIR_VIDJIL + "/germline"

        # When : Calling index:
        try:
            with Omboddle(
                self.session,
                keep_session=True,
                params={
                    "sequences": ">seq1 \n"
                    + "CGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGGGGCCAGATTATAAGAAACTCTTTGGCAGTGGAACAACAC\n"
                    + "\n"
                    + ">seq2 \n"
                    + "GGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTCAGTAGCTACGACATGCACTGGGTCCGCCAAGCTACAGGAAAAGGTCTGGAGTGGGTCTCAGCTATTGGTACTGCTGGTGACACATACTATCCAGGCTCCGTGAAGGGCCGATTCACCATCTCCAGAGAAAATGCCAAGAACTCCTTGTATCTTCAAATGAACAGCCTGAGAGCCGGGGACACGGCTGTGTATTACTGTGCAAGAGTGAGGCGGAGAGATCGGGGGATTGTAGTGGTGGTAGCTGCTACTCAACGGTAAGTTGGTTCGACCCCTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT"
                },
            ):
                json_result = segmenter_controller.index()

            # Then : We get a result
            result = json.loads(json_result)
            clone_names = [clone["name"] for clone in result["clones"]]
            assert "TRGV5*01 5/GGGCCAG/5 TRGJ1*01" in clone_names
            assert (
                "IGHV3-13*01 1/TGAGGCGGAGAGATCGGGGG/5 IGHD2-15*01 1/AACGGTAAGT/5 IGHJ5*02"
                in clone_names
            )
        finally:
            settings.DIR_GERMLINE = saved_dir_germline
            settings.DIR_VIDJIL = saved_dir_vidjil

    def test_index_invalid_sequence(self):
        # Given : correctly set vidjil path
        saved_dir_vidjil = settings.DIR_VIDJIL
        saved_dir_germline = settings.DIR_GERMLINE
        settings.DIR_VIDJIL = str(
            pathlib.Path(
                __file__
            ).parent.parent.parent.parent.parent.parent.parent.parent.absolute()
        )
        settings.DIR_GERMLINE = settings.DIR_VIDJIL + "/germline"

        # When : Calling index:
        try:
            with Omboddle(
                self.session, keep_session=True, params={"sequences": "blabla"}
            ):
                json_result = segmenter_controller.index()

            # Then : We get a result
            result = json.loads(json_result)
            assert (
                result["error"] == "invalid sequences, please use fasta or fastq format"
            )
        finally:
            settings.DIR_GERMLINE = saved_dir_germline
            settings.DIR_VIDJIL = saved_dir_vidjil

    def test_index_unseg(self):
        # Given : correctly set vidjil path
        saved_dir_vidjil = settings.DIR_VIDJIL
        saved_dir_germline = settings.DIR_GERMLINE
        settings.DIR_VIDJIL = str(
            pathlib.Path(
                __file__
            ).parent.parent.parent.parent.parent.parent.parent.parent.absolute()
        )
        settings.DIR_GERMLINE = settings.DIR_VIDJIL + "/germline"

        # When : Calling index:
        try:
            with Omboddle(
                self.session,
                keep_session=True,
                params={"sequences": ">seq1 \n" + "CGTCTT"},
            ):
                json_result = segmenter_controller.index()

            # Then : We get a result
            result = json.loads(json_result)
            print(result)
            assert len(result["clones"]) == 1
            assert result["clones"][0]["sequence"] == "CGTCTT"
        finally:
            settings.DIR_GERMLINE = saved_dir_germline
            settings.DIR_VIDJIL = saved_dir_vidjil
