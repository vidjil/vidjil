import json
import os
import shutil
import tempfile
from contextlib import contextmanager

from py4web import action

from .. import settings
from ..common import cors, log, request
from ..modules import vidjil_utils

##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"


@contextmanager
def TemporaryDirectory():
    name = tempfile.mkdtemp()
    try:
        yield name
    finally:
        shutil.rmtree(name)


limit_max = 10  # max sequence per request


def segment_sequences(sequences):
    """
    Segment the sequences given in parameter (FASTA format)
    and return a JSON of the result
    """
    text_result = "{}"

    check = check_sequences(sequences)
    if check is not None:
        text_result = '{"error": "%s"}' % check
    else:
        with TemporaryDirectory() as folder_path:
            # Store sequences in a tmp file
            file_path = folder_path + "/sequences.txt"
            with open(file_path, "w") as fasta:
                fasta.write(sequences)

            ## vidjil config
            config = f"-c designations -3 -g {settings.DIR_GERMLINE}"

            ## complete command
            cmd = settings.DIR_VIDJIL + "/vidjil-algo " + " -o  " + folder_path
            cmd += " " + config + " " + file_path

            ## execute vidjil command
            os.system(cmd)

            # Get result in a tmp file
            result_path = folder_path + "/sequences.vidjil"

            if os.path.isfile(result_path):
                with open(result_path, "r", encoding="utf-8") as myfile:
                    text_result = myfile.read()
            else:
                res = {"success": "false", "message": "Error while processing the file"}
                log.error(res)
                return json.dumps(res, separators=(",", ":"))

    log.debug("segment sequences %s" % str(sequences))
    return text_result


def check_sequences(sequences):
    # fasta format ?
    if sequences[0] == ">":
        if len(sequences.split(">")) > limit_max + 1:
            return "too many sequences (limit : " + str(limit_max) + ")"

    # fastq format ?
    elif sequences[0] == "@":
        if len(sequences.split("\n")) > 4 * (limit_max + 1):
            return "too many sequences (limit : " + str(limit_max) + ")"

    # unknown format ?
    else:
        return "invalid sequences, please use fasta or fastq format"
    return None


##################################
# CONTROLLERS
##################################


@action("/vidjil/segmenter/index", method=["POST", "GET"])
@action.uses(cors)
@vidjil_utils.jsontransformer
def index():
    if "sequences" not in request.params or request.params["sequences"] == "":
        log.error("no sequences in segmenter request")
        return None

    sequences = request.params["sequences"]
    return segment_sequences(sequences)
