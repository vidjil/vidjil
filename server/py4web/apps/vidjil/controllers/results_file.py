# -*- coding: utf-8 -*-
import json
import os

from ombott import static_file
from py4web import action, request

from .. import settings
from ..common import T, auth, db, log
from ..modules import vidjil_utils
from ..modules.controller_utils import error_message
from ..modules.sampleSet import get_sample_set_id_from_results_file
from ..tasks import schedule_fuse

ACCESS_DENIED = "access denied"


# display run page result
# need ["results_file_id"]
@action("/vidjil/results_file/info", method=["POST", "GET"])
@action.uses("results_file/info.html", db, auth.user)
@vidjil_utils.jsontransformer
def info():
    sample_set_id = get_sample_set_id_from_results_file(
        request.query["results_file_id"]
    )
    if not auth.can_modify_sample_set(int(sample_set_id)):
        return error_message(ACCESS_DENIED)

    out_folder = settings.DIR_OUT_VIDJIL_ID % int(request.query["results_file_id"])
    output_filename = settings.BASENAME_OUT_VIDJIL_ID % int(
        request.query["results_file_id"]
    )

    if os.path.exists(f"{out_folder}/{output_filename}.vidjil.log"):
        with open(
            f"{out_folder}/{output_filename}.vidjil.log", "r", encoding="utf-8"
        ) as f:
            content = f.read()
            content = vidjil_utils.split_log(content)
    else:
        content = None

    log.info(
        "access results file info",
        extra={
            "user_id": auth.user_id,
            "record_id": request.query["results_file_id"],
            "table_name": "results_file",
        },
    )
    return dict(message=T("result info"), content_log=content, auth=auth, db=db)


@action("/vidjil/results_file/output", method=["POST", "GET"])
@action.uses("results_file/output.html", db, auth.user)
@vidjil_utils.jsontransformer
def output():
    sample_set_id = get_sample_set_id_from_results_file(
        request.query["results_file_id"]
    )
    if auth.can_view_sample_set(int(sample_set_id)):
        results_id = int(request.query["results_file_id"])
        output_directory = settings.DIR_OUT_VIDJIL_ID % results_id

        if not os.path.exists(output_directory):
            log.error(
                f"Output path {output_directory} does not exist for {results_id=} in {sample_set_id=}"
            )
            return error_message("Output path does not exist")

        files = os.listdir(output_directory)

        file_dicts = []

        for f in files:
            file_size = vidjil_utils.format_size(os.stat(output_directory + f).st_size)
            file_dicts.append({"filename": f, "size": file_size})

        log.info(
            "view output files",
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["results_file_id"],
                "table_name": "results_file",
            },
        )
        return dict(
            message="output files",
            results_file_id=results_id,
            files=file_dicts,
            auth=auth,
            db=db,
        )
    return error_message("access denied")


@action("/vidjil/results_file/download", method=["POST", "GET"])
@action.uses(db, auth.user)
def download():
    sample_set_id = get_sample_set_id_from_results_file(
        request.query["results_file_id"]
    )
    if (
        auth.can_view_sample_set(int(sample_set_id))
        and ".." not in request.query["filename"]
    ):
        results_id = int(request.query["results_file_id"])
        directory = settings.DIR_OUT_VIDJIL_ID % results_id
        try:
            log.info(
                "Downloaded results file",
                extra={
                    "user_id": auth.user_id,
                    "record_id": request.query["results_file_id"],
                    "table_name": "results_file",
                },
            )
            return static_file(request.query["filename"], directory, download=True)
        except IOError:
            return error_message("File could not be read")
    return error_message("access denied")


@action("/vidjil/results_file/confirm", method=["POST", "GET"])
@action.uses("results_file/confirm.html", db, auth.user)
@vidjil_utils.jsontransformer
def confirm():
    sample_set_id = request.query["sample_set_id"]

    if auth.can_modify_sample_set(int(sample_set_id)) & auth.can_process_sample_set(
        int(sample_set_id)
    ):
        return dict(message=T("result confirm"), auth=auth, db=db)
    else:
        res = {"message": ACCESS_DENIED}
        return json.dumps(res, separators=(",", ":"))


@action("/vidjil/results_file/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    sample_set_id = request.query["sample_set_id"]

    if auth.can_modify_sample_set(int(sample_set_id)) & auth.can_process_sample_set(
        int(sample_set_id)
    ):
        config_id = db.results_file[request.query["results_file_id"]].config_id

        # delete results_file
        db(db.results_file.id == request.query["results_file_id"]).delete()

        # delete fused_file
        count = db(
            (sample_set_id == db.sample_set_membership.sample_set_id)
            & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            & (db.sequence_file.id == db.results_file.sequence_file_id)
            & (db.results_file.config_id == config_id)
        ).count()

        if count == 0:
            db(
                (db.fused_file.sample_set_id == sample_set_id)
                & (db.fused_file.config_id == config_id)
            ).delete()
        else:
            schedule_fuse([sample_set_id], [config_id])

        res = {
            "redirect": "sample_set/index",
            "args": {"id": sample_set_id, "config_id": config_id},
            "success": "true",
            "message": "[%s] (%s) c%s: process deleted"
            % (request.query["results_file_id"], sample_set_id, config_id),
        }
        log.info(
            res,
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["results_file_id"],
                "table_name": "results_file",
            },
        )
        return json.dumps(res, separators=(",", ":"))
    else:
        res = {"message": ACCESS_DENIED}
        return json.dumps(res, separators=(",", ":"))
